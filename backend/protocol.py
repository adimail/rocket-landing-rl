import struct
from typing import Dict, Optional


class BinaryProtocol:
    """
    Handles the binary serialization of telemetry data for the WebSocket.

    Format per rocket (16 floats = 64 bytes):
    0:  x
    1:  y
    2:  vx
    3:  vy
    4:  ax
    5:  ay
    6:  angle
    7:  angularVelocity
    8:  angularAcceleration
    9:  mass
    10: fuelMass
    11: reward (NaN if inactive)
    12: throttle
    13: coldGas
    14: landing_code (0=None, 1=Safe, 2=Good, 3=Ok, 4=Unsafe)
    15: is_active (1.0=Active, 0.0=Inactive/Null)
    """

    # 16 floats
    FORMAT = "16f"

    # Message Types
    MSG_TELEMETRY = 1

    @staticmethod
    def _get_landing_code(status: Optional[str]) -> float:
        if status == "safe":
            return 1.0
        elif status == "good":
            return 2.0
        elif status == "ok":
            return 3.0
        elif status in ["unsafe", "crash", "destroy", "failed"]:
            return 4.0
        return 0.0

    @staticmethod
    def encode_telemetry_header() -> bytes:
        """Returns the header byte for a telemetry message."""
        return struct.pack("B", BinaryProtocol.MSG_TELEMETRY)

    @staticmethod
    def encode_rocket_state(
        state: Optional[Dict],
        reward: Optional[float],
        action: Dict[str, float],
        landing_status: Optional[str],
    ) -> bytes:
        """
        Encodes a single rocket's state into a 64-byte binary chunk.
        """
        landing_code = BinaryProtocol._get_landing_code(landing_status)

        if state is None:
            # Inactive rocket
            # Send NaN for reward so frontend preserves last value
            return struct.pack(
                BinaryProtocol.FORMAT,
                *([0.0] * 11),  # x through fuelMass
                float("nan"),  # reward
                0.0,  # throttle
                0.0,  # coldGas
                landing_code,  # landing_code
                0.0,  # is_active = 0.0
            )
        else:
            # Active rocket
            safe_reward = reward if reward is not None else 0.0
            return struct.pack(
                BinaryProtocol.FORMAT,
                float(state.get("x", 0.0)),
                float(state.get("y", 0.0)),
                float(state.get("vx", 0.0)),
                float(state.get("vy", 0.0)),
                float(state.get("ax", 0.0)),
                float(state.get("ay", 0.0)),
                float(state.get("angle", 0.0)),
                float(state.get("angularVelocity", 0.0)),
                float(state.get("angularAcceleration", 0.0)),
                float(state.get("mass", 0.0)),
                float(state.get("fuelMass", 0.0)),
                float(safe_reward),
                float(action.get("throttle", 0.0)),
                float(action.get("coldGas", 0.0)),
                landing_code,
                1.0,  # is_active = 1.0
            )
