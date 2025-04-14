export type RocketState = {
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
};

export type RocketControl = {
  throttle: number; // [0.0 – 1.0]
  gimbalAngleX: number; // degrees
  cold_gas_thrust: number; // [-1.0 - 1.0]
};
