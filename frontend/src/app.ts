import "./styles/index.css";
import { RocketWebSocket } from "./websocket";
import { RocketControls } from "@/utils/controls";

document.addEventListener("DOMContentLoaded", () => {
  try {
    const rocketSocket = new RocketWebSocket("ws://localhost:9000/ws");

    const rocketControls = new RocketControls(rocketSocket);

    console.log(
      "Rocket simulation keyboard controls initialized",
      rocketControls,
    );
  } catch (error) {
    console.error("[Init] Failed to initialize rocket simulation:", error);
  }
});
