import numpy as np
from backend.config import Config
from typing import List

cfg = Config()


def get_float_list(config_key: str, fallback: List[float]) -> List[float]:
    """Get a list of two floats from config, with fallback value if not found."""
    val = cfg.get(config_key)
    if (
        isinstance(val, list)
        and len(val) == 2
        and all(isinstance(v, (int, float)) for v in val)
    ):
        return [float(val[0]), float(val[1])]
    return fallback


def get_random_in_range(range_key: str, fallback: List[float]) -> float:
    """Get a random value within a specified range from config."""
    range_values = get_float_list(range_key, fallback)
    return float(np.random.uniform(range_values[0], range_values[1]))


def get_initial_state():
    x = round(get_random_in_range("rocket.position_limits.x", [-2000.0, 2000.0]), 2)
    y = round(get_random_in_range("rocket.position_limits.y", [2000.0, 2300.0]), 2)

    vx = round(get_random_in_range("rocket.velocity_limits.vx", [-30.0, -10.0]), 2)
    vy = round(get_random_in_range("rocket.velocity_limits.vy", [-250.0, -230.0]), 2)

    ax = round(get_random_in_range("rocket.acceleration_limits.ax", [-5.0, 5.0]), 2)
    ay = round(get_random_in_range("rocket.acceleration_limits.ay", [-5.0, 5.0]), 2)

    angle = round(get_random_in_range("rocket.attitude_limits.angle", [-15.0, 15.0]), 2)
    angular_velocity = round(
        get_random_in_range("rocket.attitude_limits.angular_velocity", [-7.5, 7.5]),
        2,
    )

    dry_mass = round(
        get_random_in_range("rocket.mass_limits.dry_mass", [34000.0, 38000.0]), 2
    )
    fuel_mass = round(
        get_random_in_range("rocket.mass_limits.fuel_mass", [370000.0, 410000.0]),
        2,
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
        "mass": dry_mass,
        "fuelMass": fuel_mass,
    }


def get_environment_config():
    return {
        "gravity": cfg.get("environment.gravity") or -9.81,  # Corrected key
        "thrust_power": cfg.get("rocket.thrust_power") or 15000000,
        "cold_gas_thrust_power": cfg.get("rocket.cold_gas_thrust_power") or 70000,
        "fuel_consumption_rate": cfg.get("rocket.fuel_consumption_rate") or 1700,
        "max_step": cfg.get("simulation.max_steps") or 1000,
        "air_density": cfg.get("environment.air_density") or 1.225,
        "num_rockets": cfg.get("environment.num_rockets") or 2,
        "time_step": cfg.get("simulation.time_step") or 0.1,
        "sim_speed": cfg.get("simulation.speed") or 1,
        "sim_loop": cfg.get("simulation.loop") or False,
    }


def get_rl_config():
    def get_limit(key, index, fallback):
        val = cfg.get(key)
        if (
            isinstance(val, list)
            and len(val) > index
            and isinstance(val[index], (int, float))
        ):
            return float(val[index])
        return fallback

    return {
        # Position limits
        "min_pos_x": get_limit("rocket.position_limits.x", 0, -2000.0),
        "max_pos_x": get_limit("rocket.position_limits.x", 1, 2000.0),
        "min_pos_y": get_limit("rocket.position_limits.y", 0, 2000.0),
        "max_pos_y": get_limit("rocket.position_limits.y", 1, 2300.0),
        # Velocity limits
        "min_vel_x": get_limit("rocket.velocity_limits.vx", 0, -30.0),
        "max_vel_x": get_limit("rocket.velocity_limits.vx", 1, -10.0),
        "min_vel_y": get_limit("rocket.velocity_limits.vy", 0, -250.0),
        "max_vel_y": get_limit("rocket.velocity_limits.vy", 1, -230.0),
        # Acceleration limits
        "min_acc_x": get_limit("rocket.acceleration_limits.ax", 0, -5.0),
        "max_acc_x": get_limit("rocket.acceleration_limits.ax", 1, 5.0),
        "min_acc_y": get_limit("rocket.acceleration_limits.ay", 0, -5.0),
        "max_acc_y": get_limit("rocket.acceleration_limits.ay", 1, 5.0),
        # Attitude limits
        "min_angle": get_limit("rocket.attitude_limits.angle", 0, -15.0),
        "max_angle": get_limit("rocket.attitude_limits.angle", 1, 15.0),
        "min_angular_velocity": get_limit(
            "rocket.attitude_limits.angular_velocity", 0, -7.5
        ),
        "max_angular_velocity": get_limit(
            "rocket.attitude_limits.angular_velocity", 1, 7.5
        ),
        # Mass limits
        "min_dry_mass": get_limit("rocket.mass_limits.dry_mass", 0, 34000.0),
        "max_dry_mass": get_limit("rocket.mass_limits.dry_mass", 1, 38000.0),
        "min_fuel_mass": get_limit("rocket.mass_limits.fuel_mass", 0, 370000.0),
        "max_fuel_mass": get_limit("rocket.mass_limits.fuel_mass", 1, 410000.0),
    }


def get_physics_config():
    return {
        "air_density": cfg.get("environment.air_density") or 1.225,
        "drag_coefficient": cfg.get("rocket.drag_coefficient") or 0.8,
        "reference_area": cfg.get("rocket.reference_area") or 10.8,
        "rocket_radius": cfg.get("rocket.radius") or 1.85,
        "cold_gas_moment_arm": cfg.get("rocket.cold_gas_moment_arm") or 1.85,
        "angular_damping": cfg.get("rocket.angular_damping") or 0.05,
    }
