import { RocketWebSocket } from "@/websocket";
import { RocketAction } from "@/types";

export class RocketControls {
  private socket: RocketWebSocket;
  private readonly rocketIndex: number = 0;
  private keysPressed: Set<string> = new Set();
  private intervalId: number | null = null;

  constructor(socket: RocketWebSocket) {
    this.socket = socket;
    this.attachKeyboardControls();
    this.startUpdateInterval();
  }

  private attachKeyboardControls(): void {
    try {
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleKeyUp = this.handleKeyUp.bind(this);

      document.addEventListener("keydown", this.handleKeyDown);
      document.addEventListener("keyup", this.handleKeyUp);

      console.log("[RocketControls] Keyboard controls initialized (W/A/D)");
    } catch (err) {
      console.error("[RocketControls] Failed to setup keyboard controls:", err);
    }
  }

  private startUpdateInterval(): void {
    this.intervalId = window.setInterval(() => {
      this.sendAction();
    }, 100);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    try {
      const key = e.key.toLowerCase();
      if (["w", "a", "d"].includes(key)) {
        this.keysPressed.add(key);
        this.sendAction();
      }
    } catch (err) {
      console.error("[RocketControls] Failed to handle key press:", err);
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    try {
      const key = e.key.toLowerCase();
      if (["w", "a", "d"].includes(key)) {
        this.keysPressed.delete(key);
        this.sendAction();
      }
    } catch (err) {
      console.error("[RocketControls] Failed to handle key release:", err);
    }
  }

  private sendAction(): void {
    const hasLeft = this.keysPressed.has("a");
    const hasRight = this.keysPressed.has("d");
    const hasUp = this.keysPressed.has("w");

    let coldGas = 0;
    if (hasLeft && hasRight) {
      coldGas = 0;
    } else if (hasLeft) {
      coldGas = -1.0;
    } else if (hasRight) {
      coldGas = 1.0;
    }

    const throttle = hasUp ? 1.0 : 0;

    if (throttle > 0 || coldGas !== 0) {
      this.sendDirectAction(throttle, coldGas);
    }
  }

  private sendDirectAction(throttle: number, coldGas: number): void {
    try {
      const action: RocketAction = {
        throttle,
        coldGas,
      };
      this.socket.sendAction(action, this.rocketIndex);
    } catch (err) {
      console.error("[RocketControls] Failed to send action:", err);
    }
  }

  public dispose(): void {
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
