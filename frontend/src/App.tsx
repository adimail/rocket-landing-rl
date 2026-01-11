import { Header } from "@/components/layout/Header";
import { Viewport } from "@/components/simulation/Viewport";
import { TelemetryPanel } from "@/components/telemetry/TelemetryPanel";
import { FleetTable } from "@/components/fleet/FleetTable";
import { useTelemetryBridge } from "@/hooks/useTelemetryBridge";

function App() {
  useTelemetryBridge();

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      <Header />

      <main className="flex-1 p-4 grid grid-cols-12 grid-rows-12 gap-4 overflow-hidden">
        <div className="col-span-8 row-span-8">
          <Viewport />
        </div>

        <div className="col-span-4 row-span-12">
          <TelemetryPanel />
        </div>

        <div className="col-span-8 row-span-4">
          <FleetTable />
        </div>
      </main>
    </div>
  );
}

export default App;
