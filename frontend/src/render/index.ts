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
let currentLandingStatuses: (string | null)[] | null = null;

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
  renderStateText(currentStates, persistentRewards, currentLandingStatuses);

  const canvasBottom = canvas.height - Constants.GROUND_OFFSET;
  const canvasCenterX = canvas.width / 2;

  currentStates.forEach((state, index) => {
    const currentLandingX = canvasCenterX + state.x * Constants.SCALE_FACTOR;
    const currentLandingY = canvasBottom - state.y * Constants.SCALE_FACTOR;
    const action = currentActions?.[index] ?? defaultAction;

    if (areCrashed[index] && state.y <= 10.0) {
      // Only show explosion if crashed and near ground
      const elapsedTime = timestamp - (explosionStartTimes[index] || timestamp);
      explosionFrameCounters[index] = Math.floor(
        elapsedTime / Constants.EXPLOSION_FRAME_DURATION,
      );
      if (explosionFrameCounters[index] < Constants.TOTAL_EXPLOSION_FRAMES) {
        renderExplosion(
          ctx,
          explosionFrameCounters[index],
          currentLandingX,
          currentLandingY,
        );
      } else {
        renderExplosion(
          ctx, // Render last frame of explosion if counter exceeds
          Constants.TOTAL_EXPLOSION_FRAMES - 1,
          currentLandingX,
          currentLandingY,
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
  landingMessages?: (("unsafe" | "safe" | "ok" | "good") | null)[], // type updated for clarity
  newStepRewards?: number[],
  dones?: boolean[],
): void {
  try {
    currentStates = states;
    currentActions = actions ?? null;
    currentStepRewards = newStepRewards ?? null;
    currentLandingStatuses = landingMessages ?? null; // Added

    // Ensure arrays are initialized/resized if numRockets changes (handled by resetRenderStates via websocket)
    // Safety check if somehow lengths are mismatched:
    if (areCrashed.length !== states.length) {
      console.warn(
        "Forcing resize of render tracking arrays in renderStates due to mismatch.",
      );
      resetRenderStates(states.length);
    }

    states.forEach((state, index) => {
      const isReportedDoneThisStep = dones ? dones[index] : false;
      const currentReward = currentStepRewards
        ? currentStepRewards[index]
        : null;
      const landingStatus = landingMessages?.[index] ?? null;

      // Update persistent reward if the rocket is not yet terminated
      // or if it just terminated in this step.
      if (!hasTerminated[index] || isReportedDoneThisStep) {
        persistentRewards[index] = currentReward;
      }

      if (isReportedDoneThisStep && !hasTerminated[index]) {
        // This rocket just finished its episode in this step.
        hasTerminated[index] = true; // Mark it as terminated for future frames.

        if (landingStatus) {
          if (landingStatus === "unsafe") {
            if (!areCrashed[index]) {
              areCrashed[index] = true;
              explosionFrameCounters[index] = 0;
              explosionStartTimes[index] = performance.now();
              console.log(
                `Rocket ${index} [DONE, CRASHED via landingStatus='unsafe'], y=${state.y.toFixed(
                  2,
                )}`,
              );
            }
          } else {
            // "safe", "good", "ok"
            areCrashed[index] = false;
            console.log(
              `Rocket ${index} [DONE, LANDED SAFELY via landingStatus='${landingStatus}'], y=${state.y.toFixed(
                2,
              )}`,
            );
          }
        } else {
          console.warn(
            `Rocket ${index} [DONE, BUT NO landingStatus!], y=${state.y.toFixed(
              2,
            )}. Check y-pos for crash.`,
          );
          if (state.y <= 0.1 && !areCrashed[index]) {
            // Basic fallback if on ground
            areCrashed[index] = true;
            explosionFrameCounters[index] = 0;
            explosionStartTimes[index] = performance.now();
            console.log(
              `Rocket ${index} [FALLBACK CRASH for done but no status], y=${state.y.toFixed(
                2,
              )}`,
            );
          }
        }
      } else if (
        isReportedDoneThisStep &&
        hasTerminated[index] &&
        landingStatus === "unsafe" &&
        !areCrashed[index]
      ) {
        // If already terminated but was not marked as crashed, and now we get an unsafe status
        areCrashed[index] = true;
        explosionFrameCounters[index] = 0;
        explosionStartTimes[index] = performance.now();
        console.log(
          `Rocket ${index} [LATE CRASH UPDATE to unsafe], y=${state.y.toFixed(
            2,
          )}`,
        );
      } else if (
        isReportedDoneThisStep &&
        hasTerminated[index] &&
        landingStatus &&
        landingStatus !== "unsafe" &&
        areCrashed[index]
      ) {
        // If already terminated and marked crashed, but now we get a safe status (e.g. correction)
        areCrashed[index] = false;
        console.log(
          `Rocket ${index} [LATE SAFE UPDATE to ${landingStatus}], y=${state.y.toFixed(
            2,
          )}`,
        );
      }

      // Reset visual state if rocket is clearly airborne again (e.g., after a full simulation restart)
      if (state.y > 10.0) {
        if (areCrashed[index]) {
          areCrashed[index] = false;
        }
        if (hasTerminated[index]) {
          // If it was terminated, but now it's flying
          hasTerminated[index] = false;
          persistentRewards[index] = null;
          // Also reset landing status for this rocket if it's flying again
          if (currentLandingStatuses && currentLandingStatuses[index]) {
            currentLandingStatuses[index] = null;
          }
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

export function resetRenderStates(numRockets: number): void {
  console.log("Resetting all render states for", numRockets, "rockets");
  persistentRewards = new Array(numRockets).fill(null);
  explosionFrameCounters = new Array(numRockets).fill(0);
  explosionStartTimes = new Array(numRockets).fill(0);
  areCrashed = new Array(numRockets).fill(false);
  hasTerminated = new Array(numRockets).fill(false);
  currentLandingStatuses = new Array(numRockets).fill(null); // Added
}
