from backend.simulation.rocket.controls import RocketControls
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


class SimulationController:
    def __init__(self, num_rockets=2, log_state=True, log_action=True, log_reward=True):
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
                self.rockets[0].dt if self.rockets else self.config.get("env.time_step")
            )

            self.paused = True

            self.rocket_touchdown_status: List[bool] = [False] * self.num_rockets
            self.rocket_steps: List[int] = [0] * self.num_rockets
            self.max_steps = (
                self.rockets[0].max_steps
                if self.rockets
                else self.config.get("env.max_steps")
            )
            self._running = False
            self.state_callback: Optional[
                Callable[[List[Dict], List[float], List[bool]], None]
            ] = None

            # --- Action Representation Change ---
            # Store actions as dictionaries consistently
            self.current_actions: List[Dict[str, float]] = [
                {"throttle": 0.0, "coldGas": 0.0} for _ in range(self.num_rockets)
            ]
            self.prev_action_taken: List[Dict[str, float]] = [
                {"throttle": 0.0, "coldGas": 0.0} for _ in range(self.num_rockets)
            ]
            # -----------------------------------

            self.sim_speed = min(self.config.get("env.speed"), 10)

            self._log(
                "info",
                f"SimulationController initialized with {self.num_rockets} rockets",
            )
        except Exception as e:
            # Use configured logger if available, else print
            self._log("exception", f"Failed to initialize SimulationController: {e}")
            raise

    def _log(self, level: str, msg: str):
        """Safely log messages using the configured logger."""
        if self.logger and hasattr(self.logger, level):
            getattr(self.logger, level)(msg)
        elif level == "exception":
            print(
                f"EXCEPTION: {msg}"
            )  # Fallback print for critical errors if logger fails
        # else:
        #     print(f"{level.upper()}: {msg}") # Optional fallback for other levels

    def _setup_new_logger(self):
        try:
            # Ensure previous handlers are closed before reconfiguring
            if self.logger:
                for handler in self.logger.handlers[:]:  # Iterate over a copy
                    handler.close()
                    self.logger.removeHandler(handler)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_dir = "logs/simulations"
            log_filename = f"{timestamp}.log"

            # Assuming Logger class correctly sets up and returns a logger instance
            self.logger = Logger(
                file_name=log_filename,
                log_dir=log_dir,
                stream_handler=False,  # Typically false for simulation logs
            ).get_logger()
            self._log("info", f"Logger initialized: {log_filename}")
        except Exception as e:
            print(
                f"Logger setup failed: {e}"
            )  # Print as logger might not be functional
            self.logger = None  # Ensure logger is None if setup fails
            # Decide if this is critical enough to raise the exception
            # raise

    def reset(self) -> List[Dict]:
        """Resets the simulation state for all rockets."""
        try:
            self._log("info", "Resetting simulation...")
            # Reset logger for the new simulation run
            self._setup_new_logger()

            states = [rocket.reset() for rocket in self.rockets]
            self.paused = True
            self.rocket_touchdown_status = [False] * self.num_rockets
            self.rocket_steps = [0] * self.num_rockets
            self._running = False
            # --- Action Representation Change ---
            # Reset actions to default dictionaries
            self.current_actions = [
                {"throttle": 0.0, "coldGas": 0.0} for _ in range(self.num_rockets)
            ]
            # -----------------------------------
            if self.log_state:
                # Log initial states concisely if many rockets
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
                # Ensure loop restarts if it wasn't already running (e.g., paused immediately after start)
                if (
                    not asyncio.current_task()
                ):  # Check if a loop task is already running
                    asyncio.create_task(self._simulation_loop())
                return

            if self._running:
                self._log(
                    "warning", "Simulation already running. Start command ignored."
                )
                return

            self.paused = False
            self._running = True
            self.state_callback = state_callback  # Store the callback

            self._log("info", "Simulation started.")
            # Start the simulation loop as an async task
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

    # --- Action Representation Change ---
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

    # -----------------------------------

    async def _simulation_loop(self):
        """The main asynchronous simulation loop."""
        self._log("info", "Simulation loop starting.")
        while self._running:
            if self.paused:
                await asyncio.sleep(0.1)
                continue

            loop_start_time = asyncio.get_event_loop().time()

            try:
                states, rewards, dones = self.step(self.current_actions)
                all_done = all(dones)

                if self.state_callback:
                    self.state_callback(states, rewards, dones)

                if all_done:
                    self._log(
                        "info", "All rockets have landed or finished. Stopping loop."
                    )
                    self._running = False
                    break

                loop_end_time = asyncio.get_event_loop().time()
                elapsed_time = loop_end_time - loop_start_time
                sleep_duration = (self.dt / self.sim_speed) - elapsed_time
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
        """Advances the simulation by one time step for all rockets."""
        all_states: List[Dict] = []
        all_rewards: List[float] = []
        all_dones: List[bool] = []

        if len(actions) != self.num_rockets:
            self._log(
                "error",
                f"Step received {len(actions)} actions, but expected {self.num_rockets}.",
            )
            raise ValueError(
                f"Action list length mismatch: expected {self.num_rockets}, got {len(actions)}"
            )

        try:
            if self.paused:
                for i in range(self.num_rockets):
                    state = self.rockets[i].rocket.get_state()
                    all_states.append(state)
                    all_rewards.append(0.0)
                    all_dones.append(self.rocket_touchdown_status[i])
                return all_states, all_rewards, all_dones

            for i in range(self.num_rockets):
                if not self.rocket_touchdown_status[i]:
                    # --- Action Representation Change ---
                    # Pass the action dictionary directly to the rocket's step method
                    current_action = actions[i]
                    state, reward, sim_done = self.rockets[i].step(current_action)
                    # -----------------------------------

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

            self.prev_action_taken = self.current_actions
            self.current_actions = [
                {"throttle": 0.0, "coldGas": 0.0} for _ in range(self.num_rockets)
            ]

            return all_states, all_rewards, all_dones

        except Exception as e:
            self._log(
                "exception", f"Simulation step failed for one or more rockets: {e}"
            )
            raise

    def render(self) -> List[Dict]:
        """Returns the current state of all rockets (useful if not running loop)."""
        try:
            return [rocket.rocket.get_state() for rocket in self.rockets]
        except Exception as e:
            self._log("exception", f"Simulation render failed: {e}")
            raise
