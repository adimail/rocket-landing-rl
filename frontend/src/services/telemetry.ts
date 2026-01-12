import { WS_URL } from "@/lib/constants";
import type {
  WebSocketMessage,
  RocketAction,
  ConnectionStatus,
  RocketState,
} from "@/types/simulation";

interface TelemetryCallbacks {
  onStatusChange: (status: ConnectionStatus) => void;
  onLatencyUpdate: (latency: number) => void;
  onSpeedUpdate: (speed: number) => void;
  onSimulationUpdate: (data: {
    states?: RocketState[];
    actions?: RocketAction[];
    landing?: (string | null)[];
    rewards?: number[];
  }) => void;
  onReset: () => void;
  onSimStatusChange: (status: string) => void;
}

class TelemetryService {
  private socket: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private errorGraceTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private lastPing = 0;
  private isExplicitlyDisconnected = false;
  private callbacks: TelemetryCallbacks | null = null;

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.sendCommand = this.sendCommand.bind(this);
    this.sendAction = this.sendAction.bind(this);
  }

  public init(callbacks: TelemetryCallbacks) {
    this.callbacks = callbacks;
  }

  public connect() {
    if (
      this.socket?.readyState === WebSocket.CONNECTING ||
      this.socket?.readyState === WebSocket.OPEN
    ) {
      return;
    }
    this.isExplicitlyDisconnected = false;
    this.callbacks?.onStatusChange("connecting");
    if (this.errorGraceTimeout) clearTimeout(this.errorGraceTimeout);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.errorGraceTimeout = setTimeout(() => {
      if (this.socket?.readyState !== WebSocket.OPEN) {
        this.callbacks?.onStatusChange("error");
      }
    }, 5000);
    this.socket = new WebSocket(WS_URL);
    this.socket.onopen = () => {
      if (this.errorGraceTimeout) clearTimeout(this.errorGraceTimeout);
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
      this.callbacks?.onStatusChange("connected");
      this.startPing();
    };
    this.socket.onclose = (event) => {
      this.stopPing();
      if (this.isExplicitlyDisconnected) {
        this.callbacks?.onStatusChange("disconnected");
        return;
      }
      if (event.code === 1000) {
        this.callbacks?.onStatusChange("disconnected");
      } else {
        this.reconnectTimeout = setTimeout(this.connect, 3000);
      }
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
      this.callbacks?.onReset();
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
      if (data.status === "pong") {
        this.callbacks?.onLatencyUpdate(performance.now() - this.lastPing);
        return;
      }
      if (data.status === "playing" || data.status === "paused") {
        this.callbacks?.onSimStatusChange(data.status);
      }
      if (data.speed !== undefined) this.callbacks?.onSpeedUpdate(data.speed);
      if (data.restart) this.callbacks?.onReset();
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
      this.callbacks?.onSimulationUpdate({
        states,
        actions,
        landing,
        rewards,
      });
    } catch (e) {
      console.error("Telemetry parse error", e);
    }
  };

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.lastPing = performance.now();
        this.socket.send(JSON.stringify({ command: "ping" }));
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

export const telemetryService = new TelemetryService();
