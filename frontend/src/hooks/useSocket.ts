import { telemetryService } from "@/services/telemetry";

export function useSocket() {
  return {
    connect: telemetryService.connect,
    disconnect: telemetryService.disconnect,
    sendCommand: telemetryService.sendCommand,
    sendAction: telemetryService.sendAction,
  };
}
