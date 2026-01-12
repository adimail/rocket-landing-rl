export interface RocketState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  angle: number;
  angularVelocity: number;
  angularAcceleration: number;
  mass: number;
  fuelMass: number;
  speed: number;
  relativeAngle: number;
}

export interface RocketAction {
  throttle: number;
  coldGas: number;
}

export interface SimulationStep {
  state: (RocketState | null)[];
  reward: (number | null)[];
  done: boolean[];
  prev_action_taken: RocketAction[];
}

export interface WebSocketMessage {
  status?: string;
  step?: SimulationStep;
  state?: RocketState[];
  action?: RocketAction[];
  landing?: (string | null)[];
  reward?: number[];
  done?: boolean[];
  initial?: boolean;
  restart?: boolean;
  speed?: number;
  agent_enabled?: boolean;
}

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "connecting"
  | "error";
