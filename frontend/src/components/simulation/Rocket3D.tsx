import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "@/lib/store";
import * as THREE from "three";
import { useGLTF, Cone } from "@react-three/drei";

const ROCKET_SCALE = 0.007;

const FLAME_COLOR_CORE = "#fff";
const FLAME_COLOR_OUTER = "#f59e0b";

export function Rocket3D({ index }: { index: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Group>(null);

  const { scene } = useGLTF("/assets/booster.glb");
  const clone = useMemo(() => scene.clone(), [scene]);

  useFrame(() => {
    const state = useStore.getState().rockets[index];
    const action = useStore.getState().actions[index];

    if (!groupRef.current || !state) return;

    // Position scaling: 0.1 means 10 meters in sim = 1 unit in 3D view
    groupRef.current.position.set(state.x * 0.1, state.y * 0.1, 0);
    groupRef.current.rotation.z = THREE.MathUtils.degToRad(state.angle);

    if (flameRef.current) {
      const throttle = action?.throttle || 0;
      flameRef.current.visible = throttle > 0.01;
      // Scale flame relative to rocket scale so it doesn't look tiny/huge
      flameRef.current.scale.set(1, throttle * 10, 1);
    }
  });

  return (
    <group ref={groupRef}>
      <primitive
        object={clone}
        scale={ROCKET_SCALE}
        position={[0, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />

      <group ref={flameRef} position={[0, -1 * (ROCKET_SCALE * 50), 0]}>
        <Cone
          args={[0.3 * (ROCKET_SCALE * 20), 3 * (ROCKET_SCALE * 20), 8]}
          position={[0, -1.5 * (ROCKET_SCALE * 20), 0]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshBasicMaterial
            color={FLAME_COLOR_OUTER}
            transparent
            opacity={0.8}
          />
        </Cone>
        <Cone
          args={[0.15 * (ROCKET_SCALE * 20), 2 * (ROCKET_SCALE * 20), 8]}
          position={[0, -1 * (ROCKET_SCALE * 20), 0]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshBasicMaterial color={FLAME_COLOR_CORE} />
        </Cone>
      </group>
    </group>
  );
}

useGLTF.preload("/assets/booster.glb");
