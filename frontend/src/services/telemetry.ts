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
    states?: (RocketState | null)[];
    actions?: RocketAction[];
    landing?: (string | null)[];
    rewards?: (number | null)[];
  }) => void;
  onReset: () => void;
  onSimStatusChange: (status: string) => void;
  onAgentStatusChange: (enabled: boolean) => void;
}

class TelemetryService {
  private socket: WebSocket | null = null;
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

    this.errorGraceTimeout = setTimeout(() => {
      if (this.socket?.readyState !== WebSocket.OPEN) {
        this.callbacks?.onStatusChange("error");
      }
    }, 3000);

    this.socket = new WebSocket(WS_URL);
    this.socket.binaryType = "arraybuffer";

    this.socket.onopen = () => {
      if (this.errorGraceTimeout) clearTimeout(this.errorGraceTimeout);
      this.callbacks?.onStatusChange("connected");
      this.startPing();
    };

    this.socket.onclose = () => {
      this.stopPing();
      if (this.isExplicitlyDisconnected) {
        this.callbacks?.onStatusChange("disconnected");
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
      if (event.data instanceof ArrayBuffer) {
        this.handleBinaryMessage(event.data);
        return;
      }

      const data: WebSocketMessage = JSON.parse(event.data);
      if (data.status === "pong") {
        this.callbacks?.onLatencyUpdate(performance.now() - this.lastPing);
        return;
      }
      if (data.status === "playing" || data.status === "paused") {
        this.callbacks?.onSimStatusChange(data.status);
      }
      if (data.speed !== undefined) this.callbacks?.onSpeedUpdate(data.speed);
      if (data.agent_enabled !== undefined)
        this.callbacks?.onAgentStatusChange(data.agent_enabled);
      if (data.restart) this.callbacks?.onReset();

      let states: (RocketState | null)[] | undefined = data.state;
      let actions: RocketAction[] | undefined = data.action;
      let landing: (string | null)[] | undefined = data.landing;
      let rewards: (number | null)[] | undefined = data.reward;

      if (data.step) {
        states = data.step.state;
        actions = data.step.prev_action_taken;
        rewards = data.step.reward;
        landing = data.landing;
      }

      const hasPayload = !!(states || actions || rewards || landing);
      if (hasPayload) {
        this.callbacks?.onSimulationUpdate({
          states,
          actions,
          landing,
          rewards,
        });
      }
    } catch (e) {
      console.error("Telemetry parse error", e);
    }
  };

  private handleBinaryMessage(buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    const msgType = view.getUint8(0);

    if (msgType === 1) {
      const FLOATS_PER_ROCKET = 16;
      const BYTES_PER_ROCKET = FLOATS_PER_ROCKET * 4;
      const numRockets = (buffer.byteLength - 1) / BYTES_PER_ROCKET;

      const states: (RocketState | null)[] = [];
      const actions: RocketAction[] = [];
      const rewards: (number | null)[] = [];
      const landing: (string | null)[] = [];

      let offset = 1;

      for (let i = 0; i < numRockets; i++) {
        const x = view.getFloat32(offset, true);
        const y = view.getFloat32(offset + 4, true);
        const vx = view.getFloat32(offset + 8, true);
        const vy = view.getFloat32(offset + 12, true);
        const ax = view.getFloat32(offset + 16, true);
        const ay = view.getFloat32(offset + 20, true);
        const angle = view.getFloat32(offset + 24, true);
        const angVel = view.getFloat32(offset + 28, true);
        const angAcc = view.getFloat32(offset + 32, true);
        const mass = view.getFloat32(offset + 36, true);
        const fuelMass = view.getFloat32(offset + 40, true);
        const reward = view.getFloat32(offset + 44, true);
        const throttle = view.getFloat32(offset + 48, true);
        const coldGas = view.getFloat32(offset + 52, true);
        const landingCode = view.getFloat32(offset + 56, true);
        const isActive = view.getFloat32(offset + 60, true);

        offset += BYTES_PER_ROCKET;

        if (isActive > 0.5) {
          const speed = Math.sqrt(vx * vx + vy * vy);
          const relativeAngle = Math.abs(angle);

          states.push({
            x,
            y,
            vx,
            vy,
            ax,
            ay,
            angle,
            angularVelocity: angVel,
            angularAcceleration: angAcc,
            mass,
            fuelMass,
            speed,
            relativeAngle,
            totalMass: mass + fuelMass,
          } as RocketState);
        } else {
          states.push(null);
        }

        actions.push({ throttle, coldGas });
        rewards.push(isNaN(reward) ? null : reward);

        let landingStr: string | null = null;
        if (landingCode > 0.5 && landingCode < 1.5) landingStr = "safe";
        else if (landingCode > 1.5 && landingCode < 2.5) landingStr = "good";
        else if (landingCode > 2.5 && landingCode < 3.5) landingStr = "ok";
        else if (landingCode > 3.5) landingStr = "unsafe";

        landing.push(landingStr);
      }

      this.callbacks?.onSimulationUpdate({
        states,
        actions,
        landing,
        rewards,
      });
    }
  }

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
