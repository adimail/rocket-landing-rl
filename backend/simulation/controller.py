from backend.rocket import RocketControls
from backend.logger import Logger
from datetime import datetime
import asyncio

from backend.config import Config
import json
from typing import (
    Tuple,
    List,
    Dict,
    Optional,
    Callable,
)

from backend.rl import RLAgent


class SimulationController:
    def __init__(
        self,
        num_rockets=2,
        log_state=True,
        log_action=True,
        log_reward=True,
        rl_agent: Optional[RLAgent] = None,
    ):
        try:
            self.log_state = log_state
            self.log_action = log_action
            self.log_reward = log_reward

            self.config = Config()

            self.logger = None
            self._setup_new_logger()

            self.num_rockets = num_rockets
            self.rockets: List[RocketControls] = [
                RocketControls() for _ in range(self.num_rockets)
            ]

            self.dt = (
                self.rockets[0].dt
                if self.rockets
                else self.config.get("simulation.time_step")
            )

            self.paused = True

            self.rocket_touchdown_status: List[bool] = [False] * self.num_rockets
            self.rocket_steps: List[int] = [0] * self.num_rockets
            self._running = False
            self.state_callback: Optional[
                Callable[[List[Dict], List[float], List[bool]], None]
            ] = None

            self.rl_agent = rl_agent
            self.agent_enabled = bool(rl_agent)
            self.agent_controlled_indices = (
                set(range(self.num_rockets)) if self.agent_enabled else set()
            )

            self.current_actions: List[Dict[str, float]] = [
                {"throttle": 0.0, "coldGas": 0.0} for _ in range(self.num_rockets)
            ]
            self.prev_action_taken: List[Dict[str, float]] = [
                {"throttle": 0.0, "coldGas": 0.0} for _ in range(self.num_rockets)
            ]

            self.sim_speed = min(self.config.get("simulation.speed"), 10)

            self._log(
                "info",
                f"SimulationController initialized with {self.num_rockets} rockets. Agent control {'enabled' if self.agent_enabled else 'disabled'}.",
            )
        except Exception as e:
            self._log("exception", f"Failed to initialize SimulationController: {e}")
            raise

    def _log(self, level: str, msg: str):
        """Safely log messages using the configured logger."""
        if self.logger and hasattr(self.logger, level):
            getattr(self.logger, level)(msg)
        elif level == "exception":
            print(f"EXCEPTION: {msg}")

    def _setup_new_logger(self):
        try:
            if self.logger:
                for handler in self.logger.handlers[:]:
                    handler.close()
                    self.logger.removeHandler(handler)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_dir = "logs/simulations"
            log_filename = f"{timestamp}.log"

            self.logger = Logger(
                file_name=log_filename,
                log_dir=log_dir,
                stream_handler=False,
            ).get_logger()
            self._log("info", f"Logger initialized: {log_filename}")
        except Exception as e:
            print(f"Logger setup failed: {e}")
            self.logger = None

    def reset(self) -> List[Dict]:
        """Resets the simulation state for all rockets."""
        try:
            self._log("info", "Resetting simulation...")
            self._setup_new_logger()

            states = [rocket.reset() for rocket in self.rockets]
            self.paused = True
            self.rocket_touchdown_status = [False] * self.num_rockets
            self.rocket_steps = [0] * self.num_rockets
            self._running = False
            self.current_actions = [
                {"throttle": 0.0, "coldGas": 0.0} for _ in range(self.num_rockets)
            ]
            # -----------------------------------
            if self.log_state:
                log_states = (
                    str(states)
                    if self.num_rockets < 5
                    else f"{self.num_rockets} initial states generated."
                )
                self._log("debug", f"Initial States: {log_states}")

            return states
        except Exception as e:
            self._log("exception", f"Simulation reset failed: {e}")
            raise

    def start(
        self, state_callback: Callable[[List[Dict], List[float], List[bool]], None]
    ):
        """Starts or resumes the simulation loop."""
        try:
            if self._running and self.paused:
                self.paused = False
                self._log("info", "Simulation resumed.")
                if not asyncio.current_task():
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
        """Pauses the simulation loop."""
        try:
            if not self.paused:
                self.paused = True
                self._log("info", "Simulation paused.")
            else:
                self._log("info", "Simulation already paused.")
        except Exception as e:
            self._log("exception", f"Simulation pause failed: {e}")
            raise

    def set_action(self, action: Dict[str, float], rocket_index: int):
        """Sets the intended action for a specific rocket for the next step.
        Action is now expected as a dictionary.
        """
        if not (0 <= rocket_index < self.num_rockets):
            self._log(
                "error",
                f"Invalid rocket index: {rocket_index}. Must be 0 <= index < {self.num_rockets}",
            )
            return

        throttle = action.get("throttle", 0.0)
        cold_gas = action.get("coldGas", 0.0)

        clipped_action = {
            "throttle": max(0.0, min(1.0, float(throttle))),
            "coldGas": max(-1.0, min(1.0, float(cold_gas))),
        }

        self.current_actions[rocket_index] = clipped_action

        if self.log_action:
            self._log(
                "debug",
                f"Action set for rocket {rocket_index}: {clipped_action}",
            )

    async def _simulation_loop(self):
        """The main asynchronous simulation loop."""
        self._log("info", "Simulation loop starting.")
        while self._running:
            if self.paused:
                await asyncio.sleep(0.1)
                continue

            loop_start_time = asyncio.get_event_loop().time()

            try:
                actions_for_this_step: List[Dict[str, float]] = []
                current_sim_states = self.render()

                for i in range(self.num_rockets):
                    action_to_use = {"throttle": 0.0, "coldGas": 0.0}
                    if (
                        self.agent_enabled
                        and i in self.agent_controlled_indices
                        and self.rl_agent
                    ):
                        raw_state = current_sim_states[i]
                        predicted_action = self.rl_agent.predict(raw_state)
                        if predicted_action:
                            action_to_use = predicted_action
                        else:
                            self._log(
                                "warning",
                                f"Agent prediction failed for rocket {i}. Using default action.",
                            )
                            action_to_use = {"throttle": 0.0, "coldGas": 0.0}
                    else:
                        action_to_use = self.current_actions[i]

                    actions_for_this_step.append(action_to_use)

                states, rewards, dones = self.step(actions_for_this_step)

                all_done = all(dones)

                if self.state_callback:
                    self.state_callback(states, rewards, dones)

                self.current_actions = [
                    {"throttle": 0.0, "coldGas": 0.0} for _ in range(self.num_rockets)
                ]

                if all_done:
                    self._log(
                        "info", "All rockets have landed or finished. Stopping loop."
                    )
                    self._running = False
                    break

                loop_end_time = asyncio.get_event_loop().time()
                elapsed_time = loop_end_time - loop_start_time
                sleep_duration = max(0, (self.dt / self.sim_speed) - elapsed_time)
                if sleep_duration > 0:
                    await asyncio.sleep(sleep_duration)

            except Exception as e:
                self._log("exception", f"Error in simulation loop: {e}")
                self._running = False
                break

        self._log("info", "Simulation loop finished.")

    def step(
        self, actions: List[Dict[str, float]]
    ) -> Tuple[List[Dict], List[float], List[bool]]:
        """Advances the simulation by one time step for all rockets using the provided actions."""
        all_states: List[Dict] = []
        all_rewards: List[float] = []
        all_dones: List[bool] = []
        actual_actions_taken_this_step: List[Dict[str, float]] = []

        if len(actions) != self.num_rockets:
            self._log(
                "error",
                f"Step received {len(actions)} actions, but expected {self.num_rockets}.",
            )
            actions = [
                {"throttle": 0.0, "coldGas": 0.0} for _ in range(self.num_rockets)
            ]

        try:
            if self.paused:
                for i in range(self.num_rockets):
                    state = self.rockets[i].rocket.get_state()
                    all_states.append(state)
                    all_rewards.append(0.0)
                    all_dones.append(self.rocket_touchdown_status[i])
                    actual_actions_taken_this_step.append(
                        {"throttle": 0.0, "coldGas": 0.0}
                    )
                self.prev_action_taken = actual_actions_taken_this_step
                return all_states, all_rewards, all_dones

            for i in range(self.num_rockets):
                current_action = actions[i]
                actual_actions_taken_this_step.append(current_action)

                if not self.rocket_touchdown_status[i]:
                    state, reward, sim_done = self.rockets[i].step(current_action)

                    self.rocket_touchdown_status[i] = sim_done
                    self.rocket_steps[i] += 1

                    if self.log_state or self.log_action or self.log_reward:
                        log_entry = {
                            "step": self.rocket_steps[i],
                            "rocket_index": i,
                            "action": current_action if self.log_action else "omitted",
                            "state": state if self.log_state else "omitted",
                            "reward": f"{reward:.4f}" if self.log_reward else "omitted",
                            "done": sim_done,
                        }
                        self._log("debug", f"StepLog: {json.dumps(log_entry)}")

                    all_states.append(state)
                    all_rewards.append(reward)
                    all_dones.append(sim_done)

                else:
                    state = self.rockets[i].rocket.get_state()
                    all_states.append(state)
                    all_rewards.append(0.0)
                    all_dones.append(True)

            self.prev_action_taken = actual_actions_taken_this_step

            return all_states, all_rewards, all_dones

        except Exception as e:
            self._log(
                "exception", f"Simulation step failed for one or more rockets: {e}"
            )
            try:
                current_states = self.render()
                error_rewards = [-100.0] * self.num_rockets
                error_dones = [True] * self.num_rockets
                self.prev_action_taken = [
                    {"throttle": 0.0, "coldGas": 0.0} for _ in range(self.num_rockets)
                ]
                return current_states, error_rewards, error_dones
            except Exception as inner_e:
                self._log(
                    "exception",
                    f"Failed to even get current state after step error: {inner_e}",
                )
                raise e

    def render(self) -> List[Dict]:
        """Returns the current state of all rockets (useful if not running loop)."""
        try:
            return [rc.rocket.get_state() for rc in self.rockets]
        except Exception as e:
            self._log("exception", f"Simulation render failed: {e}")
            return [{"error": f"Render failed: {e}"}] * self.num_rockets
