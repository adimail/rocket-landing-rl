import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { SpeedControl } from "./SpeedControl";

interface ControlBarProps {
  onStart: () => void;
  onPause: () => void;
  onRestart: () => void;
  onToggleAgent: () => void;
}

export function ControlBar({
  onStart,
  onPause,
  onRestart,
  onToggleAgent,
}: ControlBarProps) {
  const isAgentEnabled = useAppStore((s) => s.isAgentEnabled);

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-bg p-4 border-b border-orange">
      <div className="flex gap-2">
        <Button onClick={onStart}>Start</Button>
        <Button onClick={onPause}>Pause</Button>
        <Button onClick={onRestart}>Restart</Button>
        <Button onClick={onToggleAgent}>
          {isAgentEnabled ? "Disable Agent" : "Enable Agent"}
        </Button>
      </div>
      <div className="w-full md:w-64">
        <SpeedControl />
      </div>
    </div>
  );
}
