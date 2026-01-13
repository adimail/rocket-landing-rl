import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

const VIEW_RANGE = 400;
const STEP = 50;
const TICK_COUNT = 20;

export function AltitudeTape() {
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const readoutRef = useRef<HTMLDivElement>(null);
  const tickRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const updateTape = (y: number | undefined) => {
      if (y === undefined) return;

      if (readoutRef.current) {
        readoutRef.current.innerText = y.toFixed(1);
      }

      const startTick = Math.floor((y - VIEW_RANGE / 2) / STEP) * STEP;

      tickRefs.current.forEach((el, i) => {
        if (!el) return;

        const tickValue = startTick + i * STEP;

        if (tickValue < 0) {
          el.style.display = "none";
          return;
        }
        el.style.display = "flex";

        const delta = tickValue - y;
        const percent = 50 - (delta / (VIEW_RANGE / 2)) * 50;

        el.style.top = `${percent}%`;

        const textSpan = el.querySelector("span");
        if (textSpan) {
          textSpan.innerText = tickValue.toString();
        }
      });
    };

    const initialState = useStore.getState().rockets[selectedIndex]?.y;
    updateTape(initialState);

    const unsub = useStore.subscribe(
      (state) => state.rockets[selectedIndex]?.y,
      (y) => updateTape(y),
    );
    return unsub;
  }, [selectedIndex]);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-14 bg-black/40 backdrop-blur-md border-l border-white/10 overflow-hidden select-none">
      <div className="absolute inset-0">
        {Array.from({ length: TICK_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              tickRefs.current[i] = el;
            }}
            className="absolute w-full flex items-center gap-1.5 will-change-transform"
            style={{ display: "none" }}
          >
            <div className="h-px w-2 bg-white/40" />
            <span className="text-[9px] font-mono text-white/60 tabular-nums">
              0
            </span>
          </div>
        ))}
      </div>

      <div className="absolute top-1/2 left-0 right-0 h-px bg-yellow-500/50 z-10">
        <div
          ref={readoutRef}
          className="absolute -top-2.5 right-1 bg-yellow-500 text-black text-[10px] px-1.5 py-0.5 rounded-sm font-bold font-mono shadow-[0_0_10px_rgba(234,179,8,0.5)]"
        >
          0.0
        </div>
      </div>
    </div>
  );
}
