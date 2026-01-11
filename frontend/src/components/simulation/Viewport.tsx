import { Suspense, useState, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
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
  const [isPlaying, setIsPlaying] = useState(false);
  const controlsRef = useRef();

  const handlePlay = () => {
    setIsPlaying(true);
    sendCommand("start");
  };

  const handlePause = () => {
    setIsPlaying(false);
    sendCommand("pause");
  };

  const handleRestart = () => {
    setIsPlaying(true);
    sendCommand("restart");
  };

  const moveCameraToFrontAllRockets = () => {
    const c = controlsRef.current;
    if (!c) return;
    c.object.position.set(0, 80, 800);
    c.target.set(0, 0, 0);
    c.update();
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const c = controlsRef.current;
      if (!c) return;
      c.object.position.set(0, 80, 800);
      c.target.set(0, 0, 0);
      c.update();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
      <Canvas camera={{ position: [0, 80, 800], fov: 45, far: 20000 }}>
        <ambientLight intensity={0.2} />
        <directionalLight
          position={[50, 100, 50]}
          intensity={5.0}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />

        <Grid
          position={[0, 0, 0]}
          args={[2000, 2000]}
          sectionSize={50}
          cellSize={5}
          cellColor="#334e68"
          sectionColor="#5f6670"
          fadeDistance={1500}
        />

        <Suspense fallback={null}>
          {rockets.map((_, i) => (
            <Rocket3D key={i} index={i} />
          ))}
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          makeDefault
          maxPolarAngle={Math.PI / 2 - 0.09}
          minDistance={20}
          maxDistance={1000}
          enablePan={true}
          panSpeed={0.5}
          rotateSpeed={0.5}
        />
      </Canvas>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md shadow-lg border border-white/10 rounded-full px-4 py-2 flex items-center gap-2">
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            className="p-2 hover:bg-white/20 rounded-full cursor-pointer"
          >
            <Play className="w-5 h-5 text-white" fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="p-2 hover:bg-white/20 rounded-full cursor-pointer"
          >
            <Pause className="w-5 h-5 text-white" fill="currentColor" />
          </button>
        )}

        <div className="w-px h-4 bg-white/20 mx-1" />

        <button
          onClick={handleRestart}
          className="p-2 hover:bg-white/20 rounded-full cursor-pointer"
        >
          <RotateCcw className="w-5 h-5 text-white" />
        </button>

        <div className="w-px h-4 bg-white/20 mx-1" />

        <button
          onClick={moveCameraToFrontAllRockets}
          className="p-2 hover:bg-white/20 rounded-full cursor-pointer"
        >
          <span className="text-sm text-white">Front View</span>
        </button>

        <div className="w-px h-4 bg-white/20 mx-1" />

        <button
          onClick={() => {
            toggleAgent();
            sendCommand("toggle_agent");
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer",
            isAgentEnabled
              ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/30"
              : "hover:bg-white/20 text-slate-300",
          )}
        >
          <Zap className="w-4 h-4" />
          <span>RL Agent</span>
        </button>
      </div>
    </div>
  );
}
