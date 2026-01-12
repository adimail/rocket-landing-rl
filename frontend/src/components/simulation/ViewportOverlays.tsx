import { useLandingStats } from "@/hooks/useLandingStats";

export function ViewportOverlays() {
  const { success, failure, rate } = useLandingStats();

  return (
    <>
      <div className="absolute bottom-6 left-6 flex flex-col gap-1 pointer-events-none select-none z-20">
        <div className="flex gap-4 items-baseline">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
              Success
            </span>
            <span className="text-xl font-mono font-bold text-emerald-400">
              {success}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
              Failed
            </span>
            <span className="text-xl font-mono font-bold text-red-400">
              {failure}
            </span>
          </div>
          <div className="flex flex-col border-l border-slate-800 pl-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
              Success Rate
            </span>
            <span className="text-xl font-mono font-bold text-blue-400">
              {rate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="absolute text-[7px] bottom-6 right-6 flex flex-col items-end gap-2 pointer-events-none select-none z-20">
        <div className="flex items-center gap-2">
          <div className="flex gap-3 font-bold uppercase tracking-wide text-slate-400">
            <div className="flex gap-1">
              <span className="text-[7px] text-slate-200 bg-slate-800 px-1 rounded">
                SPACE
              </span>
              <span>Pause/Play</span>
            </div>
            <div className="flex gap-1">
              <span className="text-[7px] text-slate-200 bg-slate-800 px-1 rounded">
                ARROWS
              </span>
              <span>Switch Rocket</span>
            </div>
            <div className="flex gap-1">
              <span className="text-[7px] text-slate-200 bg-slate-800 px-1 rounded">
                R
              </span>
              <span>Restart</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
