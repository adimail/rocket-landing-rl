import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { RocketPreview } from "./RocketPreview";
import { StatsGrid } from "./StatsGrid";
import { RealTimeChart } from "./RealTimeChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";

export function TelemetryPanel() {
  const selectedIndex = useStore((s) => s.selectedRocketIndex);

  return (
    <div className="h-full flex flex-col gap-4">
      <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">
              Rocket Telemetry
            </span>
          </div>
          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
            Rocket : {selectedIndex.toString() + 1}
          </span>
        </div>

        <div className="flex-1 relative bg-slate-950">
          <RocketPreview />
        </div>
      </Card>

      <StatsGrid />

      <Card className="p-4 border-slate-200 shadow-sm bg-white">
        <Tabs defaultValue="vy" className="w-full">
          <TabsList className="grid grid-cols-3 gap-2 mb-4 bg-slate-100 p-1 rounded-lg">
            <TabsTrigger
              value="vy"
              className="text-[10px] font-bold uppercase py-1.5 rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm text-slate-500"
            >
              Vel Y
            </TabsTrigger>
            <TabsTrigger
              value="vx"
              className="text-[10px] font-bold uppercase py-1.5 rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm text-slate-500"
            >
              Vel X
            </TabsTrigger>
            <TabsTrigger
              value="angle"
              className="text-[10px] font-bold uppercase py-1.5 rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm text-slate-500"
            >
              Tilt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vy" className="mt-0 outline-none">
            <RealTimeChart
              dataKey="vy"
              color="#6366f1"
              label="Vertical Velocity"
            />
          </TabsContent>
          <TabsContent value="vx" className="mt-0 outline-none">
            <RealTimeChart
              dataKey="vx"
              color="#8b5cf6"
              label="Horizontal Velocity"
            />
          </TabsContent>
          <TabsContent value="angle" className="mt-0 outline-none">
            <RealTimeChart dataKey="angle" color="#f59e0b" label="Angle" />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
