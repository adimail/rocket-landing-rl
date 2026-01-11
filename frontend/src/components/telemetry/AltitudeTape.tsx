import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

const VIEW_RANGE = 400;
const STEP = 50;
const TICK_COUNT = 20; // Enough to cover view + buffer

export function AltitudeTape() {
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const readoutRef = useRef<HTMLDivElement>(null);
  const ticksContainerRef = useRef<HTMLDivElement>(null);
  const tickRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const unsub = useStore.subscribe(
      (state) => state.rockets[selectedIndex]?.y,
      (y) => {
        if (y === undefined) return;

        // 1. Update Readout (Transient)
        if (readoutRef.current) {
          readoutRef.current.innerText = y.toFixed(1);
        }

        // 2. Update Ticks (Transient)
        // We calculate which ticks should be visible and update the DOM nodes directly
        // recycling the fixed pool of div elements.
        const startTick = Math.floor((y - VIEW_RANGE / 2) / STEP) * STEP;

        tickRefs.current.forEach((el, i) => {
          if (!el) return;

          const tickValue = startTick + i * STEP;

          // Only show positive altitude ticks
          if (tickValue < 0) {
            el.style.display = "none";
            return;
          }
          el.style.display = "flex";

          // Calculate position relative to the tape window (0% to 100%)
          // 0% is top (high altitude), 100% is bottom (low altitude)
          // y is current altitude (center, 50%)

          // offset in meters from current altitude
          const delta = tickValue - y;

          // Map delta to percentage.
          // Top of screen is y + VIEW_RANGE/2
          // Bottom of screen is y - VIEW_RANGE/2
          // Position % = 50% - (delta / (VIEW_RANGE/2) * 50%)

          const percent = 50 - (delta / (VIEW_RANGE / 2)) * 50;

          el.style.top = `${percent}%`;

          // Update text content of the tick
          const textSpan = el.firstElementChild
            ?.nextElementSibling as HTMLElement;
          if (textSpan) {
            textSpan.innerText = tickValue.toString();
          }
        });
      },
    );
    return unsub;
  }, [selectedIndex]);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-14 bg-black/20 backdrop-blur-sm border-l border-white/10 overflow-hidden select-none">
      <div ref={ticksContainerRef} className="absolute inset-0">
        {Array.from({ length: TICK_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              tickRefs.current[i] = el;
            }}
            className="absolute w-full flex items-center gap-1.5 transition-none will-change-transform"
            style={{ display: "none" }}
          >
            <div className="h-px w-2 bg-white/40" />
            <span className="text-[9px] font-mono text-white/60 tabular-nums">
              0
            </span>
          </div>
        ))}
      </div>

      <div className="absolute top-1/2 left-0 right-0 h-px bg-yellow-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] z-10">
        <div
          ref={readoutRef}
          className="absolute -top-2.5 right-1 bg-yellow-500 text-black text-[10px] px-1.5 py-0.5 rounded-sm font-bold font-mono"
        >
          0.0
        </div>
      </div>
    </div>
  );
}
