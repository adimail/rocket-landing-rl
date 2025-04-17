import numpy as np
from backend.simulation.rocket import Rocket
from backend.config import Config


class RocketControls:
    def __init__(self):
        try:
            self.config = Config()
            self.dt = self.config.get("env.time_step")
            if not isinstance(self.dt, (int, float)) or self.dt <= 0:
                print(f"Warning: Invalid env.time_step '{self.dt}', using default 0.1")
                self.dt = 0.1

            self.rocket = Rocket(self.config)
            self.touchdown = False
            self.steps = 0

            self.max_steps = self.config.get("env.max_steps")
            if not isinstance(self.max_steps, int) or self.max_steps <= 0:
                print(
                    f"Warning: Invalid env.max_steps '{self.max_steps}', using default 1000"
                )
                self.max_steps = 1000

            self.coef_vx_penalty = 0.15  # Penalty for horizontal velocity
            self.coef_vy_penalty_base = 0.1  # Base penalty for vertical velocity
            self.coef_angle_penalty = 0.1  # Penalty for deviation from vertical
            self.vy_penalty_scale_factor = (
                10.0  # How much the vy penalty increases near ground
            )
            self.vy_penalty_characteristic_height = (
                300.0  # Altitude (m) at which scaling effect is significant
            )
            self.altitude_factor_scale = 100.0  # Denominator scale for altitude reward

        except Exception as err:
            print(f"FATAL Error initializing RocketControls: {err}")
            raise

    def step(self, action):
        """
        Advances the simulation by one time step.

        Args:
            action: Dictionary containing:
              - throttle (float [0.0, 1.0]): Main engine throttle.
              - coldGas (float [-1.0, 1.0]): Cold gas thruster control.
              Or a tuple (throttle, cold_gas_control).

        Returns:
            tuple: (state, reward, done)
              - state (dict): The current state of the rocket.
              - reward (float): The reward received for this step.
              - done (bool): True if the episode has ended (landed or max steps).

        Raises:
            Exception: If called after the simulation has ended or if an internal error occurs.
        """
        try:
            if self.touchdown:
                print("Warning: step() called after touchdown. Returning last state.")
                return (
                    self.rocket.get_state(),
                    0.0,
                    True,
                )

            self.steps += 1

            if self.steps >= self.max_steps:
                self.touchdown = True
                timeout_penalty = -100.0
                print(
                    f"Max steps ({self.max_steps}) reached. Applying timeout penalty."
                )
                return self.rocket.get_state(), timeout_penalty, True

            throttle = 0.0
            cold_gas_control = 0.0
            if isinstance(action, dict):
                throttle = float(action.get("throttle", 0.0))
                cold_gas_control = float(action.get("coldGas", 0.0))
            elif isinstance(action, (list, tuple)) and len(action) == 2:
                throttle = float(action[0])
                cold_gas_control = float(action[1])
            else:
                print(
                    f"Warning: Invalid action format received: {action}. Using zero action."
                )

            throttle = max(0.0, min(1.0, throttle))
            cold_gas_control = max(-1.0, min(1.0, cold_gas_control))

            self.rocket.apply_action(throttle, cold_gas_control, self.dt)

            state = self.rocket.get_state()
            if "error" in state:
                print(f"Error retrieving state: {state['error']}")
                return state, -500.0, True

            reward, self.touchdown = self.compute_reward(state)
            reward = float(reward)

            return state, reward, self.touchdown

        except Exception as err:
            print(f"FATAL Error during simulation step {self.steps}: {err}")
            return (
                self.rocket.get_state(),
                -500.0,
                True,
            )

    def compute_reward(self, state):
        """
        Computes reward based on the rocket's state. Includes terminal rewards
        for landing/crashing and shaping rewards for in-flight guidance.

        Args:
            state (dict): The current state dictionary of the rocket.

        Returns:
            tuple: (reward, done)
              - reward (float): The computed reward.
              - done (bool): True if the state is terminal (landed/crashed).
        """
        try:
            y = state.get("y", 0.0)
            vx = state.get("vx", 0.0)
            vy = state.get("vy", 0.0)
            angle_deg = state.get("angle", 0.0)

            if y <= 0.0:
                safe_vx = self.config.get("env.safeSpeedThresholdVx") or 20.0
                safe_vy = self.config.get("env.safeSpeedThresholdVy") or 20.0
                safe_angle = self.config.get("env.safeAngleThresholdDeg") or 5.0

                good_vx = self.config.get("env.goodSpeedThresholdVx") or 30.0
                good_vy = self.config.get("env.goodSpeedThresholdVy") or 30.0
                good_angle = self.config.get("env.goodAngleThresholdDeg") or 5.0

                ok_vx = self.config.get("env.okSpeedThresholdVx") or 40.0
                ok_vy = self.config.get("env.okSpeedThresholdVy") or 40.0
                ok_angle = self.config.get("env.okAngleThresholdDeg") or 80.0

                is_perfect = (
                    abs(vx) < safe_vx
                    and abs(vy) < safe_vy
                    and abs(angle_deg) < safe_angle
                )
                is_good = (
                    abs(vx) < good_vx
                    and abs(vy) < good_vy
                    and abs(angle_deg) < good_angle
                )
                is_ok = (
                    abs(vx) < ok_vx and abs(vy) < ok_vy and abs(angle_deg) < ok_angle
                )

                if is_perfect:
                    reward = 200.0
                    print(
                        f"Perfect! vx:{vx:.2f}, vy:{vy:.2f}, angle:{angle_deg:.2f}. Penalty: {reward:.2f}"
                    )
                elif is_good:
                    reward = 100.0
                    print(
                        f"Good! vx:{vx:.2f}, vy:{vy:.2f}, angle:{angle_deg:.2f}. Penalty: {reward:.2f}"
                    )
                elif is_ok:
                    reward = 50.0
                    print(
                        f"Ok! vx:{vx:.2f}, vy:{vy:.2f}, angle:{angle_deg:.2f}. Penalty: {reward:.2f}"
                    )
                else:
                    impact_penalty = -(
                        abs(vx) * 1.5 + abs(vy) * 3.0 + abs(angle_deg) * 0.5
                    )
                    reward = max(-200.0, impact_penalty)
                    print(
                        f"Crash! vx:{vx:.2f}, vy:{vy:.2f}, angle:{angle_deg:.2f}. Penalty: {reward:.2f}"
                    )

                return reward, True

            # --- Shaping Rewards (In-Flight) ---

            # 1. Altitude Reward: Encourages getting closer to the ground (y=0)
            # Value approaches 1 as y -> 0. Diminishes at higher altitudes.
            # Added small epsilon to prevent division by zero if y is exactly 0 (though terminal condition handles y<=0)
            altitude_factor = 1.0 / (1.0 + abs(y) / self.altitude_factor_scale + 1e-6)

            # 2. Velocity Penalty: Penalizes undesirable velocities.
            #    - Horizontal velocity (vx) is penalized consistently.
            #    - Vertical velocity (vy) penalty scales up significantly near the ground,
            #      especially for downward velocity (vy < 0).
            vx_penalty = -self.coef_vx_penalty * abs(vx)

            # Calculate altitude-dependent scaling for vy penalty
            # Scale increases exponentially as y approaches 0. Capped by vy_penalty_scale_factor.
            # Use max(0, y) to prevent issues if y is slightly negative before terminal check catches it.
            altitude_weight = 1.0 + (self.vy_penalty_scale_factor - 1.0) * np.exp(
                -max(0, y) / self.vy_penalty_characteristic_height
            )

            # Penalize downward velocity more heavily near the ground
            # Penalize upward velocity less, or even slightly reward it high up? (Keep simple for now)
            vy_penalty = -self.coef_vy_penalty_base * abs(vy) * altitude_weight

            velocity_penalty = vx_penalty + vy_penalty

            # 3. Angle Penalty: Penalizes deviation from a vertical orientation (0 degrees).
            angle_penalty = -self.coef_angle_penalty * abs(angle_deg)

            # 4. Fuel Efficiency Reward: Penalize high throttle usage
            # fuel_penalty = -coef_fuel * throttle # (Requires throttle value passed here or stored)

            # Total shaping reward
            reward = altitude_factor + velocity_penalty + angle_penalty

            # Ensure reward is not excessively large or small in shaping phase
            reward = np.clip(reward, -10.0, 10.0)

            return reward, False

        except KeyError as e:
            print(f"Error in compute_reward: Missing key in state: {e}")
            return -300.0, True
        except Exception as err:
            print(f"Error in compute_reward: {err}")
            return -300.0, True

    def reset(self):
        """
        Resets the rocket simulation to its initial state.

        Returns:
            dict: The initial state of the rocket after reset.

        Raises:
            Exception: If resetting the internal rocket state fails.
        """
        try:
            self.rocket.reset()
            self.touchdown = False
            self.steps = 0
            initial_state = self.rocket.get_state()
            if "error" in initial_state:
                print(f"Error retrieving state after reset: {initial_state['error']}")
                raise RuntimeError("Failed to get valid state after reset")
            return initial_state
        except Exception as err:
            print(f"Error resetting RocketControls: {err}")
            raise
