import React from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

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
  const status = useStore((s) => s.status);
  const hasData = useStore((s) => s.rockets.length > 0);
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!hasData) return;

    const selector = isReward
      ? (state: any) => state.rewards[selectedIndex]
      : (state: any) => state.rockets[selectedIndex]?.[valueKey!];

    const syncValue = (val: number | undefined) => {
      if (ref.current && val !== undefined) {
        ref.current.innerText = val.toFixed(2);
        if (isReward) {
          ref.current.className = cn(
            "font-mono text-lg font-bold tracking-tight",
            val > 0
              ? "text-emerald-400"
              : val < 0
                ? "text-red-400"
                : "text-yellow-400",
          );
        }
      }
    };

    syncValue(selector(useStore.getState()));

    return useStore.subscribe(selector, (val) => syncValue(val));
  }, [selectedIndex, valueKey, isReward, hasData]);

  if (status === "connecting" || !hasData) {
    return (
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex flex-col justify-between h-16">
        <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">
          {label}
        </div>
        <Skeleton className="h-5 w-16 bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex flex-col justify-between h-16 transition-colors hover:border-slate-700">
      <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          ref={ref}
          className="font-mono text-lg font-bold text-slate-100 tracking-tight"
        >
          0.00
        </span>
        <span className="text-[9px] font-bold text-slate-600 uppercase">
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
      <MetricCard label="Angle" valueKey="angle" unit="°" />
      <MetricCard label="Acc Y" valueKey="ay" unit="m/s²" />
      <MetricCard label="Acc X" valueKey="ax" unit="m/s²" />
      <MetricCard label="Speed" valueKey="speed" unit="m/s" />
      <MetricCard label="Fuel" valueKey="fuelMass" unit="kg" />
    </div>
  );
}
