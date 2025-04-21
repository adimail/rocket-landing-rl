import numpy as np
from typing import Tuple, Dict, Any

from backend.config import Config
from backend.utils import evaluate_landing

try:
    _config_loader = Config()
    _reward_config = _config_loader.get("rl.rewards")
    _rl_config = _config_loader.get("rl")
except Exception as e:
    print(f"FATAL ERROR: Could not load configuration for reward calculation: {e}")
    _reward_config = {}
    _rl_config = {}

# Get truncation thresholds from rl_config with defaults
max_horizontal_pos = _rl_config.get("max_horizontal_position", 50000.0)
max_altitude = _rl_config.get("max_altitude", 20000.0)
tip_over_angle = _rl_config.get("tip_over_angle", 90.0)

# Get the reward scales
throttle_descent_reward_scale = _reward_config.get("throttle_descent_reward_scale", 0.3)
free_fall_penalty_scale = _reward_config.get("free_fall_penalty_scale", 0.2)
cold_gas_reward_scale = _reward_config.get("cold_gas_reward_scale", 0.7)
angle_aware_throttle_scale = _reward_config.get("angle_aware_throttle_scale", 0.3)
horizontal_correction_scale = _reward_config.get("horizontal_correction_scale", 0.2)
correct_direction_bonus = _reward_config.get("correct_direction_bonus", 1.5)
gamma = _reward_config["gamma"]


def calculate_reward(
    state_before: Dict[str, Any],
    action: np.ndarray,
    state_after: Dict[str, Any],
) -> Tuple[float, bool, bool]:
    """
    Calculates the reward for a state transition in the rocket landing environment.

    Args:
        state_before: Dictionary representing the rocket's state before the action.
        action: The action taken by the agent [throttle, cold_gas].
        state_after: Dictionary representing the rocket's state after the action.

    Returns:
        A tuple containing:
            - reward (float): The calculated reward for the step.
            - terminated_on_ground (bool): True if the episode terminated by ground contact
            - truncated (bool): True if the episode ended due to external limits (time, bounds, tipping over).
    """

    total_reward = 0.0
    terminated_on_ground = False
    truncated = False

    # Extract state variables
    y_before = state_before.get("y", 0.0)
    angle_before = state_before.get("angle", 0.0)
    angular_velocity_before = state_before.get("angularVelocity", 0.0)

    y_after = state_after.get("y", 0.0)
    vy_after = state_after.get("vy", 0.0)
    angle_after = state_after.get("angle", 0.0)
    angular_velocity_after = state_after.get("angularVelocity", 0.0)

    # Process action
    action = np.asarray(action)
    if action.shape != (2,):
        print(
            f"Warning: Unexpected action shape {action.shape}. Expected (2,). Using zero action."
        )
        action = np.array([0.0, 0.0], dtype=np.float32)

    throttle = float(action[0])  # Range: [0, 1]
    cold_gas = float(action[1])  # Range: [-1, 1]

    # --- TERMINATION ON GROUND ---
    if y_after <= 0.1 and y_before > 0.1:
        terminated_on_ground = True
        landing_eval = evaluate_landing(state_after, _config_loader)

        angle_bonus = max(0, 1.0 - (abs(angle_after) / 10.0))
        velocity_bonus = max(0, 1.0 - (abs(vy_after) / 5.0))

        # Weighted landing quality - focusing mainly on angle and vertical velocity
        landing_quality = 0.6 * angle_bonus + 0.4 * velocity_bonus

        if landing_eval["landing_message"] == "safe":
            total_reward += _reward_config["landing_perfect"] * (
                1.0 + 0.5 * landing_quality
            )
        elif landing_eval["landing_message"] == "good":
            total_reward += _reward_config["landing_good"] * (
                0.8 + 0.2 * landing_quality
            )
        elif landing_eval["landing_message"] == "ok":
            total_reward += _reward_config["landing_ok"]
        else:
            # Progressive crash penalty based on severity (focused on angle and vertical velocity)
            crash_severity = min(
                1.0, (abs(vy_after) / 20.0 + abs(angle_after) / 45.0) / 2.0
            )
            total_reward += _reward_config["crash_ground"] * (
                0.7 + 0.3 * crash_severity
            )

        return float(total_reward), terminated_on_ground, False

    # --- SHAPING REWARDS (Applied per step if not terminated on ground) ---

    # 1. Angular Control Reward with Directional Awareness
    # Reward actions that reduce the absolute angle and angular velocity error
    angle_error_before = abs(angle_before)
    angle_error_after = abs(angle_after)
    ang_vel_error_before = abs(angular_velocity_before)
    ang_vel_error_after = abs(angular_velocity_after)

    scale_angle_error_reduction = 0.5
    scale_ang_vel_error_reduction = 0.1

    # Basic angular correction reward
    reward_angular_correction = (
        -(angle_error_after - angle_error_before) * scale_angle_error_reduction
    )
    reward_angular_correction -= (
        ang_vel_error_after - ang_vel_error_before
    ) * scale_ang_vel_error_reduction

    total_reward += reward_angular_correction

    # Cold gas usage reward with direction awareness
    # For correct cold gas application:
    # - If angle > 0 (tilting right), cold_gas should be negative
    # - If angle < 0 (tilting left), cold_gas should be positive
    if angle_error_before > 0.1 or ang_vel_error_before > 0.1:
        # Determine if cold gas is applied in the correct direction
        correct_direction = (angle_before > 0 and cold_gas < 0) or (
            angle_before < 0 and cold_gas > 0
        )

        # Calculate base reward for angular correction
        angular_correction_needed = angle_error_before + ang_vel_error_before
        correction_effectiveness = (angle_error_before - angle_error_after) + (
            ang_vel_error_before - ang_vel_error_after
        )

        # Apply direction-aware cold gas reward
        if correct_direction:
            # Enhanced reward for applying in correct direction
            direction_multiplier = correct_direction_bonus
        else:
            # Stronger penalty for incorrect direction - this is important for learning
            direction_multiplier = -correct_direction_bonus

        cold_gas_reward = (
            abs(cold_gas)
            * angular_correction_needed
            * direction_multiplier
            * cold_gas_reward_scale
        )

        # Reward more if the correction is effective
        if correction_effectiveness > 0:
            # Square the effectiveness to amplify the reward for good corrections
            cold_gas_reward *= 1.0 + correction_effectiveness**2

        total_reward += cold_gas_reward
    else:
        # If no significant angle correction needed, penalize cold gas usage
        # Reduced penalty to avoid discouraging small stabilizing corrections
        cold_gas_penalty = abs(cold_gas) * 0.3 * cold_gas_reward_scale
        total_reward -= cold_gas_penalty

    # 2. Vertical Control Reward
    # Encourage using throttle to slow descent when airborne
    if y_after > 0.1 and vy_after < 0:
        # Enhanced reward that considers angle - less reward if tilted
        angle_factor = max(0, 1.0 - (abs(angle_after) / 45.0))

        # Additional factor: reward more for controlling high descent speeds
        descent_speed_factor = min(1.0, abs(vy_after) / 10.0)

        # Higher reward for controlled descent at higher speeds
        reward_throttle_descent = (
            throttle
            * (-vy_after)
            * angle_factor
            * (1.0 + descent_speed_factor)
            * throttle_descent_reward_scale
        )
        total_reward += reward_throttle_descent

    # 3. Free Fall Penalty with proximity awareness
    # Penalize descending without throttle, especially near ground
    if y_after > 0.1 and vy_after < 0 and throttle < 0.1:
        # Apply stronger penalty as rocket gets closer to ground and descends faster
        proximity_factor = 1.0 + (8.0 / max(y_after, 1.0))  # Increases as y decreases
        speed_factor = min(1.0, abs(vy_after) / 15.0)  # Increases with descent speed

        free_fall_penalty = (
            free_fall_penalty_scale
            * (-vy_after)
            * proximity_factor
            * (1.0 + speed_factor)
        )
        total_reward -= free_fall_penalty

    # 4. Angle-Aware Throttle Usage
    # When the rocket is tilted, use thrust efficiently
    if throttle > 0.1 and y_after > 0.1:
        if abs(angle_after) > 10.0:
            # Strong penalty for using high throttle with extreme angles
            angle_inefficiency = abs(angle_after) / 90.0
            throttle_inefficiency_penalty = (
                throttle * angle_inefficiency * angle_aware_throttle_scale
            )
            total_reward -= throttle_inefficiency_penalty
        elif abs(angle_after) > 5.0 and abs(angle_after) <= 10.0:
            # Mild penalty for moderate angles
            angle_inefficiency = (abs(angle_after) - 5.0) / 5.0
            throttle_inefficiency_penalty = (
                throttle * angle_inefficiency * angle_aware_throttle_scale * 0.5
            )
            total_reward -= throttle_inefficiency_penalty

    # 5. Penalize upward movement when airborne with altitude consideration
    if y_after > 0.1 and vy_after > 0:
        # Scale penalty based on current altitude and speed
        altitude_factor = min(1.0, y_after / 1000.0)  # Higher altitude = higher penalty
        ascent_speed_factor = min(1.0, vy_after / 5.0)  # Higher speed = higher penalty

        total_reward -= vy_after * 0.5 * altitude_factor * (1.0 + ascent_speed_factor)

    # 6. Potential-Based Shaping
    # Penalize distance from optimal state (without horizontal position penalty)
    def potential(state):
        y = state.get("y", 0.0)
        vx, vy = state.get("vx", 0.0), state.get("vy", 0.0)
        angle = state.get("angle", 0.0)
        angular_velocity = state.get("angularVelocity", 0.0)

        # Ensure y is non-negative
        y_potential = max(0.0, y)

        # Adaptive weights that change with altitude
        # Closer to ground: focus more on angle and velocity
        # Higher up: focus more on vertical position
        y_factor = min(1.0, y_potential / 2000.0)  # 0 near ground, 1 at high altitude

        weight_y_dist = 0.005  # Consistent importance for vertical position
        weight_vel_y = 0.015 * (2.0 - y_factor)  # More important near ground
        weight_vel_x = 0.005  # Less important than vertical velocity
        weight_angle = 0.01 * (2.0 - y_factor)  # More important near ground
        weight_stab = 0.05 * (2.0 - y_factor)  # More important near ground

        # Calculate individual penalty components
        y_dist_penalty = y_potential  # Penalize altitude
        vy_penalty = abs(vy)  # Penalize vertical velocity
        vx_penalty = abs(vx)  # Penalize horizontal velocity
        angle_penalty = abs(angle)  # Penalize tilt
        stab_penalty = abs(angular_velocity)  # Penalize angular velocity

        return (
            -weight_y_dist * y_dist_penalty
            - weight_vel_y * vy_penalty
            - weight_vel_x * vx_penalty
            - weight_angle * angle_penalty
            - weight_stab * stab_penalty
        )

    # Calculate shaping reward: gamma * Potential(s') - Potential(s)
    potential_before = potential(state_before)
    potential_after = potential(state_after)
    shaping_reward = gamma * potential_after - potential_before
    total_reward += shaping_reward

    # --- Truncation Penalties ---
    # Out of bounds check (position limits)
    if abs(state_after.get("x", 0.0)) > max_horizontal_pos or y_after > max_altitude:
        total_reward += _reward_config["out_of_bounds"]
        truncated = True

    if abs(angle_after) > tip_over_angle:
        total_reward += _reward_config["tipped_over"]

    return float(total_reward), terminated_on_ground, truncated
