from backend.simulation.physics.controls import RocketSimulator
from backend.logger import Logger
from datetime import datetime


class SimulationController:
    def __init__(self, log_state=False, log_action=True, log_reward=True):
        try:
            self.log_state = log_state
            self.log_action = log_action
            self.log_reward = log_reward

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_dir = "logs/simulations"
            log_filename = f"{timestamp}.log"

            self.logger = Logger(
                file_name=log_filename,
                log_dir=log_dir,
                stream_handler=False,
            ).get_logger()

            self.sim = RocketSimulator()
            self.paused = True
            self.done = False
            self.time = 0.0
            self._log("info", f"SimulationController initialized at {timestamp}")
        except Exception as e:
            self._log("exception", f"Failed to initialize SimulationController: {e}")
            raise

    def _log(self, level, msg):
        if hasattr(self.logger, level):
            getattr(self.logger, level)(msg)

    def reset(self):
        try:
            self._log("info", "Resetting simulation...")
            state = self.sim.reset()
            self.paused = True
            self.done = False
            self.time = 0.0
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

    def step(self, action=(0.0, 0.0)):
        try:
            if self.paused or self.done:
                state = self.sim.rocket.get_state()
                return state, 0.0, self.done

            if self.log_action:
                self._log("debug", f"Action: {action}")

            state, reward, sim_done = self.sim.step(action)
            self.time += self.sim.dt
            self.done = sim_done

            if self.log_reward:
                self._log("debug", f"Reward: {reward}")
            if self.log_state:
                self._log("debug", f"State: {state}")

            return state, reward, self.done
        except Exception as e:
            self._log("exception", f"Simulation step failed: {e}")
            raise

    def render(self):
        try:
            return self.sim.rocket.get_state()
        except Exception as e:
            self._log("exception", f"Simulation render failed: {e}")
            raise
