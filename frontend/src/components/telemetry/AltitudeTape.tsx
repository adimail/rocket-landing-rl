import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

const VIEW_HEIGHT_METERS = 1000;
const TICK_SPACING = 100;

export function AltitudeTape() {
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const [offset, setOffset] = useState(0);
  const [indicatorPercent, setIndicatorPercent] = useState(0);
  const [currentAlt, setCurrentAlt] = useState(0);

  useEffect(() => {
    const unsub = useStore.subscribe(
      (state) => state.rockets[selectedIndex],
      (rocket) => {
        if (!rocket) return;

        const y = Math.max(0, rocket.y);
        setCurrentAlt(y);

        const halfView = VIEW_HEIGHT_METERS / 2;

        if (y <= halfView) {
          setOffset(0);
          setIndicatorPercent((y / VIEW_HEIGHT_METERS) * 100);
        } else {
          setOffset(y - halfView);
          setIndicatorPercent(50);
        }
      },
    );
    return unsub;
  }, [selectedIndex]);

  const startTick = Math.floor(offset / TICK_SPACING) * TICK_SPACING;
  const endTick =
    Math.ceil((offset + VIEW_HEIGHT_METERS) / TICK_SPACING) * TICK_SPACING;

  const ticks = [];
  for (let t = startTick; t <= endTick; t += TICK_SPACING) {
    ticks.push(t);
  }

  return (
    <div className="h-full w-16 bg-slate-100 border-l border-slate-200 relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 pointer-events-none">
        {ticks.map((tickVal) => {
          const pos = (tickVal - offset) / VIEW_HEIGHT_METERS;
          const bottomPct = pos * 100;

          if (bottomPct < -5 || bottomPct > 105) return null;

          return (
            <div
              key={tickVal}
              className="absolute w-full border-b border-slate-300 flex justify-end pr-1 text-[9px] text-slate-400 font-mono h-0"
              style={{ bottom: `${bottomPct}%` }}
            >
              <span className="absolute -top-1.5 right-1">{tickVal}</span>
            </div>
          );
        })}
      </div>

      <div
        className="absolute w-full h-0.5 bg-amber-500 z-10 transition-all duration-75 ease-linear will-change-transform"
        style={{ bottom: `${indicatorPercent}%` }}
      >
        <div className="absolute -top-2.5 left-1 bg-amber-500 text-white text-[10px] px-1 rounded font-mono shadow-sm">
          {currentAlt.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
