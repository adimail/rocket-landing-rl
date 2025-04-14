import type { RocketState } from "../types";
import * as Constants from "@/utils/constants";
import { backgroundImg, rocketImage, explosionImage } from "@/utils/constants";

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

export function setupCanvas(): {
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

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
): void {
  ctx.drawImage(backgroundImg, 0, 0, canvasWidth, canvasHeight);
}

export function renderRocket(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  state: RocketState,
): void {
  const rocketCenterX = Constants.ROCKET_WIDTH / 2;
  const rocketCenterY = Constants.ROCKET_HEIGHT / 2;
  const canvasBottom = canvasHeight - Constants.GROUND_OFFSET;
  const canvasCenterX = canvasWidth / 2;

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

export function renderExplosion(
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
