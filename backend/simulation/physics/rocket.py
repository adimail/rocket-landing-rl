import numpy as np
from .config import get_initial_state
from backend.simulation.physics import PhysicsEngine


class Rocket:
    def __init__(self, config):
        try:
            self.config = config
            self.physics_engine = PhysicsEngine(self.config)
            self.gimbal_limit = self.config.get("env.gimbal_limit_deg") or 15
            self.state = get_initial_state()
        except Exception as err:
            print("Error initializing Rocket:", err)
            raise

    def apply_action(self, throttle: float, gimbal: float, dt: float):
        try:
            throttle = np.clip(throttle, 0.0, 1.0)

            total_mass = self.state["mass"] + self.state["fuelMass"]
            if self.state["fuelMass"] <= 0:
                throttle = 0.0

            net_force = self.physics_engine.calculate_net_force(
                total_mass, throttle, self.state["angle"], gimbal
            )
            acceleration = self.physics_engine.calculate_acceleration(
                net_force, total_mass
            )
            self.state["ax"], self.state["ay"] = acceleration

            self.physics_engine.update_linear_motion(self.state, dt)

            angular_acceleration = self.physics_engine.calculate_angular_acceleration(
                gimbal
            )
            self.state["angularAcceleration"] = angular_acceleration
            self.physics_engine.update_angular_motion(self.state, dt)

            fuel_used = self.physics_engine.calculate_fuel_consumption(throttle, dt)
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
