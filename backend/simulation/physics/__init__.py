import numpy as np
from backend.config import Config


class PhysicsEngine:
    def __init__(self, config: Config):
        self.gravity = config.get("env.gravity") or -9.81
        self.thrust_power = config.get("env.thrust_power") or 1000000
        self.cold_gas_thrust_power = config.get("env.cold_gas_thrust_power") or 0.5
        self.fuel_consumption_rate = config.get("env.fuel_consumption_rate") or 0.1
        self.dt = config.get("env.time_step") or 0.2

        # Angular damping factor - prevents excessive rotation
        self.angular_damping = 0.05

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

    def update_state_verlet(
        self, current_state: dict, previous_state: dict, dt: float
    ) -> dict:
        """
        Updates state using Verlet integration. Returns new state.

        Verlet integration is a second-order method that uses positions and accelerations
        from the current and previous states to update the position and velocity.
        """
        new_state = current_state.copy()

        # Linear motion update using Verlet integration
        # Position update: x(t+dt) = 2*x(t) - x(t-dt) + a(t)*dt²
        new_state["x"] = (
            2 * current_state["x"] - previous_state["x"] + current_state["ax"] * dt**2
        )
        new_state["y"] = (
            2 * current_state["y"] - previous_state["y"] + current_state["ay"] * dt**2
        )

        # Velocity update: v(t+dt/2) = (x(t+dt) - x(t)) / dt
        new_state["vx"] = (new_state["x"] - current_state["x"]) / dt
        new_state["vy"] = (new_state["y"] - current_state["y"]) / dt

        # Angular motion update with damping
        # Apply small damping factor to prevent excessive rotation
        damping_factor = 1.0 - (self.angular_damping * dt)

        # Calculate new angle using modified Verlet for angular motion
        new_state["angle"] = (
            2 * current_state["angle"] * damping_factor
            - previous_state["angle"] * damping_factor**2
            + current_state["angularAcceleration"] * dt**2
        )

        # Calculate angular velocity with damping
        new_state["angularVelocity"] = (
            (new_state["angle"] - current_state["angle"]) / dt
        ) * damping_factor

        # Normalize angle
        new_state["angle"] = self.normalize_angle(new_state["angle"])

        return new_state

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

    def calculate_angular_acceleration(self, throttle: float, cold_gas: float) -> float:
        """Calculates angular acceleration based on cold gas control input."""
        # Scale the cold gas effect - throttle provides a modest boost to control authority
        # but cold gas works even without main engine thrust
        base_control = self.cold_gas_thrust_power * cold_gas
        throttle_boost = (
            0.3 * throttle * abs(cold_gas)
        )  # Throttle gives a small boost to control

        return base_control + throttle_boost
