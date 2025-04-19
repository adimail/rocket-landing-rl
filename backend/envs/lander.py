import gymnasium as gym
from gymnasium import spaces
import numpy as np
import logging
from typing import Tuple, Dict, Any, Optional, TypeVar, cast

from backend.rl.reward import calculate_reward
from backend.rocket import Rocket
from backend.simulation.config import get_rl_config

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

    **Observation Space:** Continuous Box(6)
        - obs[0]: x position (m) - Horizontal distance from landing pad center.
        - obs[1]: y position (altitude) (m) - Height above the landing pad.
        - obs[2]: x velocity (m/s) - Horizontal velocity.
        - obs[3]: y velocity (m/s) - Vertical velocity (negative is downward).
        - obs[4]: angle (degrees) - Angle from vertical (0 = upright, positive = tilted right). Normalized to [-180, 180].
        - obs[5]: angular velocity (deg/s) - Rate of change of the angle.

    **Termination:**
        - Rocket crashes (lands too hard, too fast horizontally, or at too large an angle).
        - Rocket lands successfully within tolerances.

    **Truncation:**
        - Rocket goes significantly out of predefined spatial bounds.
        - Rocket tips over beyond a critical angle (e.g., > 90 degrees).
        - Maximum number of steps per episode is reached.
    """

    metadata = {"render_modes": ["human", "rgb_array"], "render_fps": 30}

    def __init__(self, render_mode: Optional[str] = None):
        super().__init__()

        logger.info("Initializing RocketLandingEnv...")

        try:
            self.rl_config = get_rl_config()

            # --- Parameters from Config (with defaults) ---
            self.landing_vel_tolerance = self.rl_config.get(
                "landing_velocity_tolerance", 5.0
            )
            self.landing_angle_tolerance = self.rl_config.get(
                "landing_angle_tolerance", 5.0
            )  # Degrees
            self.max_altitude = self.rl_config.get("max_altitude", 20000.0)
            self.max_horizontal_pos = self.rl_config.get(
                "max_horizontal_position", 50000.0
            )  # Symmetrical bounds assumed
            self.max_speed = self.rl_config.get(
                "max_speed", 300.0
            )  # Magnitude for vx, vy bounds
            self.max_angular_velocity = self.rl_config.get(
                "max_angular_velocity", 180.0
            )  # Deg/s
            self.max_angle = 180.0  # Physical limit for normalization [-180, 180]
            self.tip_over_angle = self.rl_config.get(
                "tip_over_angle", 90.0
            )  # Angle beyond which it's truncated

            self.max_episode_steps = self.rl_config.get("max_episode_steps", 1000)

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
            # [x, y, vx, vy, angle, angular_vel]
            self.observation_low = np.array(
                [
                    -self.max_horizontal_pos,  # x min
                    0.0,  # y min (ground level)
                    -self.max_speed,  # vx min
                    -self.max_speed,  # vy min
                    -self.max_angle,  # angle min
                    -self.max_angular_velocity,  # angular velocity min
                ],
                dtype=np.float32,
            )

            self.observation_high = np.array(
                [
                    self.max_horizontal_pos,  # x max
                    self.max_altitude,  # y max
                    self.max_speed,  # vx max
                    self.max_speed,  # vy max (can be positive if ascending)
                    self.max_angle,  # angle max
                    self.max_angular_velocity,  # angular velocity max
                ],
                dtype=np.float32,
            )

            self.observation_space = spaces.Box(
                low=self.observation_low,
                high=self.observation_high,
                dtype=np.float32,
            )

            assert render_mode is None or render_mode in self.metadata["render_modes"]
            self.render_mode = render_mode

            logger.info("RocketLandingEnv Initialized Successfully.")
            logger.info(f"  Action Space: {self.action_space}")
            logger.info(f"  Observation Space: {self.observation_space}")
            logger.info(f"  Max Steps: {self.max_episode_steps}")
            logger.info(
                f"  Landing Tolerances: Vel={self.landing_vel_tolerance} m/s, Angle={self.landing_angle_tolerance} deg"
            )

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
        """Extracts the 6-element observation vector from the rocket's state."""
        try:
            state = self.rocket.get_state()
            # Ensure the order matches the observation space definition
            obs = np.array(
                [
                    state.get("x", 0.0),
                    state.get("y", 0.0),
                    state.get("vx", 0.0),
                    state.get("vy", 0.0),
                    state.get("angle", 0.0),
                    state.get("angularVelocity", 0.0),
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
            return np.zeros(6, dtype=np.float32)

    def _get_info(self) -> Dict[str, Any]:
        """Returns auxiliary information about the state (not used for RL training)."""
        state = self.rocket.get_state()
        info = {
            "raw_state": state,  # Contains all state variables, including mass, fuel etc.
            "speed": state.get("speed", 0.0),
            "altitude": state.get("y", 0.0),
            "fuel_mass": state.get("fuelMass", 0.0),
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

        # --- Action Validation and Clipping ---
        if not self.action_space.contains(action):
            logger.warning(
                f"Action {action} outside bounds {self.action_space}. Clipping."
            )
            action_box = cast(spaces.Box, self.action_space)
            action = np.clip(action, action_box.low, action_box.high)

        throttle = float(action[0])
        cold_gas_control = float(action[1])

        # --- Store state before action ---
        state_before = self.rocket.get_state()
        y_before = state_before.get("y", 0.0)
        vx_before = state_before.get("vx", 0.0)
        vy_before = state_before.get("vy", 0.0)
        angle_before = state_before.get("angle", 0.0)
        ang_vel_before = state_before.get("angularVelocity", 0.0)
        fuel_before = state_before.get("fuelMass", 0.0)

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

        landed_successfully = self._check_landing_success(state_after)
        crashed = self._check_crash(state_after)
        out_of_bounds = self._check_out_of_bounds(state_after)
        tipped_over = self._check_tipped_over(state_after)
        max_steps_reached = self.current_step >= self.max_episode_steps

        if landed_successfully:
            terminated = True
            logger.debug(
                f"Episode Terminated: Successful landing at step {self.current_step}."
            )
        elif crashed:
            terminated = True
            logger.debug(f"Episode Terminated: Crashed at step {self.current_step}.")
        elif out_of_bounds:
            truncated = True
            logger.debug(
                f"Episode Truncated: Out of bounds at step {self.current_step}."
            )
        elif tipped_over:
            truncated = True
            logger.debug(f"Episode Truncated: Tipped over at step {self.current_step}.")
        elif max_steps_reached:
            truncated = True
            logger.debug(f"Episode Truncated: Max steps reached ({self.current_step}).")

        state_before_minimal = {
            "y": y_before,
            "vx": vx_before,
            "vy": vy_before,
            "angle": angle_before,
            "angularVelocity": ang_vel_before,
            "fuelMass": fuel_before,
        }
        reward, _ = calculate_reward(
            state_before_minimal,
            action,
            state_after,
        )

        observation = self._get_obs()
        info = self._get_info()
        info["landed_successfully"] = landed_successfully
        info["crashed"] = crashed
        info["out_of_bounds"] = out_of_bounds
        info["tipped_over"] = tipped_over

        reward = float(reward)

        logger.debug(
            f"Step: {self.current_step}, Act: [{throttle:.2f},{cold_gas_control:.2f}], "
            f"Obs: [x:{observation[0]:.1f}, y:{observation[1]:.1f}, vx:{observation[2]:.1f}, vy:{observation[3]:.1f}, "
            f"ang:{observation[4]:.1f}, angV:{observation[5]:.1f}], "
            f"Rew: {reward:.3f}, Term: {terminated}, Trunc: {truncated}"
        )

        return observation, reward, terminated, truncated, info

    def _check_landing_success(self, state: Dict[str, float]) -> bool:
        """Checks if the rocket has landed successfully within tolerances."""
        on_ground = state.get("y", 1.0) <= 0.1  # Allow tiny tolerance below 0
        vy_ok = abs(state.get("vy", 100.0)) <= self.landing_vel_tolerance
        vx_ok = abs(state.get("vx", 100.0)) <= self.landing_vel_tolerance
        angle_ok = abs(state.get("angle", 100.0)) <= self.landing_angle_tolerance

        is_success = on_ground and vy_ok and vx_ok and angle_ok
        if is_success:
            logger.debug(
                f"Landing Check: Success! y={state.get('y'):.2f}, vx={state.get('vx'):.2f}, vy={state.get('vy'):.2f}, ang={state.get('angle'):.2f}"
            )

        return is_success

    def _check_crash(self, state: Dict[str, float]) -> bool:
        """Checks if the rocket has hit the ground without meeting landing criteria."""
        hit_ground = state.get("y", 1.0) <= 0.0
        crashed = hit_ground and not self._check_landing_success(state)
        return crashed

    def _check_out_of_bounds(self, state: Dict[str, float]) -> bool:
        """Checks if the rocket is outside the defined operational area."""
        buffer = 100
        out = (
            abs(state.get("x", 0.0)) > self.max_horizontal_pos + buffer
            or state.get("y", 0.0) > self.max_altitude + buffer
        )
        return out

    def _check_tipped_over(self, state: Dict[str, float]) -> bool:
        """Checks if the rocket angle exceeds the stable limit."""
        tipped = abs(state.get("angle", 0.0)) > self.tip_over_angle
        return tipped

    def render(self):
        """Renders the environment (placeholder)."""
        if self.render_mode == "human":
            print("Rendering not implemented yet.")
        return None

    def close(self):
        """Cleans up resources."""
        logger.info("RocketLandingEnv Closed.")
