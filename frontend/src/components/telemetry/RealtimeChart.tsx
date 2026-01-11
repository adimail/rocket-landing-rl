import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { useStore, telemetryHistory } from "@/lib/store";

interface RealTimeChartProps {
  dataKey: string;
  color: string;
  label: string;
}

export function RealTimeChart({ dataKey, color, label }: RealTimeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uplotRef = useRef<uPlot | null>(null);
  const selectedIndex = useStore((s) => s.selectedRocketIndex);

  useEffect(() => {
    if (!containerRef.current) return;

    const history = telemetryHistory[selectedIndex];
    // Convert RingBuffer to array for initial render
    const initialTicks = history?.ticks.toArray() || [];
    const initialData =
      history?.[dataKey as keyof typeof history]?.toArray() || [];

    const opts: uPlot.Options = {
      width: containerRef.current.clientWidth,
      height: 120,
      series: [
        {},
        {
          label: label,
          stroke: color,
          width: 2,
          points: { show: false },
          fill: `${color}15`,
        },
      ],
      axes: [
        { show: false },
        {
          stroke: "#475569",
          grid: { stroke: "#f1f5f9", width: 1 },
          size: 45,
          font: "10px JetBrains Mono",
          values: (self, ticks) => ticks.map((t) => t.toFixed(1)),
        },
      ],
      padding: [8, 12, 8, 0],
      cursor: { show: false },
    };

    // uPlot accepts TypedArrays directly in the data array
    uplotRef.current = new uPlot(
      opts,
      [initialTicks as any, initialData as any],
      containerRef.current,
    );

    const unsub = useStore.subscribe(
      (state) => state.tick,
      () => {
        const h = telemetryHistory[selectedIndex];
        if (!h || !uplotRef.current) return;

        // RingBuffer.toArray() returns a Float64Array, which uPlot handles efficiently
        uplotRef.current.setData([
          h.ticks.toArray() as any,
          h[dataKey as keyof typeof h].toArray() as any,
        ]);
      },
    );

    const ro = new ResizeObserver((entries) => {
      if (uplotRef.current && entries[0]) {
        uplotRef.current.setSize({
          width: entries[0].contentRect.width,
          height: 120,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      unsub();
      ro.disconnect();
      uplotRef.current?.destroy();
    };
  }, [selectedIndex, dataKey, color, label]);

  return <div ref={containerRef} className="w-full" />;
}
