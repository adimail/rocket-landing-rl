import { useRef, useEffect } from "react";
import type { RocketState, RocketAction } from "@/types";
import { useGameLoop } from "@/hooks/useGameLoop";
import {
  renderBackground,
  renderRocket,
  renderExplosion,
} from "@/lib/canvas-renderer";
import * as C from "@/lib/constants";

interface CanvasViewProps {
  statesRef: React.MutableRefObject<RocketState[]>;
  actionsRef: React.MutableRefObject<RocketAction[]>;
  metaRef: React.MutableRefObject<{
    crashed: boolean[];
    explosionStart: number[];
  }>;
}

export function CanvasView({
  statesRef,
  actionsRef,
  metaRef,
}: CanvasViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { clientWidth } = containerRef.current;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientWidth * 0.75;
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useGameLoop((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    renderBackground(ctx, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const bottom = canvas.height - C.GROUND_OFFSET;

    statesRef.current.forEach((state, i) => {
      const action = actionsRef.current[i] || { throttle: 0, coldGas: 0 };
      const isCrashed = metaRef.current.crashed[i];

      if (isCrashed && state.y <= 10) {
        const elapsed = time - metaRef.current.explosionStart[i];
        const frame = Math.floor(elapsed / C.EXPLOSION_FRAME_DURATION);

        if (frame < C.TOTAL_EXPLOSION_FRAMES) {
          const x = centerX + state.x * C.SCALE_FACTOR;
          const y = bottom - state.y * C.SCALE_FACTOR;
          renderExplosion(ctx, frame, x, y);
        }
      } else {
        renderRocket(ctx, canvas.width, canvas.height, state, action);
      }
    });
  });

  return (
    <div ref={containerRef} className="w-full border border-gray bg-[#222]">
      <canvas ref={canvasRef} className="block w-full h-auto" />
    </div>
  );
}
