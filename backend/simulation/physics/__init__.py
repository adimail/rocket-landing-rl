import numpy as np
from backend.config import Config


class PhysicsEngine:
    def __init__(self, config: Config):
        self.gravity = config.get("env.gravity") or -9.81
        self.thrust_power = config.get("env.thrust_power") or 20.0
        self.cold_gas_thrust_power = config.get("env.cold_gas_thrust_power") or 0.5
        self.fuel_consumption_rate = config.get("env.fuel_consumption_rate") or 0.1
        self.dt = config.get("env.time_step") or 0.05

    def calculate_gravity_force(self, mass: float) -> np.ndarray:
        """Calculates the gravitational force vector."""
        return np.array([0.0, mass * self.gravity])

    def calculate_thrust_force_vector(
        self, throttle: float, angle_degrees: float
    ) -> np.ndarray:
        """Calculates the thrust force vector. Accepts angles in degrees, uses radians internally."""
        if throttle > 0:
            angle_radians = np.deg2rad(angle_degrees)
            thrust_direction_radians = angle_radians
            fx = throttle * self.thrust_power * np.sin(thrust_direction_radians)
            fy = throttle * self.thrust_power * np.cos(thrust_direction_radians)
            return np.array([fx, fy])
        else:
            return np.array([0.0, 0.0])

    def calculate_drag_force(
        self, state: dict, air_density=1.225, drag_coefficient=0.8, reference_area=10.0
    ) -> np.ndarray:
        """Calculates aerodynamic drag force vector."""
        velocity_vector = np.array([state["vx"], state["vy"]])
        speed_squared = np.dot(velocity_vector, velocity_vector)  # v^2
        if speed_squared > 0:
            velocity_magnitude = np.sqrt(speed_squared)
            drag_magnitude = (
                0.5 * air_density * drag_coefficient * reference_area * speed_squared
            )
            drag_direction = -velocity_vector / velocity_magnitude
            return drag_magnitude * drag_direction
        else:
            return np.array([0.0, 0.0])

    def calculate_net_force(
        self,
        mass: float,
        throttle: float,
        angle: float,
        state: dict,
    ) -> np.ndarray:
        """Calculates the net force vector acting on the rocket, including drag."""
        gravity = self.calculate_gravity_force(mass)
        thrust = self.calculate_thrust_force_vector(throttle, angle)
        drag = self.calculate_drag_force(state)
        return gravity + thrust + drag

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

    def calculate_angular_acceleration(self, cold_gas: float, throttle: float) -> float:
        return throttle * 2.0 + cold_gas * self.cold_gas_thrust_power

    def update_angular_motion(self, state: dict, dt: float) -> None:
        """Updates angle and angular velocity using Euler method."""
        state["angularVelocity"] += state["angularAcceleration"] * dt
        state["angle"] += state["angularVelocity"] * dt
        state["angle"] = self.normalize_angle(state["angle"])

    def normalize_angle(self, angle):
        """Normalize angle to be within -360 to 360 degrees."""
        while angle > 360:
            angle -= 360
        while angle < -360:
            angle += 360
        return angle

    def calculate_fuel_consumption(self, throttle: float, dt: float) -> float:
        """Calculates the amount of fuel consumed over a time step."""
        return throttle * self.fuel_consumption_rate * dt
