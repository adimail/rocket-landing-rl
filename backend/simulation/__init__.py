from backend.simulation.rocket.controls import RocketControls
from backend.logger import Logger
from datetime import datetime


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

            if self.log_state:
                self._log("debug", f"Initial State: {state}")

            return state
        except Exception as e:
            self._log("exception", f"Simulation reset failed: {e}")
            raise

    def start(self):
        try:
            self.paused = False
            self._log("info", "Simulation started.")
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

    def step(self, action=(0.0, 0.0, 0.0)):
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
                        "gimbal": action[1],
                        "cold_gas_control": action[2],
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
