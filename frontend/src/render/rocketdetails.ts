import type { RocketState } from "../types";

export function renderStateText(states: RocketState[]): void {
  try {
    updateRocketStateDetails(states);
  } catch (error) {
    console.error("Error rendering rocket state details:", error);
  }
}

function updateRocketStateDetails(states: RocketState[]): void {
  const detailsContainer = document.getElementById("rocketstatedetails");
  if (!detailsContainer) return;

  const format = (value: number) =>
    Number.isFinite(value) ? value.toFixed(2) : "N/A";

  let htmlContent = "";

  states.forEach((state, index) => {
    htmlContent += `
      <div style="margin-bottom: 12px; border: 1px solid #ccc; padding: 12px; border-radius: 6px;">
        <div style="font-weight: bold; margin-bottom: 6px;">
          Rocket ${index + 1}
        </div>
		<hr/>
        <div style="margin-bottom: 4px;">Speed: <strong>${format(state.speed)}</strong> m/s</div>
        <div style="margin-bottom: 4px;">Relative Angle: <strong>${format(state.relativeAngle)}</strong>°</div>
        <ul style="list-style: none; padding-left: 0; margin: 0;">
          <li>Position: x=${format(state.x)}, y=${format(state.y)}</li>
          <li>Velocity: vx=${format(state.vx)}, vy=${format(state.vy)}</li>
          <li>Acceleration: ax=${format(state.ax)}, ay=${format(state.ay)}</li>
          <li>Angle: ${format(state.angle)}°</li>
          <li>Angular Velocity: ω=${format(state.angularVelocity)}°/s</li>
          <li>Mass: ${format(state.mass)} kg</li>
          <li>Fuel Mass: ${format(state.fuelMass)} kg</li>
        </ul>
      </div>
    `;
  });

  detailsContainer.innerHTML = htmlContent;
}
