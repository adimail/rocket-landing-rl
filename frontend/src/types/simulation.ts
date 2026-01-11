export interface RocketState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  angle: number;
  angularVelocity: number;
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
  state: RocketState[];
  reward: number[];
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
}

export type ConnectionStatus = "connected" | "disconnected" | "connecting";
