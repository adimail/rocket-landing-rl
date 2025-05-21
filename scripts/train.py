import os
import time
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.vec_env import VecNormalize, SubprocVecEnv, DummyVecEnv
from stable_baselines3.common.callbacks import EvalCallback, CheckpointCallback

from multiprocessing import freeze_support

from backend.envs import RocketLandingEnv
from backend.config import Config

LOG_DIR = "models/logs/train"
MODEL_DIR = "models"
TENSORBOARD_LOG_NAME = "PPO_RocketLander"
MODEL_NAME_PREFIX = "ppo_rocket"

TOTAL_TIMESTEPS = 1_000_000
N_ENVS = 8  # Number of parallel environments (based on CPU cores)
USE_SUBPROC_VEC_ENV = True

# Evaluation and Saving Frequency (in total steps across all envs)
EVAL_FREQ = max(25_000 // N_ENVS, 1)
CHECKPOINT_FREQ = max(100_000 // N_ENVS, 1)

config_loader = Config()
ppo_config = config_loader.get("rl.training.algorithm.PPO")

try:
    GAMMA = ppo_config.get("gamma", 0.99)
    LEARNING_RATE = ppo_config.get("learning_rate", 0.0003)
    BATCH_SIZE = ppo_config.get("batch_size", 256)
    N_STEPS = ppo_config.get("n_steps", 2048)
    ENT_COEF = ppo_config.get("ent_coef", 0.01)
    N_EPOCHS = ppo_config.get("n_epochs", 10)
    GAE_LAMBDA = ppo_config.get("gae_lambda", 0.95)
    CLIP_RANGE = ppo_config.get("clip_range", 0.2)
    MAX_GRAD_NORM = ppo_config.get("max_grad_norm", 0.5)
except KeyError:
    print("Warning: Could not load PPO config from yaml, using defaults.")
    GAMMA = 0.99
    LEARNING_RATE = 0.0003
    BATCH_SIZE = 256
    N_STEPS = 2048
    ENT_COEF = 0.01
    N_EPOCHS = 10
    GAE_LAMBDA = 0.95
    CLIP_RANGE = 0.2
    MAX_GRAD_NORM = 0.5


def make_env():
    env = RocketLandingEnv()
    return env


if __name__ == "__main__":

    freeze_support()

    os.makedirs(LOG_DIR, exist_ok=True)
    os.makedirs(MODEL_DIR, exist_ok=True)

    run_timestamp = time.strftime("%Y%m%d-%H%M%S")
    run_log_dir = os.path.join(LOG_DIR, f"{TENSORBOARD_LOG_NAME}_{run_timestamp}")
    run_model_dir = os.path.join(MODEL_DIR, f"{MODEL_NAME_PREFIX}_{run_timestamp}")
    best_model_save_path = os.path.join(run_model_dir, "best_model")
    checkpoint_save_path = os.path.join(run_model_dir, "checkpoints")
    vec_normalize_path = os.path.join(run_model_dir, "vecnormalize.pkl")

    os.makedirs(run_log_dir, exist_ok=True)
    os.makedirs(run_model_dir, exist_ok=True)
    os.makedirs(best_model_save_path, exist_ok=True)
    os.makedirs(checkpoint_save_path, exist_ok=True)

    print(f"TensorBoard Logs: {run_log_dir}")
    print(f"Models will be saved in: {run_model_dir}")
    print(f"VecNormalize stats will be saved to: {vec_normalize_path}")

    # --- Environment Setup ---
    # Create the vectorized environment INSIDE the main block
    vec_env_cls = SubprocVecEnv if USE_SUBPROC_VEC_ENV and N_ENVS > 1 else DummyVecEnv
    train_vec_env = make_vec_env(make_env, n_envs=N_ENVS, vec_env_cls=vec_env_cls)

    # Wrap with VecNormalize
    norm_train_vec_env = VecNormalize(
        train_vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0, gamma=GAMMA
    )

    print(f"Observation Space (Normalized): {norm_train_vec_env.observation_space}")
    print(f"Action Space: {norm_train_vec_env.action_space}")

    # --- Callbacks ---
    # 1. Checkpoint Callback: Saves model periodically
    checkpoint_callback = CheckpointCallback(
        save_freq=CHECKPOINT_FREQ,
        save_path=checkpoint_save_path,
        name_prefix=MODEL_NAME_PREFIX,
        save_replay_buffer=False,
        save_vecnormalize=True,
        verbose=1,
    )

    # 2. Evaluation Callback: Evaluates and saves the best model
    eval_callback = EvalCallback(
        norm_train_vec_env,
        best_model_save_path=best_model_save_path,
        log_path=run_log_dir,
        eval_freq=EVAL_FREQ,
        n_eval_episodes=30,
        deterministic=True,
        render=False,
        verbose=1,
    )

    # --- Model Definition ---
    policy_kwargs = dict(net_arch=dict(pi=[256, 256], vf=[256, 256]))

    model = PPO(
        "MlpPolicy",
        norm_train_vec_env,
        learning_rate=LEARNING_RATE,
        n_steps=N_STEPS,
        batch_size=BATCH_SIZE,
        n_epochs=N_EPOCHS,
        gamma=GAMMA,
        gae_lambda=GAE_LAMBDA,
        clip_range=CLIP_RANGE,
        ent_coef=ENT_COEF,
        max_grad_norm=MAX_GRAD_NORM,
        policy_kwargs=policy_kwargs,
        verbose=1,
        tensorboard_log=LOG_DIR,
    )

    # --- Training ---
    print(f"\nStarting training for {TOTAL_TIMESTEPS} timesteps...")
    try:
        model.learn(
            total_timesteps=TOTAL_TIMESTEPS,
            callback=[eval_callback, checkpoint_callback],
            tb_log_name=f"{TENSORBOARD_LOG_NAME}_{run_timestamp}",
            reset_num_timesteps=False,
        )
    except KeyboardInterrupt:
        print("\nTraining interrupted by user.")
    finally:
        # --- Save Final Model and Normalization Stats ---
        final_model_path = os.path.join(run_model_dir, f"{MODEL_NAME_PREFIX}_final")
        print(f"\nSaving final model to: {final_model_path}")
        model.save(final_model_path)

        print(f"Saving final VecNormalize statistics to: {vec_normalize_path}")
        norm_train_vec_env.save(vec_normalize_path)

        # Close the environment
        norm_train_vec_env.close()
        print("Training finished and environment closed.")

    # --- Example: Loading and Evaluating the BEST Model ---
    print("\n--- Evaluating Best Model ---")

    best_model_zip = os.path.join(best_model_save_path, "best_model.zip")
    best_model_norm_stats = os.path.join(run_model_dir, "vecnormalize.pkl")

    if os.path.exists(best_model_zip) and os.path.exists(best_model_norm_stats):
        print(f"Loading best model from: {best_model_zip}")
        print(f"Loading normalization stats from: {best_model_norm_stats}")

        eval_env = make_vec_env(make_env, n_envs=1, vec_env_cls=DummyVecEnv)
        eval_norm_env = VecNormalize.load(best_model_norm_stats, eval_env)
        eval_norm_env.training = False
        eval_norm_env.norm_reward = False

        loaded_model = PPO.load(best_model_zip, env=eval_norm_env)
        print("Model and normalization stats loaded successfully.")

        total_reward_sum = 0
        num_episodes = 10
        for episode in range(num_episodes):
            obs = eval_norm_env.reset()
            terminated = False
            episode_reward = 0
            step = 0
            while not terminated:
                if isinstance(obs, tuple):
                    action, _ = loaded_model.predict(obs[0], deterministic=True)
                else:
                    action, _ = loaded_model.predict(obs, deterministic=True)
                obs, reward, terminated, info = eval_norm_env.step(action)
                episode_reward += reward[0]
                step += 1
                if terminated[0]:
                    print(
                        f"Episode {episode+1} finished after {step} steps. Reward: {episode_reward:.2f}"
                    )
                    final_info = info[0]
                    print(
                        f"  Final State (example): y={final_info.get('raw_state', {}).get('y', 'N/A'):.2f}, vy={final_info.get('raw_state', {}).get('vy', 'N/A'):.2f}, angle={final_info.get('raw_state', {}).get('angle', 'N/A'):.2f}"
                    )
                    break

            total_reward_sum += episode_reward

        avg_reward = total_reward_sum / num_episodes
        print(
            f"\nAverage reward over {num_episodes} evaluation episodes: {avg_reward:.2f}"
        )

        eval_norm_env.close()

    else:
        print(
            "Could not find saved best model or normalization stats. Skipping evaluation."
        )

    print("\nScript finished.")
