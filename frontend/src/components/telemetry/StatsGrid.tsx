import React from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function MetricCard({
  label,
  valueKey,
  unit,
  isReward = false,
}: {
  label: string;
  valueKey?: keyof import("@/types/simulation").RocketState;
  unit: string;
  isReward?: boolean;
}) {
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const selector = isReward
      ? (state: any) => state.rewards[selectedIndex]
      : (state: any) => state.rockets[selectedIndex]?.[valueKey!];

    return useStore.subscribe(selector, (val) => {
      if (ref.current && val !== undefined) {
        ref.current.innerText = val.toFixed(2);
        if (isReward) {
          ref.current.className = cn(
            "font-mono text-sm font-bold",
            val > 0
              ? "text-emerald-400"
              : val < 0
                ? "text-red-400"
                : "text-yellow-400",
          );
        }
      }
    });
  }, [selectedIndex, valueKey, isReward]);

  return (
    <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
      <div className="text-[8px] font-black text-yellow-500/50 uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span ref={ref} className="font-mono text-sm font-bold text-yellow-400">
          0.00
        </span>
        <span className="text-[8px] font-bold text-slate-500 uppercase">
          {unit}
        </span>
      </div>
    </div>
  );
}

export function StatsGrid() {
  return (
    <div className="grid grid-cols-4 gap-2">
      <MetricCard label="Alt" valueKey="y" unit="m" />
      <MetricCard label="Vel Y" valueKey="vy" unit="m/s" />
      <MetricCard label="Vel X" valueKey="vx" unit="m/s" />
      <MetricCard label="Reward" unit="pts" isReward />
      <MetricCard label="Acc Y" valueKey="ay" unit="m/s²" />
      <MetricCard label="Acc X" valueKey="ax" unit="m/s²" />
      <MetricCard label="Speed" valueKey="speed" unit="m/s" />
      <MetricCard label="Fuel" valueKey="fuelMass" unit="kg" />
    </div>
  );
}
