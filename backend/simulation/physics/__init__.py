import numpy as np
from backend.config import Config


class PhysicsEngine:
    def __init__(self, config: Config):
        self.gravity = config.get("env.gravity") or -9.81
        self.thrust_power = config.get("env.thrust_power") or 20.0
        self.fuel_consumption_rate = config.get("env.fuel_consumption_rate") or 0.1
        self.dt = config.get("env.time_step") or 0.05

    def calculate_gravity_force(self, mass: float) -> np.ndarray:
        """Calculates the gravitational force vector."""
        return np.array([0.0, mass * self.gravity])

    def calculate_thrust_force_vector(
        self, throttle: float, angle: float, gimbal: float
    ) -> np.ndarray:
        """Calculates the thrust force vector."""
        if throttle > 0:
            thrust_direction = angle + gimbal
            fx = throttle * self.thrust_power * np.sin(thrust_direction)
            fy = throttle * self.thrust_power * np.cos(thrust_direction)
            return np.array([fx, fy])
        else:
            return np.array([0.0, 0.0])

    def calculate_net_force(
        self, mass: float, throttle: float, angle: float, gimbal: float
    ) -> np.ndarray:
        """Calculates the net force vector acting on the rocket."""
        gravity = self.calculate_gravity_force(mass)
        thrust = self.calculate_thrust_force_vector(throttle, angle, gimbal)
        return gravity + thrust

    def calculate_acceleration(self, net_force: np.ndarray, mass: float) -> np.ndarray:
        """Calculates the acceleration vector based on net force and mass."""
        if mass > 0:
            return net_force / mass
        else:
            return np.array([0.0, 0.0])

    def update_linear_motion(self, state: dict, dt: float) -> None:
        """Updates linear position and velocity using Euler method."""
        state["vx"] += state["ax"] * dt
        state["vy"] += state["ay"] * dt
        state["x"] += state["vx"] * dt
        state["y"] += state["vy"] * dt

    def calculate_angular_acceleration(self, gimbal: float) -> float:
        """Calculates a simplified angular acceleration based on gimbal."""
        return gimbal * 2.0

    def update_angular_motion(self, state: dict, dt: float) -> None:
        """Updates angle and angular velocity using Euler method."""
        state["angularVelocity"] += state["angularAcceleration"] * dt
        state["angle"] += state["angularVelocity"] * dt

    def calculate_fuel_consumption(self, throttle: float, dt: float) -> float:
        """Calculates the amount of fuel consumed over a time step."""
        return throttle * self.fuel_consumption_rate * dt

    # TODO:
    # - Aerodynamic drag
    # - Rotational dynamics (torque, moment of inertia)
    # - Collision detection
    # - Ground interaction forces
