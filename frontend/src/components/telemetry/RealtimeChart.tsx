import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { useStore } from "@/lib/store";

interface RealTimeChartProps {
  dataKey: "vy" | "vx" | "angle";
  color: string;
  label: string;
}

export function RealTimeChart({ dataKey, color, label }: RealTimeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uplotRef = useRef<uPlot | null>(null);
  const selectedIndex = useStore((s) => s.selectedRocketIndex);

  // Buffers
  const dataRef = useRef<[number[], number[]]>([[], []]);

  useEffect(() => {
    if (!containerRef.current) return;

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
        },
      ],
      axes: [
        { show: false },
        {
          stroke: "#94a3b8",
          grid: { stroke: "#f1f5f9" },
          size: 30,
          font: "10px monospace",
        },
      ],
      padding: [10, 0, 10, 0],
      cursor: {
        drag: { x: false, y: false },
        points: { size: 6, fill: color },
      },
    };

    uplotRef.current = new uPlot(opts, dataRef.current, containerRef.current);

    const unsub = useStore.subscribe(
      (state) => ({
        val: state.rockets[selectedIndex]?.[dataKey],
        tick: state.tick,
      }),
      ({ val, tick }) => {
        if (val === undefined || !uplotRef.current) return;

        const xData = dataRef.current[0];
        const yData = dataRef.current[1];

        xData.push(tick);
        yData.push(val);

        // Keep last 300 points
        if (xData.length > 300) {
          xData.shift();
          yData.shift();
        }

        uplotRef.current.setData(dataRef.current);
      },
    );

    // Resize Observer
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
