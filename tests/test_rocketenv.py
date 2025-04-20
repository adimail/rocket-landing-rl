from backend.envs import RocketLandingEnv

if __name__ == "__main__":
    print("\n" + "=" * 30 + "\nTesting RocketLandingEnv...\n" + "=" * 30)

    from stable_baselines3.common.env_checker import check_env

    try:
        print("Instantiating environment...")
        env = RocketLandingEnv()
        print("Environment instantiated.")

        print("\nRunning SB3 Environment Checker...")
        check_env(env)
        print("SB3 Environment Check Passed (or comment out check_env to skip).")

        print("\n--- Testing Basic Interaction (1 Episode) ---")
        obs, info = env.reset(seed=42)
        print(f"Initial Observation (State): {obs}")
        print(f"Initial Info: {info}")

        terminated = False
        truncated = False
        total_reward = 0.0
        steps = 0

        while not terminated and not truncated:
            action = env.action_space.sample()
            print(f"Step: {steps+1}, Action: {action}")

            obs, reward, terminated, truncated, info = env.step(action)

            total_reward += reward
            steps += 1

            if steps % 50 == 0:
                print(
                    f"Step: {steps}, Reward: {reward:.3f}, Term: {terminated}, Trunc: {truncated}, Alt: {info.get('altitude', 0):.1f}"
                )

            if steps > env.max_episode_steps + 50:
                print(
                    "\nERROR: Exceeded maximum expected steps, potential infinite loop. Breaking."
                )
                truncated = True

        print("-" * 30)
        print(f"Episode finished after {steps} steps.")
        final_state = info.get("raw_state", {})
        print(
            f"Final State (Selected): x={final_state.get('x'):.2f}, y={final_state.get('y'):.2f}, vx={final_state.get('vx'):.2f}, vy={final_state.get('vy'):.2f}, ang={final_state.get('angle'):.2f}"
        )
        print(f"Total Reward: {total_reward:.3f}")
        print(f"Terminated: {terminated}, Truncated: {truncated}")
        print(f"Success: {info.get('landed_successfully', False)}")
        print(f"Crashed: {info.get('crashed', False)}")
        print(f"Out of Bounds: {info.get('out_of_bounds', False)}")
        print(f"Tipped Over: {info.get('tipped_over', False)}")
        print("-" * 30)

        env.close()
        print("\nEnvironment test finished successfully.")

    except AssertionError as ae:
        print(f"\nASSERTION ERROR during environment testing: {ae}")
        print("This often relates to space definitions or check_env issues.")
        import traceback

        traceback.print_exc()
    except Exception as e:
        print(f"\nUNEXPECTED ERROR during environment testing: {e}")
        import traceback

        traceback.print_exc()
