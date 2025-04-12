from tornado.ioloop import IOLoop
import tornado.websocket
import json
import threading
import time

from backend.physics.engine import RocketSimulator


class RocketWebSocketHandler(tornado.websocket.WebSocketHandler):
    def initialize(self, logger):
        self.logger = logger
        self.sim = RocketSimulator()
        self.client_connected = False
        self.stream_thread = None
        self.io_loop = IOLoop.current()

    def open(self):
        self.logger.info("WebSocket opened")
        self.client_connected = True

        self.stream_thread = threading.Thread(target=self.stream_state)
        self.stream_thread.daemon = True
        self.stream_thread.start()

    def on_close(self):
        self.logger.info("WebSocket closed")
        self.client_connected = False

    def on_message(self, message):
        try:
            data = json.loads(message)

            command = data.get("command")
            if command:
                if command == "pause":
                    self.sim.paused = True
                elif command == "start":
                    self.sim.paused = False
                elif command == "restart":
                    self.sim.reset()
                    self.sim.paused = True
                return

            throttle = data.get("throttle", 0.0)
            gimbal = data.get("gimbal", 0.0)

            if not self.sim.paused:
                state, reward, done = self.sim.step((throttle, gimbal))
                self.send_json({"state": state, "reward": reward, "done": done})

        except Exception as e:
            self.logger.error(f"WebSocket message handling failed: {e}")

    def send_json(self, payload: dict):
        try:
            self.write_message(json.dumps(payload))
        except Exception as e:
            self.logger.error(f"Failed to send message: {e}")

    def stream_state(self):
        while self.client_connected:
            try:
                if not self.sim.paused and not self.sim.done:
                    state, reward, done = self.sim.step((0.0, 0.0))
                    self.io_loop.add_callback(
                        self.send_json,
                        {
                            "state": state,
                            "reward": reward,
                            "done": done,
                            "time": self.sim.time,
                        },
                    )
                elif self.sim.done:
                    state = self.sim.rocket.get_state()
                    self.io_loop.add_callback(
                        self.send_json,
                        {"state": state, "done": True, "time": self.sim.time},
                    )
                    time.sleep(0.5)
                else:
                    state = self.sim.rocket.get_state()
                    self.io_loop.add_callback(
                        self.send_json,
                        {"state": state, "paused": True, "time": self.sim.time},
                    )
                    time.sleep(0.5)

                time.sleep(0.1)

            except Exception as e:
                self.logger.error(f"Error during streaming: {e}")
                break
