import type { RocketState, RocketAction } from "@/types";
import * as C from "./constants";

export const assets = {
  rocket: new Image(),
  background: new Image(),
  explosion: new Image(),
};

assets.rocket.src = "/assets/booster.webp";
assets.background.src = "/assets/landingsite.webp";
assets.explosion.src = "/assets/explosion.png";

// Helper to check if image is ready
function isLoaded(img: HTMLImageElement) {
  return img.complete && img.naturalWidth !== 0;
}

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  if (isLoaded(assets.background)) {
    ctx.drawImage(assets.background, 0, 0, width, height);
  } else {
    // Fallback while loading
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, width, height);
  }
}

export function renderRocket(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  state: RocketState,
  action: RocketAction,
) {
  const centerX = canvasWidth / 2;
  const bottom = canvasHeight - C.GROUND_OFFSET;

  const x = centerX + state.x * C.SCALE_FACTOR;
  const y = bottom - state.y * C.SCALE_FACTOR;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((Math.PI / 180) * state.angle);

  const w = C.ROCKET_WIDTH;
  const h = C.ROCKET_HEIGHT;

  if (isLoaded(assets.rocket)) {
    ctx.drawImage(assets.rocket, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = "#fff";
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }

  // Flame and Thruster logic
  if (state.y > 0) {
    if (action.throttle > 0) {
      const length = C.MAX_FLAME_LENGTH * action.throttle;
      const width = C.FLAME_WIDTH * (0.5 + action.throttle * 0.5);

      const grad = ctx.createLinearGradient(0, h / 2, 0, h / 2 + length);
      grad.addColorStop(0, C.COLORS.flameInner);
      grad.addColorStop(1, C.COLORS.flameOuter);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-width / 2, h / 2);
      ctx.lineTo(width / 2, h / 2);
      ctx.lineTo(0, h / 2 + length);
      ctx.fill();
    }

    const thrusterY = -h / 2 + C.THRUSTER_OFFSET_Y;

    if (action.coldGas > 0) {
      ctx.fillStyle = C.COLORS.thruster;
      ctx.fillRect(
        -C.THRUSTER_OFFSET_X - C.THRUSTER_LENGTH,
        thrusterY - C.THRUSTER_WIDTH / 2,
        C.THRUSTER_LENGTH,
        C.THRUSTER_WIDTH,
      );
    }

    if (action.coldGas < 0) {
      ctx.fillStyle = C.COLORS.thruster;
      ctx.fillRect(
        C.THRUSTER_OFFSET_X,
        thrusterY - C.THRUSTER_WIDTH / 2,
        C.THRUSTER_LENGTH,
        C.THRUSTER_WIDTH,
      );
    }
  }

  ctx.restore();
}

export function renderExplosion(
  ctx: CanvasRenderingContext2D,
  frame: number,
  x: number,
  y: number,
) {
  if (!isLoaded(assets.explosion)) return;

  const fw = assets.explosion.width / C.TOTAL_EXPLOSION_FRAMES;
  const fh = assets.explosion.height;

  ctx.drawImage(
    assets.explosion,
    frame * fw,
    0,
    fw,
    fh,
    x - fw / 2,
    y - fh * 0.8,
    fw,
    fh,
  );
}
