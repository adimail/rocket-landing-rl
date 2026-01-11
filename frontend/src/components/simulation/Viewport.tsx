import { Suspense } from "react";
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
    <div className="relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
      <Canvas shadows camera={{ position: [0, 20, 100], fov: 45, far: 20000 }}>
        {/* Sky Color */}
        <color attach="background" args={["#e0f2fe"]} />

        <ambientLight intensity={0.7} />
        <directionalLight
          position={[50, 100, 50]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <Environment preset="city" />

        {/* Dark Ground Plane */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.05, 0]}
          receiveShadow
        >
          <planeGeometry args={[2000, 2000]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Grid with white lines */}
        <Grid
          position={[0, 0, 0]}
          args={[10000, 10000]}
          sectionSize={20}
          cellSize={2}
          cellColor="#64748b"
          sectionColor="#ffffff"
          fadeDistance={10000}
          infiniteGrid
        />

        <Suspense fallback={null}>
          {rockets.map((_, i) => (
            <Rocket3D key={i} index={i} />
          ))}
        </Suspense>

        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2}
          maxDistance={8000}
        />
      </Canvas>

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
