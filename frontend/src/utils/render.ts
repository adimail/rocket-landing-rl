import type { RocketState } from "../types";
import * as Constants from "./constants";
import { backgroundImg, rocketImage, explosionImage } from "./constants";

let currentState: RocketState | null = null;
let explosionFrameCounter = 0;
let explosionStartTime = 0;
let isCrashed = false;
let animationFrameId: number | null = null;

function resizeCanvas(canvas: HTMLCanvasElement, container: HTMLElement): void {
  try {
    canvas.width = container.clientWidth;
    if (backgroundImg.naturalWidth && backgroundImg.naturalHeight) {
      const aspectRatio =
        backgroundImg.naturalHeight / backgroundImg.naturalWidth;
      canvas.height = canvas.width * aspectRatio;
    } else {
      canvas.height = canvas.width * Constants.DEFAULT_ASPECT_RATIO;
    }
  } catch (error) {
    console.error("[resizeCanvas] Error resizing canvas:", error);
  }
}

function setupCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} | null {
  try {
    const canvas = document.getElementById(
      "rocket-canvas",
    ) as HTMLCanvasElement;
    if (!canvas) {
      console.error("[setupCanvas] Canvas not found.");
      return null;
    }
    const container = canvas.parentElement || document.body;
    resizeCanvas(canvas, container);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("[setupCanvas] Canvas context not available.");
      return null;
    }
    return { canvas, ctx };
  } catch (error) {
    console.error("[setupCanvas] Error setting up canvas:", error);
    return null;
  }
}

function renderBackground(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
): void {
  ctx.drawImage(backgroundImg, 0, 0, canvasWidth, canvasHeight);
}

function renderRocket(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  state: RocketState,
): void {
  const rocketCenterX = Constants.ROCKET_WIDTH / 2;
  const rocketCenterY = Constants.ROCKET_HEIGHT / 2;
  const canvasCenterX = canvasWidth / 2;
  const canvasBottom = canvasHeight - Constants.GROUND_OFFSET;
  ctx.save();
  ctx.translate(
    canvasCenterX + state.x * Constants.SCALE_FACTOR,
    canvasBottom - state.y * Constants.SCALE_FACTOR,
  );
  ctx.rotate((Math.PI / 180) * state.angle);
  ctx.drawImage(
    rocketImage,
    -rocketCenterX,
    -rocketCenterY,
    Constants.ROCKET_WIDTH,
    Constants.ROCKET_HEIGHT,
  );
  ctx.restore();
}

function renderStateText(
  ctx: CanvasRenderingContext2D,
  state: RocketState,
): void {
  ctx.font = "12px monospace";
  ctx.fillStyle = "#eee";
  ctx.textAlign = "left";
  let textX = Constants.TEXT_PADDING_L;
  let textY = Constants.TEXT_INITIAL_Y;
  ctx.fillText(
    `Position: x=${state.x.toFixed(2)}, y=${state.y.toFixed(2)}`,
    textX,
    textY,
  );
  textY += Constants.TEXT_LINE_HEIGHT;
  ctx.fillText(
    `Velocity: vx=${state.vx.toFixed(2)}, vy=${state.vy.toFixed(2)}`,
    textX,
    textY,
  );
  textY += Constants.TEXT_LINE_HEIGHT;
  ctx.fillText(
    `Acceleration: ax=${state.ax.toFixed(2)}, ay=${state.ay.toFixed(2)}`,
    textX,
    textY,
  );
  textY += Constants.TEXT_LINE_HEIGHT;
  ctx.fillText(`Angle: ${state.angle.toFixed(2)} deg`, textX, textY);
  textY += Constants.TEXT_LINE_HEIGHT;
  ctx.fillText(
    `Angular Vel: ω=${state.angularVelocity.toFixed(2)} deg/s`,
    textX,
    textY,
  );
  textY += Constants.TEXT_LINE_HEIGHT;
  ctx.fillText(`Mass: ${state.mass.toFixed(2)} kg`, textX, textY);
  textY += Constants.TEXT_LINE_HEIGHT;
  ctx.fillText(`Fuel Mass: ${state.fuelMass.toFixed(2)} kg`, textX, textY);
  ctx.textAlign = "right";
  const rightTextX = ctx.canvas.width - Constants.TEXT_PADDING_R;
  let rightTextY = Constants.TEXT_INITIAL_Y;
  ctx.fillText(`Speed: ${state.speed.toFixed(2)} m/s`, rightTextX, rightTextY);
  rightTextY += Constants.TEXT_LINE_HEIGHT;
  ctx.fillText(
    `Relative Angle: ${state.relativeAngle.toFixed(2)} deg`,
    rightTextX,
    rightTextY,
  );
}

function renderExplosion(
  ctx: CanvasRenderingContext2D,
  explosionFrame: number,
  landingX: number,
  landingY: number,
): void {
  try {
    const frameWidth = explosionImage.width / Constants.TOTAL_EXPLOSION_FRAMES;
    const frameHeight = explosionImage.height;

    const explosionScale = 1;
    const scaledWidth = frameWidth * explosionScale;
    const scaledHeight = frameHeight * explosionScale;

    const explosionX = landingX - scaledWidth / 2;
    const explosionY = landingY - scaledHeight / 2 - 20;

    ctx.drawImage(
      explosionImage,
      explosionFrame * frameWidth,
      0,
      frameWidth,
      frameHeight,
      explosionX,
      explosionY,
      scaledWidth,
      scaledHeight,
    );
  } catch (error) {
    console.error("[renderExplosion] Error rendering explosion:", error);
  }
}

function animationLoop(timestamp: number): void {
  if (!currentState) {
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
  renderStateText(ctx, currentState);

  const canvasCenterX = canvas.width / 2;
  const canvasBottom = canvas.height - Constants.GROUND_OFFSET;
  const landingX = canvasCenterX + currentState.x * Constants.SCALE_FACTOR;
  const landingY = canvasBottom - currentState.y * Constants.SCALE_FACTOR;

  if (isCrashed) {
    const elapsedTime = timestamp - explosionStartTime;
    explosionFrameCounter = Math.floor(
      elapsedTime / Constants.EXPLOSION_FRAME_DURATION,
    );

    if (explosionFrameCounter < Constants.TOTAL_EXPLOSION_FRAMES) {
      renderExplosion(ctx, explosionFrameCounter, landingX, landingY);
      animationFrameId = requestAnimationFrame(animationLoop);
    } else {
      renderExplosion(
        ctx,
        Constants.TOTAL_EXPLOSION_FRAMES - 1,
        landingX,
        landingY,
      );
      animationFrameId = requestAnimationFrame(animationLoop);
    }
  } else {
    renderRocket(ctx, canvas.width, canvas.height, currentState);
    animationFrameId = requestAnimationFrame(animationLoop);
  }
}

export function renderState(
  state: RocketState,
  landing?: "safe" | "unsafe",
): void {
  try {
    currentState = state;

    if (landing) {
      if (landing === "unsafe" && !isCrashed) {
        isCrashed = true;
        explosionFrameCounter = 0;
        explosionStartTime = performance.now();
      } else if (landing === "safe") {
        isCrashed = false;
      }
    } else {
      const hasCrashed =
        state.y <= 0 &&
        (state.speed > Constants.SPEED_THRESHOLD ||
          Math.abs(state.relativeAngle) > Constants.ANGLE_THRESHOLD);
      if (hasCrashed && !isCrashed) {
        isCrashed = true;
        explosionFrameCounter = 0;
        explosionStartTime = performance.now();
      }
      if (isCrashed && state.y > 0) {
        isCrashed = false;
      }
    }

    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(animationLoop);
    }
  } catch (error) {
    console.error("[renderState] Error starting render:", error);
  }
}
