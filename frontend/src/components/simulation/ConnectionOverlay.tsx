import { Loader2, WifiOff, AlertCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useSocket } from "@/hooks/useSocket";

export function ConnectionOverlay() {
  const status = useStore((s) => s.status);
  const { connect } = useSocket();

  if (status === "connected") return null;

  return (
    <div className="absolute inset-0 z-10 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
      {status === "connecting" ? (
        <>
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-300 font-mono text-sm tracking-widest uppercase">
            Establishing Uplink...
          </p>
        </>
      ) : status === "error" ? (
        <>
          <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
          <p className="text-slate-300 font-mono text-sm mb-6">
            Connection Failed
          </p>
          <button
            onClick={connect}
            className="px-6 cursor-pointer py-2 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
          >
            Retry Connection
          </button>
        </>
      ) : (
        <>
          <WifiOff className="w-10 h-10 text-slate-600 mb-4" />
          <p className="text-slate-500 font-mono text-sm">Simulation Offline</p>
        </>
      )}
    </div>
  );
}
