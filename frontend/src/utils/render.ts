import type { RocketState } from "../types";
import rocketImageSrc from "../assets/booster.webp";
import marsbaseImageSrc from "../assets/landingsite.webp";

const rocketImage = new Image();
rocketImage.src = rocketImageSrc;

const marsbaseImage = new Image();
marsbaseImage.src = marsbaseImageSrc;

function resizeCanvas(canvas: HTMLCanvasElement, container: HTMLElement): void {
  try {
    canvas.width = container.clientWidth;

    if (marsbaseImage.naturalWidth && marsbaseImage.naturalHeight) {
      const aspectRatio =
        marsbaseImage.naturalHeight / marsbaseImage.naturalWidth;
      canvas.height = canvas.width * aspectRatio;
    } else {
      canvas.height = canvas.width * 0.75;
    }
  } catch (error) {
    console.error("[resizeCanvas] Error resizing canvas:", error);
  }
}

export function renderState(state: RocketState): void {
  try {
    const canvas = document.getElementById(
      "rocket-canvas",
    ) as HTMLCanvasElement;
    if (!canvas) {
      console.error("[renderState] Canvas not found.");
      return;
    }

    const container = canvas.parentElement || document.body;
    resizeCanvas(canvas, container);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("[renderState] Canvas context not available.");
      return;
    }

    // --- Render the Mars base background image ---
    // This draws the background image stretched to cover the entire canvas.
    ctx.drawImage(marsbaseImage, 0, 0, canvas.width, canvas.height);

    // --- Render the booster (rocket) image ---
    // Define rocket dimensions and calculate its center.
    const rocketWidth = 30;
    const rocketHeight = 60;
    const rocketCenterX = rocketWidth / 2;
    const rocketCenterY = rocketHeight / 2;

    // For this example, a fixed scale factor is used. You may modify this factor based on your requirements.
    const scaleFactor = 2;

    // Assume the ground is located a bit above the bottom edge (50px above) of the canvas.
    const canvasCenterX = canvas.width / 2;
    const canvasBottom = canvas.height - 50;

    ctx.save();
    // Translate so that the rocket's position (state.x, state.y) relates to the canvas coordinate system:
    // The x position is centered, and the y position is measured upward from the ground.
    ctx.translate(
      canvasCenterX + state.x * scaleFactor,
      canvasBottom - state.y * scaleFactor,
    );
    ctx.rotate(state.angle);
    ctx.drawImage(
      rocketImage,
      -rocketCenterX,
      -rocketCenterY,
      rocketWidth,
      rocketHeight,
    );
    ctx.restore();

    // --- Render Rocket State as Text ---
    ctx.font = "12px monospace";
    ctx.fillStyle = "#eee";
    let textX = 10;
    let textY = 20;
    const lineHeight = 15;

    ctx.fillText(
      `Position: x=${state.x.toFixed(2)}, y=${state.y.toFixed(2)}`,
      textX,
      textY,
    );
    textY += lineHeight;
    ctx.fillText(
      `Velocity: vx=${state.vx.toFixed(2)}, vy=${state.vy.toFixed(2)}`,
      textX,
      textY,
    );
    textY += lineHeight;
    ctx.fillText(
      `Acceleration: ax=${state.ax.toFixed(2)}, ay=${state.ay.toFixed(2)}`,
      textX,
      textY,
    );
    textY += lineHeight;
    ctx.fillText(
      `Angle: ${((state.angle * 180) / Math.PI).toFixed(2)} deg`,
      textX,
      textY,
    );
    textY += lineHeight;
    ctx.fillText(
      `Angular Vel: ω=${state.angularVelocity.toFixed(2)} rad/s`,
      textX,
      textY,
    );
    textY += lineHeight;
    ctx.fillText(`Mass: ${state.mass.toFixed(2)} kg`, textX, textY);
    textY += lineHeight;
    ctx.fillText(`Fuel Mass: ${state.fuelMass.toFixed(2)} kg`, textX, textY);
  } catch (error) {
    console.error("[renderState] Error rendering state:", error);
  }
}
