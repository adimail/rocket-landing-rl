import type { RocketState } from "../types";
import rocketImageSrc from "../assets/booster.webp";
import marsbaseImageSrc from "../assets/landingsite.webp";

const rocketImage = new Image();
rocketImage.src = rocketImageSrc;
const marsbaseImage = new Image();
marsbaseImage.src = marsbaseImageSrc;

const DEFAULT_ASPECT_RATIO = 0.75;
const ROCKET_WIDTH = 30;
const ROCKET_HEIGHT = 60;
const SCALE_FACTOR = 2;
const GROUND_OFFSET = 50;
const TEXT_PADDING_X = 10;
const TEXT_INITIAL_Y = 20;
const TEXT_LINE_HEIGHT = 15;

function resizeCanvas(canvas: HTMLCanvasElement, container: HTMLElement): void {
  try {
    canvas.width = container.clientWidth;

    if (marsbaseImage.naturalWidth && marsbaseImage.naturalHeight) {
      const aspectRatio =
        marsbaseImage.naturalHeight / marsbaseImage.naturalWidth;
      canvas.height = canvas.width * aspectRatio;
    } else {
      canvas.height = canvas.width * DEFAULT_ASPECT_RATIO;
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
  ctx.drawImage(marsbaseImage, 0, 0, canvasWidth, canvasHeight);
}

function renderRocket(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  state: RocketState,
): void {
  const rocketCenterX = ROCKET_WIDTH / 2;
  const rocketCenterY = ROCKET_HEIGHT / 2;
  const canvasCenterX = canvasWidth / 2;
  const canvasBottom = canvasHeight - GROUND_OFFSET;

  ctx.save();

  ctx.translate(
    canvasCenterX + state.x * SCALE_FACTOR,
    canvasBottom - state.y * SCALE_FACTOR,
  );

  ctx.rotate(state.angle);

  ctx.drawImage(
    rocketImage,
    -rocketCenterX,
    -rocketCenterY,
    ROCKET_WIDTH,
    ROCKET_HEIGHT,
  );

  ctx.restore();
}

function renderStateText(
  ctx: CanvasRenderingContext2D,
  state: RocketState,
): void {
  ctx.font = "12px monospace";
  ctx.fillStyle = "#eee";

  let textX = TEXT_PADDING_X;
  let textY = TEXT_INITIAL_Y;

  ctx.fillText(
    `Position: x=${state.x.toFixed(2)}, y=${state.y.toFixed(2)}`,
    textX,
    textY,
  );
  textY += TEXT_LINE_HEIGHT;

  ctx.fillText(
    `Velocity: vx=${state.vx.toFixed(2)}, vy=${state.vy.toFixed(2)}`,
    textX,
    textY,
  );
  textY += TEXT_LINE_HEIGHT;

  ctx.fillText(
    `Acceleration: ax=${state.ax.toFixed(2)}, ay=${state.ay.toFixed(2)}`,
    textX,
    textY,
  );
  textY += TEXT_LINE_HEIGHT;

  ctx.fillText(
    `Angle: ${((state.angle * 180) / Math.PI).toFixed(2)} deg`,
    textX,
    textY,
  );
  textY += TEXT_LINE_HEIGHT;

  ctx.fillText(
    `Angular Vel: ω=${state.angularVelocity.toFixed(2)} rad/s`,
    textX,
    textY,
  );
  textY += TEXT_LINE_HEIGHT;

  ctx.fillText(`Mass: ${state.mass.toFixed(2)} kg`, textX, textY);
  textY += TEXT_LINE_HEIGHT;

  ctx.fillText(`Fuel Mass: ${state.fuelMass.toFixed(2)} kg`, textX, textY);
}

export function renderState(state: RocketState): void {
  try {
    const setup = setupCanvas();
    if (!setup) return;

    const { canvas, ctx } = setup;

    renderBackground(ctx, canvas.width, canvas.height);
    renderRocket(ctx, canvas.width, canvas.height, state);
    renderStateText(ctx, state);
  } catch (error) {
    console.error("[renderState] Error rendering state:", error);
  }
}
