import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Cone } from "@react-three/drei";
import * as THREE from "three";
import type { RocketAction } from "@/types/simulation";

const FLAME_COLOR_CORE = "#ffedd5";
const FLAME_COLOR_OUTER = "#f59e0b";
const COLD_GAS_COLOR = "#fff";

export interface RocketVisualConfig {
  flame: {
    radius: number;
    height: number;
  };
  rcs: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
}

const DEFAULT_CONFIG: RocketVisualConfig = {
  flame: { radius: 0.4, height: 2.5 },
  rcs: { width: 0.3, height: 5.2, offsetX: 0.5, offsetY: 15.5 },
};

interface RocketMeshProps {
  getAction: () => RocketAction | undefined;
  scale?: number;
  config?: Partial<RocketVisualConfig>;
}

export function RocketMesh({
  getAction,
  scale = 1,
  config = {},
}: RocketMeshProps) {
  const flameRef = useRef<THREE.Group>(null);
  const rcsLeftRef = useRef<THREE.Group>(null);
  const rcsRightRef = useRef<THREE.Group>(null);

  const { scene } = useGLTF("/assets/booster.glb");
  const clone = useMemo(() => scene.clone(), [scene]);

  // Merge defaults with provided config
  const settings = {
    flame: { ...DEFAULT_CONFIG.flame, ...config.flame },
    rcs: { ...DEFAULT_CONFIG.rcs, ...config.rcs },
  };

  useFrame(() => {
    const action = getAction();

    if (flameRef.current) {
      const throttle = action?.throttle || 0;
      flameRef.current.visible = throttle > 0.01;
      const flicker = Math.random() * 0.1 + 0.95;
      flameRef.current.scale.set(1, (throttle * 1.5 + 0.2) * flicker, 1);
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
    <group>
      <primitive
        object={clone}
        scale={scale}
        position={[0, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />

      <group ref={flameRef} position={[0, 0, 0]}>
        <Cone
          args={[settings.flame.radius, settings.flame.height, 8]}
          position={[0, -settings.flame.height / 2, 0]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshBasicMaterial
            color={FLAME_COLOR_OUTER}
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </Cone>
        <Cone
          args={[settings.flame.radius * 0.6, settings.flame.height * 0.6, 8]}
          position={[0, -settings.flame.height * 0.3, 0]}
          rotation={[Math.PI, 0, 0]}
        >
          <meshBasicMaterial color={FLAME_COLOR_CORE} />
        </Cone>
      </group>

      <group
        ref={rcsLeftRef}
        position={[settings.rcs.offsetX, settings.rcs.offsetY, 0]}
        rotation={[0, 0, -Math.PI / 2]}
      >
        <Cone
          args={[settings.rcs.width, settings.rcs.height, 18]}
          position={[0, settings.rcs.height / 2, 0]}
        >
          <meshBasicMaterial color={COLD_GAS_COLOR} transparent opacity={1} />
        </Cone>
      </group>

      <group
        ref={rcsRightRef}
        position={[-settings.rcs.offsetX, settings.rcs.offsetY, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <Cone
          args={[settings.rcs.width, settings.rcs.height, 8]}
          position={[0, settings.rcs.height / 2, 0]}
        >
          <meshBasicMaterial color={COLD_GAS_COLOR} transparent opacity={0.6} />
        </Cone>
      </group>
    </group>
  );
}

useGLTF.preload("/assets/booster.glb");
