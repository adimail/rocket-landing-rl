import numpy as np
from typing import Tuple

from backend.config import Config

try:
    _config_loader = Config()
    _reward_config = _config_loader.get("rl.rewards")
    _landing_config = _config_loader.get("landing.thresholds")
except Exception as e:
    print(f"FATAL ERROR: Could not load configuration for reward calculation: {e}")
    _reward_config = {}
    _landing_config = {}


def calculate_reward(
    state_before,
    action,
    state_after,
) -> Tuple[float, bool]:
    """
    Calculates the reward for a state transition in the rocket landing environment.
    Loads its own configuration from config.yaml via the Config class.

    Args:
        state_before: Dictionary representing the rocket's state before the action.
        action: The action taken by the agent (e.g., {'throttle': t, 'coldGas': c} or [t, c]).
        state_after: Dictionary representing the rocket's state after the action.

    Returns:
        A tuple containing:
            - reward (float): The calculated reward for the step.
            - terminated_on_ground (bool): True if the episode terminated specifically
                                           due to ground contact (landing or crash)
                                           in this step, False otherwise.
    """
    reward_config = _reward_config
    gamma = reward_config.get("gamma", 0.99)

    total_reward = 0.0
    terminated_on_ground = False

    # Extract state values
    y = state_after.get("y", 0.0)
    vx = state_after.get("vx", 0.0)
    vy = state_after.get("vy", 0.0)
    angle = state_after.get("angle", 0.0)
    # angular_velocity = state_after.get("angularVelocity", 0.0)

    angle_before = state_before.get("angle", 0.0)
    angular_velocity_before = state_before.get("angularVelocity", 0.0)

    # Parse action
    throttle = cold_gas = 0.0
    if isinstance(action, dict):
        throttle = float(action.get("throttle", 0.0))
        cold_gas = float(action.get("coldGas", 0.0))
    elif isinstance(action, (list, tuple, np.ndarray)):
        throttle, cold_gas = float(action[0]), float(action[1])

    # --- TERMINATION ON GROUND ---
    if y <= 0.1:
        terminated_on_ground = True
        land_cfg = _landing_config.get("ok", {})
        land_vx = land_cfg.get("speed_vx", 30.0)
        land_vy = land_cfg.get("speed_vy", 30.0)
        land_angle = land_cfg.get("angle", 5.0)

        if abs(vx) < land_vx and abs(vy) < land_vy and abs(angle) < land_angle:
            total_reward += reward_config.get("landing", 1000.0)
        else:
            total_reward += reward_config.get("crash_ground", -192.0)
        return total_reward, terminated_on_ground

    # --- ANGULAR CONTROL REWARD ---
    # Positive angle (right tilt) -> cold_gas should be negative (left)
    reward_angular_correction = (
        -angle_before * cold_gas - angular_velocity_before * cold_gas
    )
    total_reward += 1.0 * reward_angular_correction  # Scale factor

    # --- VERTICAL DESCENT REWARD ---
    if vy < 0:
        descent_speed = abs(vy)
        log_descent_reward = np.log1p(descent_speed)
        total_reward += 5 * throttle * log_descent_reward
    elif vy > 0:
        total_reward -= 0.5 * vy  # Penalize upward movement

    # --- POTENTIAL-BASED SHAPING ---
    def potential(state):
        x, y = state["x"], state["y"]
        vx, vy = state["vx"], state["vy"]
        angle = state["angle"]
        angular_velocity = state["angularVelocity"]

        dist_penalty = np.sqrt(x**2 + y**2)
        vel_penalty = np.sqrt(vx**2 + vy**2)
        angle_penalty = 1 - np.cos(np.radians(angle))
        stab_penalty = abs(angular_velocity)

        return (
            -0.001 * dist_penalty
            - 0.002 * vel_penalty
            - 0.005 * angle_penalty
            - 0.2 * stab_penalty
        )

    potential_before = potential(state_before)
    potential_after = potential(state_after)
    shaping_reward = gamma * potential_after - potential_before
    total_reward += shaping_reward

    return float(total_reward), terminated_on_ground
