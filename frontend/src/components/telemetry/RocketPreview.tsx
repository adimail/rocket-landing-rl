import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { AltitudeTape } from "./AltitudeTape";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { RocketMesh } from "@/components/simulation/RocketMesh";
import { SpeedParticles } from "@/components/simulation/SpeedParticles";
import { ExplosionEffect } from "@/components/simulation/ExplosionEffect";

const PREVIEW_CONFIG = {
  flame: { radius: 0.5, height: 3.0 },
  rcs: { width: 0.4, height: 6.0, offsetX: 2.0, offsetY: 11.0 },
};

function RocketPreviewModel() {
  const groupRef = useRef<THREE.Group>(null);
  const selectedIndex = useStore((s) => s.selectedRocketIndex);

  useFrame(() => {
    const state = useStore.getState().rockets[selectedIndex];
    if (!groupRef.current || !state) return;
    groupRef.current.rotation.z = THREE.MathUtils.degToRad(state.angle);
  });

  const getAction = () => useStore.getState().actions[selectedIndex];

  return (
    <group ref={groupRef}>
      <RocketMesh
        getAction={getAction}
        scale={0.0018}
        config={PREVIEW_CONFIG}
        isHighlighted={true}
      />
    </group>
  );
}

function ControlHUD({ index }: { index: number }) {
  const action = useStore((s) => s.actions[index]);
  const throttle = action?.throttle ?? 0;
  const coldGas = action?.coldGas ?? 0;

  return (
    <div className="absolute inset-0 pointer-events-none p-4">
      <div className="absolute right-20 top-1/2 -translate-y-1/2 flex gap-4 items-start">
        <div className="flex flex-col items-center">
          <span className="h-5 flex items-center text-[7px] font-bold text-slate-600 uppercase">
            R
          </span>
          <div className="w-1.5 h-32 bg-slate-950 border border-slate-800 rounded-full relative overflow-hidden">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-800 z-10" />
            <div
              className={cn(
                "absolute left-0 right-0 transition-all duration-75",
                coldGas > 0 ? "bg-blue-400" : "bg-indigo-400",
              )}
              style={{
                top: coldGas > 0 ? `${50 - coldGas * 50}%` : "50%",
                height: `${Math.abs(coldGas) * 50}%`,
              }}
            />
          </div>
          <span className="h-5 flex items-center text-[7px] font-bold text-slate-600 uppercase">
            L
          </span>
          <span className="text-[8px] font-black text-slate-500 uppercase [writing-mode:vertical-lr] rotate-180 mt-2">
            RCS
          </span>
        </div>

        <div className="flex flex-col items-center w-5 overflow-hidden">
          <div className="h-5" />
          <div className="w-1.5 h-32 bg-slate-950 border border-slate-800 rounded-full relative flex flex-col justify-end overflow-hidden">
            <div
              className="w-full bg-gradient-to-t from-orange-600 via-orange-400 to-yellow-300 transition-all duration-75"
              style={{ height: `${throttle * 100}%` }}
            />
          </div>
          <span className="h-5 flex items-center text-[10px] font-mono font-bold text-orange-400">
            {(throttle * 100).toFixed(0)}%
          </span>
          <span className="text-[8px] font-black text-slate-500 uppercase [writing-mode:vertical-lr] rotate-180 mt-2">
            THR
          </span>
        </div>
      </div>
    </div>
  );
}

export function RocketPreview() {
  const status = useStore((s) => s.status);
  const hasData = useStore((s) => s.rockets.length > 0);
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const [reward, setReward] = useState(0);

  useEffect(() => {
    return useStore.subscribe(
      (state) => state.rewards[selectedIndex],
      (val) => setReward(val || 0),
    );
  }, [selectedIndex]);

  if (status === "connecting" || !hasData) {
    return (
      <div className="w-full h-full relative bg-slate-950 flex items-center justify-center">
        <Skeleton className="w-24 h-48 bg-slate-900/50 rounded-full" />
        <div className="absolute bottom-4 left-4 space-y-2">
          <Skeleton className="h-2 w-16 bg-slate-800" />
          <Skeleton className="h-6 w-24 bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-slate-950">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 4, 35]} fov={35} />
        <ambientLight intensity={1.3} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <Suspense fallback={null}>
          <SpeedParticles />
          <ExplosionEffect index={selectedIndex} />
          <RocketPreviewModel />
        </Suspense>
      </Canvas>

      <ControlHUD index={selectedIndex} />

      <div className="absolute bottom-4 left-4 flex flex-col gap-1 bg-slate-950/60 p-2 rounded-lg border border-white/5 backdrop-blur-sm">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Step Reward
        </span>
        <div
          className={cn(
            "font-mono text-xl font-black tabular-nums drop-shadow-md",
            reward > 0
              ? "text-emerald-400"
              : reward < 0
                ? "text-red-400"
                : "text-white",
          )}
        >
          {reward > 0 ? "+" : ""}
          {reward.toFixed(2)}
        </div>
      </div>

      <AltitudeTape />
    </div>
  );
}
