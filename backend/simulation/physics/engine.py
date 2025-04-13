from backend.simulation.physics.rocket import Rocket


class RocketSimulator:
    def __init__(self, dt=0.05):
        self.rocket = Rocket()
        self.dt = dt
        self.time = 0.0
        self.done = False

    def step(self, action):
        if self.done:
            raise Exception("Simulation is over. Reset to start again.")

        throttle, gimbal = action
        self.rocket.apply_action(throttle, gimbal, self.dt)
        self.time += self.dt

        state = self.rocket.get_state()
        reward, self.done = self.compute_reward(state)

        return state, reward, self.done

    def compute_reward(self, state):
        x, y = state["x"], state["y"]
        vx, vy = state["vx"], state["vy"]
        theta = state["theta"]

        if y <= 0.0:
            soft_landing = abs(vx) < 1.0 and abs(vy) < 2.0 and abs(theta) < 0.1
            reward = 100.0 if soft_landing else -100.0
            return reward, True

        reward = -abs(vx) - abs(vy) - abs(theta)
        return reward, False

    def reset(self):
        self.rocket.reset()
        self.time = 0.0
        self.done = False
        return self.rocket.get_state()
