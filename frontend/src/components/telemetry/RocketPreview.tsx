import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { AltitudeTape } from "./AltitudeTape";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { RocketMesh } from "@/components/simulation/RocketMesh";

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
        scale={0.002}
        config={PREVIEW_CONFIG}
        isHighlighted={true}
      />
    </group>
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
    <div className="w-full h-full relative">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 4, 35]} fov={35} />
        <ambientLight intensity={1.3} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <Suspense fallback={null}>
          <RocketPreviewModel />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-4 left-4 flex flex-col gap-1">
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
