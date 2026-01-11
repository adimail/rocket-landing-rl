import { useStore } from "@/lib/store";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const status = useStore((s) => s.status);
  const latency = useStore((s) => s.latency);
  const tick = useStore((s) => s.tick);

  return (
    <header className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <h1 className="font-semibold text-slate-900 tracking-tight">
          Reinforcement Learning Agent For Vertical Rocket Landings
        </h1>
      </div>

      <div className="flex items-center gap-6 text-sm font-medium">
        <div className="flex items-center gap-2 text-slate-500">
          <span className="uppercase text-[10px] tracking-wider font-bold text-slate-400">
            T-Clock
          </span>
          <span className="font-mono">{tick.toString().padStart(6, "0")}</span>
        </div>

        <div className="h-4 w-px bg-slate-200" />

        <div className="flex items-center gap-2">
          {status === "connected" ? (
            <Wifi className="w-4 h-4 text-emerald-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span
            className={cn(
              "",
              status === "connected" ? "text-emerald-600" : "text-red-600",
            )}
          >
            {status === "connected" ? `${latency.toFixed(0)}ms` : "Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
