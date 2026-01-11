import { API_URL } from "@/lib/constants";

export async function fetchSimulationSpeed(): Promise<number> {
  const res = await fetch(`${API_URL}/speed`);
  if (!res.ok) throw new Error("Failed to fetch speed");
  const data = await res.json();
  return parseFloat(data.speed);
}
