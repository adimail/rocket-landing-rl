import type { RocketState } from "../types";

export function renderState(state: RocketState, el: HTMLElement): void {
  try {
    const formatted = `
Rocket State:
-------------
Position    => x: ${state.x.toFixed(2)}, y: ${state.y.toFixed(2)}
Velocity    => vx: ${state.vx.toFixed(2)}, vy: ${state.vy.toFixed(2)}
Orientation => θ: ${state.theta.toFixed(2)} rad
Angular Vel => ω: ${state.omega.toFixed(2)} rad/s
    `.trim();

    el.textContent = formatted;
  } catch (error) {
    console.error("[renderState] Error rendering state:", error);
    el.textContent = "Error rendering state";
  }
}
