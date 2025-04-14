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
            self.send_json({"state": states, "initial": True})

        except Exception as e:
            self.logger.error(f"Failed to send initial state: {e}")

    def on_close(self):
        self.logger.info("WebSocket closed")
        self.client_connected = False
        self.sim.pause()

    def on_message(self, message):
        try:
            data = json.loads(message)
            command = data.get("command")
            if command:
                self.handle_command(command)
                return

            if "speed" in data:
                speed = float(data["speed"])
                self.sim.sim_speed = max(speed, 0.01)
                return

            throttle = data.get("throttle", 0.0)
            cold_gas_control = data.get("coldGasControl", 0.0)

            if not self.sim.paused:
                actions = [(throttle, cold_gas_control)] * self.sim.num_rockets
                self.sim.set_action(actions)

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
                self.send_json({"state": states, "restart": True})
        except Exception as e:
            self.logger.error(f"Command handling failed: {e}")

    def send_json(self, payload: dict):
        try:
            self.write_message(json.dumps(payload))
        except Exception as e:
            self.logger.error(f"Failed to send message: {e}")

    def send_state_update(self, states, rewards, dones):
        try:
            all_done = all(dones)
            if all_done:
                safeSpeedThreshold = self.sim.rockets[0].rocket.config.get(
                    "env.safeSpeedThreshold"
                )
                safeAngleThreshold = self.sim.rockets[0].rocket.config.get(
                    "env.safeAngleThreshold"
                )

                landing_messages = []
                for state in states:
                    is_safe = (
                        state["speed"] <= safeSpeedThreshold
                        and state["relativeAngle"] <= safeAngleThreshold
                    )
                    landing_messages.append("safe" if is_safe else "unsafe")

                self.io_loop.add_callback(
                    self.send_json,
                    {
                        "landing": landing_messages,
                        "state": states,
                        "done": True,
                    },
                )
                self.logger.info(f"Simulation over. Landing are {landing_messages}")

                if self.config.get("env.loop"):
                    self.logger.info("[LOOP] Restarting simulation...")
                    states = self.sim.reset()
                    self.sim.start(self.send_state_update)
                    self.send_json({"state": states, "restart": True})

            else:
                self.io_loop.add_callback(
                    self.send_json,
                    {
                        "state": states,
                        "reward": rewards,
                        "done": dones,
                    },
                )

        except Exception as e:
            self.logger.error(f"Failed to send state update: {e}")
