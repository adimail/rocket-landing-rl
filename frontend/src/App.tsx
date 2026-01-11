import { useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useSimulationSocket } from "@/hooks/useSimulationSocket";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { ControlBar } from "@/components/controls/ControlBar";
import { CanvasView } from "@/components/simulation/CanvasView";
import { Telemetry } from "@/components/simulation/Telemetry";
import type { RocketState, RocketAction } from "@/types";

function App() {
  const statesRef = useRef<RocketState[]>([]);
  const actionsRef = useRef<RocketAction[]>([]);
  const metaRef = useRef({
    rewards: [] as number[],
    dones: [] as boolean[],
    landing: [] as (string | null)[],
    crashed: [] as boolean[],
    explosionStart: [] as number[],
  });

  const { sendCommand, sendAction } = useSimulationSocket(
    statesRef,
    actionsRef,
    metaRef,
  );

  const toggleAgent = useAppStore((s) => s.toggleAgent);
  const activeRocketIndex = useAppStore((s) => s.activeRocketIndex);
  const error = useAppStore((s) => s.error);
  const isConnected = useAppStore((s) => s.isConnected);

  useKeyboardControls((action: RocketAction) => {
    sendAction(action, activeRocketIndex);
  });

  const handleToggleAgent = () => {
    toggleAgent();
    sendCommand("toggle_agent");
  };

  return (
    <div className="min-h-screen bg-bg text-fg font-mono p-5 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-4">
        <h1 className="text-2xl text-yellow">
          Reinforcement Learning: Vertical Rocket Landing
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`w-3 h-3 rounded-full ${isConnected ? "bg-green" : "bg-red animate-pulse"}`}
          />
          <span>{isConnected ? "Connected" : "Offline"}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red/10 border border-red text-red p-4 rounded mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p>{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs underline hover:no-underline"
          >
            Retry Connection
          </button>
        </div>
      )}

      <ControlBar
        onStart={() => sendCommand("start")}
        onPause={() => sendCommand("pause")}
        onRestart={() => sendCommand("restart")}
        onToggleAgent={handleToggleAgent}
      />

      <div className="mt-4">
        <CanvasView
          statesRef={statesRef}
          actionsRef={actionsRef}
          metaRef={metaRef}
        />
        <Telemetry statesRef={statesRef} metaRef={metaRef} />
      </div>
    </div>
  );
}

export default App;
