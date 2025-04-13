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
            state = self.sim.reset()
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

            if not self.sim.paused and not self.sim.rocket.touchdown:
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
            elif command == "start":
                self.sim.start()
            elif command == "restart":
                state = self.sim.reset()
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
        step_counter = 0
        steps_per_message = int(0.1 / self.sim.dt)

        while self.client_connected:
            try:
                if self.sim.paused:
                    sent_sim_over = False
                    time.sleep(self.sim.dt)
                    continue

                if self.sim.rocket.touchdown:
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
                        self.logger.info("Simulation over.")
                        sent_sim_over = True
                    time.sleep(self.sim.dt)
                    continue

                state, reward, done = self.sim.step((0.0, 0.0))
                step_counter += 1

                if step_counter >= steps_per_message:
                    self.io_loop.add_callback(
                        self.send_json,
                        {
                            "state": state,
                            "reward": reward,
                            "done": done,
                            "time": self.sim.time,
                        },
                    )
                    step_counter = 0

                time.sleep(self.sim.dt)

            except Exception as e:
                self.logger.error(f"Error during streaming: {e}")
                break

    def reset_simulation(self):
        try:
            self.logger.info("Resetting simulation after ground touch...")
            state = self.sim.reset()
            self.send_json({"state": state, "time": self.sim.time, "initial": True})
        except Exception as e:
            self.logger.error(f"Failed to reset simulation: {e}")
