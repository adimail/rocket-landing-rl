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

DEFAULT_REWARDS = {
    "landing_perfect": 1000.0,
    "landing_good": 500.0,
    "landing_ok": 100.0,
    "crash_ground": -500.0,
    "out_of_bounds": -100.0,
    "tipped_over": -200.0,
    "time_penalty": -0.01,
    "throttle_penalty_factor": 0.0,
    "rcs_penalty_factor": 0.0,
    "gamma": 0.99,
    "throttle_descent_reward_scale": 0.1,
}

# Merge loaded config with defaults
reward_config = DEFAULT_REWARDS.copy()
reward_config.update(_reward_config)

# Get truncation thresholds from rl_config with defaults
max_horizontal_pos = _rl_config.get("max_horizontal_position", 50000.0)
max_altitude = _rl_config.get("max_altitude", 20000.0)
tip_over_angle = _rl_config.get("tip_over_angle", 90.0)

# Get the new throttle reward scale
throttle_descent_reward_scale = reward_config.get(
    "throttle_descent_reward_scale", DEFAULT_REWARDS["throttle_descent_reward_scale"]
)


def calculate_reward(
    state_before: Dict[str, Any],
    action: np.ndarray,
    state_after: Dict[str, Any],
) -> Tuple[float, bool]:
    """
    Calculates the reward for a state transition in the rocket landing environment.

    Args:
        state_before: Dictionary representing the rocket's state before the action.
        action: The action taken by the agent [throttle, cold_gas].
        state_after: Dictionary representing the rocket's state after the action.

    Returns:
        A tuple containing:
            - reward (float): The calculated reward for the step.
            - terminated_on_ground (bool): True if the episode terminated specifically
                                           due to ground contact (landing or crash)
                                           in this step, False otherwise.
    """
    gamma = reward_config["gamma"]

    total_reward = 0.0
    terminated_on_ground = False

    # Extract state values (use .get with default 0.0 for safety)
    # Keep only variables actually used in calculations below
    y_before = state_before.get("y", 0.0)
    angle_before = state_before.get("angle", 0.0)
    angular_velocity_before = state_before.get("angularVelocity", 0.0)

    y_after = state_after.get("y", 0.0)
    vy_after = state_after.get("vy", 0.0)
    angle_after = state_after.get("angle", 0.0)
    angular_velocity_after = state_after.get("angularVelocity", 0.0)
    x_after = state_after.get("x", 0.0)
    # vx_after = state_after.get("vx", 0.0)

    action = np.asarray(action)

    if action.shape != (2,):
        print(
            f"Warning: Unexpected action shape {action.shape}. Expected (2,). Using zero action."
        )
        action = np.array([0.0, 0.0], dtype=np.float32)

    throttle = float(action[0])
    cold_gas = float(action[1])

    # --- TERMINATION ON GROUND ---
    # Check for ground contact (y_after is at or below ground, and y_before was above)
    if y_after <= 0.1 and y_before > 0.1:
        terminated_on_ground = True
        # Use the evaluate_landing helper to check against thresholds
        # evaluate_landing needs the config loader to access landing.thresholds
        landing_eval = evaluate_landing(state_after, _config_loader)

        if landing_eval["landing_message"] == "safe":
            total_reward += reward_config["landing_perfect"]
        elif landing_eval["landing_message"] == "good":
            total_reward += reward_config["landing_good"]
        elif landing_eval["landing_message"] == "ok":
            total_reward += reward_config["landing_ok"]
        else:
            total_reward += reward_config["crash_ground"]

        return float(total_reward), terminated_on_ground

    # --- SHAPING REWARDS (Applied per step if not terminated on ground) ---

    # 1. Angular Control Reward
    # Reward actions that reduce the absolute angle and angular velocity error
    angle_error_before = abs(angle_before)
    angle_error_after = abs(angle_after)
    ang_vel_error_before = abs(angular_velocity_before)
    ang_vel_error_after = abs(angular_velocity_after)

    scale_angle_error_reduction = 0.5
    scale_ang_vel_error_reduction = 0.1

    reward_angular_correction = (
        -(angle_error_after - angle_error_before) * scale_angle_error_reduction
    )
    reward_angular_correction -= (
        ang_vel_error_after - ang_vel_error_before
    ) * scale_ang_vel_error_reduction

    total_reward += reward_angular_correction

    # Cold gas usage reward
    cold_gas_reward_scale = 0.3
    cold_gas_penalty_scale = 0.5

    # If there's significant angular error or angular velocity, reward cold gas usage
    if angle_error_before > 0.1 or ang_vel_error_before > 0.1:
        angular_correction_needed = angle_error_before + ang_vel_error_before
        correction_effectiveness = (angle_error_before - angle_error_after) + (
            ang_vel_error_before - ang_vel_error_after
        )

        cold_gas_reward = (
            cold_gas
            * angular_correction_needed
            * correction_effectiveness
            * cold_gas_reward_scale
        )
        total_reward += cold_gas_reward
    else:
        cold_gas_penalty = cold_gas * cold_gas_penalty_scale
        total_reward -= cold_gas_penalty

    # 2. Vertical Control Reward
    # Encourage using throttle to slow descent when airborne.
    # Penalize upward movement.

    # Reward throttle usage when descending (vy < 0) and airborne (y > 0)
    # Scale by throttle amount and descent speed magnitude (-vy)
    # This directly rewards using the engine to brake descent.
    if y_after > 0.1 and vy_after < 0:
        # Reward = throttle * (-vy_after) * scale
        # Using -vy_after rewards braking more when descending faster.
        reward_throttle_descent = throttle * (-vy_after) * throttle_descent_reward_scale
        total_reward += reward_throttle_descent

    # Penalize upward movement (vy > 0) when airborne
    scale_vy_ascent_penalty = 0.5  # Tune this
    if y_after > 0.1 and vy_after > 0:
        total_reward -= vy_after * scale_vy_ascent_penalty

    # 3. Potential-Based Shaping
    # Penalize distance from origin (x, y), total velocity (vx, vy), angle, and angular velocity.
    # This rewards transitions that move towards a state with lower penalties.
    def potential(state):
        x, y = state.get("x", 0.0), state.get("y", 0.0)
        vx, vy = state.get("vx", 0.0), state.get("vy", 0.0)
        angle = state.get("angle", 0.0)
        angular_velocity = state.get("angularVelocity", 0.0)

        # Ensure y is non-negative for potential calculation if it somehow goes negative before termination
        y_potential = max(0.0, y)

        # Adjusted weights - more balanced initially
        # Tune these weights based on desired behavior emphasis
        weight_dist = 0.005
        weight_vel = 0.01
        weight_angle = 0.005
        weight_stab = 0.05

        # Calculate individual penalty components (used within this function)
        dist_penalty_val = np.sqrt(x**2 + y_potential**2)
        vel_penalty_val = np.sqrt(vx**2 + vy**2)
        angle_penalty_val = abs(angle)
        stab_penalty_val = abs(angular_velocity)

        return (
            -weight_dist * dist_penalty_val
            - weight_vel * vel_penalty_val
            - weight_angle * angle_penalty_val
            - weight_stab * stab_penalty_val
        )

    # Calculate shaping reward: gamma * Potential(s') - Potential(s)
    potential_before = potential(state_before)
    potential_after = potential(state_after)
    shaping_reward = gamma * potential_after - potential_before
    total_reward += shaping_reward

    # 4. Time Penalty
    # Penalize each step to encourage faster completion
    total_reward += reward_config["time_penalty"]

    # --- Truncation Penalties (Applied if state_after is out of bounds/tipped) ---
    # These are added *in addition* to shaping and step penalties in the step they occur.
    # The environment should handle the actual truncation.
    if abs(x_after) > max_horizontal_pos or y_after > max_altitude:
        total_reward += reward_config["out_of_bounds"]

    if abs(angle_after) > tip_over_angle:
        total_reward += reward_config["tipped_over"]

    return float(total_reward), terminated_on_ground
