import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { AltitudeTape } from "./AltitudeTape";
import { RealTimeChart } from "./RealTimeChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { Rocket } from "lucide-react";

function MetricBox({
  label,
  valueKey,
  unit,
}: {
  label: string;
  valueKey: keyof import("@/types/simulation").RocketState;
  unit: string;
}) {
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    return useStore.subscribe(
      (state) => state.rockets[selectedIndex]?.[valueKey],
      (val) => {
        if (ref.current && val !== undefined) {
          ref.current.innerText = val.toFixed(2);
        }
      },
    );
  }, [selectedIndex, valueKey]);

  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
      <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1">
        {label}
      </div>
      <div className="font-mono text-lg text-slate-700">
        <span ref={ref}>0.00</span>{" "}
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
    </div>
  );
}

import * as React from "react";

export function TelemetryPanel() {
  const selectedIndex = useStore((s) => s.selectedRocketIndex);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top: Rocket Focus */}
      <Card className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-gradient-to-b from-white to-slate-50">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Rocket className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="font-semibold text-slate-700">
            Rocket {selectedIndex + 1}
          </h2>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            ID: RKT-{selectedIndex.toString().padStart(3, "0")}
          </div>
        </div>
        <AltitudeTape />
      </Card>

      {/* Middle: Physics Grid */}
      <Card className="p-4 grid grid-cols-2 gap-2">
        <MetricBox label="Vertical Vel" valueKey="vy" unit="m/s" />
        <MetricBox label="Horizontal Vel" valueKey="vx" unit="m/s" />
        <MetricBox label="Angle" valueKey="angle" unit="deg" />
        <MetricBox label="Fuel" valueKey="fuelMass" unit="kg" />
      </Card>

      {/* Bottom: Charts */}
      <Card className="p-4">
        <Tabs defaultValue="vy">
          <TabsList className="flex gap-2 mb-4 border-b border-slate-100 pb-2">
            <TabsTrigger
              value="vy"
              className="text-xs font-medium px-3 py-1 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-500 hover:text-slate-700"
            >
              Velocity Y
            </TabsTrigger>
            <TabsTrigger
              value="vx"
              className="text-xs font-medium px-3 py-1 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-500 hover:text-slate-700"
            >
              Velocity X
            </TabsTrigger>
            <TabsTrigger
              value="angle"
              className="text-xs font-medium px-3 py-1 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-500 hover:text-slate-700"
            >
              Angle
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vy">
            <RealTimeChart
              dataKey="vy"
              color="#0ea5e9"
              label="Vertical Velocity"
            />
          </TabsContent>
          <TabsContent value="vx">
            <RealTimeChart
              dataKey="vx"
              color="#8b5cf6"
              label="Horizontal Velocity"
            />
          </TabsContent>
          <TabsContent value="angle">
            <RealTimeChart dataKey="angle" color="#f59e0b" label="Angle" />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
