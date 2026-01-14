import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { LANDING_STATUSES } from "@/lib/constants";

export function ExplosionEffect({ index }: { index: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const [active, setActive] = useState(false);
  const startTime = useRef(0);

  const count = 400;
  const particles = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.2 + Math.random() * 0.8;

      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      vel[i * 3 + 2] = Math.cos(phi) * speed;
    }
    return { pos, vel };
  }, []);

  useEffect(() => {
    const unsub = useStore.subscribe(
      (s) => {
        const status = s.landingStatus[index];
        return status ? status.toLowerCase() : null;
      },
      (status) => {
        if (status && LANDING_STATUSES.FAILURE.includes(status)) {
          setActive(true);
          startTime.current = 0;
          const positions = pointsRef.current?.geometry.attributes.position
            .array as Float32Array;
          if (positions) positions.fill(0);
        } else if (!status) {
          setActive(false);
        }
      },
    );
    return unsub;
  }, [index]);

  useFrame((_, delta) => {
    if (!active || !pointsRef.current || !matRef.current) return;

    startTime.current += delta;
    const t = startTime.current;

    if (t > 2) {
      matRef.current.opacity = 0;
      return;
    }

    const positions = pointsRef.current.geometry.attributes.position
      .array as Float32Array;
    const velocities = particles.vel;

    for (let i = 0; i < count; i++) {
      positions[i * 3] += velocities[i * 3] * 20 * delta;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * 20 * delta;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * 20 * delta;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    matRef.current.opacity = Math.max(0, 1 - t / 1.5);
    matRef.current.size = Math.max(0, 1.5 * (1 - t / 2));
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.pos}
          itemSize={3}
          args={[particles.pos, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0}
        color="#ff6600"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
