import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

const VIEW_RANGE = 400;
const STEP = 50;

export function AltitudeTape() {
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const [alt, setAlt] = useState(0);

  useEffect(() => {
    const unsub = useStore.subscribe(
      (state) => state.rockets[selectedIndex]?.y,
      (y) => {
        if (y !== undefined) setAlt(y);
      },
    );
    return unsub;
  }, [selectedIndex]);

  const start = Math.floor((alt - VIEW_RANGE / 2) / STEP) * STEP;
  const end = start + VIEW_RANGE + STEP;
  const ticks = [];
  for (let t = start; t <= end; t += STEP) {
    if (t >= 0) ticks.push(t);
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-14 bg-black/20 backdrop-blur-sm border-l border-white/10 overflow-hidden select-none">
      <div className="absolute inset-0">
        {ticks.map((t) => {
          const offset = ((t - alt) / (VIEW_RANGE / 2)) * 50;
          const top = 50 - offset;
          if (top < -10 || top > 110) return null;

          return (
            <div
              key={t}
              className="absolute w-full flex items-center gap-1.5"
              style={{ top: `${top}%` }}
            >
              <div className="h-px w-2 bg-white/40" />
              <span className="text-[9px] font-mono text-white/60 tabular-nums">
                {t}
              </span>
            </div>
          );
        })}
      </div>

      <div className="absolute top-1/2 left-0 right-0 h-px bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] z-10">
        <div className="absolute -top-2.5 right-1 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-bold font-mono">
          {alt.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
