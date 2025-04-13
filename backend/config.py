import os
import yaml
from typing import Any


class Config:
    def __init__(self):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        self.config_path = os.path.join(base_dir, "config.yaml")
        self._config = self._load_config()

    def _load_config(self) -> dict[str, Any]:
        if not os.path.isfile(self.config_path):
            raise FileNotFoundError(f"Config file not found: {self.config_path}")
        try:
            with open(self.config_path, "r") as f:
                return yaml.safe_load(f) or {}
        except yaml.YAMLError as e:
            raise ValueError(f"Failed to parse YAML config: {e}")

    def get(self, key_path: str) -> Any:
        keys = key_path.split(".")
        val: Any = self._config

        for i, key in enumerate(keys):
            if not isinstance(val, dict):
                raise KeyError(
                    f"Invalid config path: '{'.'.join(keys[:i])}' is not a dict."
                )
            if key not in val:
                raise KeyError(f"Missing config key: '{'.'.join(keys[:i+1])}'")
            val = val[key]

        return val
