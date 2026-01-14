import os
from tornado.ioloop import IOLoop
from backend.config import Config
import tornado.websocket
import json
from typing import Dict, List, Optional
from backend.simulation import SimulationController
from backend.utils import evaluate_landing
from backend.rl.agent import RLAgent
from backend.protocol import BinaryProtocol


class RocketWebSocketHandler(tornado.websocket.WebSocketHandler):
    def check_origin(self, _origin):
        return True

    def initialize(self, logger):
        self.logger = logger
        self.config = Config()
        self.num_rockets = self.config.get("environment.num_rockets")
        self.model_version = self.config.get("model.version")
        self.rl_agent_instance: Optional[RLAgent] = None
        self._get_model()
        self.sim = SimulationController(
            self.num_rockets, rl_agent=self.rl_agent_instance
        )
        self.client_connected = False
        self.io_loop = IOLoop.current()
        self.final_outcomes = {}

    def _get_model(self):
        if self.model_version:
            try:
                base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
                model_path = os.path.join(
                    base_dir, "assets", "model", self.model_version, "best_model.zip"
                )
                stats_path = os.path.join(
                    base_dir, "assets", "model", self.model_version, "vecnormalize.pkl"
                )
                if os.path.exists(model_path) and os.path.exists(stats_path):
                    self.rl_agent_instance = RLAgent(
                        model_path=model_path, vec_normalize_path=stats_path
                    )
                    self.logger.info(
                        f"RL Agent (version {self.model_version}) loaded successfully."
                    )
            except Exception as e:
                self.logger.error(f"Failed to initialize RL Agent: {e}", exc_info=True)

    def open(self):
        self.logger.info("WebSocket opened")
        self.client_connected = True
        try:
            states = self.sim.reset()
            self.final_outcomes = {}
            self.send_json(
                {
                    "step": {
                        "state": states,
                        "reward": None,
                        "done": [False] * self.num_rockets,
                        "prev_action_taken": None,
                    },
                    "initial": True,
                }
            )
            self.broadcast_status()
        except Exception as e:
            self.logger.error(f"Failed to send initial state: {e}")

    def on_close(self):
        self.logger.info("WebSocket closed")
        self.client_connected = False
        self.sim.stop()

    def on_message(self, message):
        try:
            data = json.loads(message)
            if "command" in data:
                command = data["command"]
                if command == "toggle_agent":
                    if self.sim.rl_agent:
                        self.sim.agent_enabled = not self.sim.agent_enabled
                        self.broadcast_status()
                    return
                else:
                    self.handle_command(command)
                    return
            if "action" in data and "rocket_index" in data:
                self.sim.set_action(data["action"], int(data["rocket_index"]))
                return
        except Exception as e:
            self.logger.error(f"WebSocket message handling failed: {e}")

    def handle_command(self, command: str):
        if command == "pause":
            self.sim.pause()
        elif command == "start":
            self.sim.start(self.send_state_update)
        elif command == "restart":
            self.io_loop.call_later(0.1, self._initiate_restart)
        self.broadcast_status()

    def broadcast_status(self):
        status_msg = "paused" if self.sim.paused else "playing"
        self.send_json(
            {
                "status": status_msg,
                "agent_enabled": self.sim.agent_enabled,
            }
        )

    def send_json(self, payload: dict):
        try:
            self.write_message(json.dumps(payload))
        except Exception as e:
            self.logger.error(f"Failed to send message: {e}")

    def send_binary_telemetry(
        self,
        states: List[Optional[dict]],
        rewards: List[Optional[float]],
        _dones: List[bool],
        actions: List[Dict[str, float]],
        landing_statuses: List[Optional[str]],
    ):
        try:
            data = bytearray()
            data.extend(BinaryProtocol.encode_telemetry_header())
            for i in range(self.num_rockets):
                landing_str = landing_statuses[i]
                if landing_str is None and i in self.final_outcomes:
                    landing_str = self.final_outcomes[i]["status"]

                chunk = BinaryProtocol.encode_rocket_state(
                    state=states[i],
                    reward=rewards[i],
                    action=actions[i],
                    landing_status=landing_str,
                )
                data.extend(chunk)
            self.write_message(bytes(data), binary=True)
        except Exception as e:
            self.logger.error(f"Failed to send binary telemetry: {e}")

    def send_state_update(
        self,
        states: List[Optional[dict]],
        rewards: List[Optional[float]],
        dones: List[bool],
    ):
        try:
            prev_actions = self.sim.prev_action_taken.copy()
            actions_for_payload: List[Dict[str, float]] = []
            landing_statuses: List[Optional[str]] = [None] * self.num_rockets

            for i in range(self.num_rockets):
                actions_for_payload.append(
                    prev_actions[i]
                    if states[i] and not dones[i]
                    else {"throttle": 0.0, "coldGas": 0.0}
                )
                if dones[i] and states[i] is not None:
                    landing_eval = evaluate_landing(states[i], self.config)
                    status_str = landing_eval["landing_message"]
                    landing_statuses[i] = status_str
                    self.final_outcomes[i] = {
                        "status": status_str,
                        "reward": rewards[i],
                    }

            self.io_loop.add_callback(
                self.send_binary_telemetry,
                states,
                rewards,
                dones,
                actions_for_payload,
                landing_statuses,
            )

            if all(dones):
                self.broadcast_status()
                if self.config.get("simulation.loop"):
                    self.io_loop.call_later(0.1, self._initiate_restart)
        except Exception as e:
            self.logger.error(f"Failed to prepare state update: {e}")

    def _initiate_restart(self):
        states = self.sim.reset()
        self.final_outcomes = {}
        self.send_json(
            {
                "step": {
                    "state": states,
                    "reward": None,
                    "done": [False] * self.num_rockets,
                    "prev_action_taken": None,
                },
                "restart": True,
            }
        )
        self.broadcast_status()
