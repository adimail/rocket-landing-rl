def evaluate_landing(state, config):
    vx = state.get("vx", float("inf"))
    vy = state.get("vy", float("inf"))
    angle_deg = state.get("angle", float("inf"))

    safe_vx = config.get("env.safeSpeedThresholdVx") or 20.0
    safe_vy = config.get("env.safeSpeedThresholdVy") or 20.0
    safe_angle = config.get("env.safeAngleThresholdDeg") or 5.0

    good_vx = config.get("env.goodSpeedThresholdVx") or 30.0
    good_vy = config.get("env.goodSpeedThresholdVy") or 30.0
    good_angle = config.get("env.goodAngleThresholdDeg") or 5.0

    ok_vx = config.get("env.okSpeedThresholdVx") or 40.0
    ok_vy = config.get("env.okSpeedThresholdVy") or 40.0
    ok_angle = config.get("env.okAngleThresholdDeg") or 80.0

    is_perfect = abs(vx) < safe_vx and abs(vy) < safe_vy and abs(angle_deg) < safe_angle
    is_good = abs(vx) < good_vx and abs(vy) < good_vy and abs(angle_deg) < good_angle
    is_ok = abs(vx) < ok_vx and abs(vy) < ok_vy and abs(angle_deg) < ok_angle

    if is_perfect:
        landing_message = "safe"
    elif is_good:
        landing_message = "good"
    elif is_ok:
        landing_message = "ok"
    else:
        landing_message = "unsafe"

    return {
        "vx": vx,
        "vy": vy,
        "angle": angle_deg,
        "landing_message": landing_message,
    }
