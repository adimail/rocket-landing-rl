from tornado.ioloop import IOLoop
import tornado.websocket
import json

from backend.simulation import SimulationController


class RocketWebSocketHandler(tornado.websocket.WebSocketHandler):
    def initialize(self, logger):
        self.logger = logger
        self.sim = SimulationController()
        self.client_connected = False
        self.io_loop = IOLoop.current()

    def open(self):
        self.logger.info("WebSocket opened")
        self.client_connected = True

        try:
            state = self.sim.reset()
            self.send_json({"state": state, "initial": True})

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
                self.sim.set_action((throttle, cold_gas_control))

        except Exception as e:
            self.logger.error(f"WebSocket message handling failed: {e}")

    def handle_command(self, command: str):
        try:
            if command == "pause":
                self.sim.pause()
            elif command == "start":
                self.sim.start(self.send_state_update)
            elif command == "restart":
                state = self.sim.reset()
                self.send_json({"state": state, "restart": True})
        except Exception as e:
            self.logger.error(f"Command handling failed: {e}")

    def send_json(self, payload: dict):
        try:
            self.write_message(json.dumps(payload))
        except Exception as e:
            self.logger.error(f"Failed to send message: {e}")

    def send_state_update(self, state, reward, done):
        try:
            if done:
                safeSpeedThreshold = self.sim.rocket.config.get(
                    "env.safeSpeedThreshold"
                )
                safeAngleThreshold = self.sim.rocket.config.get(
                    "env.safeAngleThreshold"
                )

                is_safe = (
                    state["speed"] <= safeSpeedThreshold
                    and state["relativeAngle"] <= safeAngleThreshold
                )
                landingMessage = "safe" if is_safe else "unsafe"

                self.io_loop.add_callback(
                    self.send_json,
                    {
                        "message": "Simulation over",
                        "landing": landingMessage,
                        "state": state,
                        "done": True,
                    },
                )
                self.logger.info(f"Simulation over. Landing is {landingMessage}")

            else:
                self.io_loop.add_callback(
                    self.send_json,
                    {
                        "state": state,
                        "reward": reward,
                        "done": done,
                    },
                )

        except Exception as e:
            self.logger.error(f"Failed to send state update: {e}")
