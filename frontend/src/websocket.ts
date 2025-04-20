import type { RocketState, RocketAction } from "@/types";
import { renderStates, resetPersistentRewards } from "@/render";

export class RocketWebSocket {
  private socket: WebSocket;
  private readonly url: string;
  private isRunning: boolean = false;
  private numRockets: number = 0;

  constructor(wsUrl: string) {
    this.url = wsUrl;
    this.socket = this.initializeSocket();
    this.attachUIHandlers();
  }

  private initializeSocket(): WebSocket {
    const socket = new WebSocket(this.url);

    socket.onopen = () => {
      console.log("[RocketWebSocket] Connected to WebSocket");
    };

    socket.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };

    socket.onclose = () => {
      console.log("[RocketWebSocket] WebSocket connection closed");
      this.isRunning = false;
      const startPauseBtn = document.getElementById("start-pause-btn");
      if (startPauseBtn) startPauseBtn.textContent = "Start";
    };

    socket.onerror = (error: Event) => {
      console.error("[RocketWebSocket] WebSocket error:", error);
    };

    return socket;
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      let states: RocketState[] | undefined = undefined;
      let actions: RocketAction[] | undefined = undefined;
      let landing: ("unsafe" | "safe" | "ok" | "good")[] | undefined =
        undefined;
      let rewards: number[] | undefined = undefined;
      let dones: boolean[] | undefined = undefined;

      if (data.status) {
        console.log("[RocketWebSocket] Status:", data.status);
        return;
      }

      if (data.step) {
        states = data.step.state;
        rewards = data.step.reward;
        dones = data.step.done;
        landing = data.landing;
        if (data.step.prev_action_taken) {
          actions = data.step.prev_action_taken as RocketAction[];
        }
      } else if (data.state) {
        states = data.state;
        actions = data.action;
        landing = data.landing;
        rewards = data.reward;
        dones = data.done;
      }

      if (states) {
        if (states.length !== this.numRockets) {
          this.numRockets = states.length;
          console.log(
            "[RocketWebSocket] Detected",
            this.numRockets,
            "rockets.",
          );
          resetPersistentRewards(this.numRockets);
        }
        renderStates(states, actions, landing, rewards, dones);
      }

      if (data.initial) {
        console.log("[RocketWebSocket] Received initial state.");
        if (states) {
          resetPersistentRewards(states.length);
          renderStates(states, actions, landing, rewards, dones);
        }
      }
      if (data.restart) {
        console.log("[RocketWebSocket] Simulation restarted by server.");
        resetPersistentRewards(this.numRockets);
      }
    } catch (err) {
      console.error(
        "[RocketWebSocket] Failed to parse or handle message:",
        err,
        "Data:",
        event.data,
      );
    }
  }

  private async attachUIHandlers(): Promise<void> {
    const startPauseBtn = document.getElementById("start-pause-btn");
    const restartBtn = document.getElementById("restart-btn");
    const speedSlider = document.getElementById(
      "speed-slider",
    ) as HTMLInputElement;
    const speedValue = document.getElementById("speed-value");
    const agentToggleBtn = document.getElementById("toggle-agent-btn");

    if (!startPauseBtn || !restartBtn || !speedSlider || !speedValue) {
      console.warn("One or more UI control elements not found.");
    }

    try {
      const res = await fetch("/api/speed");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const speed = parseFloat(data.speed);

      if (speedSlider && speedValue) {
        speedSlider.value = speed.toString();
        speedValue.textContent = `${speed.toFixed(1)}x`;
      }
    } catch (err) {
      console.error("[RocketWebSocket] Failed to fetch initial speed:", err);
    }

    if (startPauseBtn) {
      startPauseBtn.addEventListener("click", () => {
        this.isRunning = !this.isRunning;
        const command = this.isRunning ? "start" : "pause";
        startPauseBtn.textContent = this.isRunning ? "Pause" : "Start";
        this.sendCommand(command);
      });
    }

    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        this.isRunning = false;
        if (startPauseBtn) startPauseBtn.textContent = "Start";
        this.sendCommand("restart");
        resetPersistentRewards(this.numRockets);
      });
    }

    if (speedSlider && speedValue) {
      speedSlider.addEventListener("input", () => {
        const speed = parseFloat(speedSlider.value);
        speedValue.textContent = `${speed.toFixed(1)}x`;
        this.sendSpeed(speed);
      });
    }

    if (agentToggleBtn) {
      agentToggleBtn.addEventListener("click", () => {
        console.log("[RocketWebSocket] Toggling agent control...");
        this.sendCommand("toggle_agent");
      });
    } else {
      console.warn("Agent toggle button not found (ID: toggle-agent-btn)");
    }
  }

  private sendCommand(command: "start" | "pause" | "restart" | "toggle_agent") {
    try {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ command }));
      } else {
        console.warn(
          `[RocketWebSocket] Cannot send command '${command}', socket not open.`,
        );
      }
    } catch (err) {
      console.error("[RocketWebSocket] Failed to send command:", command, err);
    }
  }

  private sendSpeed(speed: number): void {
    try {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ speed }));
      } else {
        console.warn(`[RocketWebSocket] Cannot send speed, socket not open.`);
      }
    } catch (err) {
      console.error("[RocketWebSocket] Failed to send speed:", err);
    }
  }

  public sendAction(action: RocketAction, rocketIndex: number = 0): void {
    try {
      if (this.socket.readyState !== WebSocket.OPEN) {
        console.warn("[RocketWebSocket] Socket not open, cannot send action");
        return;
      }

      const throttle = Math.max(0, Math.min(1, action.throttle));
      const coldGas = Math.max(-1, Math.min(1, action.coldGas));

      const payload = {
        action: { throttle, coldGas },
        rocket_index: rocketIndex,
      };

      this.socket.send(JSON.stringify(payload));
    } catch (err) {
      console.error("[RocketWebSocket] Failed to send action:", err);
    }
  }

  public close(): void {
    this.socket.close();
  }
}
