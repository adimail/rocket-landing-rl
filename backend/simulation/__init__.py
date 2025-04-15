from backend.simulation.rocket.controls import RocketControls
from backend.logger import Logger
from datetime import datetime
import asyncio
from backend.config import Config
from typing import Tuple, List


class SimulationController:
    def __init__(self, num_rockets=2, log_state=True, log_action=True, log_reward=True):
        try:
            self.log_state = log_state
            self.log_action = log_action
            self.log_reward = log_reward

            self.config = Config()

            self.logger = None
            self._setup_new_logger()

            self.rockets = [RocketControls() for _ in range(num_rockets)]

            self.dt = self.rockets[0].dt if self.rockets else 0.1

            self.paused = True

            self.rocket_touchdown_status = [False] * num_rockets
            self.rocket_steps = [0] * num_rockets
            self.max_steps = self.rockets[0].max_steps if self.rockets else 1000
            self._running = False
            self.state_callback = None
            self.current_actions: List[Tuple[float, float]] = [(0.0, 0.0)] * num_rockets
            self.num_rockets = num_rockets
            self.sim_speed = min(self.config.get("env.speed"), 10)

            self._log("info", "SimulationController started")
        except Exception as e:
            self._log("exception", f"Failed to initialize SimulationController: {e}")
            raise

    def _log(self, level, msg):
        if hasattr(self.logger, level):
            getattr(self.logger, level)(msg)

    def _setup_new_logger(self):
        try:
            if self.logger:
                for handler in self.logger.handlers:
                    handler.close()
                self.logger.handlers.clear()

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_dir = "logs/simulations"
            log_filename = f"{timestamp}.log"

            self.logger = Logger(
                file_name=log_filename,
                log_dir=log_dir,
                stream_handler=False,
            ).get_logger()
        except Exception as e:
            print(f"Logger setup failed: {e}")
            raise

    def reset(self):
        try:
            self._log("info", "Resetting simulation...")

            self._setup_new_logger()
            states = [rocket.reset() for rocket in self.rockets]
            self.paused = True
            self.rocket_touchdown_status = [False] * self.num_rockets
            self.rocket_steps = [0] * self.num_rockets
            self._running = False
            self.current_actions = [(0.0, 0.0)] * self.num_rockets  # Reset actions
            if self.log_state:
                self._log("debug", f"Initial States: {states}")

            return states
        except Exception as e:
            self._log("exception", f"Simulation reset failed: {e}")
            raise

    def start(self, state_callback):
        try:
            if self._running and self.paused:
                self.paused = False
                self._log("info", "Simulation resumed.")
                asyncio.create_task(self._simulation_loop())
                return

            if self._running:
                self._log(
                    "warning", "Simulation already running. Start command ignored."
                )
                return

            self.paused = False
            self._running = True
            self.state_callback = state_callback

            self._log("info", "Simulation started.")
            asyncio.create_task(self._simulation_loop())

        except Exception as e:
            self._log("exception", f"Simulation start failed: {e}")
            raise

    def pause(self):
        try:
            self.paused = True
            self._log("info", "Simulation paused.")
        except Exception as e:
            self._log("exception", f"Simulation pause failed: {e}")
            raise

    def set_action(self, action: Tuple[float, float], rocket_index: int):
        """Set the action for a specific rocket.

        Args:
            action: Tuple containing (throttle, cold_gas_control)
            rocket_index: Index of the rocket to apply the action to
        """
        if rocket_index < 0 or rocket_index >= self.num_rockets:
            raise ValueError(
                f"Invalid rocket index: {rocket_index}. Should be between 0 and {self.num_rockets-1}"
            )

        self.current_actions[rocket_index] = action

        if self.log_action:
            self._log(
                "debug",
                f"Action set for rocket {rocket_index}: throttle={action[0]}, cold_gas={action[1]}",
            )

    async def _simulation_loop(self):
        all_rockets_landed = all(self.rocket_touchdown_status)

        while self._running and not self.paused and not all_rockets_landed:
            try:
                # Pass actions for all rockets to step function
                states, rewards, dones = self.step(self.current_actions)
                done = all(dones)  # Simulation done if all rockets are done

                if done:
                    self._running = False
                    if self.state_callback:
                        self.state_callback(states, rewards, dones)
                    break

                if self.state_callback:
                    self.state_callback(states, rewards, dones)

                await asyncio.sleep(self.dt * 1 / self.sim_speed)

            except Exception as e:
                self._log("exception", f"Error in simulation loop: {e}")
                self._running = False
                break

    def step(
        self, actions: List[Tuple[float, float]]
    ) -> Tuple[List[dict], List[float], List[bool]]:
        all_states = []
        all_rewards = []
        all_dones = []

        if len(actions) != self.num_rockets:
            raise ValueError(
                f"Expected {self.num_rockets} actions, but got {len(actions)}"
            )

        try:
            if self.paused or all(self.rocket_touchdown_status):
                for i in range(self.num_rockets):
                    state = self.rockets[i].rocket.get_state().copy()
                    all_states.append(state)
                    all_rewards.append(0.0)
                    all_dones.append(self.rocket_touchdown_status[i])
                return all_states, all_rewards, all_dones

            for i in range(self.num_rockets):
                if not self.rocket_touchdown_status[i]:  # Only step if not landed
                    state, reward, sim_done = self.rockets[i].step(
                        actions[i]
                    )  # Pass individual action
                    self.rocket_touchdown_status[i] = sim_done

                    log_entry = {
                        "rocket_index": i,
                        "state": state if self.log_state else None,
                        "action": (
                            {
                                "throttle": actions[i][0],
                                "cold_gas_control": actions[i][1],
                            }
                            if self.log_action
                            else None
                        ),
                        "reward": reward if self.log_reward else None,
                    }
                    self._log("debug", f"StepLog: {log_entry}")
                    all_states.append(state)
                    all_rewards.append(reward)
                    all_dones.append(sim_done)
                else:  # if landed, just return last state, 0 reward, done=True
                    state = self.rockets[i].rocket.get_state().copy()
                    all_states.append(state)
                    all_rewards.append(0.0)
                    all_dones.append(True)  # Already landed

            return all_states, all_rewards, all_dones
        except Exception as e:
            self._log("exception", f"Simulation step failed: {e}")
            raise

    def render(self):
        try:
            return [rocket.rocket.get_state().copy() for rocket in self.rockets]
        except Exception as e:
            self._log("exception", f"Simulation render failed: {e}")
            raise
