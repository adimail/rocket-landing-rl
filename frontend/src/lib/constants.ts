export const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:9000/ws`;

export const API_URL = "/api";

export const ROCKET_WIDTH = 13;
export const ROCKET_HEIGHT = 60;
export const SCALE_FACTOR = 0.2;
export const GROUND_OFFSET = 50;
export const MAX_FLAME_LENGTH = 25;
export const FLAME_WIDTH = 8;
export const THRUSTER_LENGTH = 6;
export const THRUSTER_WIDTH = 3;
export const THRUSTER_OFFSET_Y = 5;
export const THRUSTER_OFFSET_X = ROCKET_WIDTH / 2 + 1;
export const EXPLOSION_FRAME_DURATION = 60;
export const TOTAL_EXPLOSION_FRAMES = 25;

export const COLORS = {
  flameInner: "rgba(255, 255, 255, 0.9)",
  flameOuter: "rgba(255, 165, 0, 0.5)",
  thruster: "rgba(173, 216, 230, 0.8)",
  safe: "rgba(144, 238, 144, 0.2)",
  unsafe: "rgba(255, 122, 122, 0.2)",
};

export const LANDING_STATUSES = {
  SUCCESS: ["safe", "good", "perfect", "landed", "ok"],
  FAILURE: ["unsafe", "crash", "destroy", "failed"],
};
