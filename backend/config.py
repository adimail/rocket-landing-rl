import os
import yaml
from typing import Any, TypeVar, Optional, cast

T = TypeVar("T")


class Config:
    def __init__(self, config_path: Optional[str] = None) -> None:
        # Determine the base directory (one level above the current file's directory)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.config_path = config_path or os.path.join(base_dir, "config.yaml")
        self._config = self._load_config()

    def _load_config(self) -> dict[str, Any]:
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"Config file not found at {self.config_path}")
        with open(self.config_path, "r") as f:
            return yaml.safe_load(f) or {}

    def get(self, key_path: str, default: Optional[T] = None) -> Optional[T]:
        """
        Access nested config values using dot notation.

        Example:
            get("app.PORT", 8000) -> 8080
        """
        keys = key_path.split(".")
        val: Any = self._config
        for key in keys:
            if isinstance(val, dict) and key in val:
                val = val[key]
            else:
                return default
        return cast(Optional[T], val)

    def as_dict(self) -> dict[str, Any]:
        """
        Get the entire config as a dictionary.
        """
        return self._config

    def reload(self) -> dict[str, Any]:
        """
        Reload config from disk (e.g., if config.yaml changes at runtime).
        """
        self._config = self._load_config()
        return self._config

    def __getitem__(self, key: str) -> Any:
        return self._config[key]

    def __repr__(self) -> str:
        return f"<Config file={self.config_path} keys={list(self._config.keys())}>"
