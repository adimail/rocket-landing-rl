from backend.rl.reward import calculate_reward
from backend.rocket import Rocket
from backend.config import Config
import numpy as np
from typing import Tuple, Dict, Any, Union, List


class RocketControls:
    def __init__(self):
        try:
            self.config = Config()
            self.dt = self.config.get("simulation.time_step")
            if not isinstance(self.dt, (int, float)) or self.dt <= 0:
                print(
                    f"Warning: Invalid simulation.time_step '{self.dt}', using default 0.1"
                )
                self.dt = 0.1

            self.rocket = Rocket()
            self.touchdown = False
            self.steps = 0

        except Exception as err:
            print(f"FATAL Error initializing RocketControls: {err}")
            raise

    def step(
        self,
        action: Union[Dict[str, float], List[float], Tuple[float, float], np.ndarray],
    ) -> Tuple[Dict[str, Any], float, bool]:
        """
        Advances the simulation by one time step.

        Args:
            action: The action taken by the agent. Expected formats:
              - Dictionary: {'throttle': float [0.0, 1.0], 'coldGas': float [-1.0, 1.0]}
              - List/Tuple/np.ndarray: [throttle, cold_gas_control]

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
                # print("Warning: step() called after touchdown. Returning last state.") # Avoid spamming logs
                return (
                    self.rocket.get_state(),
                    0.0,  # No reward after termination
                    True,
                )

            self.steps += 1

            # --- Action Parsing and Clipping ---
            throttle = 0.0
            cold_gas_control = 0.0

            if isinstance(action, dict):
                throttle = float(action.get("throttle", 0.0))
                cold_gas_control = float(action.get("coldGas", 0.0))
            elif isinstance(action, (list, tuple, np.ndarray)):
                if len(action) >= 2:
                    throttle = float(action[0])
                    cold_gas_control = float(action[1])
                else:
                    pass

            throttle = np.clip(throttle, 0.0, 1.0)
            cold_gas_control = np.clip(cold_gas_control, -1.0, 1.0)

            action_np = np.array([throttle, cold_gas_control], dtype=np.float32)

            # --- Simulation Step ---
            state_before = self.rocket.get_state()
            self.rocket.apply_action(throttle, cold_gas_control)
            state_after = self.rocket.get_state()

            if "error" in state_after:
                print(f"Error retrieving state_after: {state_after['error']}")
                return state_after, -500.0, True  # Terminate on simulation error

            # --- Reward Calculation ---
            # Pass the correctly formatted numpy action array
            reward, self.touchdown = calculate_reward(
                state_before, action_np, state_after
            )
            reward = float(reward)

            # --- Check for Truncation (handled by environment, but RocketControls can signal done) ---
            # The environment's step method will ultimately decide termination/truncation
            # based on state_after and max_steps. RocketControls just needs to signal
            # if it thinks it's done (landed/crashed).
            # The `self.touchdown` flag from calculate_reward is sufficient for this.

            return (
                state_after,
                reward,
                self.touchdown,
            )  # Return self.touchdown as the 'done' flag

        except Exception as err:
            print(f"FATAL Error during simulation step {self.steps}: {err}")
            # Return a terminal state and penalty on fatal error
            return (
                self.rocket.get_state(),
                -500.0,  # Severe penalty for crashing due to error
                True,  # Indicate episode is done
            )

    def reset(self) -> Dict[str, Any]:
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
