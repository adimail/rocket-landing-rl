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
    x = round(get_random_in_range("rocket.position_limits.x", [-50.0, 50.0]), 2)
    y = round(get_random_in_range("rocket.position_limits.y", [150.0, 190.0]), 2)

    # Velocity randomization
    vx = round(get_random_in_range("rocket.velocity_limits.vx", [-3.0, -1.0]), 2)
    vy = round(get_random_in_range("rocket.velocity_limits.vy", [-13.0, -7.0]), 2)

    # Acceleration randomization
    ax = round(get_random_in_range("rocket.acceleration_limits.ax", [-0.5, 0.5]), 2)
    ay = round(get_random_in_range("rocket.acceleration_limits.ay", [-0.5, 0.5]), 2)

    # Attitude randomization
    angle = round(get_random_in_range("rocket.attitude_limits.angle", [0.0, 0.4]), 2)
    angular_velocity = round(
        get_random_in_range("rocket.attitude_limits.angularVelocity", [0.0, 0.16]), 2
    )

    # Mass randomization
    mass = round(get_random_in_range("rocket.mass_limits.mass", [34000, 38000]), 2)
    fuel_mass = round(
        get_random_in_range("rocket.mass_limits.fuelMass", [370000, 410000]), 2
    )

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
        "max_step": cfg.get("env.max_steps") or 1000,
    }


def get_physics_config():
    return {
        "air_density": cfg.get("physics.air_density") or 1.225,  # kg/m³
        "drag_coefficient": cfg.get("physics.drag_coefficient") or 0.8,
        "reference_area": cfg.get("physics.reference_area") or 10.8,  # m²
        "rocket_radius": cfg.get("physics.rocket_radius") or 1.85,  # m
        "cold_gas_moment_arm": cfg.get("physics.cold_gas_moment_arm") or 1.85,  # m
        "angular_damping": cfg.get("physics.angular_damping") or 0.05,
    }
