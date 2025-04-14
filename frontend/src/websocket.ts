import type { RocketState } from "./types";
import { renderState } from "./utils/render";

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
        if (data.landing === "safe") {
          console.log("[RocketWebSocket] Landing was safe!");
        } else if (data.landing === "unsafe") {
          console.log("[RocketWebSocket] Landing was unsafe!");
        }
      }

      if (data.state) {
        const state: RocketState = data.state;
        renderState(state, data.landing);
      }
    } catch (err) {
      console.error("[RocketWebSocket] Failed to parse message:", err);
    }
  }

  private attachUIHandlers(): void {
    const startPauseBtn = document.getElementById("start-pause-btn");
    const restartBtn = document.getElementById("restart-btn");

    if (!startPauseBtn || !restartBtn) return;

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
  }

  private sendCommand(command: "start" | "pause" | "restart") {
    try {
      this.socket.send(JSON.stringify({ command }));
    } catch (err) {
      console.error("[RocketWebSocket] Failed to send command:", err);
    }
  }

  public close(): void {
    this.socket.close();
  }
}
