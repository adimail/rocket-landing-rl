import type { RocketState } from "../types";

export function renderStateText(
  states: RocketState[],
  rewards: (number | null)[],
  landingStatuses: (string | null)[] | null,
): void {
  try {
    updateRocketStateDetails(states, rewards, landingStatuses);
  } catch (error) {
    console.error("Error rendering rocket state details:", error);
  }
}

function updateRocketStateDetails(
  states: RocketState[],
  rewards: (number | null)[],
  landingStatuses: (string | null)[] | null,
): void {
  const detailsContainer = document.getElementById("rocketstatedetails");
  if (!detailsContainer) return;

  const format = (value: number) =>
    Number.isFinite(value) ? value.toFixed(3) : "N/A";

  let htmlContent = "";

  states.forEach((state, index) => {
    const reward = rewards?.[index];
    const rewardDisplay =
      reward !== null && reward !== undefined
        ? ` | reward: ${format(reward)}`
        : "";

    const landingStatus = landingStatuses?.[index] ?? null;
    let backgroundColor = "";
    if (
      landingStatus === "safe" ||
      landingStatus === "good" ||
      landingStatus === "ok"
    ) {
      backgroundColor = "rgba(144, 238, 144, 0.2)";
    } else if (landingStatus === "unsafe") {
      backgroundColor = "rgba(255, 122, 122, 0.2)";
    }

    htmlContent += `
      <div style="margin-bottom: 12px; border: 1px solid #ccc; padding: 12px; border-radius: 6px; background-color: ${backgroundColor};">
        <div style="font-weight: bold; margin-bottom: 6px;">
          Rocket ${index + 1}${rewardDisplay} ${landingStatus ? `| Landing: ${landingStatus}` : ""}
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
