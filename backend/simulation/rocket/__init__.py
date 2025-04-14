import numpy as np
from backend.simulation.config import get_initial_state
from backend.simulation.physics import PhysicsEngine


class Rocket:
    def __init__(self, config):
        try:
            self.config = config
            self.physics_engine = PhysicsEngine(self.config)
            self.state = get_initial_state()
        except Exception as err:
            print("Error initializing Rocket:", err)
            raise

    def apply_action(self, throttle: float, cold_gas_control: float, dt: float):
        try:
            throttle = np.clip(throttle, 0.0, 1.0)

            total_mass = self.state["mass"] + self.state["fuelMass"]
            if self.state["fuelMass"] <= 0:
                throttle = 0.0

            net_force = self.physics_engine.calculate_net_force(
                total_mass,
                throttle,
                self.state["angle"],
                self.state,
            )
            acceleration = self.physics_engine.calculate_acceleration(
                net_force, total_mass
            )
            self.state["ax"], self.state["ay"] = acceleration

            self.physics_engine.update_linear_motion(self.state, dt)

            angular_acceleration = self.physics_engine.calculate_angular_acceleration(
                throttle, cold_gas_control
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
            state = self.state.copy()

            vx = state["vx"]
            vy = state["vy"]
            speed = np.sqrt(vx**2 + vy**2)
            state["speed"] = float(speed)

            relative_angle_deg = abs(state["angle"])
            state["relativeAngle"] = float(relative_angle_deg)

            return state
        except Exception as err:
            print("Error getting state:", err)
            raise
