import os
import numpy as np
from typing import Dict, Optional
from datetime import datetime

from backend.logger import Logger

from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from backend.envs.lander import (
    RocketLandingEnv,
)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

logger = Logger(
    file_name=f"{timestamp}_agent.log",
    log_dir="logs/agents",
    stream_handler=False,
).get_logger()


class RLAgent:
    """
    Loads a trained Stable Baselines3 agent and its normalization statistics
    to predict actions based on raw simulation state dictionaries.
    """

    def __init__(
        self,
        model_path: str = "assets/best_model.zip",
        vec_normalize_path: str = "assets/vecnormalize.pkl",
    ):
        """
        Initializes the agent by loading the model and normalization stats.

        Args:
            model_path: Path to the saved SB3 model (.zip file).
            vec_normalize_path: Path to the saved VecNormalize statistics (.pkl file).
        """
        self.model_path = model_path
        self.vec_normalize_path = vec_normalize_path
        self.model: Optional[PPO] = None
        self.norm_env_wrapper: Optional[VecNormalize] = None
        self.observation_shape = None

        self._load_agent()

    def _load_agent(self):
        """Loads the SB3 model and VecNormalize statistics."""
        logger.info(f"Attempting to load RL agent:")
        logger.info(f"  Model path: {self.model_path}")
        logger.info(f"  VecNormalize path: {self.vec_normalize_path}")

        if not os.path.exists(self.model_path):
            logger.error(f"Model file not found at: {self.model_path}")
            raise FileNotFoundError(f"Model file not found: {self.model_path}")

        if not os.path.exists(self.vec_normalize_path):
            logger.error(
                f"VecNormalize statistics file not found at: {self.vec_normalize_path}"
            )
            raise FileNotFoundError(
                f"VecNormalize statistics file not found: {self.vec_normalize_path}"
            )

        try:
            # 1. Create a dummy VecEnv (needs the original env structure)
            #    We use DummyVecEnv as it's simpler for loading purposes.
            dummy_env = DummyVecEnv([lambda: RocketLandingEnv()])

            # 2. Load the VecNormalize statistics
            self.norm_env_wrapper = VecNormalize.load(
                self.vec_normalize_path, dummy_env
            )

            # 3. Set the wrapper to evaluation mode
            self.norm_env_wrapper.training = False
            # We don't need reward normalization during prediction
            self.norm_env_wrapper.norm_reward = False

            # 4. Load the PPO model, passing the *normalized* environment wrapper
            self.model = PPO.load(self.model_path, env=self.norm_env_wrapper)

            # Store the expected observation shape
            self.observation_shape = self.norm_env_wrapper.observation_space.shape

            logger.info("RL Agent loaded successfully.")
            logger.info(f"  Model observation space shape: {self.observation_shape}")

        except Exception as e:
            logger.error(f"Failed to load RL agent: {e}", exc_info=True)
            # Set to None to indicate failure
            self.model = None
            self.norm_env_wrapper = None
            raise  # Re-raise the exception after logging

    def _state_dict_to_obs_array(self, raw_state: Dict) -> Optional[np.ndarray]:
        """
        Converts a raw state dictionary from the simulation into a NumPy array
        matching the environment's observation space order.

        **IMPORTANT:** This assumes the observation space order is:
        [x, y, vx, vy, ax, ay, angle, angularVelocity]
        Adjust this if your RocketLandingEnv._get_obs() has a different order
        or different components.
        """
        try:
            obs = np.array(
                [
                    raw_state.get("x", 0.0),
                    raw_state.get("y", 0.0),
                    raw_state.get("vx", 0.0),
                    raw_state.get("vy", 0.0),
                    raw_state.get("ax", 0.0),
                    raw_state.get("ay", 0.0),
                    raw_state.get("angle", 0.0),
                    raw_state.get("angularVelocity", 0.0),
                ],
                dtype=np.float32,
            )

            # Check if the shape matches what the loaded model expects
            if self.observation_shape and obs.shape != self.observation_shape:
                logger.warning(
                    f"Observation shape mismatch. Expected {self.observation_shape}, got {obs.shape}. Check _state_dict_to_obs_array order and env definition."
                )
                # Attempt to reshape if it's just missing the batch dim, otherwise return None
                if (
                    len(obs.shape) == 1
                    and len(self.observation_shape) == 1
                    and obs.shape[0] == self.observation_shape[0]
                ):
                    pass  # Shape is okay (e.g., (8,) vs (8,))
                else:
                    return None  # Indicate failure

            return obs

        except KeyError as e:
            logger.error(
                f"Raw state dictionary missing expected key: {e}. State: {raw_state}"
            )
            return None
        except Exception as e:
            logger.error(
                f"Error converting state dict to observation array: {e}", exc_info=True
            )
            return None

    def predict(self, raw_state: Dict) -> Optional[Dict[str, float]]:
        """
        Predicts an action based on the raw simulation state dictionary.

        Args:
            raw_state: A dictionary representing the current state from the simulation
                       (e.g., from rocket.get_state()).

        Returns:
            A dictionary containing the predicted action {'throttle': float, 'coldGas': float},
            or None if prediction fails or the agent wasn't loaded correctly.
        """
        if self.model is None or self.norm_env_wrapper is None:
            logger.warning("Agent not loaded or failed to load. Cannot predict.")
            return None

        # 1. Convert raw state dict to NumPy array
        obs_array = self._state_dict_to_obs_array(raw_state)
        if obs_array is None:
            logger.error("Failed to convert raw state to observation array.")
            return None  # Indicate prediction failure

        # 2. Normalize the observation
        # Note: normalize_obs expects a batch, so we might need to add a dimension if not already present
        # However, SB3 predict usually handles single observations correctly if the wrapper is loaded.
        # Let's reshape just in case for consistency with VecEnv expectations.
        if len(obs_array.shape) == 1:
            obs_array_batched = obs_array.reshape(1, -1)
        else:
            obs_array_batched = obs_array  # Assume already batched if not 1D

        normalized_obs = self.norm_env_wrapper.normalize_obs(obs_array_batched)

        # 3. Predict the action using the loaded model
        try:
            # Use deterministic=True for evaluation/deployment
            action_array, _ = self.model.predict(normalized_obs, deterministic=True)

            # Action array might be nested if predict returns a batch, e.g., [[throttle, coldGas]]
            # Extract the first action
            if len(action_array.shape) > 1:
                action = action_array[0]
            else:
                action = action_array

            # 4. Format the action into a dictionary
            action_dict = {"throttle": float(action[0]), "coldGas": float(action[1])}
            return action_dict

        except Exception as e:
            logger.error(f"Error during model prediction: {e}", exc_info=True)
            return None
