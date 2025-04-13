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
};

export type RocketControl = {
  throttle: number; // [0.0 – 1.0]
  gimbalAngleX: number; // radians
  gimbalAngleY: number; // radians (not used right now for 2D sim)
};
