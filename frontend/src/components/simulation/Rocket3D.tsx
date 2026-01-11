import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "@/lib/store";
import * as THREE from "three";
import { Cylinder, Cone } from "@react-three/drei";

const ROCKET_BODY_COLOR = "#e2e8f0";
const ROCKET_FIN_COLOR = "#475569";
const FLAME_COLOR_CORE = "#fff";
const FLAME_COLOR_OUTER = "#f59e0b";

export function Rocket3D({ index }: { index: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const state = useStore.getState().rockets[index];
    const action = useStore.getState().actions[index];

    if (!groupRef.current || !state) return;

    // Update Position (Scale factor 0.1 for 3D view)
    groupRef.current.position.set(state.x * 0.1, state.y * 0.1, 0);
    groupRef.current.rotation.z = THREE.MathUtils.degToRad(state.angle);

    // Update Flame
    if (flameRef.current) {
      const throttle = action?.throttle || 0;
      flameRef.current.visible = throttle > 0.01;
      flameRef.current.scale.y = throttle;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <Cylinder args={[0.5, 0.5, 4, 16]} position={[0, 2, 0]}>
        <meshStandardMaterial color={ROCKET_BODY_COLOR} />
      </Cylinder>

      {/* Nose Cone */}
      <Cone args={[0.5, 1, 16]} position={[0, 4.5, 0]}>
        <meshStandardMaterial color={ROCKET_BODY_COLOR} />
      </Cone>

      {/* Fins */}
      <group position={[0, 0.5, 0]}>
        <mesh position={[0.6, 0, 0]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.5, 1, 0.1]} />
          <meshStandardMaterial color={ROCKET_FIN_COLOR} />
        </mesh>
        <mesh position={[-0.6, 0, 0]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.5, 1, 0.1]} />
          <meshStandardMaterial color={ROCKET_FIN_COLOR} />
        </mesh>
      </group>

      {/* Engine Flame */}
      <group ref={flameRef} position={[0, -0.5, 0]}>
        <Cone
          args={[0.3, 3, 8]}
          position={[0, -1.5, 0]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshBasicMaterial
            color={FLAME_COLOR_OUTER}
            transparent
            opacity={0.8}
          />
        </Cone>
        <Cone
          args={[0.15, 2, 8]}
          position={[0, -1, 0]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshBasicMaterial color={FLAME_COLOR_CORE} />
        </Cone>
      </group>
    </group>
  );
}
