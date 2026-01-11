import { useStore } from "@/lib/store";
import { WS_URL } from "@/lib/constants";
import type { WebSocketMessage, RocketAction } from "@/types/simulation";

class TelemetryService {
  private socket: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private errorGraceTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private lastPing = 0;
  private isExplicitlyDisconnected = false;

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.sendCommand = this.sendCommand.bind(this);
    this.sendAction = this.sendAction.bind(this);
  }

  public connect() {
    if (
      this.socket?.readyState === WebSocket.CONNECTING ||
      this.socket?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    this.isExplicitlyDisconnected = false;
    const store = useStore.getState();
    store.setConnectionStatus("connecting");

    // Clear existing timeouts
    if (this.errorGraceTimeout) clearTimeout(this.errorGraceTimeout);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    // Set a timeout to flag error if connection takes too long
    this.errorGraceTimeout = setTimeout(() => {
      if (this.socket?.readyState !== WebSocket.OPEN) {
        useStore.getState().setConnectionStatus("error");
      }
    }, 5000);

    this.socket = new WebSocket(WS_URL);

    this.socket.onopen = () => {
      if (this.errorGraceTimeout) clearTimeout(this.errorGraceTimeout);
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

      useStore.getState().setConnectionStatus("connected");
      this.startPing();
    };

    this.socket.onclose = (event) => {
      this.stopPing();

      if (this.isExplicitlyDisconnected) {
        useStore.getState().setConnectionStatus("disconnected");
        return;
      }

      if (event.code === 1000) {
        useStore.getState().setConnectionStatus("disconnected");
      } else {
        // Unexpected close, attempt reconnect
        this.reconnectTimeout = setTimeout(this.connect, 3000);
      }

      if (this.errorGraceTimeout) clearTimeout(this.errorGraceTimeout);
    };

    this.socket.onerror = () => {
      // Error logic is largely handled by the grace timeout and onclose
    };

    this.socket.onmessage = this.handleMessage;
  }

  public disconnect() {
    this.isExplicitlyDisconnected = true;
    this.stopPing();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.errorGraceTimeout) clearTimeout(this.errorGraceTimeout);
  }

  public sendCommand(command: string, payload?: object) {
    if (command === "restart") {
      useStore.getState().resetHistory();
    }
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ command, ...payload }));
    }
  }

  public sendAction(action: RocketAction, index: number) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action, rocket_index: index }));
    }
  }

  private handleMessage = (event: MessageEvent) => {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      const store = useStore.getState();

      if (data.status === "pong") {
        store.setLatency(performance.now() - this.lastPing);
        return;
      }

      if (data.speed !== undefined) store.setSpeed(data.speed);
      if (data.restart) store.resetHistory();

      // Normalize data structure
      let states = data.state;
      let actions = data.action;
      let landing = data.landing;
      let rewards = data.reward;

      if (data.step) {
        states = data.step.state;
        actions = data.step.prev_action_taken;
        rewards = data.step.reward;
        landing = data.landing;
      }

      store.updateSimulation({ states, actions, landing, rewards });
    } catch (e) {
      console.error("Telemetry parse error", e);
    }
  };

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.lastPing = performance.now();
        // Optional: Send a ping frame if server supports it, or just rely on traffic
        // For this implementation, we assume the server might echo or we just track time
      }
    }, 2000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Singleton instance
export const telemetryService = new TelemetryService();
