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
          color: "text-emerald-500",
        };
      case "connecting":
        return {
          icon: <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />,
          text: "Connecting...",
          color: "text-yellow-500",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: "Connection Failed",
          color: "text-red-500",
        };
      default:
        return {
          icon: <WifiOff className="w-4 h-4 text-slate-600" />,
          text: "Offline",
          color: "text-slate-600",
        };
    }
  };

  const config = getStatusDisplay();

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
        <h1 className="font-semibold text-slate-100 tracking-tight text-sm uppercase">
          RL Vertical Landing Control
        </h1>
      </div>

      <div className="flex items-center gap-6 text-sm font-medium">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="uppercase text-[10px] tracking-wider font-bold text-slate-600">
            T-Clock
          </span>
          <span className="font-mono text-slate-200">
            {tick.toString().padStart(6, "0")}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {config.icon}
            <span
              className={cn("font-medium tabular-nums text-xs", config.color)}
            >
              {config.text}
            </span>
          </div>
          {status === "error" && (
            <button
              onClick={connect}
              className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-500"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
