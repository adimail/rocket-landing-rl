import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "@/lib/store";
import * as THREE from "three";
import { useGLTF, Cone } from "@react-three/drei";

const ROCKET_SCALE = 0.003;

const FLAME_COLOR_CORE = "#ffedd5";
const FLAME_COLOR_OUTER = "#f59e0b";
const COLD_GAS_COLOR = "#fff";

export function Rocket3D({ index }: { index: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Group>(null);
  const rcsLeftRef = useRef<THREE.Group>(null);
  const rcsRightRef = useRef<THREE.Group>(null);

  const { scene } = useGLTF("/assets/booster.glb");
  const clone = useMemo(() => scene.clone(), [scene]);

  useFrame(() => {
    const state = useStore.getState().rockets[index];
    const action = useStore.getState().actions[index];

    if (!groupRef.current || !state) return;

    // Position scaling: 0.1 means 10 meters in sim = 1 unit in 3D view
    groupRef.current.position.set(state.x * 0.1, state.y * 0.1, 0);
    groupRef.current.rotation.z = THREE.MathUtils.degToRad(state.angle);

    // --- Main Engine Flame Logic ---
    if (flameRef.current) {
      const throttle = action?.throttle || 0;
      flameRef.current.visible = throttle > 0.01;

      // Scale flame based on throttle.
      // Base Y scale is 1.0, max is roughly 2.5x length at full throttle.
      const flicker = Math.random() * 0.1 + 0.95; // Slight flicker effect
      flameRef.current.scale.set(1, (throttle * 1.5 + 0.2) * flicker, 1);
    }

    // --- Cold Gas (RCS) Logic ---
    const coldGas = action?.coldGas || 0;

    if (rcsLeftRef.current) {
      rcsLeftRef.current.visible = coldGas < -0.1;
      const scale = Math.abs(coldGas);
      rcsLeftRef.current.scale.set(scale, scale, scale);
    }

    if (rcsRightRef.current) {
      rcsRightRef.current.visible = coldGas > 0.1;
      const scale = Math.abs(coldGas);
      rcsRightRef.current.scale.set(scale, scale, scale);
    }
  });

  // --- Dimensions (Tuned for ROCKET_SCALE = 0.003) ---
  // Rocket is roughly 6 units tall in 3D space with this scale.

  // Flame dimensions
  const flameRadius = 0.4;
  const flameHeight = 2.5;

  // RCS dimensions
  const rcsWidth = 0.3;
  const rcsHeight = 5.2;
  const rcsOffsetX = 0.5; // Distance from center
  const rcsOffsetY = 15.5; // Height on rocket body

  return (
    <group ref={groupRef}>
      <primitive
        object={clone}
        scale={ROCKET_SCALE}
        position={[0, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* Main Engine Flame */}
      <group ref={flameRef} position={[0, 0, 0]}>
        {/* Outer Flame */}
        <Cone
          args={[flameRadius, flameHeight, 8]}
          position={[0, -flameHeight / 2, 0]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshBasicMaterial
            color={FLAME_COLOR_OUTER}
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </Cone>
        {/* Inner Core */}
        <Cone
          args={[flameRadius * 0.6, flameHeight * 0.6, 8]}
          position={[0, -flameHeight * 0.3, 0]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshBasicMaterial color={FLAME_COLOR_CORE} />
        </Cone>
      </group>

      {/* Cold Gas Thrusters (RCS) */}
      {/* Left Thruster (Fires to push nose RIGHT, meaning rotate LEFT/CCW) */}
      <group
        ref={rcsLeftRef}
        position={[rcsOffsetX, rcsOffsetY, 0]}
        rotation={[0, 0, -Math.PI / 2]}
      >
        <Cone args={[rcsWidth, rcsHeight, 18]} position={[0, rcsHeight / 2, 0]}>
          <meshBasicMaterial color={COLD_GAS_COLOR} transparent opacity={1} />
        </Cone>
      </group>

      {/* Right Thruster (Fires to push nose LEFT, meaning rotate RIGHT/CW) */}
      <group
        ref={rcsRightRef}
        position={[-rcsOffsetX, rcsOffsetY, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <Cone args={[rcsWidth, rcsHeight, 8]} position={[0, rcsHeight / 2, 0]}>
          <meshBasicMaterial color={COLD_GAS_COLOR} transparent opacity={0.6} />
        </Cone>
      </group>
    </group>
  );
}

useGLTF.preload("/assets/booster.glb");
