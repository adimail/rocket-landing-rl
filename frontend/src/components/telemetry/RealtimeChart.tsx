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
  const dataRef = useRef<[number[], (number | null)[]]>([[], []]);

  useEffect(() => {
    if (!containerRef.current) return;

    const opts: uPlot.Options = {
      width: containerRef.current.clientWidth,
      height: 140,
      series: [
        {},
        {
          label: label,
          stroke: color,
          width: 2,
          points: { show: false },
          fill: `${color}10`,
        },
      ],
      axes: [
        { show: false },
        {
          stroke: "#94a3b8",
          grid: { stroke: "#f1f5f9", width: 1 },
          size: 40,
          font: "10px JetBrains Mono",
        },
      ],
      padding: [12, 12, 12, 0],
      cursor: { show: false },
    };

    uplotRef.current = new uPlot(opts, dataRef.current, containerRef.current);

    const unsub = useStore.subscribe(
      (state) => ({
        val: state.rockets[selectedIndex]?.[dataKey],
        tick: state.tick,
      }),
      ({ val, tick }) => {
        if (val === undefined || !uplotRef.current) return;

        const [x, y] = dataRef.current;
        x.push(tick);
        y.push(val);

        if (x.length > 200) {
          x.shift();
          y.shift();
        }

        uplotRef.current.setData([x, y]);
      },
      { fireImmediately: false },
    );

    const ro = new ResizeObserver((entries) => {
      if (uplotRef.current && entries[0]) {
        uplotRef.current.setSize({
          width: entries[0].contentRect.width,
          height: 140,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      unsub();
      ro.disconnect();
      uplotRef.current?.destroy();
      dataRef.current = [[], []];
    };
  }, [selectedIndex, dataKey, color, label]);

  return <div ref={containerRef} className="w-full" />;
}
