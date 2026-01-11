import React from "react";
import { useStore } from "@/lib/store";

function MetricCard({
  label,
  valueKey,
  unit,
  colorClass = "text-slate-700",
}: {
  label: string;
  valueKey: keyof import("@/types/simulation").RocketState;
  unit: string;
  colorClass?: string;
}) {
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    return useStore.subscribe(
      (state) => state.rockets[selectedIndex]?.[valueKey],
      (val) => {
        if (ref.current && val !== undefined) {
          ref.current.innerText = val.toFixed(2);
        }
      },
    );
  }, [selectedIndex, valueKey]);

  return (
    <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span ref={ref} className={`font-mono text-xl font-bold ${colorClass}`}>
          0.00
        </span>
        <span className="text-[10px] font-medium text-slate-400 uppercase">
          {unit}
        </span>
      </div>
    </div>
  );
}

export function StatsGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard
        label="Vertical Vel"
        valueKey="vy"
        unit="m/s"
        colorClass="text-blue-600"
      />
      <MetricCard
        label="Horizontal Vel"
        valueKey="vx"
        unit="m/s"
        colorClass="text-purple-600"
      />
      <MetricCard
        label="Heading"
        valueKey="angle"
        unit="deg"
        colorClass="text-amber-600"
      />
      <MetricCard
        label="Propellant"
        valueKey="fuelMass"
        unit="kg"
        colorClass="text-emerald-600"
      />
    </div>
  );
}
