import { LANDING_STATUSES } from "@/lib/constants";

export type NormalizedStatus = "flying" | "landed" | "crashed" | "unknown";

export function getRocketStatus(
  rawStatus: string | null,
  vy: number,
  y: number,
): NormalizedStatus {
  if (!rawStatus) {
    if (y < 1.0 && Math.abs(vy) < 0.5) return "landed";
    return "flying";
  }

  const s = rawStatus.toLowerCase();
  if (LANDING_STATUSES.SUCCESS.some((k) => s.includes(k))) return "landed";
  if (LANDING_STATUSES.FAILURE.some((k) => s.includes(k))) return "crashed";

  return "unknown";
}

export function getStatusColor(status: NormalizedStatus) {
  switch (status) {
    case "landed":
      return "success";
    case "crashed":
      return "destructive";
    default:
      return "default";
  }
}

export function getStatusText(
  status: NormalizedStatus,
  rawStatus: string | null,
) {
  switch (status) {
    case "landed":
      return "Landed";
    case "crashed":
      return "Crashed";
    case "flying":
      return "Flying";
    default:
      return rawStatus || "Unknown";
  }
}
