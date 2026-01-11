import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { RocketPreview } from "./RocketPreview";
import { StatsGrid } from "./StatsGrid";
import { RealTimeChart } from "./RealTimeChart";
import { cn } from "@/lib/utils";

const AVAILABLE_METRICS = [
  { id: "vy", label: "Vel Y" },
  { id: "vx", label: "Vel X" },
  { id: "ay", label: "Acc Y" },
  { id: "ax", label: "Acc X" },
  { id: "speed", label: "Speed" },
  { id: "angle", label: "Tilt" },
  { id: "angularVelocity", label: "Ang Vel" },
  { id: "reward", label: "Reward" },
];

export function TelemetryPanel() {
  const status = useStore((s) => s.status);
  const hasData = useStore((s) => s.rockets.length > 0);
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const activeCharts = useStore((s) => s.activeCharts);
  const toggleChart = useStore((s) => s.toggleChart);

  const isLoading = status === "connecting" || !hasData;

  return (
    <div className="h-full rounded-xl flex flex-col overflow-hidden bg-slate-50 border-l border-slate-200">
      <div className="sticky top-0 z-20 bg-slate-50">
        <div className="h-64 relative bg-slate-950 border-b border-slate-800">
          <RocketPreview />
          <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
            {isLoading ? (
              <Skeleton className="h-6 w-40 bg-slate-800" />
            ) : (
              <span className="font-mono text-[10px] font-bold px-2 py-1 bg-yellow-400 text-black rounded shadow-lg uppercase">
                Telemetry Target: #{selectedIndex + 1}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 border-b border-slate-200 shadow-sm bg-white">
          <StatsGrid />
        </div>

        <div className="p-2 bg-slate-100 border-b border-slate-200 flex flex-wrap gap-1.5">
          {AVAILABLE_METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleChart(m.id)}
              disabled={isLoading}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-bold uppercase border cursor-pointer transition-all",
                activeCharts.includes(m.id)
                  ? "bg-yellow-400 border-yellow-500 text-black shadow-sm"
                  : "bg-white border-slate-200 text-slate-400 hover:border-slate-300",
                isLoading && "opacity-50 cursor-not-allowed",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4 border-slate-200 bg-white">
                <Skeleton className="h-3 w-20 mb-4" />
                <Skeleton className="h-24 w-full" />
              </Card>
            ))
          : AVAILABLE_METRICS.filter((m) => activeCharts.includes(m.id)).map(
              (m) => (
                <Card
                  key={m.id}
                  className="p-2 border-slate-200 bg-white overflow-hidden"
                >
                  <div className="px-2 mb-1 flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                      {m.label}
                    </span>
                  </div>
                  <RealTimeChart
                    dataKey={m.id as any}
                    color={m.id === "reward" ? "#10b981" : "#facc15"}
                    label={m.label}
                  />
                </Card>
              ),
            )}
      </div>
    </div>
  );
}
