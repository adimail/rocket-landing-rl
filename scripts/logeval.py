import os
import re
import ast
import math
import pandas as pd
import matplotlib.pyplot as plt
from typing import Union, List, Optional
from datetime import datetime


class SimulationLogEval:
    def __init__(self, log_dir: str, output_dir: str, csv_dir: str):
        self.log_dir = log_dir
        self.output_dir = output_dir
        self.csv_dir = csv_dir
        self.dirs = {
            self.output_dir: False,
            self.csv_dir: False,
        }
        self._ensure_directories()

    def _ensure_directories(self):
        for path, must_exist in self.dirs.items():
            if must_exist:
                if not os.path.exists(path):
                    raise FileNotFoundError(
                        f"Required directory '{path}' does not exist."
                    )
            else:
                try:
                    os.makedirs(path, exist_ok=True)
                except Exception as e:
                    raise OSError(f"Failed to create directory '{path}': {e}")

    def _parse_step_log_line(
        self, line: str
    ) -> tuple[Optional[datetime], Optional[dict]]:
        pattern = r"^(?P<timestamp>[\d\-:, ]+) - .+? - DEBUG - StepLog: (?P<dict_data>\{.+\})$"
        match = re.match(pattern, line)
        if match:
            timestamp_str = match.group("timestamp").strip()
            try:
                timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S,%f")
                step_data = ast.literal_eval(match.group("dict_data"))
                return timestamp, step_data
            except Exception as e:
                print(f"[ERROR] Failed to parse log line at {timestamp_str}: {e}")
        return None, None

    def _extract_log_data(self, log_path: str) -> Optional[pd.DataFrame]:
        try:
            timestamps, states, rewards = [], [], []
            with open(log_path, "r") as file:
                for line in file:
                    timestamp, data = self._parse_step_log_line(line)
                    if timestamp and data:
                        timestamps.append(timestamp)
                        states.append(data["state"])
                        rewards.append(data["reward"])
            if not timestamps:
                print(f"[WARNING] No valid data parsed from {log_path}")
                return None
            df = pd.DataFrame(states)
            df["timestamp"] = timestamps
            df["reward"] = rewards
            df.set_index("timestamp", inplace=True)
            return df
        except Exception as e:
            print(f"[ERROR] Failed to extract data from {log_path}: {e}")
            return None

    def _plot_state_over_time(
        self,
        df: pd.DataFrame,
        state_keys: Union[str, List[str]],
        ylabel: Union[None, str, List[str]],
        output_path: str,
    ):
        if isinstance(state_keys, str):
            state_keys = [state_keys]

        if ylabel is None:
            ylabel = state_keys
        elif isinstance(ylabel, str):
            ylabel = [ylabel] * len(state_keys)
        elif isinstance(ylabel, list) and len(ylabel) != len(state_keys):
            raise ValueError("Length of 'ylabel' must match the number of 'state_keys'")

        for key in state_keys:
            if key not in df.columns:
                raise ValueError(f"'{key}' not found in dataframe columns")

        num_keys = len(state_keys)
        if num_keys == 1:
            plt.figure(figsize=(12, 6))
            plt.plot(df.index, df[state_keys[0]], label=state_keys[0], color="tab:blue")
            plt.xlabel("Time")
            plt.ylabel(ylabel[0])
            plt.title(f"{state_keys[0]} over time")
            plt.grid(True)
            plt.legend()
            plt.tight_layout()
            plt.savefig(output_path)
            # plt.show()
        else:
            ncols = 3
            nrows = math.ceil(num_keys / ncols)
            fig, axes = plt.subplots(
                nrows=nrows, ncols=ncols, figsize=(14, 4 * nrows), sharex=True
            )
            axes = axes.flatten()

            for i, key in enumerate(state_keys):
                axes[i].plot(df.index, df[key], label=key, color="tab:blue")
                axes[i].set_ylabel(ylabel[i])
                axes[i].set_title(f"{key} over time")
                axes[i].grid(True)
                axes[i].legend()

            for j in range(len(state_keys), len(axes)):
                fig.delaxes(axes[j])

            fig.supxlabel("Time")
            plt.tight_layout()
            plt.savefig(output_path)
            # plt.show()

    def _save_csv(self, df: pd.DataFrame, log_file: str):
        csv_filename = os.path.splitext(log_file)[0] + ".csv"
        csv_path = os.path.join(self.csv_dir, csv_filename)
        try:
            df.to_csv(csv_path)
            print(f"[SUCCESS] CSV saved to {csv_path}")
        except Exception as e:
            print(f"[ERROR] Failed to save CSV for {log_file}: {e}")

    def process_all_logs(
        self,
        state_keys: List[str],
        ylabel: Optional[Union[str, List[str]]] = None,
    ):
        log_files = [
            f
            for f in os.listdir(self.log_dir)
            if f.endswith(".log") and os.path.isfile(os.path.join(self.log_dir, f))
        ]
        if not log_files:
            print(f"[INFO] No .log files found in '{self.log_dir}'")
            return

        for log_file in log_files:
            log_path = os.path.join(self.log_dir, log_file)
            print(f"[INFO] Processing '{log_path}'...")
            df = self._extract_log_data(log_path)
            if df is not None:
                self._save_csv(df, log_file)
                output_filename = os.path.splitext(log_file)[0] + ".jpg"
                output_path = os.path.join(self.output_dir, output_filename)
                try:
                    self._plot_state_over_time(df, state_keys, ylabel, output_path)
                    print(f"[SUCCESS] Plot saved to {output_path}")
                except Exception as e:
                    print(f"[ERROR] Plotting failed for {log_file}: {e}")


if __name__ == "__main__":
    state_keys = [
        "x",
        "y",
        "vx",
        "vy",
        "ax",
        "ay",
        "angle",
        "angularVelocity",
        "angularAcceleration",
        "mass",
        "fuelMass",
        "speed",
        "relativeAngle",
    ]

    eval = SimulationLogEval(
        log_dir="logs/simulations",
        output_dir="output/simulation-graphs",
        csv_dir="output/simulation-data",
    )
    eval.process_all_logs(state_keys=state_keys)
