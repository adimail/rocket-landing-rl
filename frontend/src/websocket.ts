import type { RocketState } from "./types";
import { renderStates } from "@/render";

export class RocketWebSocket {
  private socket: WebSocket;
  private readonly url: string;
  private isRunning: boolean = false;

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
    };

    socket.onerror = (error: Event) => {
      console.error("[RocketWebSocket] WebSocket error:", error);
    };

    return socket;
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      if (data.landing) {
        data.landing.forEach((landing: "safe" | "unsafe", index: number) => {
          if (landing === "safe") {
            console.log(
              `[RocketWebSocket] Rocket ${index + 1} landing was safe!`,
            );
          } else if (landing === "unsafe") {
            console.log(
              `[RocketWebSocket] Rocket ${index + 1} landing was unsafe!`,
            );
          }
        });
      }

      if (data.state) {
        const states: RocketState[] = data.state;
        renderStates(states, data.landing);
      }
    } catch (err) {
      console.error("[RocketWebSocket] Failed to parse message:", err);
    }
  }

  private async attachUIHandlers(): Promise<void> {
    const startPauseBtn = document.getElementById("start-pause-btn");
    const restartBtn = document.getElementById("restart-btn");
    const speedSlider = document.getElementById(
      "speed-slider",
    ) as HTMLInputElement;
    const speedValue = document.getElementById("speed-value");

    if (!startPauseBtn || !restartBtn || !speedSlider || !speedValue) return;

    try {
      const res = await fetch("/api/speed");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const speed = parseFloat(data.speed);

      speedSlider.value = speed.toString();
      speedValue.textContent = `${speed.toFixed(1)}x`;
    } catch (err) {
      console.error("[RocketWebSocket] Failed to fetch initial speed:", err);
    }

    startPauseBtn.addEventListener("click", () => {
      this.isRunning = !this.isRunning;
      const command = this.isRunning ? "start" : "pause";
      startPauseBtn.textContent = this.isRunning ? "Pause" : "Start";
      this.sendCommand(command);
    });

    restartBtn.addEventListener("click", () => {
      this.isRunning = false;
      startPauseBtn.textContent = "Start";
      this.sendCommand("restart");
    });

    speedSlider.addEventListener("input", () => {
      const speed = parseFloat(speedSlider.value);
      speedValue.textContent = `${speed.toFixed(1)}x`;
      this.sendSpeed(speed);
    });
  }

  private sendCommand(command: "start" | "pause" | "restart") {
    try {
      this.socket.send(JSON.stringify({ command }));
    } catch (err) {
      console.error("[RocketWebSocket] Failed to send command:", err);
    }
  }

  private sendSpeed(speed: number): void {
    try {
      this.socket.send(JSON.stringify({ speed }));
    } catch (err) {
      console.error("[RocketWebSocket] Failed to send speed:", err);
    }
  }

  public close(): void {
    this.socket.close();
  }
}
