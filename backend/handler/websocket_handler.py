from tornado.ioloop import IOLoop
from backend.config import Config
import tornado.websocket
import json

from backend.simulation import SimulationController


class RocketWebSocketHandler(tornado.websocket.WebSocketHandler):
    def initialize(self, logger):
        self.logger = logger
        self.config = Config()
        num_rockets = self.config.get("env.num_rockets") or 1
        self.sim = SimulationController(num_rockets=num_rockets)
        self.client_connected = False
        self.io_loop = IOLoop.current()

    def open(self):
        self.logger.info("WebSocket opened")
        self.client_connected = True

        try:
            states = self.sim.reset()
            self.send_json(
                {
                    "step": {"state": states, "reward": None, "done": False},
                    "action": None,
                    "initial": True,
                }
            )
        except Exception as e:
            self.logger.error(f"Failed to send initial state: {e}")

    def on_close(self):
        self.logger.info("WebSocket closed")
        self.client_connected = False
        self.sim.pause()

    def on_message(self, message):
        try:
            data = json.loads(message)
            if "command" in data:
                self.handle_command(data["command"])
                return

            if "speed" in data:
                speed = float(data["speed"])
                self.sim.sim_speed = max(speed, 0.01)
                return

            if "action" in data:
                rocket_index = int(data.get("rocket_index", 0))
                action = data["action"]
                try:
                    if isinstance(action, dict):
                        throttle = float(action.get("throttle", 0.0))
                        cold_gas = float(action.get("coldGasControl", 0.0))
                        action_tuple = (throttle, cold_gas)
                    else:
                        action_tuple = (float(action[0]), float(action[1]))
                except Exception as inner_e:
                    self.logger.error(f"Parsing action failed: {inner_e}")
                    return

                self.sim.set_action(action_tuple, rocket_index)
                return

        except Exception as e:
            self.logger.error(f"WebSocket message handling failed: {e}")

    def handle_command(self, command: str):
        try:
            if command == "pause":
                self.sim.pause()
            elif command == "start":
                self.sim.start(self.send_state_update)
            elif command == "restart":
                states = self.sim.reset()
                self.send_json(
                    {
                        "step": {"state": states, "reward": None, "done": False},
                        "action": None,
                        "restart": True,
                    }
                )
        except Exception as e:
            self.logger.error(f"Command handling failed: {e}")

    def send_json(self, payload: dict):
        try:
            self.write_message(json.dumps(payload))
        except Exception as e:
            self.logger.error(f"Failed to send message: {e}")

    def send_state_update(self, states, rewards, dones):
        try:
            payload = {
                "step": {
                    "state": states,
                    "reward": rewards,
                    "done": dones,
                },
                "action": self.sim.current_actions,
            }

            all_done = all(dones)
            if all_done:
                safe_speed_threshold = self.sim.rockets[0].rocket.config.get(
                    "env.safeSpeedThreshold"
                )
                safe_angle_threshold = self.sim.rockets[0].rocket.config.get(
                    "env.safeAngleThreshold"
                )
                landing_messages = []
                for state in states:
                    is_safe = (
                        state.get("speed", 0) <= safe_speed_threshold
                        and state.get("relativeAngle", 0) <= safe_angle_threshold
                    )
                    landing_messages.append("safe" if is_safe else "unsafe")

                payload["landing"] = landing_messages
                self.logger.info(f"Simulation over. Landings are: {landing_messages}")

                payload["step"]["done"] = True

            self.io_loop.add_callback(self.send_json, payload)

            if all_done and self.config.get("env.loop"):
                self.logger.info("[LOOP] Restarting simulation...")
                states = self.sim.reset()
                self.sim.start(self.send_state_update)
                self.send_json(
                    {
                        "step": {"state": states, "reward": None, "done": False},
                        "action": None,
                        "restart": True,
                    }
                )

        except Exception as e:
            self.logger.error(f"Failed to send state update: {e}")
