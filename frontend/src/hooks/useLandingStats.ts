import { useState, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { LANDING_STATUSES } from "@/lib/constants";

export function useLandingStats() {
  const [stats, setStats] = useState({ success: 0, failure: 0 });
  const landingStatus = useStore((s) => s.landingStatus);
  const tick = useStore((s) => s.tick);
  const processedIndices = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (tick === 0) {
      processedIndices.current.clear();
      setStats({ success: 0, failure: 0 });
    }

    landingStatus.forEach((status, index) => {
      if (!status || processedIndices.current.has(index)) return;

      const s = status.toLowerCase();
      const isSuccess = LANDING_STATUSES.SUCCESS.includes(s);
      const isFailure = LANDING_STATUSES.FAILURE.includes(s);

      if (isSuccess || isFailure) {
        setStats((prev) => ({
          success: prev.success + (isSuccess ? 1 : 0),
          failure: prev.failure + (isFailure ? 1 : 0),
        }));
        processedIndices.current.add(index);
      }
    });
  }, [landingStatus, tick]);

  const total = stats.success + stats.failure;
  const rate = total === 0 ? 0 : (stats.success / total) * 100;

  return { ...stats, total, rate };
}
