import numpy as np
from backend.simulation.config import get_initial_state
from backend.simulation.physics import PhysicsEngine


class Rocket:
    def __init__(self, config):
        try:
            self.config = config
            self.physics_engine = PhysicsEngine(self.config)
            self.dt = self.config.get("env.time_step") or 0.2

            self.state = get_initial_state()
            self.initial_state = self.state.copy()
            self.previous_state = self.calculate_consistent_previous_state(self.state)

            self.first_step = True
        except Exception as err:
            print("Error initializing Rocket:", err)
            raise

    def calculate_consistent_previous_state(self, current_state):
        """
        Calculate a previous state that will ensure smooth continuation of motion.
        This method creates a previous state that's consistent with the forces acting on
        the rocket at the start of the simulation.
        """
        dt = self.dt
        previous = current_state.copy()

        total_mass = current_state["mass"] + current_state["fuelMass"]
        net_force = self.physics_engine.calculate_net_force(
            total_mass,
            0.0,
            current_state["angle"],
            current_state,
        )

        ax, ay = self.physics_engine.calculate_acceleration(net_force, total_mass)
        current_state["ax"] = ax
        current_state["ay"] = ay
        current_state["angularAcceleration"] = 0.0

        # Calculate previous position such that current velocity and acceleration are maintained
        # x(t-dt) = x(t) - v(t)*dt + 0.5*a(t)*dt²
        previous["x"] = (
            current_state["x"] - (current_state["vx"] * dt) + (0.5 * ax * dt**2)
        )
        previous["y"] = (
            current_state["y"] - (current_state["vy"] * dt) + (0.5 * ay * dt**2)
        )

        # Calculate previous angle to maintain angular velocity
        previous["angle"] = current_state["angle"] - (
            current_state["angularVelocity"] * dt
        )

        # Set previous accelerations to match current for smooth start
        previous["ax"] = ax
        previous["ay"] = ay
        previous["angularAcceleration"] = 0.0

        return previous

    def apply_action(self, throttle: float, cold_gas_control: float, dt: float):
        try:
            # Clip control inputs to valid ranges
            throttle = np.clip(throttle, 0.0, 1.0)
            cold_gas_control = np.clip(cold_gas_control, -1.0, 1.0)

            # Check fuel status
            total_mass = self.state["mass"] + self.state["fuelMass"]
            if self.state["fuelMass"] <= 0:
                throttle = 0.0

            # Calculate forces and accelerations for current state
            net_force = self.physics_engine.calculate_net_force(
                total_mass,
                throttle,
                self.state["angle"],
                self.state,
            )

            # Save accelerations to current state
            acceleration = self.physics_engine.calculate_acceleration(
                net_force, total_mass
            )
            self.state["ax"] = round(acceleration[0], 2)
            self.state["ay"] = round(acceleration[1], 2)

            # Calculate angular acceleration - modified to ensure smooth changes
            angular_acceleration = self.physics_engine.calculate_angular_acceleration(
                throttle, cold_gas_control
            )
            self.state["angularAcceleration"] = round(angular_acceleration, 2)

            # Special case for the first step - use full Verlet from the start
            # This ensures smooth motion from the beginning
            new_state = self.physics_engine.update_state_verlet(
                self.state, self.previous_state, dt
            )

            # Update previous state before updating current state
            self.previous_state = self.state.copy()

            # Update current state with the new state values
            for key in new_state:
                self.state[key] = round(new_state[key], 2)

            # Update fuel mass
            fuel_used = self.physics_engine.calculate_fuel_consumption(throttle, dt)
            self.state["fuelMass"] = round(
                max(self.state["fuelMass"] - fuel_used, 0.0), 2
            )

            self.first_step = False

        except Exception as err:
            print("Error in apply_action:", err)
            raise

    def reset(self):
        try:
            self.state = get_initial_state()
            self.initial_state = self.state.copy()
            self.previous_state = self.calculate_consistent_previous_state(self.state)
            self.first_step = True
        except Exception as err:
            print("Error resetting Rocket:", err)
            raise

    def get_state(self):
        try:
            state = self.state.copy()

            # Calculate additional state information
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
