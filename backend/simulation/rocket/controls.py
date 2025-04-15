from backend.simulation.rocket import Rocket
from backend.config import Config


class RocketControls:
    def __init__(self):
        try:
            self.config = Config()
            self.dt = self.config.get("env.time_step") or 0.2
            self.rocket = Rocket(self.config)
            self.touchdown = False
            self.steps = 0
            self.max_steps = self.config.get("env.max_steps") or 1000
        except Exception as err:
            print("Error initializing RocketControls:", err)
            raise

    def step(self, action):
        """
        action: Dictionary or tuple containing:
          - throttle (number [0.0, 1.0])
          - cold_gas_thrust (-1.0 to 1.0)
        """
        try:
            if self.touchdown:
                raise Exception("Simulation is over. Reset to start again.")

            self.steps += 1

            if self.steps >= self.max_steps:
                self.touchdown = True
                return self.rocket.get_state(), -100.0, True

            if isinstance(action, dict):
                throttle = action.get("throttle", 0.0)
                cold_gas_control = action.get("coldGas", 0.0)
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
                perfect_landing = (
                    abs(vx) < 0.5 and abs(vy) < 1.0 and abs(angle_deg) < 2.0
                )
                good_landing = abs(vx) < 1.0 and abs(vy) < 2.0 and abs(angle_deg) < 5.0
                ok_landing = abs(vx) < 2.0 and abs(vy) < 3.0 and abs(angle_deg) < 10.0

                if perfect_landing:
                    reward = 200.0
                elif good_landing:
                    reward = 100.0
                elif ok_landing:
                    reward = 50.0
                else:
                    impact_penalty = -(abs(vx) + abs(vy) * 2 + abs(angle_deg) / 2)
                    reward = max(-200.0, impact_penalty)

                return reward, True

            altitude_factor = 1.0 / (1.0 + abs(y) / 100.0)
            velocity_penalty = -0.1 * (abs(vx) + abs(vy))
            angle_penalty = -0.05 * abs(angle_deg)

            reward = altitude_factor + velocity_penalty + angle_penalty

            return reward, False
        except Exception as err:
            print("Error in compute_reward:", err)
            raise

    def reset(self):
        try:
            self.rocket.reset()
            self.touchdown = False
            self.steps = 0
            return self.rocket.get_state()
        except Exception as err:
            print("Error resetting RocketControls:", err)
            raise
