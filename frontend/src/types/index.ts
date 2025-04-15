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
