import { useRef } from "react";
import { useStore } from "@/lib/store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export function FleetTable() {
  const rockets = useStore((s) => s.rockets);
  const landingStatus = useStore((s) => s.landingStatus);
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const setSelectedIndex = useStore((s) => s.setSelectedRocket);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rockets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center px-4 py-3 border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <div className="w-16">ID</div>
        <div className="w-24">Status</div>
        <div className="w-24 text-right">Alt (m)</div>
        <div className="w-24 text-right">Vel (m/s)</div>
        <div className="flex-1 ml-4">Fuel</div>
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rocket = rockets[virtualRow.index];
            const status = landingStatus[virtualRow.index];
            const isSelected = selectedIndex === virtualRow.index;

            // Derived status
            let badgeVariant:
              | "default"
              | "success"
              | "destructive"
              | "warning" = "default";
            let statusText = "Flying";

            if (
              status === "safe" ||
              status === "good" ||
              status === "perfect"
            ) {
              badgeVariant = "success";
              statusText = "Landed";
            } else if (status === "unsafe" || status === "crash") {
              badgeVariant = "destructive";
              statusText = "Crashed";
            }

            return (
              <div
                key={virtualRow.index}
                onClick={() => setSelectedIndex(virtualRow.index)}
                className={cn(
                  "absolute top-0 left-0 w-full flex items-center px-4 h-12 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50",
                  isSelected && "bg-indigo-50/50 hover:bg-indigo-50",
                )}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="w-16 font-mono text-sm text-slate-500">
                  #{virtualRow.index + 1}
                </div>
                <div className="w-24">
                  <Badge variant={badgeVariant}>{statusText}</Badge>
                </div>
                <div className="w-24 text-right font-mono text-sm text-slate-700">
                  {rocket.y.toFixed(1)}
                </div>
                <div className="w-24 text-right font-mono text-sm text-slate-700">
                  {rocket.vy.toFixed(1)}
                </div>
                <div className="flex-1 ml-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400"
                    style={{ width: `${(rocket.fuelMass / 400000) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
