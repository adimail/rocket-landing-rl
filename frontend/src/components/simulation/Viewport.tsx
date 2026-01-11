import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import { Rocket3D } from "./Rocket3D";
import { useStore } from "@/lib/store";
import { useSocket } from "@/hooks/useSocket";
import { Play, Pause, RotateCcw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Viewport() {
  const rockets = useStore((s) => s.rockets);
  const isAgentEnabled = useStore((s) => s.isAgentEnabled);
  const { sendCommand } = useSocket();
  const toggleAgent = useStore((s) => s.toggleAgent);

  return (
    <div className="relative w-full h-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
      <Canvas camera={{ position: [0, 20, 100], fov: 45 }}>
        <color attach="background" args={["#f8fafc"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} />
        <Environment preset="city" />

        <Grid
          position={[0, -0.1, 0]}
          args={[1000, 1000]}
          sectionSize={10}
          cellColor="#cbd5e1"
          sectionColor="#94a3b8"
          fadeDistance={400}
        />

        {rockets.map((_, i) => (
          <Rocket3D key={i} index={i} />
        ))}

        <OrbitControls makeDefault />
      </Canvas>

      {/* Floating Controls Dock */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-lg border border-slate-200 rounded-full px-4 py-2 flex items-center gap-2">
        <button
          onClick={() => sendCommand("start")}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <Play className="w-5 h-5 text-slate-700" fill="currentColor" />
        </button>
        <button
          onClick={() => sendCommand("pause")}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <Pause className="w-5 h-5 text-slate-700" fill="currentColor" />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <button
          onClick={() => sendCommand("restart")}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <RotateCcw className="w-5 h-5 text-slate-700" />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <button
          onClick={() => {
            toggleAgent();
            sendCommand("toggle_agent");
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
            isAgentEnabled
              ? "bg-indigo-100 text-indigo-700"
              : "hover:bg-slate-100 text-slate-600",
          )}
        >
          <Zap className="w-4 h-4" />
          <span>AI Agent</span>
        </button>
      </div>
    </div>
  );
}
