from stable_baselines3 import PPO
from backend.envs.lander import RocketLandingEnv

env = RocketLandingEnv()

model = PPO("MlpPolicy", env, verbose=1)
model.learn(total_timesteps=1_000_000)
model.save("ppo_rocket_lander")

del model
model = PPO.load("ppo_rocket_lander")

eval_env = RocketLandingEnv()
obs, info = eval_env.reset()
terminated = False
truncated = False
while not terminated and not truncated:
    action, _ = model.predict(obs, deterministic=True)
    obs, reward, terminated, truncated, info = eval_env.step(action)

eval_env.close()
