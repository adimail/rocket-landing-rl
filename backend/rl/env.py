from backend.physics.engine import RocketSimulator


class RocketEnv:
    def __init__(self):
        self.sim = RocketSimulator()

    def reset(self):
        return self.sim.reset()

    def step(self, action):
        return self.sim.step(action)

    def render(self):
        return self.sim.rocket.get_state()
