import os
from tornado.ioloop import IOLoop
from backend.config import Config
import tornado.websocket
import json
from typing import Dict, List, Any, Optional

from backend.simulation import SimulationController
from backend.utils import evaluate_landing
from backend.rl.agent import RLAgent


class RocketWebSocketHandler(tornado.websocket.WebSocketHandler):
    def initialize(self, logger):
        self.logger = logger
        self.config = Config()
        num_rockets = self.config.get("environment.num_rockets") or 1

        rl_agent_instance: Optional[RLAgent] = None
        try:
            # TODO: Make these paths configurable or find the latest best model
            # Using relative paths from project root might be safer
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            model_path = os.path.join(base_dir, "assets", "best_model.zip")
            stats_path = os.path.join(base_dir, "assets", "vecnormalize.pkl")

            if os.path.exists(model_path) and os.path.exists(stats_path):
                rl_agent_instance = RLAgent(
                    model_path=model_path, vec_normalize_path=stats_path
                )
                self.logger.info("RL Agent loaded successfully.")
            else:
                self.logger.warning(
                    f"RL Agent model ({model_path}) or stats ({stats_path}) not found. Agent control disabled."
                )
        except Exception as e:
            self.logger.error(f"Failed to initialize RL Agent: {e}", exc_info=True)

        self.sim = SimulationController(num_rockets, rl_agent=rl_agent_instance)

        self.client_connected = False
        self.io_loop = IOLoop.current()

    def open(self):
        self.logger.info("WebSocket opened")
        self.client_connected = True

        try:
            states = self.sim.reset()
            self.send_json(
                {
                    "step": {
                        "state": states,
                        "reward": None,
                        "done": False,
                        "prev_action_taken": None,
                    },
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
                command = data["command"]
                if command == "toggle_agent":
                    if self.sim.rl_agent:
                        self.sim.agent_enabled = not self.sim.agent_enabled
                        status = "enabled" if self.sim.agent_enabled else "disabled"
                        self.logger.info(f"RL Agent control {status} by user.")
                        self.send_json({"status": f"Agent {status}"})
                    else:
                        self.logger.warning(
                            "Cannot toggle agent: Agent not loaded into SimulationController."
                        )
                        self.send_json({"status": "Agent not available"})
                    return
                else:
                    self.handle_command(command)
                    return

            if "speed" in data:
                speed = float(data["speed"])
                self.sim.sim_speed = max(speed, 0.01)
                return

            if "action" in data and "rocket_index" in data:
                rocket_index = int(data["rocket_index"])
                action_data = data["action"]

                if isinstance(action_data, dict):
                    try:
                        action_dict: Dict[str, float] = {
                            "throttle": float(action_data.get("throttle", 0.0)),
                            "coldGas": float(action_data.get("coldGas", 0.0)),
                        }
                        self.sim.set_action(action_dict, rocket_index)
                    except (ValueError, TypeError, KeyError) as inner_e:
                        self.logger.error(
                            f"Parsing user action failed: {inner_e} - Data: {action_data}"
                        )
                else:
                    self.logger.error(
                        f"Received user action is not a dictionary: {action_data}"
                    )
                return

            self.logger.warning(
                f"Received unrecognized message format: {message[:200]}..."
            )

        except json.JSONDecodeError as e:
            self.logger.error(
                f"Failed to decode JSON message: {e} - Message: {message[:200]}..."
            )
        except Exception as e:
            self.logger.error(
                f"WebSocket message handling failed: {e} - Message: {message[:200]}..."
            )

    def handle_command(self, command: str):
        try:
            if command == "pause":
                self.sim.pause()
            elif command == "start":
                self.sim.start(self.send_state_update)
            elif command == "restart":
                self.io_loop.call_later(0.1, self._initiate_restart)

        except Exception as e:
            self.logger.error(f"Command handling failed: {e}")

    def send_json(self, payload: dict):
        """Safely serialize and send a JSON payload."""
        try:
            message = json.dumps(payload)
            self.write_message(message)
        except TypeError as e:
            self.logger.error(
                f"Failed to serialize payload to JSON: {e} - Payload: {payload}"
            )
        except tornado.websocket.WebSocketClosedError:
            self.logger.warning("Attempted to send message on closed WebSocket.")
        except Exception as e:
            self.logger.error(f"Failed to send message: {e}")

    def send_state_update(
        self, states: List[Dict], rewards: List[float], dones: List[bool]
    ):
        """Callback function invoked by SimulationController after a step."""
        try:
            prev_action_taken = self.sim.prev_action_taken.copy()

            payload: Dict[str, Any] = {
                "step": {
                    "state": states,
                    "reward": rewards,
                    "done": dones,
                    "prev_action_taken": prev_action_taken,
                },
            }

            all_done = all(dones)
            if all_done:
                landing_messages = []

                for state in states:
                    msg = evaluate_landing(state, self.config)
                    landing_messages.append(msg["landing_message"])

                payload["landing"] = landing_messages
                self.logger.info(f"Landings: {landing_messages}")

            self.io_loop.add_callback(self.send_json, payload)

            if all_done and self.config.get("simulation.loop"):
                self.io_loop.call_later(0.1, self._initiate_restart)

        except Exception as e:
            self.logger.error(f"Failed to prepare or send state update: {e}")

    def _initiate_restart(self):
        try:
            states = self.sim.reset()
            self.send_json(
                {
                    "step": {
                        "state": states,
                        "reward": None,
                        "done": False,
                        "prev_action_taken": None,
                    },
                    "restart": True,
                }
            )
            self.sim.start(self.send_state_update)
        except Exception as e:
            self.logger.error(f"Failed during automatic restart: {e}")
