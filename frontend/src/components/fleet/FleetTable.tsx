import { useRef } from "react";
import { useStore } from "@/lib/store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { useThrottle } from "@/hooks/useThrottle";

export function FleetTable() {
  const rawRockets = useStore((s) => s.rockets);
  const rawLandingStatus = useStore((s) => s.landingStatus);

  const rockets = useThrottle(rawRockets, 100);
  const landingStatus = useThrottle(rawLandingStatus, 100);

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
            const rawStatus = landingStatus[virtualRow.index];
            const isSelected = selectedIndex === virtualRow.index;

            if (!rocket) return null;

            let badgeVariant:
              | "default"
              | "success"
              | "destructive"
              | "warning" = "default";
            let statusText = "Flying";

            const status = rawStatus ? rawStatus.toLowerCase() : null;

            if (status) {
              if (
                status.includes("safe") ||
                status.includes("good") ||
                status.includes("perfect") ||
                status.includes("landed")
              ) {
                badgeVariant = "success";
                statusText = "Landed";
              } else if (
                status.includes("unsafe") ||
                status.includes("crash") ||
                status.includes("destroy") ||
                status.includes("failed")
              ) {
                badgeVariant = "destructive";
                statusText = "Crashed";
              } else {
                statusText = rawStatus || "Unknown";
              }
            } else {
              // Fallback inference if status is null but rocket is clearly stopped on ground
              if (
                rocket.y < 1.0 &&
                Math.abs(rocket.vy) < 0.5 &&
                Math.abs(rocket.vx) < 0.5
              ) {
                badgeVariant = "success";
                statusText = "Landed";
              }
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
