from backend.simulation.physics.rocket import Rocket


class RocketSimulator:
    def __init__(self, dt=0.05):
        try:
            self.rocket = Rocket()
            self.dt = dt
            self.time = 0.0
            self.done = False
        except Exception as err:
            print("Error initializing RocketSimulator:", err)
            raise

    def step(self, action):
        """
        action: Dictionary or tuple containing:
          - throttle (number [0.0, 1.0])
          - gimbalAngleX (radians)
          Optionally, gimbalAngleY can be included but is ignored for the 2D sim.
        """
        try:
            if self.done:
                raise Exception("Simulation is over. Reset to start again.")

            if isinstance(action, dict):
                throttle = action.get("throttle", 0.0)
                gimbal = action.get("gimbalAngleX", 0.0)
            else:
                throttle, gimbal = action

            self.rocket.apply_action(throttle, gimbal, self.dt)
            self.time += self.dt

            state = self.rocket.get_state()
            reward, self.done = self.compute_reward(state)

            return state, reward, self.done
        except Exception as err:
            print("Error during simulation step:", err)
            raise

    def compute_reward(self, state):
        """
        Computes reward based on the rocket's state.
        A soft landing is defined as having low horizontal (vx) and vertical (vy) velocities and a near-zero angle.
        """
        try:
            y = state["y"]
            vx, vy = state["vx"], state["vy"]
            angle = state["angle"]

            if y <= 0.0:
                soft_landing = abs(vx) < 1.0 and abs(vy) < 2.0 and abs(angle) < 0.1
                reward = 100.0 if soft_landing else -100.0
                return reward, True

            reward = -abs(vx) - abs(vy) - abs(angle)
            return reward, False
        except Exception as err:
            print("Error in compute_reward:", err)
            raise

    def reset(self):
        try:
            self.rocket.reset()
            self.time = 0.0
            self.done = False
            return self.rocket.get_state()
        except Exception as err:
            print("Error resetting RocketSimulator:", err)
            raise
