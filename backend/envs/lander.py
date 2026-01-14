import gymnasium as gym
from gymnasium import spaces
import numpy as np
import logging
from typing import Tuple, Dict, Any, Optional, TypeVar, cast

from backend.rl.reward import calculate_reward
from backend.rocket import Rocket
from backend.simulation.config import get_rl_config
from backend.config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SpaceT = TypeVar("SpaceT", bound=spaces.Space)


class RocketLandingEnv(gym.Env):
    """
    Custom Gymnasium Environment for Rocket Landing Simulation.

    Simulates a rocket booster attempting a vertical landing.

    **Action Space:** Continuous Box(2)
        - action[0]: Main Engine Throttle (0.0 to 1.0) - Normalized
        - action[1]: Cold Gas Thruster Control (-1.0 to 1.0) - Normalized torque request

    **Observation Space:** Continuous Box(8)
        - obs[0]: x position (m) - Horizontal distance from landing pad center.
        - obs[1]: y position (altitude) (m) - Height above the landing pad.
        - obs[2]: vx velocity (m/s) - Horizontal velocity.
        - obs[3]: vy velocity (m/s) - Vertical velocity (negative is downward).
        - obs[4]: ax acceleration (m/s^2) - Horizontal acceleration.
        - obs[5]: ay acceleration (m/s^2) - Vertical acceleration (negative is downward).
        - obs[6]: angle (degrees) - Angle from vertical (0 = upright, positive = tilted right). Normalized to [-180, 180].
        - obs[7]: angular velocity (deg/s) - Rate of change of the angle.

    **Termination:**
        - Rocket crashes (lands too hard, too fast horizontally, or at too large an angle).
        - Rocket lands successfully within tolerances.

    **Truncation:**
        - Rocket goes significantly out of predefined spatial bounds.
        - Rocket tips over beyond a critical angle (e.g., > 90 degrees).
        - Maximum number of steps per episode is reached.
    """

    def __init__(self):
        super().__init__()

        logger.info("Initializing RocketLandingEnv...")

        try:
            self.config = Config()
            self.rl_config = get_rl_config()

            self.max_episode_steps = self.rl_config["max_episode_steps"]

            self.rocket = Rocket()  # Rocket now loads its own config internally
            self.current_step = 0

            # --- Action Space ---
            # action[0]: Throttle (0.0 to 1.0)
            # action[1]: Cold Gas Control (-1.0 to 1.0)
            self.action_space = spaces.Box(
                low=np.array([0.0, -1.0], dtype=np.float32),
                high=np.array([1.0, 1.0], dtype=np.float32),
                dtype=np.float32,
            )

            # --- Observation Space ---
            # [x, y, vx, vy, ax, ay, angle, angular_velocity]
            self.observation_low = np.array(
                [
                    self.config.get("rocket.position_limits.x")[0],  # x min
                    0.0,  # y min (ground level)
                    self.config.get("rocket.velocity_limits.vx")[0],  # vx min
                    self.config.get("rocket.velocity_limits.vy")[0],  # vy min
                    self.config.get("rocket.acceleration_limits.ax")[0],  # ax min
                    self.config.get("rocket.acceleration_limits.ay")[0],  # ay min
                    self.config.get("rocket.attitude_limits.angle")[0],  # angle min
                    self.config.get("rocket.attitude_limits.angular_velocity")[0],
                ],
                dtype=np.float32,
            )

            self.observation_high = np.array(
                [
                    self.config.get("rocket.position_limits.x")[1],  # x max
                    self.config.get("rocket.position_limits.y")[
                        1
                    ],  # y max (fixed from x to y)
                    self.config.get("rocket.velocity_limits.vx")[1],  # vx max
                    self.config.get("rocket.velocity_limits.vy")[1],  # vy max
                    self.config.get("rocket.acceleration_limits.ax")[1],  # ax max
                    self.config.get("rocket.acceleration_limits.ay")[1],  # ay max
                    self.config.get("rocket.attitude_limits.angle")[1],  # angle max
                    self.config.get("rocket.attitude_limits.angular_velocity")[1],
                ],
                dtype=np.float32,
            )

            self.observation_space = spaces.Box(
                low=self.observation_low,
                high=self.observation_high,
                dtype=np.float32,
            )

            logger.info("RocketLandingEnv Initialized Successfully.")
            logger.info(f"  Action Space: {self.action_space}")
            logger.info(f"  Observation Space: {self.observation_space}")
            logger.info(f"  Max Steps: {self.max_episode_steps}")

        except KeyError as ke:
            logger.error(f"Initialization failed: Missing key in configuration - {ke}")
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error during RocketLandingEnv initialization: {e}",
                exc_info=True,
            )
            raise

    def _get_obs(self) -> np.ndarray:
        """Extracts the 8-element observation vector from the rocket's state."""
        try:
            state = self.rocket.get_state()
            # Ensure the order matches the observation space definition
            obs = np.array(
                [
                    state.get("x", 0.0),
                    state.get("y", 0.0),
                    state.get("vx", 0.0),
                    state.get("vy", 0.0),
                    state.get("ax", 0.0),
                    state.get("ay", 0.0),
                    state.get("angle", 0.0),
                    state.get(
                        "angularVelocity", 0.0
                    ),  # Note: matches the key from get_state()
                ],
                dtype=np.float32,
            )

            # Get the actual observation space bounds for clipping
            low = cast(spaces.Box, self.observation_space).low
            high = cast(spaces.Box, self.observation_space).high

            obs = np.clip(obs, low, high)
            return obs
        except Exception as e:
            logger.error(f"Error getting observation: {e}", exc_info=True)
            # Return zeros in case of error to avoid crashing the training
            # but log the error for debugging
            return np.zeros(8, dtype=np.float32)  # Fixed to return 8 elements

    def _get_info(self) -> Dict[str, Any]:
        """Returns auxiliary information about the state (not used for RL training)."""
        state = self.rocket.get_state()
        info = {
            "raw_state": state,
            "speed": state.get("speed", 0.0),
            "altitude": state.get("y", 0.0),
            "steps": self.current_step,
        }
        return info

    def reset(self, *, seed: Optional[int] = None) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Resets the environment to a randomized initial state."""
        super().reset(seed=seed)

        logger.debug(f"Resetting environment with seed {seed}")

        try:
            self.rocket.reset()
        except Exception as e:
            logger.error(f"CRITICAL: Error during rocket reset: {e}", exc_info=True)
            raise

        self.current_step = 0

        observation = self._get_obs()
        info = self._get_info()

        logger.debug(f"Reset complete. Initial Obs: {observation}")
        return observation, info

    def step(
        self, action: np.ndarray
    ) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """
        Applies an action, steps the simulation, calculates reward, and checks for termination/truncation.

        Args:
            action (np.ndarray): Action from the agent [throttle, cold_gas_control].

        Returns:
            Tuple containing:
                - observation (np.ndarray): The next observation.
                - reward (float): The reward received for the step.
                - terminated (bool): True if the episode ended due to goal achievement or failure (landed/crashed).
                - truncated (bool): True if the episode ended due to external limits (time, bounds, tipping over).
                - info (dict): Auxiliary information.
        """
        terminated = False
        truncated = False
        reward = 0.0

        throttle = float(action[0])
        cold_gas_control = float(action[1])

        # --- Store state before action ---
        state_before = self.rocket.get_state()

        # --- Step the Physics Simulation ---
        try:
            self.rocket.apply_action(throttle, cold_gas_control)
            state_after = self.rocket.get_state()
        except Exception as e:
            logger.error(f"Error during rocket physics step: {e}", exc_info=True)
            observation = self._get_obs()
            reward = -100
            terminated = True
            truncated = False
            info = self._get_info()
            info["error"] = f"Simulation error: {e}"
            return observation, reward, terminated, truncated, info

        self.current_step += 1

        reward, terminated, truncated = calculate_reward(
            state_before,
            action,
            state_after,
        )

        max_steps_reached = self.current_step >= self.max_episode_steps

        if max_steps_reached:
            truncated = True
            logger.debug(f"Episode Truncated: Max steps reached ({self.current_step}).")

        observation = self._get_obs()
        info = self._get_info()

        reward = float(reward)

        logger.debug(
            f"Step: {self.current_step}, Act: [{throttle:.2f},{cold_gas_control:.2f}], "
            f"Obs: [x:{observation[0]:.1f}, y:{observation[1]:.1f}, vx:{observation[2]:.1f}, vy:{observation[3]:.1f}, "
            f"ax:{observation[4]:.1f}, ay:{observation[5]:.1f}, ang:{observation[6]:.1f}, angV:{observation[7]:.1f}], "
            f"Rew: {reward:.3f}, Term: {terminated}, Trunc: {truncated}"
        )

        return observation, reward, terminated, truncated, info

    def render(self):
        """Renders the environment (placeholder)."""
        print("Rendering not implemented yet.")
        return None

    def close(self):
        """Cleans up resources."""
        logger.info("RocketLandingEnv Closed.")
