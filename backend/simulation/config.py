import numpy as np
from backend.config import Config
from typing import List

cfg = Config()


def get_float_list(config_key: str, fallback: List[float]) -> List[float]:
    """Get a list of two floats from config, with fallback value if not found."""
    val = cfg.get(config_key)
    if (
        isinstance(val, list)
        and all(isinstance(v, (int, float)) for v in val)
        and len(val) == 2
    ):
        return [float(val[0]), float(val[1])]
    return fallback


def get_random_in_range(range_key: str, fallback: List[float]) -> float:
    """Get a random value within a specified range from config."""
    range_values = get_float_list(range_key, fallback)
    return float(np.random.uniform(range_values[0], range_values[1]))


def get_initial_state():
    # Position randomization
    x = get_random_in_range("rocket.position_limits.x", [-50.0, 50.0])
    y = get_random_in_range("rocket.position_limits.y", [150.0, 190.0])

    # Velocity randomization
    vx = get_random_in_range("rocket.velocity_limits.vx", [-3.0, -1.0])
    vy = get_random_in_range("rocket.velocity_limits.vy", [-13.0, -7.0])

    # Acceleration randomization
    ax = get_random_in_range("rocket.acceleration_limits.ax", [-0.5, 0.5])
    ay = get_random_in_range("rocket.acceleration_limits.ay", [-0.5, 0.5])

    # Attitude randomization
    angle = get_random_in_range("rocket.attitude_limits.angle", [0.0, 0.4])
    angular_velocity = get_random_in_range(
        "rocket.attitude_limits.angularVelocity", [0.0, 0.16]
    )

    # Mass randomization
    mass = get_random_in_range("rocket.mass_limits.mass", [34000, 38000])
    fuel_mass = get_random_in_range("rocket.mass_limits.fuelMass", [370000, 410000])

    return {
        "x": x,
        "y": y,
        "vx": vx,
        "vy": vy,
        "ax": ax,
        "ay": ay,
        "angle": angle,
        "angularVelocity": angular_velocity,
        "mass": mass,
        "fuelMass": fuel_mass,
    }


def get_environment_config():
    return {
        "gravity": cfg.get("env.gravity") or -9.81,
        "thrust_power": cfg.get("env.thrust_power") or 20.0,
        "cold_gas_thrust_power": cfg.get("env.cold_gas_thrust_power") or 15,
        "fuel_consumption_rate": cfg.get("env.fuel_consumption_rate") or 0.1,
        "max_step": cfg.get("env.max_step") or 1000,
    }
