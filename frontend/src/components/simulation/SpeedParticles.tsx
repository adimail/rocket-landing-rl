import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/lib/store";

interface SpeedParticlesProps {
  count?: number;
  bounds?: number;
}

export function SpeedParticles({
  count = 120,
  bounds = 30,
}: SpeedParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * bounds * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * bounds * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * bounds;
    }
    return positions;
  }, [count, bounds]);

  useFrame((_, delta) => {
    if (!pointsRef.current || !matRef.current) return;

    const state = useStore.getState();
    const selectedIndex = state.selectedRocketIndex;
    const rocket = state.rockets[selectedIndex];
    const isPlaying = state.isSimPlaying;
    const landingStatus = state.landingStatus[selectedIndex];

    const isTerminal = !!landingStatus;

    if (!rocket || !isPlaying || rocket.speed < 0.5 || isTerminal) {
      matRef.current.opacity = THREE.MathUtils.lerp(
        matRef.current.opacity,
        0,
        0.15,
      );
      return;
    }

    matRef.current.opacity = THREE.MathUtils.lerp(
      matRef.current.opacity,
      0.6,
      0.05,
    );

    const positions = pointsRef.current.geometry.attributes.position
      .array as Float32Array;

    const velX = -rocket.vx * 0.15;
    const velY = -rocket.vy * 0.15;

    for (let i = 0; i < count; i++) {
      positions[i * 3] += velX * delta;
      positions[i * 3 + 1] += velY * delta;

      if (positions[i * 3] > bounds) positions[i * 3] = -bounds;
      if (positions[i * 3] < -bounds) positions[i * 3] = bounds;
      if (positions[i * 3 + 1] > bounds) positions[i * 3 + 1] = -bounds;
      if (positions[i * 3 + 1] < -bounds) positions[i * 3 + 1] = bounds;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
          args={[particles, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.4}
        color="#ffffff"
        transparent
        opacity={0}
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
