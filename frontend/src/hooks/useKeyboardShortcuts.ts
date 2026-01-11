import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useSocket } from "@/hooks/useSocket";

export function useKeyboardShortcuts() {
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const setSelectedRocket = useStore((s) => s.setSelectedRocket);
  const rocketCount = useStore((s) => s.rockets.length);
  const isPlaying = useStore((s) => s.isPlaying);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const status = useStore((s) => s.status);
  const { sendCommand } = useSocket();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        if (status !== "connected") return;

        const nextState = !isPlaying;
        setIsPlaying(nextState);
        sendCommand(nextState ? "start" : "pause");
        return;
      }

      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        if (status !== "connected") return;
        setIsPlaying(true);
        sendCommand("restart");
        return;
      }

      if (rocketCount === 0) return;

      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        const prevIndex = (selectedIndex - 1 + rocketCount) % rocketCount;
        setSelectedRocket(prevIndex);
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        const nextIndex = (selectedIndex + 1) % rocketCount;
        setSelectedRocket(nextIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedIndex,
    setSelectedRocket,
    rocketCount,
    isPlaying,
    setIsPlaying,
    sendCommand,
    status,
  ]);
}
