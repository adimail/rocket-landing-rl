import { Suspense, useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  useGLTF,
  Cone,
  PerspectiveCamera,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { AltitudeTape } from "./AltitudeTape";
import { cn } from "@/lib/utils";

function RocketModel() {
  const groupRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Group>(null);
  const rcsLeftRef = useRef<THREE.Group>(null);
  const rcsRightRef = useRef<THREE.Group>(null);

  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const { scene } = useGLTF("/assets/booster.glb");
  const clone = useMemo(() => scene.clone(), [scene]);

  useFrame(() => {
    const state = useStore.getState().rockets[selectedIndex];
    const action = useStore.getState().actions[selectedIndex];

    if (!groupRef.current || !state) return;

    groupRef.current.rotation.z = THREE.MathUtils.degToRad(state.angle);

    if (flameRef.current) {
      const throttle = action?.throttle || 0;
      flameRef.current.visible = throttle > 0.01;
      const flicker = Math.random() * 0.1 + 0.95;
      flameRef.current.scale.set(1, throttle * flicker, 1);
    }

    const coldGas = action?.coldGas || 0;
    if (rcsLeftRef.current) {
      rcsLeftRef.current.visible = coldGas > -0.1;
      const s = Math.abs(coldGas);
      rcsLeftRef.current.scale.set(s, s, s);
    }
    if (rcsRightRef.current) {
      rcsRightRef.current.visible = coldGas < 0.1;
      const s = Math.abs(coldGas);
      rcsRightRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clone} scale={0.002} rotation={[0, Math.PI / 2, 0]} />

      <group ref={flameRef} position={[0, 0, 0]}>
        <Cone
          args={[0.5, 3, 8]}
          position={[0, -1.5, 0]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
        </Cone>
        <Cone
          args={[0.3, 1.8, 8]}
          position={[0, -0.9, 0]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshBasicMaterial color="#fffbeb" />
        </Cone>
      </group>

      <group
        ref={rcsLeftRef}
        position={[2, 11, 0]}
        rotation={[0, 0, -Math.PI / 2]}
      >
        <Cone args={[0.4, 6, 8]} position={[0, 3, 0]}>
          <meshBasicMaterial color="#fff" transparent opacity={0.6} />
        </Cone>
      </group>

      <group
        ref={rcsRightRef}
        position={[-2, 11, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <Cone args={[0.4, 6, 8]} position={[0, 3, 0]}>
          <meshBasicMaterial color="#fff" transparent opacity={0.6} />
        </Cone>
      </group>
    </group>
  );
}

export function RocketPreview() {
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const [reward, setReward] = useState(0);

  useEffect(() => {
    return useStore.subscribe(
      (state) => state.rewards[selectedIndex],
      (val) => setReward(val || 0),
    );
  }, [selectedIndex]);

  return (
    <div className="w-full h-full relative">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 4, 35]} fov={35} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <Environment preset="night" />

        <Suspense fallback={null}>
          <RocketModel />
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
