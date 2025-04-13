import numpy as np


class Rocket:
    def __init__(self, initial_state=None):
        self.state = {
            "x": 0.0,
            "y": 100.0,
            "vx": 0.0,
            "vy": 0.0,
            "theta": 0.0,
            "omega": 0.0,
        }
        self.mass = 1.0
        self.gravity = -9.81
        self.thrust_power = 20.0
        self.gimbal_limit = np.radians(15)

        if initial_state:
            self.state.update(initial_state)

    def apply_action(self, throttle: float, gimbal: float, dt: float):
        gimbal = np.clip(gimbal, -self.gimbal_limit, self.gimbal_limit)
        throttle = np.clip(throttle, 0.0, 1.0)
        thrust = throttle * self.thrust_power

        # Decompose thrust into x and y components
        fx = thrust * np.sin(gimbal + self.state["theta"])
        fy = thrust * np.cos(gimbal + self.state["theta"]) + self.mass * self.gravity

        # Update velocities
        self.state["vx"] += fx / self.mass * dt
        self.state["vy"] += fy / self.mass * dt
        self.state["omega"] += gimbal * 2.0 * dt

        # Update positions
        self.state["x"] += self.state["vx"] * dt
        self.state["y"] += self.state["vy"] * dt
        self.state["theta"] += self.state["omega"] * dt

    def reset(self):
        # Reset to initial state
        self.state = {
            "x": 0.0,
            "y": 100.0,
            "vx": 0.0,
            "vy": 0.0,
            "theta": 0.0,
            "omega": 0.0,
        }
        self.mass = 1.0
        self.gravity = -9.81
        self.thrust_power = 20.0
        self.gimbal_limit = np.radians(15)

    def get_state(self):
        return self.state.copy()
