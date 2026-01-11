import { Suspense, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Rocket3D } from "./Rocket3D";
import { useStore } from "@/lib/store";
import { ConnectionOverlay } from "./ConnectionOverlay";
import { SimulationHUD } from "./SimulationHUD";

export function Viewport() {
  const rockets = useStore((s) => s.rockets);
  const controlsRef = useRef<any>(null);

  const moveCameraToFrontAllRockets = () => {
    const c = controlsRef.current;
    if (!c) return;
    c.object.position.set(0, 80, 800);
    c.target.set(0, 0, 0);
    c.update();
  };

  useEffect(() => {
    const id = requestAnimationFrame(moveCameraToFrontAllRockets);
    return () => cancelAnimationFrame(id);
  }, []);

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
        <OrbitControls
          ref={controlsRef}
          makeDefault
          maxPolarAngle={Math.PI / 2 - 0.09}
          minDistance={20}
          maxDistance={1000}
          enablePan={true}
        />
      </Canvas>

      <SimulationHUD onResetCamera={moveCameraToFrontAllRockets} />
    </div>
  );
}
