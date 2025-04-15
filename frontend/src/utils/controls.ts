import { RocketWebSocket } from "@/websocket";
import { RocketAction } from "@/types";

export class RocketControls {
  private socket: RocketWebSocket;
  private readonly rocketIndex: number = 0;
  private keysPressed: Set<string> = new Set();
  private intervalId: number | null = null;

  private currentThrottle: number = 0;
  private currentColdGas: number = 0;

  private readonly rampUpTime: number = 1500;
  private readonly rampDownTime: number = 500;

  private readonly updateInterval: number = 100;
  private readonly throttleStep: number =
    1 / (this.rampUpTime / this.updateInterval);
  private readonly coldGasLeftStep: number =
    -1 / (this.rampUpTime / this.updateInterval);
  private readonly coldGasRightStep: number =
    1 / (this.rampUpTime / this.updateInterval);
  private readonly rampDownStep: number =
    1.0 / (this.rampDownTime / this.updateInterval);

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
      this.updateValues();
      this.sendAction();
    }, this.updateInterval);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    try {
      const key = e.key.toLowerCase();
      if (["w", "a", "d"].includes(key) && !this.keysPressed.has(key)) {
        this.keysPressed.add(key);

        if (key === "w" && this.currentThrottle === 0) {
          this.currentThrottle = 0;
        } else if (key === "a" && this.currentColdGas >= 0) {
          this.currentColdGas = 0;
        } else if (key === "d" && this.currentColdGas <= 0) {
          this.currentColdGas = 0;
        }
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
      }
    } catch (err) {
      console.error("[RocketControls] Failed to handle key release:", err);
    }
  }

  private updateValues(): void {
    if (this.keysPressed.has("w")) {
      this.currentThrottle = Math.min(
        1,
        this.currentThrottle + this.throttleStep,
      );
    } else if (this.currentThrottle > 0) {
      this.currentThrottle = Math.max(
        0,
        this.currentThrottle - this.currentThrottle * this.rampDownStep,
      );
    }

    const hasLeft = this.keysPressed.has("a");
    const hasRight = this.keysPressed.has("d");

    if (hasLeft && hasRight) {
      if (this.currentColdGas > 0) {
        this.currentColdGas = Math.max(
          0,
          this.currentColdGas - this.currentColdGas * this.rampDownStep,
        );
      } else if (this.currentColdGas < 0) {
        this.currentColdGas = Math.min(
          0,
          this.currentColdGas - this.currentColdGas * this.rampDownStep,
        );
      }
    } else if (hasLeft) {
      this.currentColdGas = Math.max(
        -1,
        this.currentColdGas + this.coldGasLeftStep,
      );
    } else if (hasRight) {
      this.currentColdGas = Math.min(
        1,
        this.currentColdGas + this.coldGasRightStep,
      );
    } else if (this.currentColdGas !== 0) {
      if (this.currentColdGas > 0) {
        this.currentColdGas = Math.max(
          0,
          this.currentColdGas - this.currentColdGas * this.rampDownStep,
        );
      } else {
        this.currentColdGas = Math.min(
          0,
          this.currentColdGas - this.currentColdGas * this.rampDownStep,
        );
      }
    }
  }

  private sendAction(): void {
    if (this.currentThrottle > 0 || this.currentColdGas !== 0) {
      this.sendDirectAction(this.currentThrottle, this.currentColdGas);
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
