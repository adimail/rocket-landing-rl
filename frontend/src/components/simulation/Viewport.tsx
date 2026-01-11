import { Suspense, useState, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Rocket3D } from "./Rocket3D";
import { useStore } from "@/lib/store";
import { useSocket } from "@/hooks/useSocket";
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Loader2,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Viewport() {
  const status = useStore((s) => s.status);
  const rockets = useStore((s) => s.rockets);
  const isAgentEnabled = useStore((s) => s.isAgentEnabled);
  const { sendCommand, connect } = useSocket();
  const toggleAgent = useStore((s) => s.toggleAgent);
  const [isPlaying, setIsPlaying] = useState(false);
  const controlsRef = useRef<any>();

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
      {status !== "connected" && (
        <div className="absolute inset-0 z-10 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
          {status === "connecting" ? (
            <>
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-300 font-mono text-sm tracking-widest uppercase">
                Establishing Uplink...
              </p>
            </>
          ) : status === "error" ? (
            <>
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-slate-300 font-mono text-sm mb-6">
                Connection Failed
              </p>
              <button
                onClick={connect}
                className="px-6 py-2 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Retry Connection
              </button>
            </>
          ) : (
            <>
              <WifiOff className="w-10 h-10 text-slate-600 mb-4" />
              <p className="text-slate-500 font-mono text-sm">
                Simulation Offline
              </p>
            </>
          )}
        </div>
      )}

      <Canvas camera={{ position: [0, 80, 800], fov: 45, far: 20000 }}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[50, 100, 50]} intensity={5.0} castShadow />
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
        />
      </Canvas>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md shadow-lg border border-white/10 rounded-full px-4 py-2 flex items-center gap-2">
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            disabled={status !== "connected"}
            className="p-2 hover:bg-white/20 rounded-full cursor-pointer disabled:opacity-30"
          >
            <Play className="w-5 h-5 text-white" fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            disabled={status !== "connected"}
            className="p-2 hover:bg-white/20 rounded-full cursor-pointer disabled:opacity-30"
          >
            <Pause className="w-5 h-5 text-white" fill="currentColor" />
          </button>
        )}
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button
          onClick={handleRestart}
          disabled={status !== "connected"}
          className="p-2 hover:bg-white/20 rounded-full cursor-pointer disabled:opacity-30"
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
          disabled={status !== "connected"}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer disabled:opacity-30",
            isAgentEnabled
              ? "bg-yellow-500 text-black shadow-lg"
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
