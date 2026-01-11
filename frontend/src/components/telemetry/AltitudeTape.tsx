import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

export function AltitudeTape() {
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const tapeRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = useStore.subscribe(
      (state) => state.rockets[selectedIndex],
      (rocket) => {
        if (!rocket || !tapeRef.current || !valueRef.current) return;

        // Visual Scaling: 1px = 1m
        const y = rocket.y;
        tapeRef.current.style.transform = `translateY(${y}px)`;
        valueRef.current.innerText = y.toFixed(1);
      },
    );
    return unsub;
  }, [selectedIndex]);

  return (
    <div className="h-full w-16 bg-slate-100 border-l border-slate-200 relative overflow-hidden flex flex-col items-center">
      {/* Center Indicator */}
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-amber-500 z-10" />
      <div
        ref={valueRef}
        className="absolute top-1/2 -mt-3 left-1 z-20 bg-amber-500 text-white text-[10px] px-1 rounded font-mono"
      >
        0.0
      </div>

      {/* Moving Tape */}
      <div
        ref={tapeRef}
        className="w-full absolute top-1/2 transition-transform duration-75 ease-linear will-change-transform"
      >
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-full border-b border-slate-300 flex justify-end pr-1 text-[9px] text-slate-400 font-mono"
            style={{ top: -i * 50, height: 50 }}
          >
            {i * 50}
          </div>
        ))}
      </div>
    </div>
  );
}
