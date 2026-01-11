import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { Rocket3D } from "./Rocket3D";
import { useStore } from "@/lib/store";
import { ConnectionOverlay } from "./ConnectionOverlay";
import { SimulationHUD } from "./SimulationHUD";

function CameraManager({ resetSignal }: { resetSignal: number }) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  const isResetting = useRef(false);
  const targetPos = new THREE.Vector3(0, 80, 800);
  const targetLook = new THREE.Vector3(0, 0, 0);

  useEffect(() => {
    if (resetSignal > 0) {
      isResetting.current = true;
    }
  }, [resetSignal]);

  useEffect(() => {
    if (controlsRef.current) {
      camera.position.copy(targetPos);
      controlsRef.current.target.copy(targetLook);
      controlsRef.current.update();
    }
  }, []);

  useFrame((state, delta) => {
    if (!isResetting.current || !controlsRef.current) return;

    const step = 4 * delta;

    state.camera.position.lerp(targetPos, step);
    controlsRef.current.target.lerp(targetLook, step);
    controlsRef.current.update();

    if (
      state.camera.position.distanceTo(targetPos) < 0.5 &&
      controlsRef.current.target.distanceTo(targetLook) < 0.5
    ) {
      isResetting.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      maxPolarAngle={Math.PI / 2 - 0.09}
      minDistance={20}
      maxDistance={2000}
      enablePan={true}
    />
  );
}

export function Viewport() {
  const rockets = useStore((s) => s.rockets);
  const [resetSignal, setResetSignal] = useState(0);

  const handleResetCamera = () => {
    setResetSignal(Date.now());
  };

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
      <ConnectionOverlay />

      <Canvas camera={{ position: [0, 80, 800], fov: 45, far: 20000 }}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[50, 100, 50]} intensity={5.0} castShadow />
        <Grid
          position={[0, 0, 0]}
          args={[2000, 2000]}
          sectionSize={50}
          cellSize={5}
          cellColor="#334e68"
          sectionColor="#5f6670"
          fadeDistance={1500}
        />
        <Suspense fallback={null}>
          {rockets.map((_, i) => (
            <Rocket3D key={i} index={i} />
          ))}
        </Suspense>

        <CameraManager resetSignal={resetSignal} />
      </Canvas>

      <SimulationHUD onResetCamera={handleResetCamera} />
    </div>
  );
}
