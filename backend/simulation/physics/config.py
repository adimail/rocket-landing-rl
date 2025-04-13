import numpy as np
from backend.config import Config
from typing import List


cfg = Config()


def get_float_list(config_key: str, fallback: List[float]) -> List[float]:
    val = cfg.get(config_key)
    if (
        isinstance(val, list)
        and all(isinstance(v, (int, float)) for v in val)
        and len(val) == 2
    ):
        return [float(val[0]), float(val[1])]
    return fallback


x_limits: List[float] = get_float_list("rocket.initial_position_limits.x", [-50, 50])
y_limits: List[float] = get_float_list("rocket.initial_position_limits.y", [110, 150])

initial_x: float = float(np.random.uniform(x_limits[0], x_limits[1]))
initial_y: float = float(np.random.uniform(y_limits[0], y_limits[1]))

initial_vx = cfg.get("rocket.initial_velocity.vx") or -2.0
initial_vy = cfg.get("rocket.initial_velocity.vy") or -10.0
initial_ax = cfg.get("rocket.ax") or -2.0
initial_ay = cfg.get("rocket.ay") or -10.0
initial_angle = cfg.get("rocket.initial_state.angle") or 0.1
initial_angular_velocity = cfg.get("rocket.initial_state.angularVelocity") or 0.05
initial_mass = cfg.get("rocket.initial_state.mass") or 1.0
initial_fuel_mass = cfg.get("rocket.initial_state.fuelMass") or 0.5


def get_initial_state():
    return {
        "x": initial_x,
        "y": initial_y,
        "vx": initial_vx,
        "vy": initial_vy,
        "ax": initial_ax,
        "ay": initial_ay,
        "angle": initial_angle,
        "angularVelocity": initial_angular_velocity,
        "mass": initial_mass + initial_fuel_mass,
        "fuelMass": initial_fuel_mass,
    }


def get_environment_config():
    return {
        "gravity": cfg.get("env.gravity") or -9.81,
        "thrust_power": cfg.get("env.thrust_power") or 20.0,
        "gimbal_limit": cfg.get("env.gimbal_limit_deg") or 15,
        "fuel_consumption_rate": cfg.get("env.fuel_consumption_rate") or 0.1,
    }
