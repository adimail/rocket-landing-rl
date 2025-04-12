from backend.physics.rocket import Rocket


class RocketSimulator:
    def __init__(self, dt=0.05):
        self.rocket = Rocket()
        self.dt = dt
        self.time = 0.0
        self.done = False
        self.paused = False

    def step(self, action):
        if self.done:
            raise Exception("Simulation is over. Reset to start again.")
        if self.paused:
            return self.rocket.get_state(), 0.0, self.done

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

        # Terminal condition: hit the ground
        if y <= 0.0:
            soft_landing = abs(vx) < 1.0 and abs(vy) < 2.0 and abs(theta) < 0.1
            reward = 100.0 if soft_landing else -100.0
            return reward, True

        # Shaping reward to encourage upright + slow descent
        reward = -abs(vx) - abs(vy) - abs(theta)
        return reward, False

    def reset(self):
        self.rocket.reset()
        self.time = 0.0
        self.done = False
        self.paused = True
        return self.rocket.get_state()
