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
    const initialTicks = history?.ticks.toArray() || [];
    const initialData =
      history?.[dataKey as keyof typeof history]?.toArray() || [];

    const opts: uPlot.Options = {
      width: containerRef.current.clientWidth,
      height: 100,
      series: [
        {},
        {
          label: label,
          stroke: color,
          width: 2,
          points: { show: false },
          fill: (u, _seriesIdx) => {
            const ctx = u.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, u.bbox.height);
            gradient.addColorStop(0, `${color}33`);
            gradient.addColorStop(1, `${color}00`);
            return gradient;
          },
        },
      ],
      axes: [
        { show: false },
        {
          stroke: "#64748b",
          grid: { stroke: "#1e293b", width: 1 },
          size: 40,
          font: "10px JetBrains Mono",
          values: (_self, ticks) => ticks.map((t) => t.toFixed(1)),
        },
      ],
      padding: [10, 10, 10, 0],
      cursor: {
        show: true,
        points: { show: false },
        drag: { x: false, y: false },
        sync: { key: "charts" },
      },
      legend: { show: false },
    };

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
          height: 100,
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
