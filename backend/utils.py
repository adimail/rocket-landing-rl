def evaluate_landing(state, config):
    vx = state.get("vx", float("inf"))
    vy = state.get("vy", float("inf"))
    angle_deg = state.get("angle", float("inf"))

    safe_vx = config.get("landing.thresholds.perfect.speed_vx") or 20.0
    safe_vy = config.get("landing.thresholds.perfect.speed_vy") or 20.0
    safe_angle = config.get("landing.thresholds.perfect.angle") or 5.0

    good_vx = config.get("landing.thresholds.good.speed_vx") or 30.0
    good_vy = config.get("landing.thresholds.good.speed_vy") or 30.0
    good_angle = config.get("landing.thresholds.good.angle") or 5.0

    ok_vx = config.get("landing.thresholds.ok.speed_vx") or 40.0
    ok_vy = config.get("landing.thresholds.ok.speed_vy") or 40.0
    ok_angle = config.get("landing.thresholds.ok.angle") or 80.0

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
