import os
import re
import ast
import math
import pandas as pd
import matplotlib.pyplot as plt
from typing import Union, List, Optional, Dict
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
        self.colors = [
            "tab:blue",
            "tab:orange",
            "tab:green",
            "tab:red",
            "tab:purple",
            "tab:brown",
            "tab:pink",
            "tab:gray",
            "tab:olive",
            "tab:cyan",
        ]

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

    def _extract_log_data(self, log_path: str) -> Dict[int, pd.DataFrame]:
        """Extract data grouped by rocket index"""
        try:
            # Dictionary to store data for each rocket index
            rocket_data = {}

            with open(log_path, "r") as file:
                for line in file:
                    timestamp, data = self._parse_step_log_line(line)
                    if timestamp and data:
                        rocket_index = data["rocket_index"]

                        # Initialize lists for this rocket if not already done
                        if rocket_index not in rocket_data:
                            rocket_data[rocket_index] = {
                                "timestamps": [],
                                "states": [],
                                "rewards": [],
                                "actions": [],
                            }

                        # Add data to appropriate lists
                        rocket_data[rocket_index]["timestamps"].append(timestamp)
                        rocket_data[rocket_index]["states"].append(data["state"])
                        rocket_data[rocket_index]["rewards"].append(data["reward"])
                        rocket_data[rocket_index]["actions"].append(
                            data.get("action", {})
                        )

            # Convert to DataFrames
            dataframes = {}
            for rocket_index, data in rocket_data.items():
                if not data["timestamps"]:
                    print(f"[WARNING] No valid data for rocket index {rocket_index}")
                    continue

                df_states = pd.DataFrame(data["states"])
                df_actions = pd.DataFrame(data["actions"]).add_prefix("action_")
                df = pd.concat([df_states, df_actions], axis=1)
                df["timestamp"] = data["timestamps"]
                df["reward"] = data["rewards"]
                df["rocket_index"] = rocket_index  # Add rocket index as a column
                df.set_index("timestamp", inplace=True)
                dataframes[rocket_index] = df

            if not dataframes:
                print(f"[WARNING] No valid data parsed from {log_path}")
                return {}

            return dataframes

        except Exception as e:
            print(f"[ERROR] Failed to extract data from {log_path}: {e}")
            return {}

    def _plot_state_for_single_rocket(
        self,
        df: pd.DataFrame,
        rocket_index: int,
        state_keys: List[str],
        ylabel: List[str],
        output_dir: str,
        base_filename: str,
    ):
        """Create plots for a single rocket"""
        num_keys = len(state_keys)
        if num_keys == 1:
            plt.figure(figsize=(12, 6))
            color = self.colors[rocket_index % len(self.colors)]
            plt.plot(
                df.index, df[state_keys[0]], label=f"Rocket {rocket_index}", color=color
            )
            plt.xlabel("Time")
            plt.ylabel(ylabel[0])
            plt.title(f"{state_keys[0]} over time - Rocket {rocket_index}")
            plt.grid(True)
            plt.legend()
            plt.tight_layout()

            output_path = os.path.join(
                output_dir, f"{base_filename}_rocket_{rocket_index}_{state_keys[0]}.jpg"
            )
            plt.savefig(output_path)
            plt.close()
            print(
                f"[SUCCESS] Plot for rocket {rocket_index}, {state_keys[0]} saved to {output_path}"
            )
        else:
            ncols = 3
            nrows = math.ceil(num_keys / ncols)
            fig, axes = plt.subplots(
                nrows=nrows, ncols=ncols, figsize=(14, 4 * nrows), sharex=True
            )
            axes = axes.flatten()

            color = self.colors[rocket_index % len(self.colors)]
            for i, key in enumerate(state_keys):
                if key in df.columns:
                    axes[i].plot(
                        df.index, df[key], label=f"Rocket {rocket_index}", color=color
                    )
                    axes[i].set_ylabel(ylabel[i])
                    axes[i].set_title(f"{key} over time - Rocket {rocket_index}")
                    axes[i].grid(True)
                    axes[i].legend()

            # Remove unused subplots
            for j in range(len(state_keys), len(axes)):
                fig.delaxes(axes[j])

            fig.supxlabel("Time")
            plt.tight_layout()

            output_path = os.path.join(
                output_dir, f"{base_filename}_rocket_{rocket_index}_all_metrics.jpg"
            )
            plt.savefig(output_path)
            plt.close()
            print(
                f"[SUCCESS] Combined metrics plot for rocket {rocket_index} saved to {output_path}"
            )

    def _plot_combined_state(
        self,
        dataframes: Dict[int, pd.DataFrame],
        state_key: str,
        ylabel: str,
        output_dir: str,
        base_filename: str,
    ):
        """Create a combined plot for all rockets for a single state metric"""
        plt.figure(figsize=(12, 6))

        # Plot each rocket's data
        for idx, (rocket_index, df) in enumerate(dataframes.items()):
            if state_key in df.columns:
                color = self.colors[idx % len(self.colors)]
                plt.plot(
                    df.index, df[state_key], label=f"Rocket {rocket_index}", color=color
                )

        plt.xlabel("Time")
        plt.ylabel(ylabel)
        plt.title(f"{state_key} over time - All Rockets")
        plt.grid(True)
        plt.legend()
        plt.tight_layout()

        output_path = os.path.join(
            output_dir, f"{base_filename}_combined_{state_key}.jpg"
        )
        plt.savefig(output_path)
        plt.close()
        print(f"[SUCCESS] Combined plot for {state_key} saved to {output_path}")

    def _plot_all_metrics_combined(
        self,
        dataframes: Dict[int, pd.DataFrame],
        state_keys: List[str],
        ylabel: List[str],
        output_dir: str,
        base_filename: str,
    ):
        """Create combined plots for all metrics with all rockets"""
        ncols = 3
        nrows = math.ceil(len(state_keys) / ncols)
        fig, axes = plt.subplots(
            nrows=nrows, ncols=ncols, figsize=(16, 5 * nrows), sharex=True
        )
        axes = axes.flatten()

        for i, key in enumerate(state_keys):
            # Plot each rocket's data for this state key
            for idx, (rocket_index, df) in enumerate(dataframes.items()):
                if key in df.columns:
                    color = self.colors[idx % len(self.colors)]
                    axes[i].plot(
                        df.index, df[key], label=f"Rocket {rocket_index}", color=color
                    )

            axes[i].set_ylabel(ylabel[i])
            axes[i].set_title(f"{key} over time")
            axes[i].grid(True)

            # Add legend to each plot
            axes[i].legend()

        # Remove unused subplots
        for j in range(len(state_keys), len(axes)):
            fig.delaxes(axes[j])

        fig.supxlabel("Time")
        plt.tight_layout()

        output_path = os.path.join(
            output_dir, f"{base_filename}_all_rockets_all_metrics.jpg"
        )
        plt.savefig(output_path)
        plt.close()
        print(f"[SUCCESS] Combined all metrics plot saved to {output_path}")

    def _save_csv(self, dataframes: Dict[int, pd.DataFrame], log_file: str):
        # Create a directory for this log file
        base_filename = os.path.splitext(log_file)[0]
        log_dir = os.path.join(self.csv_dir, base_filename)
        os.makedirs(log_dir, exist_ok=True)

        # Save a CSV for each rocket
        for rocket_index, df in dataframes.items():
            csv_filename = f"{base_filename}_rocket_{rocket_index}.csv"
            csv_path = os.path.join(log_dir, csv_filename)
            try:
                df.round(2).to_csv(csv_path)
                print(f"[SUCCESS] CSV for rocket {rocket_index} saved to {csv_path}")
            except Exception as e:
                print(
                    f"[ERROR] Failed to save CSV for {log_file}, rocket {rocket_index}: {e}"
                )

        # Also save a combined CSV with all rockets
        try:
            # Add rocket_index to index for combined dataframe
            combined_df = pd.concat(
                [df.assign(rocket_index=idx) for idx, df in dataframes.items()]
            )
            combined_df = combined_df.reset_index()
            combined_df = combined_df.set_index(["timestamp", "rocket_index"])

            combined_csv_path = os.path.join(
                self.csv_dir, f"{base_filename}_combined.csv"
            )
            combined_df.round(2).to_csv(combined_csv_path)
            print(f"[SUCCESS] Combined CSV saved to {combined_csv_path}")
        except Exception as e:
            print(f"[ERROR] Failed to save combined CSV for {log_file}: {e}")

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

        if ylabel is None:
            ylabel = state_keys
        elif isinstance(ylabel, str):
            ylabel = [ylabel] * len(state_keys)
        elif isinstance(ylabel, list) and len(ylabel) != len(state_keys):
            raise ValueError("Length of 'ylabel' must match the number of 'state_keys'")

        for log_file in log_files:
            log_path = os.path.join(self.log_dir, log_file)
            print(f"[INFO] Processing '{log_path}'...")
            dataframes = self._extract_log_data(log_path)

            if dataframes:
                # Save CSVs
                self._save_csv(dataframes, log_file)

                # Create a subdirectory for this log's plots
                base_filename = os.path.splitext(log_file)[0]
                plots_dir = os.path.join(self.output_dir, base_filename)
                os.makedirs(plots_dir, exist_ok=True)

                try:
                    # 1. Create individual plots for each rocket
                    for rocket_index, df in dataframes.items():
                        self._plot_state_for_single_rocket(
                            df,
                            rocket_index,
                            state_keys,
                            ylabel,
                            plots_dir,
                            base_filename,
                        )

                    # 2. Create combined plots for each metric
                    for i, key in enumerate(state_keys):
                        self._plot_combined_state(
                            dataframes, key, ylabel[i], plots_dir, base_filename
                        )

                    # 3. Create a master plot with all metrics and all rockets
                    self._plot_all_metrics_combined(
                        dataframes, state_keys, ylabel, plots_dir, base_filename
                    )

                    print(f"[SUCCESS] All plots for {log_file} saved to {plots_dir}")
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
