import numpy as np
from .config import get_initial_state, get_environment_config


class Rocket:
    def __init__(self):
        try:
            self.state = get_initial_state()

            env_config = get_environment_config()
            self.gravity = env_config["gravity"]
            self.thrust_power = env_config["thrust_power"]
            self.gimbal_limit = env_config["gimbal_limit"]
            self.fuel_consumption_rate = env_config["fuel_consumption_rate"]
        except Exception as err:
            print("Error initializing Rocket:", err)
            raise

    def apply_action(self, throttle: float, gimbal: float, dt: float):
        try:
            gimbal = np.clip(gimbal, -self.gimbal_limit, self.gimbal_limit)
            throttle = np.clip(throttle, 0.0, 1.0)

            total_mass = self.state["mass"] + self.state["fuelMass"]
            if self.state["fuelMass"] <= 0:
                throttle = 0.0

            thrust = throttle * self.thrust_power
            thrust_direction = self.state["angle"] + gimbal
            fx = thrust * np.sin(thrust_direction)
            fy = thrust * np.cos(thrust_direction) + total_mass * self.gravity

            ax = fx / total_mass
            ay = fy / total_mass
            self.state["ax"] = ax
            self.state["ay"] = ay

            self.state["vx"] += ax * dt
            self.state["vy"] += ay * dt
            self.state["x"] += self.state["vx"] * dt
            self.state["y"] += self.state["vy"] * dt

            angular_acceleration = gimbal * 2.0
            self.state["angularVelocity"] += angular_acceleration * dt
            self.state["angle"] += self.state["angularVelocity"] * dt

            fuel_used = throttle * self.fuel_consumption_rate * dt
            self.state["fuelMass"] = max(self.state["fuelMass"] - fuel_used, 0.0)
        except Exception as err:
            print("Error in apply_action:", err)
            raise

    def reset(self):
        try:
            self.state = get_initial_state()
        except Exception as err:
            print("Error resetting Rocket:", err)
            raise

    def get_state(self):
        try:
            return self.state.copy()
        except Exception as err:
            print("Error getting state:", err)
            raise
