from backend.rocket import RocketControls
from backend.logger import Logger
from datetime import datetime
import asyncio
import os
from backend.config import Config
import json
from typing import Tuple, List, Dict, Optional, Callable, Any
from backend.rl import RLAgent


class SimulationController:
    def __init__(
        self,
        num_rockets: int,
        rl_agent: Optional[RLAgent] = None,
    ):
        try:
            self.config = Config()

            self.log_state = self.config.get("logging.log_state")
            self.log_action = self.config.get("logging.log_action")
            self.log_reward = self.config.get("logging.log_reward")

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
                Callable[[List[Any], List[Any], List[bool]], None]
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

            # --- BUFFERED LOGGING SETUP ---
            self.log_buffer = []
            self.BUFFER_SIZE = 100  # Flush to disk every 100 steps

            self._log(
                "info",
                f"SimulationController initialized with {self.num_rockets} rockets. Agent control {'enabled' if self.agent_enabled else 'disabled'}.",
            )
        except Exception as e:
            self._log("exception", f"Failed to initialize SimulationController: {e}")
            raise

    def _log(self, level: str, msg: str):
        if self.logger and hasattr(self.logger, level):
            getattr(self.logger, level)(msg)
        elif level == "exception":
            print(f"EXCEPTION: {msg}")

    def _flush_logs(self):
        """Writes buffered logs to disk."""
        if not self.log_buffer or not self.logger:
            return
        try:
            for level, msg in self.log_buffer:
                if hasattr(self.logger, level):
                    getattr(self.logger, level)(msg)
            self.log_buffer.clear()
        except Exception as e:
            print(f"Error flushing logs: {e}")

    def _setup_new_logger(self):
        try:
            if self.logger:
                for handler in self.logger.handlers[:]:
                    handler.close()
                    self.logger.removeHandler(handler)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_dir = self.config.get("paths.logs_dir")
            sim_log_dir = os.path.join(log_dir, "simulations")

            log_filename = f"{timestamp}.log"
            self.logger = Logger(
                file_name=log_filename,
                log_dir=sim_log_dir,
                stream_handler=False,
            ).get_logger()
        except Exception as e:
            print(f"Logger setup failed: {e}")
            self.logger = None

    def reset(self) -> List[Dict]:
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
            self.log_buffer = []
            return states
        except Exception as e:
            self._log("exception", f"Simulation reset failed: {e}")
            raise

    def start(self, state_callback: Callable[[List[Any], List[Any], List[bool]], None]):
        try:
            if self._running and self.paused:
                self.paused = False
                self._log("info", "Simulation resumed.")
                return
            if self._running:
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
            if not self.paused:
                self.paused = True
                self._flush_logs()
                self._log("info", "Simulation paused.")
        except Exception as e:
            self._log("exception", f"Simulation pause failed: {e}")
            raise

    def stop(self):
        """Gracefully stops the simulation loop and flushes logs."""
        self._running = False
        self.paused = True
        self._flush_logs()

    def set_action(self, action: Dict[str, float], rocket_index: int):
        if not (0 <= rocket_index < self.num_rockets):
            return
        throttle = action.get("throttle", 0.0)
        cold_gas = action.get("coldGas", 0.0)
        self.current_actions[rocket_index] = {
            "throttle": max(0.0, min(1.0, float(throttle))),
            "coldGas": max(-1.0, min(1.0, float(cold_gas))),
        }

    async def _simulation_loop(self):
        self._log("info", "Simulation loop starting.")
        while self._running:
            if self.paused:
                await asyncio.sleep(0.1)
                continue
            loop_start_time = asyncio.get_event_loop().time()
            try:
                current_sim_states = self.render()
                indices_to_predict = []
                states_to_predict: List[Dict] = []

                actions_for_this_step = [
                    self.current_actions[i] for i in range(self.num_rockets)
                ]

                if self.agent_enabled and self.rl_agent:
                    for i in range(self.num_rockets):
                        if (
                            i in self.agent_controlled_indices
                            and not self.rocket_touchdown_status[i]
                        ):
                            indices_to_predict.append(i)
                            states_to_predict.append(current_sim_states[i])

                if states_to_predict and self.rl_agent:
                    predicted_actions = self.rl_agent.predict_batch(states_to_predict)
                    for idx, action in zip(indices_to_predict, predicted_actions):
                        actions_for_this_step[idx] = action

                states, rewards, dones = self.step(actions_for_this_step)

                if self.state_callback:
                    self.state_callback(states, rewards, dones)

                self.current_actions = [
                    {"throttle": 0.0, "coldGas": 0.0} for _ in range(self.num_rockets)
                ]

                if all(dones):
                    self._flush_logs()
                    self._running = False
                    break

                loop_end_time = asyncio.get_event_loop().time()
                elapsed_time = loop_end_time - loop_start_time
                sleep_duration = max(0, self.dt - elapsed_time)
                await asyncio.sleep(sleep_duration)
            except Exception as e:
                self._log("exception", f"Error in simulation loop: {e}")
                self._running = False
                break
        self._log("info", "Simulation loop finished.")

    def step(
        self, actions: List[Dict[str, float]]
    ) -> Tuple[List[Any], List[Any], List[bool]]:
        all_states: List[Any] = []
        all_rewards: List[Any] = []
        all_dones: List[bool] = []
        actual_actions_taken_this_step: List[Dict[str, float]] = []

        try:
            for i in range(self.num_rockets):
                if self.rocket_touchdown_status[i]:
                    all_states.append(None)
                    all_rewards.append(None)
                    all_dones.append(True)
                    actual_actions_taken_this_step.append(
                        {"throttle": 0.0, "coldGas": 0.0}
                    )
                    continue

                current_action = actions[i]
                actual_actions_taken_this_step.append(current_action)
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
                    self.log_buffer.append(
                        ("debug", f"StepLog: {json.dumps(log_entry)}")
                    )

                all_states.append(state)
                all_rewards.append(reward)
                all_dones.append(sim_done)

            if len(self.log_buffer) >= self.BUFFER_SIZE:
                self._flush_logs()

            self.prev_action_taken = actual_actions_taken_this_step
            return all_states, all_rewards, all_dones

        except Exception as e:
            self._log("exception", f"Simulation step failed: {e}")
            raise

    def render(self) -> List[Dict]:
        return [rc.rocket.get_state() for rc in self.rockets]
