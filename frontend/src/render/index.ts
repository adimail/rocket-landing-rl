import type { RocketState, RocketAction } from "../types";
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
let hasTerminated: boolean[] = [];
let animationFrameId: number | null = null;
let currentStepRewards: number[] | null = null;
let persistentRewards: (number | null)[] = [];

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
  renderStateText(currentStates, persistentRewards);

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
      if (!areCrashed[index]) {
        renderRocket(ctx, canvas.width, canvas.height, state, action);
      }
    }
  });

  animationFrameId = requestAnimationFrame(animationLoop);
}

export function renderStates(
  states: RocketState[],
  actions?: RocketAction[],
  landingMessages?: ("unsafe" | "safe" | "ok" | "good")[],
  newStepRewards?: number[],
  dones?: boolean[],
): void {
  try {
    currentStates = states;
    currentActions = actions ?? null;
    currentStepRewards = newStepRewards ?? null;

    if (states.length !== persistentRewards.length) {
      explosionFrameCounters = new Array(states.length).fill(0);
      explosionStartTimes = new Array(states.length).fill(0);
      areCrashed = new Array(states.length).fill(false);
      hasTerminated = new Array(states.length).fill(false);
      persistentRewards = new Array(states.length).fill(null);
      console.log("Resized render state arrays for", states.length, "rockets");
    }

    states.forEach((state, index) => {
      const isNowDone = dones ? dones[index] : false;
      const currentReward = currentStepRewards
        ? currentStepRewards[index]
        : null;

      if (!hasTerminated[index]) {
        persistentRewards[index] = currentReward;
      }

      let justCrashed = false;
      if (landingMessages) {
        const landing = landingMessages[index];
        if (landing === "unsafe" && !areCrashed[index]) {
          areCrashed[index] = true;
          justCrashed = true;
          explosionFrameCounters[index] = 0;
          explosionStartTimes[index] = performance.now();
        } else if (
          landing === "safe" ||
          landing === "good" ||
          landing === "ok"
        ) {
          areCrashed[index] = false;
        }
        if (!hasTerminated[index]) {
          hasTerminated[index] = true;
        }
      } else if (isNowDone && !hasTerminated[index]) {
        const looksLikeCrash =
          state.y <= 0.1 &&
          (state.speed > Constants.SPEED_THRESHOLD ||
            Math.abs(state.relativeAngle) > Constants.ANGLE_THRESHOLD);
        if (looksLikeCrash && !areCrashed[index]) {
          areCrashed[index] = true;
          justCrashed = true;
          explosionFrameCounters[index] = 0;
          explosionStartTimes[index] = performance.now();
        }
        hasTerminated[index] = true;
      }

      if (state.y > 10.0) {
        if (areCrashed[index]) areCrashed[index] = false;
        if (hasTerminated[index]) {
          hasTerminated[index] = false;
          persistentRewards[index] = null;
        }
      }
    });

    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(animationLoop);
    }
  } catch (error) {
    console.error("[renderStates] Error updating render state:", error);
  }
}

export function resetPersistentRewards(numRockets: number): void {
  console.log("Resetting persistent rewards for", numRockets, "rockets");
  persistentRewards = new Array(numRockets).fill(null);
}
