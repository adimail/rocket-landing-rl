from tornado.ioloop import IOLoop
import tornado.websocket
import json
import threading
import time

from backend.simulation import SimulationController


class RocketWebSocketHandler(tornado.websocket.WebSocketHandler):
    def initialize(self, logger):
        self.logger = logger
        self.sim = SimulationController()
        self.client_connected = False
        self.stream_thread = None
        self.io_loop = IOLoop.current()

    def open(self):
        self.logger.info("WebSocket opened")
        self.client_connected = True

        try:
            state = self.sim.render()
            self.send_json({"state": state, "time": self.sim.time, "initial": True})
        except Exception as e:
            self.logger.error(f"Failed to send initial state: {e}")

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
                self.handle_command(command)
                return

            throttle = data.get("throttle", 0.0)
            gimbal = data.get("gimbal", 0.0)

            if not self.sim.paused and not self.sim.done:
                state, reward, done = self.sim.step((throttle, gimbal))
                self.send_json(
                    {
                        "state": state,
                        "reward": reward,
                        "done": done,
                        "time": self.sim.time,
                    }
                )
        except Exception as e:
            self.logger.error(f"WebSocket message handling failed: {e}")

    def handle_command(self, command: str):
        try:
            if command == "pause":
                self.sim.pause()
                self.logger.info("Simulation paused.")
            elif command == "start":
                self.sim.start()
                self.logger.info("Simulation started.")
            elif command == "restart":
                state = self.sim.reset()
                self.logger.info("Simulation restarted.")
                self.send_json({"state": state, "restart": True, "time": self.sim.time})
        except Exception as e:
            self.logger.error(f"Command handling failed: {e}")

    def send_json(self, payload: dict):
        try:
            self.write_message(json.dumps(payload))
        except Exception as e:
            self.logger.error(f"Failed to send message: {e}")

    def stream_state(self):
        sent_sim_over = False

        while self.client_connected:
            try:
                if self.sim.paused:
                    sent_sim_over = False
                    time.sleep(0.1)
                    continue

                if self.sim.done:
                    if not sent_sim_over:
                        state = self.sim.render()
                        self.io_loop.add_callback(
                            self.send_json,
                            {
                                "message": "sim over",
                                "state": state,
                                "done": True,
                                "time": self.sim.time,
                            },
                        )
                        self.logger.info(f"Simulation over.")
                        sent_sim_over = True
                    time.sleep(0.5)
                    continue

                sent_sim_over = False
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
                time.sleep(0.1)
            except Exception as e:
                self.logger.error(f"Error during streaming: {e}")
                break
