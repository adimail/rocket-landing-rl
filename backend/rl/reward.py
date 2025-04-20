import numpy as np
from typing import Tuple, Dict, Any

from backend.config import Config

try:
    _config_loader = Config()
    _reward_config = _config_loader.get("rl.rewards")
    _rl_config = _config_loader.get("rl")
    _landing_config = _config_loader.get("landing.thresholds")
except Exception as e:
    print(f"FATAL ERROR: Could not load configuration for reward calculation: {e}")
    _reward_config = {}
    _rl_config = {}
    _landing_config = {}


def calculate_reward(
    state_before: Dict[str, Any],
    action: np.ndarray,
    state_after: Dict[str, Any],
) -> Tuple[float, bool, bool]:
    """
    Simple reward function for rocket landing.

    Args:
        state_before: Dictionary with rocket state before action
        action: Array with [throttle, cold_gas] values
        state_after: Dictionary with rocket state after action
        config: Configuration dictionary with reward parameters

    Returns:
        Tuple of (reward, terminated, truncated)
    """
    reward = 0.0
    terminated = False
    truncated = False

    throttle = float(action[0])  # Range: [0, 1]
    cold_gas = float(action[1])  # Range: [-1, 1]

    # state variables
    y_before = state_before.get("y", 0.0)
    y_after = state_after.get("y", 0.0)

    vy_before = state_before.get("vy", 0.0)
    vy_after = state_after.get("vy", 0.0)

    angle_before = state_before.get("angle", 0.0)
    angle_after = state_after.get("angle", 0.0)

    angular_velocity_before = state_before.get("angularVelocity", 0.0)
    angular_velocity_after = state_after.get("angularVelocity", 0.0)

    # Get reward scales from config
    landing_perfect = _reward_config["landing_perfect"]
    landing_good = _reward_config["landing_good"]
    landing_ok = _reward_config["landing_ok"]
    crash_penalty = _reward_config["crash_ground"]
    throttle_scale = _reward_config["throttle_descent_reward_scale"]
    cold_gas_scale = _reward_config["cold_gas_reward_scale"]

    # Extract thresholds from config
    tip_over_angle = _rl_config["tip_over_angle"]
    max_horizontal_pos = _rl_config["max_horizontal_position"]
    max_altitude = _rl_config["max_altitude"]

    # ---- LANDING REWARDS ----
    # Check if landed (touched ground)
    if y_after <= 0.1 and y_before > 0.1:
        terminated = True

        perfect_vy = _landing_config["perfect"]["speed_vy"]
        perfect_angle = _landing_config["perfect"]["angle"]

        good_vy = _landing_config["good"]["speed_vy"]
        good_angle = _landing_config["good"]["angle"]

        ok_vy = _landing_config["ok"]["speed_vy"]
        ok_angle = _landing_config["ok"]["angle"]

        if abs(vy_after) <= perfect_vy and abs(angle_after) <= perfect_angle:
            reward += landing_perfect
        elif abs(vy_after) <= good_vy and abs(angle_after) <= good_angle:
            reward += landing_good
        elif abs(vy_after) <= ok_vy and abs(angle_after) <= ok_angle:
            reward += landing_ok
        else:
            # Crash penalty - scaled by severity
            crash_severity = min(
                1.0, (abs(vy_after) / 100.0 + abs(angle_after) / 90.0) / 2.0
            )
            reward += crash_penalty * (1.0 + crash_severity)

        return reward, terminated, truncated

    # ---- THROTTLE CONTROL REWARD ----
    if y_after > 0.1:  # Only when airborne
        # Base throttle reward - encourage using thrust to slow descent
        if vy_after < 0:  # Descending
            # Calculate how much vertical velocity was reduced
            velocity_reduction = max(0, abs(vy_before) - abs(vy_after))

            # Calculate angle penalty (less efficient thrust when tilted)
            angle_factor = max(0.1, 1.0 - (abs(angle_after) / 45.0))

            # Basic throttle reward - higher for higher descent speeds
            throttle_reward = (
                throttle  # Proportional to throttle used
                * min(1.0, abs(vy_after) / 30.0)  # Scales with descent speed
                * angle_factor  # Less effective when tilted
                * throttle_scale
                * 10.0  # Base scale factor
            )

            # Additional reward for actually slowing down
            effective_throttle_reward = (
                velocity_reduction  # Actual velocity reduction
                * throttle  # Proportional to throttle used
                * 15.0  # Effectiveness multiplier
            )

            reward += throttle_reward + effective_throttle_reward

            # Penalize free-fall (high descent rate with low throttle)
            if abs(vy_after) > 50.0 and throttle < 0.3:
                free_fall_penalty = (abs(vy_after) - 50.0) * (1.0 - throttle) * 0.1
                reward -= free_fall_penalty

    # ---- ATTITUDE CONTROL REWARD ----
    # Reward for reducing angle error
    angle_change = abs(angle_before) - abs(angle_after)
    angular_velocity_change = abs(angular_velocity_before) - abs(angular_velocity_after)

    ideal_cold_gas = -np.sign(angle_after)

    # Reward for using cold gas in the right direction
    cold_gas_reward = 1.2
    if abs(angle_after) > 5.0 or abs(angular_velocity_after) > 2.0:
        direction_correctness = np.sign(cold_gas) == ideal_cold_gas

        if direction_correctness:
            # Good direction - reward proportional to needed correction
            correction_need = min(
                1.0, (abs(angle_after) / 20.0 + abs(angular_velocity_after) / 5.0)
            )
            cold_gas_reward = abs(cold_gas) * correction_need * cold_gas_scale * 10.0

            # Extra reward for actually reducing angle/rotation
            if angle_change > 0 or angular_velocity_change > 0:
                cold_gas_reward *= 1.5
        else:
            # Wrong direction - small penalty
            cold_gas_reward = -abs(cold_gas) * cold_gas_scale * 5.0
    else:
        # When angle is small, penalize unnecessary cold gas use
        cold_gas_reward = -abs(cold_gas) * cold_gas_scale * 2.0

    reward += cold_gas_reward

    # ---- STABILITY REWARD ----
    # Simple reward for being stable (close to vertical)
    stability_reward = (1.0 - min(1.0, abs(angle_after) / 45.0)) * 5.0
    reward += stability_reward

    # ---- TERMINAL CONDITIONS ----
    # truncation conditions
    if abs(state_after.get("x", 0.0)) > max_horizontal_pos or y_after > max_altitude:
        reward -= 400.0
        truncated = True

    # rocket tipping over
    if abs(angle_after) > tip_over_angle:
        reward -= 400.0
        truncated = True

    return reward, terminated, truncated
