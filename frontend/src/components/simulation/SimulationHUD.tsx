import { useStore } from "@/lib/store";
import { useSocket } from "@/hooks/useSocket";
import { Play, Pause, RotateCcw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimulationHUDProps {
  onResetCamera: () => void;
}

export function SimulationHUD({ onResetCamera }: SimulationHUDProps) {
  const status = useStore((s) => s.status);
  const isAgentEnabled = useStore((s) => s.isAgentEnabled);
  const isPlaying = useStore((s) => s.isPlaying);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const toggleAgent = useStore((s) => s.toggleAgent);
  const { sendCommand } = useSocket();

  const handlePlay = () => {
    setIsPlaying(true);
    sendCommand("start");
  };

  const handlePause = () => {
    setIsPlaying(false);
    sendCommand("pause");
  };

  const handleRestart = () => {
    setIsPlaying(true);
    sendCommand("restart");
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md shadow-lg border border-white/10 rounded-full px-2 py-1 flex items-center gap-1">
      {!isPlaying ? (
        <button
          onClick={handlePlay}
          disabled={status !== "connected"}
          className="p-2 hover:bg-white/20 rounded-full cursor-pointer disabled:opacity-30"
        >
          <Play className="w-4 h-4 text-white" fill="currentColor" />
        </button>
      ) : (
        <button
          onClick={handlePause}
          disabled={status !== "connected"}
          className="p-2 hover:bg-white/20 rounded-full cursor-pointer disabled:opacity-30"
        >
          <Pause className="w-4 h-4 text-white" fill="currentColor" />
        </button>
      )}
      <div className="w-px h-4 bg-white/20 mx-1" />
      <button
        onClick={handleRestart}
        disabled={status !== "connected"}
        className="p-2 hover:bg-white/20 rounded-full cursor-pointer disabled:opacity-30"
      >
        <RotateCcw className="w-4 h-4 text-white" />
      </button>
      <div className="w-px h-4 bg-white/20 mx-1" />
      <button
        onClick={onResetCamera}
        className="p-1 hover:bg-white/20 rounded-full cursor-pointer"
      >
        <span className="text-sm text-white">Front View</span>
      </button>
      <div className="w-px h-4 bg-white/20 mx-1" />
      <button
        onClick={() => {
          toggleAgent();
          sendCommand("toggle_agent");
        }}
        disabled={status !== "connected"}
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-full text-sm font-medium cursor-pointer disabled:opacity-30",
          isAgentEnabled
            ? "bg-yellow-500 text-black shadow-lg"
            : "hover:bg-white/20 text-slate-300",
        )}
      >
        <Zap className="w-4 h-4" />
        <span>RL Agent</span>
      </button>
    </div>
  );
}
