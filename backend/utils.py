import numpy as np
from backend.config import Config


def evaluate_landing(state, config):
    vx = state.get("vx", float("inf"))
    vy = state.get("vy", float("inf"))
    angle_deg = state.get("angle", float("inf"))

    safe_vx = config.get("env.safeSpeedThresholdVx") or 20.0
    safe_vy = config.get("env.safeSpeedThresholdVy") or 20.0
    safe_angle = config.get("env.safeAngleThresholdDeg") or 5.0

    good_vx = config.get("env.goodSpeedThresholdVx") or 30.0
    good_vy = config.get("env.goodSpeedThresholdVy") or 30.0
    good_angle = config.get("env.goodAngleThresholdDeg") or 5.0

    ok_vx = config.get("env.okSpeedThresholdVx") or 40.0
    ok_vy = config.get("env.okSpeedThresholdVy") or 40.0
    ok_angle = config.get("env.okAngleThresholdDeg") or 80.0

    is_perfect = abs(vx) < safe_vx and abs(vy) < safe_vy and abs(angle_deg) < safe_angle
    is_good = abs(vx) < good_vx and abs(vy) < good_vy and abs(angle_deg) < good_angle
    is_ok = abs(vx) < ok_vx and abs(vy) < ok_vy and abs(angle_deg) < ok_angle

    if is_perfect:
        landing_message = "safe"
    elif is_good:
        landing_message = "good"
    elif is_ok:
        landing_message = "ok"
    else:
        landing_message = "unsafe"

    return {
        "vx": vx,
        "vy": vy,
        "angle": angle_deg,
        "landing_message": landing_message,
    }


def compute_reward(curr_state, action, state_after):
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

        config = Config()

        coef_vx_penalty = 0.15  # Penalty for horizontal velocity
        coef_vy_penalty_base = 0.1  # Base penalty for vertical velocity
        coef_angle_penalty = 0.1  # Penalty for deviation from vertical
        vy_penalty_scale_factor = 10.0  # How much the vy penalty increases near ground
        vy_penalty_characteristic_height = (
            300.0  # Altitude (m) at which scaling effect is significant
        )
        altitude_factor_scale = 100.0  # Denominator scale for altitude reward

        y = curr_state.get("y", 0.0)
        vx = curr_state.get("vx", 0.0)
        vy = curr_state.get("vy", 0.0)
        angle_deg = curr_state.get("angle", 0.0)

        if y <= 0.0:
            safe_vx = config.get("env.safeSpeedThresholdVx") or 20.0
            safe_vy = config.get("env.safeSpeedThresholdVy") or 20.0
            safe_angle = config.get("env.safeAngleThresholdDeg") or 5.0

            good_vx = config.get("env.goodSpeedThresholdVx") or 30.0
            good_vy = config.get("env.goodSpeedThresholdVy") or 30.0
            good_angle = config.get("env.goodAngleThresholdDeg") or 5.0

            ok_vx = config.get("env.okSpeedThresholdVx") or 40.0
            ok_vy = config.get("env.okSpeedThresholdVy") or 40.0
            ok_angle = config.get("env.okAngleThresholdDeg") or 80.0

            is_perfect = (
                abs(vx) < safe_vx and abs(vy) < safe_vy and abs(angle_deg) < safe_angle
            )
            is_good = (
                abs(vx) < good_vx and abs(vy) < good_vy and abs(angle_deg) < good_angle
            )
            is_ok = abs(vx) < ok_vx and abs(vy) < ok_vy and abs(angle_deg) < ok_angle

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
                impact_penalty = -(abs(vx) * 1.5 + abs(vy) * 3.0 + abs(angle_deg) * 0.5)
                reward = max(-200.0, impact_penalty)
                print(
                    f"Crash! vx:{vx:.2f}, vy:{vy:.2f}, angle:{angle_deg:.2f}. Penalty: {reward:.2f}"
                )

            return reward, True

        # --- Shaping Rewards (In-Flight) ---

        # 1. Altitude Reward: Encourages getting closer to the ground (y=0)
        # Value approaches 1 as y -> 0. Diminishes at higher altitudes.
        # Added small epsilon to prevent division by zero if y is exactly 0 (though terminal condition handles y<=0)
        altitude_factor = 1.0 / (1.0 + abs(y) / altitude_factor_scale + 1e-6)

        # 2. Velocity Penalty: Penalizes undesirable velocities.
        #    - Horizontal velocity (vx) is penalized consistently.
        #    - Vertical velocity (vy) penalty scales up significantly near the ground,
        #      especially for downward velocity (vy < 0).
        vx_penalty = -coef_vx_penalty * abs(vx)

        # Calculate altitude-dependent scaling for vy penalty
        # Scale increases exponentially as y approaches 0. Capped by vy_penalty_scale_factor.
        # Use max(0, y) to prevent issues if y is slightly negative before terminal check catches it.
        altitude_weight = 1.0 + (vy_penalty_scale_factor - 1.0) * np.exp(
            -max(0, y) / vy_penalty_characteristic_height
        )

        # Penalize downward velocity more heavily near the ground
        # Penalize upward velocity less, or even slightly reward it high up? (Keep simple for now)
        vy_penalty = -coef_vy_penalty_base * abs(vy) * altitude_weight

        velocity_penalty = vx_penalty + vy_penalty

        # 3. Angle Penalty: Penalizes deviation from a vertical orientation (0 degrees).
        angle_penalty = -coef_angle_penalty * abs(angle_deg)

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
