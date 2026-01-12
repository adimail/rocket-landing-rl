import { useEffect } from "react";
import { telemetryService } from "@/services/telemetry";
import { useStore } from "@/lib/store";

export function useTelemetryBridge() {
  const setConnectionStatus = useStore((s) => s.setConnectionStatus);
  const setLatency = useStore((s) => s.setLatency);
  const setSpeed = useStore((s) => s.setSpeed);
  const updateSimulation = useStore((s) => s.updateSimulation);
  const resetHistory = useStore((s) => s.resetHistory);
  const setSimStatus = useStore((s) => s.setSimStatus);

  useEffect(() => {
    telemetryService.init({
      onStatusChange: setConnectionStatus,
      onLatencyUpdate: setLatency,
      onSpeedUpdate: setSpeed,
      onSimulationUpdate: updateSimulation,
      onReset: resetHistory,
      onSimStatusChange: setSimStatus,
    });
    telemetryService.connect();
    return () => {
      telemetryService.disconnect();
    };
  }, [
    setConnectionStatus,
    setLatency,
    setSpeed,
    updateSimulation,
    resetHistory,
    setSimStatus,
  ]);
}
