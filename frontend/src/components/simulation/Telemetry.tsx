import { useEffect, useState } from "react";
import type { RocketState } from "@/types";
import { Card } from "@/components/ui/Card";
import { COLORS } from "@/lib/constants";

interface TelemetryProps {
  statesRef: React.MutableRefObject<RocketState[]>;
  metaRef: React.MutableRefObject<{
    rewards: number[];
    landing: (string | null)[];
  }>;
}

export function Telemetry({ statesRef, metaRef }: TelemetryProps) {
  const [displayData, setDisplayData] = useState<{
    states: RocketState[];
    rewards: number[];
    landing: (string | null)[];
  }>({ states: [], rewards: [], landing: [] });

  useEffect(() => {
    const interval = setInterval(() => {
      if (statesRef.current.length > 0) {
        setDisplayData({
          states: [...statesRef.current],
          rewards: [...metaRef.current.rewards],
          landing: [...metaRef.current.landing],
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {displayData.states.map((state, idx) => {
        const status = displayData.landing[idx];
        const isSafe =
          status === "safe" || status === "good" || status === "ok";
        const isUnsafe = status === "unsafe";

        return (
          <Card
            key={idx}
            style={{
              backgroundColor: isSafe
                ? COLORS.safe
                : isUnsafe
                  ? COLORS.unsafe
                  : undefined,
            }}
          >
            <div className="font-bold mb-2 flex justify-between">
              <span>Rocket {idx + 1}</span>
              <span>{displayData.rewards[idx]?.toFixed(3)}</span>
            </div>
            <hr className="border-gray mb-2" />
            <ul className="text-sm space-y-1 font-mono">
              <li>Speed: {state.speed.toFixed(2)} m/s</li>
              <li>Angle: {state.relativeAngle.toFixed(2)}°</li>
              <li>
                Pos: {state.x.toFixed(1)}, {state.y.toFixed(1)}
              </li>
              <li>
                Vel: {state.vx.toFixed(1)}, {state.vy.toFixed(1)}
              </li>
              <li>Fuel: {state.fuelMass.toFixed(0)} kg</li>
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
