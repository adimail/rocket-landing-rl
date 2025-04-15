import numpy as np
from backend.simulation.config import get_physics_config, get_environment_config

env_config = get_environment_config()
physics_config = get_physics_config()


class PhysicsEngine:
    def __init__(self):
        self.gravity = env_config.get("gravity", -9.81)
        self.dt = env_config.get("time_step", 0.1)  # s

        # Rocket parameters
        self.thrust_power = env_config.get("thrust_power", 5000000.0)  # N
        self.cold_gas_thrust_power = env_config.get(
            "cold_gas_thrust_power", 5000.0
        )  # N
        self.fuel_consumption_rate = env_config.get(
            "fuel_consumption_rate", 1700.0
        )  # kg/(s * throttle)

        # Aerodynamics & physics
        self.air_density = physics_config.get("air_density", 1.225)  # kg/m³
        self.drag_coefficient = physics_config.get("drag_coefficient", 0.8)
        self.reference_area = physics_config.get("reference_area", 10.8)  # m²
        self.rocket_radius = physics_config.get("rocket_radius", 1.85)  # m
        self.cold_gas_moment_arm = physics_config.get(
            "cold_gas_moment_arm", self.rocket_radius
        )  # m

        # Stability
        self.angular_damping = physics_config.get("angular_damping", 0.05)

        # Safety checks
        if self.dt <= 0:
            raise ValueError("time_step (dt) must be positive.")
        if (
            self.thrust_power < 0
            or self.cold_gas_thrust_power < 0
            or self.fuel_consumption_rate < 0
        ):
            raise ValueError(
                "Thrust power and fuel consumption rate cannot be negative."
            )
        if self.rocket_radius <= 0 or self.cold_gas_moment_arm <= 0:
            raise ValueError("Rocket radius and moment arm must be positive.")

    def calculate_gravity_force(self, mass: float) -> np.ndarray:
        """Calculates the gravitational force vector."""
        if mass < 0:
            mass = 0.0
        return np.array([0.0, mass * self.gravity])

    def calculate_thrust_force_vector(
        self, throttle: float, angle_degrees: float
    ) -> np.ndarray:
        """
        Calculates the main engine thrust force vector.
        Assumes angle_degrees is the rocket's tilt from the vertical (0 = straight up).
        """
        # Clamp throttle to valid range
        throttle = np.clip(throttle, 0.0, 1.0)

        if throttle > 1e-6:  # Use a small threshold to avoid floating point issues
            # Convert angle to radians for trigonometric functions
            angle_radians = np.deg2rad(angle_degrees)

            # Thrust acts along the rocket's axis.
            # If angle is 0 (vertical), thrust is purely in +y.
            # If angle is positive (tilted right), thrust has +x and +y components.
            # fx = Thrust * sin(angle)
            # fy = Thrust * cos(angle)
            thrust_magnitude = throttle * self.thrust_power
            fx = thrust_magnitude * np.sin(angle_radians)
            fy = thrust_magnitude * np.cos(angle_radians)
            return np.array([fx, fy])
        else:
            return np.array([0.0, 0.0])

    def calculate_drag_force(self, state: dict) -> np.ndarray:
        """Calculates aerodynamic drag force vector based on current velocity."""
        vx = state.get("vx", 0.0)
        vy = state.get("vy", 0.0)
        velocity_vector = np.array([vx, vy])
        speed_squared = np.dot(velocity_vector, velocity_vector)  # v^2

        if speed_squared > 1e-9:
            speed = np.sqrt(speed_squared)
            drag_magnitude = (
                0.5
                * self.air_density
                * self.drag_coefficient
                * self.reference_area
                * speed_squared
            )
            # Drag force opposes the velocity vector
            drag_direction = -velocity_vector / speed
            return drag_magnitude * drag_direction
        else:
            return np.array([0.0, 0.0])

    def calculate_net_force(
        self,
        total_mass: float,
        throttle: float,
        angle_degrees: float,
        state: dict,
    ) -> np.ndarray:
        """Calculates the net linear force vector acting on the rocket."""
        if total_mass <= 0:
            # Handle invalid mass scenario
            return np.array([0.0, 0.0])

        gravity = self.calculate_gravity_force(total_mass)
        thrust = self.calculate_thrust_force_vector(throttle, angle_degrees)
        drag = self.calculate_drag_force(state)

        # Debugging output (optional, remove in production)
        # print(f"Forces: G={gravity}, T={thrust}, D={drag}, Net={gravity + thrust + drag}")

        return gravity + thrust + drag

    def calculate_acceleration(
        self, net_force: np.ndarray, total_mass: float
    ) -> np.ndarray:
        """Calculates the linear acceleration vector based on net force and mass."""
        if total_mass <= 1e-6:  # Avoid division by zero or very small mass
            # Return zero acceleration or handle error appropriately
            # print("Warning: Near-zero mass detected in acceleration calculation.")
            return np.array([0.0, 0.0])
        return net_force / total_mass

    # --- MODIFIED: Cold Gas Angular Acceleration ---
    def calculate_angular_acceleration(
        self, cold_gas_control: float, total_mass: float
    ) -> float:
        """
        Calculates angular acceleration based on cold gas control input,
        rocket mass, radius, and thruster moment arm.
        Returns angular acceleration in degrees/s^2.
        """
        # Clamp control input
        cold_gas_control = np.clip(cold_gas_control, -1.0, 1.0)

        # Calculate instantaneous Moment of Inertia (approximating as solid cylinder)
        # I = 0.5 * m * r^2
        # Ensure mass and radius are positive to avoid issues
        if total_mass <= 1e-6 or self.rocket_radius <= 1e-6:
            # print("Warning: Near-zero mass or radius in MoI calculation.")
            return 0.0  # Cannot calculate MoI, return zero acceleration

        moment_of_inertia = 0.5 * total_mass * (self.rocket_radius**2)

        if moment_of_inertia < 1e-6:  # Avoid division by zero
            return 0.0

        # Calculate torque produced by cold gas thrusters
        # Torque = Force * Moment Arm
        cold_gas_force = self.cold_gas_thrust_power * cold_gas_control
        torque = cold_gas_force * self.cold_gas_moment_arm

        # Calculate angular acceleration in radians/s^2
        # alpha = Torque / Moment of Inertia
        angular_acceleration_rad_s2 = torque / moment_of_inertia

        # Convert to degrees/s^2 for consistency with state variables
        angular_acceleration_deg_s2 = np.rad2deg(angular_acceleration_rad_s2)

        # Debugging output (optional)
        # print(f"Mass={total_mass:.1f}, MoI={moment_of_inertia:.1f}, Torque={torque:.1f}, AlphaRad={angular_acceleration_rad_s2:.4f}, AlphaDeg={angular_acceleration_deg_s2:.4f}")

        return angular_acceleration_deg_s2

    # --- END MODIFICATION ---

    def update_state_verlet(
        self, current_state: dict, previous_state: dict, dt: float
    ) -> dict:
        """
        Updates state using Verlet integration. Returns the new state dictionary.
        Requires current_state to have 'ax', 'ay', 'angularAcceleration' populated
        based on forces calculated *at* the current state time `t`.
        """
        new_state = current_state.copy()

        # --- Linear Motion Update (Position Verlet) ---
        # x(t+dt) = x(t) + [x(t) - x(t-dt)] + a(t)*dt^2
        # Simplified: x(t+dt) = 2*x(t) - x(t-dt) + a(t)*dt^2

        # Check for necessary keys in previous state for robustness
        if not all(k in previous_state for k in ["x", "y", "angle"]):
            raise KeyError(
                "Previous state dictionary is missing required keys (x, y, angle) for Verlet integration."
            )

        # Check for necessary acceleration keys in current state
        if not all(k in current_state for k in ["ax", "ay", "angularAcceleration"]):
            raise KeyError(
                "Current state dictionary is missing required acceleration keys (ax, ay, angularAcceleration) for Verlet integration."
            )

        new_state["x"] = (
            2.0 * current_state["x"] - previous_state["x"] + current_state["ax"] * dt**2
        )
        new_state["y"] = (
            2.0 * current_state["y"] - previous_state["y"] + current_state["ay"] * dt**2
        )

        # --- Velocity Update (Central Difference Approximation) ---
        # v(t) ≈ [x(t+dt) - x(t-dt)] / (2*dt)  <- More accurate Verlet velocity
        # A simpler estimation often used: v(t+dt) ≈ [x(t+dt) - x(t)] / dt
        # Let's use the simpler one for consistency with the original code's apparent approach
        new_state["vx"] = (new_state["x"] - current_state["x"]) / dt
        new_state["vy"] = (new_state["y"] - current_state["y"]) / dt

        # --- Angular Motion Update (Position Verlet with Damping) ---
        # angle(t+dt) = angle(t) + [angle(t) - angle(t-dt)]*damp + angularAcc(t)*dt^2*damp (?)
        # Let's re-derive the damped Verlet for angle:
        # Standard Verlet: angle(t+dt) = 2*angle(t) - angle(t-dt) + alpha(t)*dt^2
        # Introduce velocity damping v(t+dt) = v_undamped(t+dt) * damping_factor
        # Velocity from Verlet: v(t+dt/2) = (angle(t+dt) - angle(t))/dt
        # Let's apply damping to the *change* in angle based on previous velocity:
        # angle(t+dt) = angle(t) + (angle(t) - angle(t-dt)) * damping_factor + alpha(t) * dt^2
        # Where damping_factor = (1.0 - self.angular_damping * dt) - this seems more standard

        damping_factor = max(
            0.0, 1.0 - (self.angular_damping * dt)
        )  # Ensure factor is not negative

        # Apply damping to the velocity component of the Verlet update
        # This formulation damps the velocity implicitly carried over from the previous step
        angle_change_damped = (
            current_state["angle"] - previous_state["angle"]
        ) * damping_factor
        new_state["angle"] = (
            current_state["angle"]
            + angle_change_damped
            + current_state["angularAcceleration"] * dt**2
        )

        # --- Angular Velocity Update (Central Difference Approximation) ---
        # Similar to linear velocity, estimate using the change in angle
        new_state["angularVelocity"] = (
            new_state["angle"] - current_state["angle"]
        ) / dt

        # --- Normalize Angle ---
        # Normalize angle to be within -180 to +180 degrees
        new_state["angle"] = self.normalize_angle_180(new_state["angle"])

        # We don't update accelerations here; they are calculated based on the new state
        # in the *next* simulation step before calling update_state_verlet again.

        return new_state

    # --- MODIFIED: Normalize Angle ---
    def normalize_angle_180(self, angle_degrees: float) -> float:
        """Normalize angle to the range [-180, 180) degrees."""
        angle_degrees = angle_degrees % 360.0
        if angle_degrees >= 180.0:
            angle_degrees -= 360.0
        elif angle_degrees < -180.0:
            angle_degrees += 360.0
        return angle_degrees

    # --- END MODIFICATION ---

    def calculate_fuel_consumption(self, throttle: float, dt: float) -> float:
        """Calculates the amount of fuel consumed over a time step."""
        throttle = np.clip(throttle, 0.0, 1.0)
        consumption = throttle * self.fuel_consumption_rate * dt
        # Ensure consumption is not negative
        return max(0.0, consumption)
