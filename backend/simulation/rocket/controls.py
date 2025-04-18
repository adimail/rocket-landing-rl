from backend.utils import compute_reward
from backend.rocket import Rocket
from backend.config import Config


class RocketControls:
    def __init__(self):
        try:
            self.config = Config()
            self.dt = self.config.get("env.time_step")
            if not isinstance(self.dt, (int, float)) or self.dt <= 0:
                print(f"Warning: Invalid env.time_step '{self.dt}', using default 0.1")
                self.dt = 0.1

            self.rocket = Rocket()
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

            state_before = self.rocket.get_state()
            self.rocket.apply_action(throttle, cold_gas_control)
            state_after = self.rocket.get_state()

            if "error" in state_after:
                print(f"Error retrieving state_after: {state_after['error']}")
                return state_after, -500.0, True

            reward, self.touchdown = compute_reward(state_before, action, state_after)
            reward = float(reward)

            return state_after, reward, self.touchdown

        except Exception as err:
            print(f"FATAL Error during simulation step {self.steps}: {err}")
            return (
                self.rocket.get_state(),
                -500.0,
                True,
            )

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
