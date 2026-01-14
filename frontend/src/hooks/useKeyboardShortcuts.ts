import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useSocket } from "@/hooks/useSocket";

export function useKeyboardShortcuts() {
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const setSelectedRocket = useStore((s) => s.setSelectedRocket);
  const rocketCount = useStore((s) => s.rockets.length);
  const isSimPlaying = useStore((s) => s.isSimPlaying);
  const status = useStore((s) => s.status);
  const { sendCommand } = useSocket();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        if (status !== "connected") return;
        sendCommand(isSimPlaying ? "pause" : "start");
        return;
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        if (status !== "connected") return;
        sendCommand("restart");
        return;
      }
      if (rocketCount === 0) return;
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedRocket((selectedIndex - 1 + rocketCount) % rocketCount);
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedRocket((selectedIndex + 1) % rocketCount);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedIndex,
    setSelectedRocket,
    rocketCount,
    isSimPlaying,
    sendCommand,
    status,
  ]);
}
