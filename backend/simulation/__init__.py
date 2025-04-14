from backend.simulation.rocket.controls import RocketControls
from backend.logger import Logger
from datetime import datetime
import asyncio
from typing import Tuple


class SimulationController:
    def __init__(self, log_state=True, log_action=True, log_reward=True):
        try:
            self.log_state = log_state
            self.log_action = log_action
            self.log_reward = log_reward

            self.logger = None
            self._setup_new_logger()

            self.rocket = RocketControls()
            self.dt = self.rocket.dt
            self.paused = True
            self.rocket.touchdown = False
            self._running = False
            self.state_callback = None
            self.current_action = (0.0, 0.0)

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
            state = self.rocket.reset()
            self.paused = True
            self.rocket.touchdown = False
            self._running = False
            self.current_action = (0.0, 0.0)
            if self.log_state:
                self._log("debug", f"Initial State: {state}")

            return state
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

    def set_action(self, action: Tuple[float, float]):
        """Set the current action from external source (e.g., WebSocket)."""
        self.current_action = action

    async def _simulation_loop(self):
        step_counter = 0
        steps_per_message = int(0.1 / self.dt)

        while self._running and not self.paused and not self.rocket.touchdown:
            try:
                state, reward, done = self.step(self.current_action)
                step_counter += 1

                if step_counter >= steps_per_message:
                    if self.state_callback:
                        self.state_callback(state, reward, done)
                    step_counter = 0

                if done:
                    self._running = False
                    if self.state_callback:
                        self.state_callback(state, reward, done)
                    break

                await asyncio.sleep(self.dt)

            except Exception as e:
                self._log("exception", f"Error in simulation loop: {e}")
                self._running = False
                break

    def step(self, action: Tuple[float, float]) -> Tuple[dict, float, bool]:
        try:
            if self.paused or self.rocket.touchdown:
                state = self.rocket.rocket.get_state().copy()
                return state, 0.0, self.rocket.touchdown

            state, reward, sim_done = self.rocket.step(action)
            self.rocket.touchdown = sim_done

            log_entry = {
                "state": state if self.log_state else None,
                "action": (
                    {
                        "throttle": action[0],
                        "cold_gas_control": action[1],
                    }
                    if self.log_action
                    else None
                ),
                "reward": reward if self.log_reward else None,
            }
            self._log("debug", f"StepLog: {log_entry}")

            return state, reward, self.rocket.touchdown
        except Exception as e:
            self._log("exception", f"Simulation step failed: {e}")
            raise

    def render(self):
        try:
            return self.rocket.rocket.get_state().copy()
        except Exception as e:
            self._log("exception", f"Simulation render failed: {e}")
            raise
