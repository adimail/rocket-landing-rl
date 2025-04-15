import type { RocketState, RocketAction } from "../types"; // Import RocketAction
import * as Constants from "@/utils/constants";
import {
  renderBackground,
  renderExplosion,
  setupCanvas,
  renderRocket,
} from "./canvas";
import { renderStateText } from "./rocketdetails";

let currentStates: RocketState[] | null = null;
let currentActions: RocketAction[] | null = null;
let explosionFrameCounters: number[] = [];
let explosionStartTimes: number[] = [];
let areCrashed: boolean[] = [];
let animationFrameId: number | null = null;

const defaultAction: RocketAction = { throttle: 0, coldGas: 0 };

function animationLoop(timestamp: number): void {
  if (!currentStates) {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    return;
  }

  const setup = setupCanvas();
  if (!setup) {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    return;
  }

  const { canvas, ctx } = setup;
  renderBackground(ctx, canvas.width, canvas.height);
  renderStateText(currentStates);

  const canvasBottom = canvas.height - Constants.GROUND_OFFSET;
  const canvasCenterX = canvas.width / 2;

  currentStates.forEach((state, index) => {
    const landingX = canvasCenterX + state.x * Constants.SCALE_FACTOR;
    const landingY = canvasBottom - state.y * Constants.SCALE_FACTOR;

    const action = currentActions?.[index] ?? defaultAction;

    if (areCrashed[index]) {
      const elapsedTime = timestamp - explosionStartTimes[index];
      explosionFrameCounters[index] = Math.floor(
        elapsedTime / Constants.EXPLOSION_FRAME_DURATION,
      );
      if (explosionFrameCounters[index] < Constants.TOTAL_EXPLOSION_FRAMES) {
        renderExplosion(ctx, explosionFrameCounters[index], landingX, landingY);
      } else {
        renderExplosion(
          ctx,
          Constants.TOTAL_EXPLOSION_FRAMES - 1,
          landingX,
          landingY,
        );
      }
    } else {
      renderRocket(ctx, canvas.width, canvas.height, state, action);
    }
  });

  animationFrameId = requestAnimationFrame(animationLoop);
}

export function renderStates(
  states: RocketState[],
  actions?: RocketAction[],
  landingMessages?: ("safe" | "unsafe")[],
): void {
  try {
    currentStates = states;
    currentActions = actions ?? null;

    if (states.length !== areCrashed.length) {
      explosionFrameCounters = new Array(states.length).fill(0);
      explosionStartTimes = new Array(states.length).fill(0);
      areCrashed = new Array(states.length).fill(false);
    }

    if (landingMessages) {
      landingMessages.forEach((landing, index) => {
        if (landing === "unsafe" && !areCrashed[index]) {
          areCrashed[index] = true;
          explosionFrameCounters[index] = 0;
          explosionStartTimes[index] = performance.now();
        } else if (landing === "safe") {
          areCrashed[index] = false;
        }
      });
    } else {
      states.forEach((state, index) => {
        if (!areCrashed[index]) {
          const hasCrashed =
            state.y <= 0 &&
            (state.speed > Constants.SPEED_THRESHOLD ||
              Math.abs(state.relativeAngle) > Constants.ANGLE_THRESHOLD);

          if (hasCrashed) {
            areCrashed[index] = true;
            explosionFrameCounters[index] = 0;
            explosionStartTimes[index] = performance.now();
          }
        }
        if (areCrashed[index] && state.y > 0) {
          areCrashed[index] = false;
        }
      });
    }

    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(animationLoop);
    }
  } catch (error) {
    console.error("[renderStates] Error starting render:", error);
  }
}
