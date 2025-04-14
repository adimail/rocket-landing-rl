from backend.simulation.rocket import Rocket
from backend.config import Config


class RocketControls:
    def __init__(self):
        try:
            self.config = Config()
            self.dt = self.config.get("env.time_step") or 0.05
            self.rocket = Rocket(self.config)
            self.touchdown = False
        except Exception as err:
            print("Error initializing RocketControls:", err)
            raise

    def step(self, action):
        """
        action: Dictionary or tuple containing:
          - throttle (number [0.0, 1.0])
          - cold_gas_thrust
        """
        try:
            if self.touchdown:
                raise Exception("Simulation is over. Reset to start again.")

            if isinstance(action, dict):
                throttle = action.get("throttle", 0.0)
                cold_gas_control = action.get("coldGasControl", 0.0)
            else:
                throttle, cold_gas_control = action

            self.rocket.apply_action(throttle, cold_gas_control, self.dt)

            state = self.rocket.get_state()
            reward, self.touchdown = self.compute_reward(state)

            return state, reward, self.touchdown
        except Exception as err:
            print("Error during simulation step:", err)
            raise

    def compute_reward(self, state):
        """
        Computes reward based on the rocket's state.
        A soft landing is defined as having low horizontal (vx) and vertical (vy) velocities and a near-zero angle (in degrees).
        """
        try:
            y = state["y"]
            vx, vy = state["vx"], state["vy"]
            angle_deg = state["angle"]

            if y <= 0.0:
                soft_landing = abs(vx) < 1.0 and abs(vy) < 2.0 and abs(angle_deg) < 5.0
                reward = 100.0 if soft_landing else -100.0
                return reward, True

            reward = -abs(vx) - abs(vy) - abs(angle_deg)
            return reward, False
        except Exception as err:
            print("Error in compute_reward:", err)
            raise

    def reset(self):
        try:
            self.rocket.reset()
            self.touchdown = False
            return self.rocket.get_state()
        except Exception as err:
            print("Error resetting RocketControls:", err)
            raise
