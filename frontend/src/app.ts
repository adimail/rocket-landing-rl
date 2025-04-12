import "./styles/index.css";
import { RocketWebSocket } from "./websocket";

document.addEventListener("DOMContentLoaded", () => {
  try {
    const rocketSocket = new RocketWebSocket(
      "ws://localhost:8080/ws",
      "rocket-state",
    );
  } catch (error) {
    console.error("[Init] Failed to initialize RocketWebSocket:", error);
  }
});
