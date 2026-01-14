import { LANDING_STATUSES } from "@/lib/constants";

export type NormalizedStatus = "flying" | "landed" | "crashed" | "unknown";

export function getRocketStatus(
  rawStatus: string | null,
  vy: number,
  y: number,
): NormalizedStatus {
  if (!rawStatus) {
    if (y < 1.0 && Math.abs(vy) < 1.0) return "landed";
    return "flying";
  }

  const s = rawStatus.toLowerCase();

  if (LANDING_STATUSES.FAILURE.some((k) => s === k)) return "crashed";
  if (LANDING_STATUSES.SUCCESS.some((k) => s === k)) return "landed";

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
  if (rawStatus) {
    return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
  }

  switch (status) {
    case "landed":
      return "Landed";
    case "crashed":
      return "Crashed";
    case "flying":
      return "Flying";
    default:
      return "Unknown";
  }
}
