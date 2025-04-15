import numpy as np
from backend.simulation.physics import PhysicsEngine
from backend.config import Config

from backend.simulation.config import (
    get_initial_state,
    get_physics_config,
    get_environment_config,
)

env_config = get_environment_config()
physics_config = get_physics_config()


class Rocket:
    def __init__(self, config: Config):
        try:
            self.config = config
            self.physics_engine = PhysicsEngine()
            self.dt = env_config.get("time_step", 0.1)  # s

            if self.dt <= 0:
                raise ValueError("Invalid time_step configured.")

            # Initialize state
            self.state = get_initial_state()
            required_keys = [
                "x",
                "y",
                "vx",
                "vy",
                "ax",
                "ay",
                "angle",
                "angularVelocity",
                "mass",
                "fuelMass",
            ]
            for key in required_keys:
                if key not in self.state:
                    if key in ["x", "y", "mass", "fuelMass"]:
                        raise KeyError(
                            f"Initial state from get_initial_state() is missing required key: {key}"
                        )
                    self.state[key] = 0.0

            self.initial_state = self.state.copy()

            self.previous_state = self.calculate_consistent_previous_state(
                self.state, self.dt
            )

            self.first_step = True

        except KeyError as ke:
            print(f"Error initializing Rocket: Missing key in state - {ke}")
            raise
        except ValueError as ve:
            print(f"Error initializing Rocket: Invalid value - {ve}")
            raise
        except Exception as err:
            print(f"Unexpected error initializing Rocket: {err}")
            raise

    def calculate_consistent_previous_state(
        self, current_state: dict, dt: float
    ) -> dict:
        """
        Calculates a previous state based on the current state and assumed dynamics
        at t=0 to properly initialize Verlet integration.
        x_prev = x_curr - v_curr*dt + 0.5*a_curr*dt^2
        angle_prev = angle_curr - omega_curr*dt + 0.5*alpha_curr*dt^2
        """
        # Deep copy to avoid modifying the original current_state unintentionally
        previous = {k: v for k, v in current_state.items()}

        # Estimate accelerations at the current (initial) state *assuming zero controls*
        # This provides a baseline for the dynamics before the first control input.
        initial_total_mass = current_state.get("mass", 0.0) + current_state.get(
            "fuelMass", 0.0
        )
        if initial_total_mass <= 1e-6:
            print("Warning: Initial total mass is near zero.")
            ax, ay = 0.0, 0.0
            angular_acceleration = 0.0
        else:
            net_force_initial = self.physics_engine.calculate_net_force(
                total_mass=initial_total_mass,
                throttle=0.0,
                angle_degrees=current_state.get("angle", 0.0),
                state=current_state,
            )
            initial_acceleration = self.physics_engine.calculate_acceleration(
                net_force_initial, initial_total_mass
            )
            ax = initial_acceleration[0]
            ay = initial_acceleration[1]

            angular_acceleration = self.physics_engine.calculate_angular_acceleration(
                cold_gas_control=0.0,
                total_mass=initial_total_mass,
            )

        vx = current_state.get("vx", 0.0)
        vy = current_state.get("vy", 0.0)
        previous["x"] = current_state.get("x", 0.0) - (vx * dt) + (0.5 * ax * dt**2)
        previous["y"] = current_state.get("y", 0.0) - (vy * dt) + (0.5 * ay * dt**2)

        angle = current_state.get("angle", 0.0)
        angular_velocity = current_state.get(
            "angularVelocity", 0.0
        )  # Should be in deg/s
        previous["angle"] = (
            angle - (angular_velocity * dt) + (0.5 * angular_acceleration * dt**2)
        )

        previous["angle"] = self.physics_engine.normalize_angle_180(previous["angle"])

        previous["ax"] = ax
        previous["ay"] = ay
        previous["angularAcceleration"] = angular_acceleration

        previous["vx"] = vx - ax * dt
        previous["vy"] = vy - ay * dt
        previous["angularVelocity"] = angular_velocity - angular_acceleration * dt

        previous["mass"] = current_state.get("mass", 0.0)
        previous["fuelMass"] = current_state.get("fuelMass", 0.0)

        return previous

    def apply_action(self, throttle: float, cold_gas_control: float, dt: float):
        try:
            throttle = np.clip(float(throttle), 0.0, 1.0)
            cold_gas_control = np.clip(float(cold_gas_control), -1.0, 1.0)

            current_fuel = self.state.get("fuelMass", 0.0)
            if current_fuel <= 0:
                throttle = 0.0  # No fuel, no main thrust
                self.state["fuelMass"] = 0.0

            current_mass = self.state.get("mass", 0.0)
            total_mass = current_mass + current_fuel
            if total_mass <= 1e-6:
                print("Warning: Total mass is near zero during apply_action.")
                return

            net_force = self.physics_engine.calculate_net_force(
                total_mass=total_mass,
                throttle=throttle,
                angle_degrees=self.state.get("angle", 0.0),
                state=self.state,
            )

            linear_acceleration = self.physics_engine.calculate_acceleration(
                net_force, total_mass
            )
            self.state["ax"] = round(linear_acceleration[0], 4)
            self.state["ay"] = round(linear_acceleration[1], 4)

            angular_acceleration = self.physics_engine.calculate_angular_acceleration(
                cold_gas_control=cold_gas_control, total_mass=total_mass
            )
            self.state["angularAcceleration"] = round(
                angular_acceleration, 4
            )  # deg/s^2

            new_state = self.physics_engine.update_state_verlet(
                self.state, self.previous_state, dt
            )

            self.previous_state = self.state.copy()
            self.state.update(new_state)

            fuel_used = self.physics_engine.calculate_fuel_consumption(throttle, dt)
            self.state["fuelMass"] = max(0.0, current_fuel - fuel_used)

            self.first_step = False

        except (KeyError, ValueError, TypeError) as err:
            print(f"Error during apply_action calculation: {err}")
            raise
        except Exception as err:
            print(f"Unexpected error in apply_action: {err}")
            raise

    def reset(self):
        try:
            self.state = get_initial_state()
            required_keys = [
                "x",
                "y",
                "vx",
                "vy",
                "mass",
                "fuelMass",
                "angle",
                "angularVelocity",
            ]
            for key in required_keys:
                if key not in self.state:
                    raise KeyError(
                        f"Initial state from get_initial_state() after reset is missing required key: {key}"
                    )
                if key not in ["ax", "ay", "angularAcceleration"]:
                    self.state.setdefault(key, 0.0)

            self.initial_state = self.state.copy()
            self.previous_state = self.calculate_consistent_previous_state(
                self.state, self.dt
            )
            self.first_step = True

        except (KeyError, ValueError) as err:
            print(f"Error resetting Rocket state: {err}")
            raise
        except Exception as err:
            print(f"Unexpected error resetting Rocket: {err}")
            raise

    def get_state(self) -> dict:
        """Returns a copy of the current rocket state with derived values."""
        try:
            state_copy = self.state.copy()

            vx = state_copy.get("vx", 0.0)
            vy = state_copy.get("vy", 0.0)
            speed = np.sqrt(vx**2 + vy**2)
            state_copy["speed"] = float(speed)

            angle_deg = state_copy.get("angle", 0.0)
            state_copy["relativeAngle"] = float(abs(angle_deg))

            state_copy["totalMass"] = state_copy.get("mass", 0.0) + state_copy.get(
                "fuelMass", 0.0
            )

            for key in state_copy:
                if isinstance(state_copy[key], (float, np.floating)):
                    state_copy[key] = round(state_copy[key], 3)

            return state_copy
        except Exception as err:
            print(f"Error getting state: {err}")
            return {"error": str(err)}
