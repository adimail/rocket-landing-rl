from backend.config import Config

cfg = Config()


DEFAULT_STATE = {
    "x": cfg.get("rocket.initial_state.x") or 0.0,
    "y": cfg.get("rocket.initial_state.y") or 100.0,
    "vx": cfg.get("rocket.initial_state.vx") or 0.0,
    "vy": cfg.get("rocket.initial_state.vy") or 0.0,
    "ax": cfg.get("rocket.initial_state.ax") or 0.0,
    "ay": cfg.get("rocket.initial_state.ay") or 0.0,
    "angle": cfg.get("rocket.initial_state.angle") or 0.0,
    "angularVelocity": cfg.get("rocket.initial_state.angularVelocity") or 0.0,
    "mass": cfg.get("rocket.initial_state.mass") or 1.0,
    "fuelMass": cfg.get("rocket.initial_state.fuelMass") or 0.5,
}

DEFAULT_CONFIG = {
    "gravity": cfg.get("env.gravity") or -9.81,
    "thrust_power": cfg.get("env.thrust_power") or 20.0,
    "gimbal_limit": cfg.get("env.gimbal_limit_deg") or 15,
    "fuel_consumption_rate": cfg.get("env.fuel_consumption_rate") or 0.1,
}
