import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { RocketPreview } from "./RocketPreview";
import { StatsGrid } from "./StatsGrid";
import { RealTimeChart } from "./RealtimeChart";
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
    <div className="h-full rounded-xl flex flex-col overflow-hidden bg-slate-900 border border-slate-800 shadow-xl">
      <div className="sticky top-0 z-20 bg-slate-900">
        <div className="h-64 relative bg-slate-950 border-b border-slate-800">
          <RocketPreview />
          <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
            {isLoading ? (
              <Skeleton className="h-6 w-40 bg-slate-800" />
            ) : (
              <span className="font-mono text-[10px] font-bold px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded uppercase tracking-wider backdrop-blur-md">
                Target: #{selectedIndex + 1}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 border-b border-slate-800 shadow-sm bg-slate-900">
          <StatsGrid />
        </div>

        <div className="p-2 bg-slate-950/30 border-b border-slate-800 flex flex-wrap gap-1.5">
          {AVAILABLE_METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleChart(m.id)}
              disabled={isLoading}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-bold uppercase border cursor-pointer transition-all",
                activeCharts.includes(m.id)
                  ? "bg-yellow-500 text-black border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300",
                isLoading && "opacity-50 cursor-not-allowed",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4 border-slate-800 bg-slate-950/50">
                <Skeleton className="h-3 w-20 mb-4 bg-slate-800" />
                <Skeleton className="h-24 w-full bg-slate-800" />
              </Card>
            ))
          : activeCharts.map((chartId) => {
              const m = AVAILABLE_METRICS.find(
                (metric) => metric.id === chartId,
              );
              if (!m) return null;
              return (
                <Card
                  key={m.id}
                  className="p-0 border-slate-800 bg-slate-950/30 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-slate-800/50 flex justify-between items-center bg-slate-950/50">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {m.label}
                    </span>
                  </div>
                  <div className="p-2">
                    <RealTimeChart
                      dataKey={m.id as any}
                      color={m.id === "reward" ? "#34d399" : "#38bdf8"}
                      label={m.label}
                    />
                  </div>
                </Card>
              );
            })}
      </div>
    </div>
  );
}
