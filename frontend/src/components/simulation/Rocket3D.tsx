import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "@/lib/store";
import * as THREE from "three";
import { RocketMesh } from "./RocketMesh";
import { ExplosionEffect } from "./ExplosionEffect";

const ROCKET_SCALE = 0.003;

export function Rocket3D({ index }: { index: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const isHighlighted = index === selectedIndex;

  useFrame(() => {
    const state = useStore.getState().rockets[index];
    if (!groupRef.current || !state) return;

    groupRef.current.position.set(state.x * 0.1, state.y * 0.1, 0);
    groupRef.current.rotation.z = THREE.MathUtils.degToRad(state.angle);
  });

  const getAction = () => useStore.getState().actions[index];

  return (
    <group ref={groupRef}>
      <RocketMesh
        getAction={getAction}
        scale={ROCKET_SCALE}
        isHighlighted={isHighlighted}
      />
      <ExplosionEffect index={index} />
    </group>
  );
}
