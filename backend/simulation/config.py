import numpy as np
from backend.config import Config
from typing import List

cfg = Config()


def get_float_list(config_key: str) -> List[float]:
    """Get a list of two floats from config. Throws error if invalid."""
    val = cfg.get(config_key)
    if (
        isinstance(val, list)
        and len(val) == 2
        and all(isinstance(v, (int, float)) for v in val)
    ):
        return [float(val[0]), float(val[1])]
    raise ValueError(f"Config key '{config_key}' must be a list of 2 numbers.")


def get_random_in_range(range_key: str) -> float:
    """Get a random value within a specified range from config."""
    range_values = get_float_list(range_key)
    return float(np.random.uniform(range_values[0], range_values[1]))


def get_initial_state():
    x = round(get_random_in_range("rocket.position_limits.x"), 2)
    y = round(get_random_in_range("rocket.position_limits.y"), 2)

    vx = round(get_random_in_range("rocket.velocity_limits.vx"), 2)
    vy = round(get_random_in_range("rocket.velocity_limits.vy"), 2)

    ax = round(get_random_in_range("rocket.acceleration_limits.ax"), 2)
    ay = round(get_random_in_range("rocket.acceleration_limits.ay"), 2)

    angle = round(get_random_in_range("rocket.attitude_limits.angle"), 2)
    angular_velocity = round(
        get_random_in_range("rocket.attitude_limits.angular_velocity"),
        2,
    )

    dry_mass = round(get_random_in_range("rocket.mass_limits.dry_mass"), 2)
    fuel_mass = round(get_random_in_range("rocket.mass_limits.fuel_mass"), 2)

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
        "gravity": cfg.get("environment.gravity"),
        "thrust_power": cfg.get("rocket.thrust_power"),
        "cold_gas_thrust_power": cfg.get("rocket.cold_gas_thrust_power"),
        "fuel_consumption_rate": cfg.get("rocket.fuel_consumption_rate"),
        "max_step": cfg.get("simulation.max_steps"),
        "air_density": cfg.get("environment.air_density"),
        "num_rockets": cfg.get("environment.num_rockets"),
        "time_step": cfg.get("simulation.time_step"),
        "sim_speed": cfg.get("simulation.speed"),
        "sim_loop": cfg.get("simulation.loop"),
    }


def get_rl_config():
    def get_limit(key, index):
        val = cfg.get(key)
        if (
            isinstance(val, list)
            and len(val) > index
            and isinstance(val[index], (int, float))
        ):
            return float(val[index])
        raise ValueError(f"Config key '{key}' is invalid or too short.")

    return {
        "max_episode_steps": cfg.get("rl.max_episode_steps"),
        # Position limits
        "min_pos_x": get_limit("rocket.position_limits.x", 0),
        "max_pos_x": get_limit("rocket.position_limits.x", 1),
        "min_pos_y": get_limit("rocket.position_limits.y", 0),
        "max_pos_y": get_limit("rocket.position_limits.y", 1),
        # Velocity limits
        "min_vel_x": get_limit("rocket.velocity_limits.vx", 0),
        "max_vel_x": get_limit("rocket.velocity_limits.vx", 1),
        "min_vel_y": get_limit("rocket.velocity_limits.vy", 0),
        "max_vel_y": get_limit("rocket.velocity_limits.vy", 1),
        # Acceleration limits
        "min_acc_x": get_limit("rocket.acceleration_limits.ax", 0),
        "max_acc_x": get_limit("rocket.acceleration_limits.ax", 1),
        "min_acc_y": get_limit("rocket.acceleration_limits.ay", 0),
        "max_acc_y": get_limit("rocket.acceleration_limits.ay", 1),
        # Attitude limits
        "min_angle": get_limit("rocket.attitude_limits.angle", 0),
        "max_angle": get_limit("rocket.attitude_limits.angle", 1),
        "min_angular_velocity": get_limit("rocket.attitude_limits.angular_velocity", 0),
        "max_angular_velocity": get_limit("rocket.attitude_limits.angular_velocity", 1),
        # Mass limits
        "min_dry_mass": get_limit("rocket.mass_limits.dry_mass", 0),
        "max_dry_mass": get_limit("rocket.mass_limits.dry_mass", 1),
        "min_fuel_mass": get_limit("rocket.mass_limits.fuel_mass", 0),
        "max_fuel_mass": get_limit("rocket.mass_limits.fuel_mass", 1),
    }


def get_physics_config():
    return {
        "air_density": cfg.get("environment.air_density"),
        "drag_coefficient": cfg.get("rocket.drag_coefficient"),
        "reference_area": cfg.get("rocket.reference_area"),
        "rocket_radius": cfg.get("rocket.radius"),
        "cold_gas_moment_arm": cfg.get("rocket.cold_gas_moment_arm"),
        "angular_damping": cfg.get("rocket.angular_damping"),
    }
