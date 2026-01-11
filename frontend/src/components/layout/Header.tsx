import { useStore } from "@/lib/store";
import { Wifi, WifiOff, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";

export function Header() {
  const status = useStore((s) => s.status);
  const latency = useStore((s) => s.latency);
  const tick = useStore((s) => s.tick);
  const { connect } = useSocket();

  const getStatusDisplay = () => {
    switch (status) {
      case "connected":
        return {
          icon: <Wifi className="w-4 h-4 text-emerald-500" />,
          text: `${latency.toFixed(0)}ms`,
          color: "text-emerald-600",
        };
      case "connecting":
        return {
          icon: <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />,
          text: "Connecting...",
          color: "text-yellow-600",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: "Connection Failed",
          color: "text-red-600",
        };
      default:
        return {
          icon: <WifiOff className="w-4 h-4 text-slate-400" />,
          text: "Offline",
          color: "text-slate-500",
        };
    }
  };

  const config = getStatusDisplay();

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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {config.icon}
            <span className={cn("font-medium tabular-nums", config.color)}>
              {config.text}
            </span>
          </div>
          {status === "error" && (
            <button
              onClick={connect}
              className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-500"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
