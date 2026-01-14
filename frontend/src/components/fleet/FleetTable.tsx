import { useRef, useMemo, useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type SortingState,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useThrottle } from "@/hooks/useThrottle";
import type { RocketState } from "@/types/simulation";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertCircle,
} from "lucide-react";
import {
  getRocketStatus,
  getStatusColor,
  getStatusText,
} from "@/lib/domain/rocket";

interface TableRow {
  index: number;
  state: RocketState;
  status: string | null;
  reward: number;
}

const columnHelper = createColumnHelper<TableRow>();

const NumericCell = ({
  value,
  decimals = 1,
}: {
  value: number;
  decimals?: number;
}) => (
  <div className="text-right font-mono pr-4 text-slate-300">
    {value.toFixed(decimals)}
  </div>
);

export function FleetTable() {
  const status = useStore((s) => s.status);
  const rawRockets = useStore((s) => s.rockets);
  const rawLandingStatus = useStore((s) => s.landingStatus);
  const rawRewards = useStore((s) => s.rewards);
  const selectedIndex = useStore((s) => s.selectedRocketIndex);
  const setSelectedIndex = useStore((s) => s.setSelectedRocket);

  const rockets = useThrottle(rawRockets, 100);
  const landingStatus = useThrottle(rawLandingStatus, 100);
  const rewards = useThrottle(rawRewards, 100);

  const [sorting, setSorting] = useState<SortingState>([]);

  const tableData = useMemo((): TableRow[] => {
    return rockets.map((rocket, index) => ({
      index,
      state: rocket,
      status: landingStatus[index],
      reward: rewards[index] || 0,
    }));
  }, [rockets, landingStatus, rewards]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("index", {
        header: "ID",
        cell: (info) => (
          <span className="font-mono text-slate-500">
            #{info.getValue() + 1}
          </span>
        ),
        size: 50,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const rawStatus = info.getValue();
          const rocket = info.row.original.state;
          const normalized = getRocketStatus(rawStatus, rocket.vy, rocket.y);
          const variant = getStatusColor(normalized);
          const text = getStatusText(normalized, rawStatus);
          return <Badge variant={variant}>{text}</Badge>;
        },
        size: 90,
      }),
      columnHelper.accessor("reward", {
        header: "Reward",
        cell: (info) => {
          const val = info.getValue();
          return (
            <div
              className={cn(
                "text-right font-mono font-bold pr-4",
                val > 0
                  ? "text-emerald-400"
                  : val < 0
                    ? "text-red-400"
                    : "text-slate-500",
              )}
            >
              {val > 0 ? "+" : ""}
              {val.toFixed(2)}
            </div>
          );
        },
        size: 80,
      }),
      columnHelper.accessor("state.x", {
        header: "X (m)",
        cell: (info) => <NumericCell value={info.getValue()} />,
        size: 70,
      }),
      columnHelper.accessor("state.y", {
        header: "Alt (m)",
        cell: (info) => <NumericCell value={info.getValue()} />,
        size: 70,
      }),
      columnHelper.accessor("state.vx", {
        header: "VX (m/s)",
        cell: (info) => <NumericCell value={info.getValue()} />,
        size: 80,
      }),
      columnHelper.accessor("state.vy", {
        header: "VY (m/s)",
        cell: (info) => <NumericCell value={info.getValue()} />,
        size: 80,
      }),
      columnHelper.accessor("state.ax", {
        header: "AX (m/s²)",
        cell: (info) => <NumericCell value={info.getValue()} />,
        size: 80,
      }),
      columnHelper.accessor("state.ay", {
        header: "AY (m/s²)",
        cell: (info) => <NumericCell value={info.getValue()} />,
        size: 80,
      }),
      columnHelper.accessor("state.angle", {
        header: "Angle (°)",
        cell: (info) => <NumericCell value={info.getValue()} />,
        size: 80,
      }),
      columnHelper.accessor("state.angularVelocity", {
        header: "ω (°/s)",
        cell: (info) => <NumericCell value={info.getValue()} />,
        size: 80,
      }),
      columnHelper.accessor("state.speed", {
        header: "Speed",
        cell: (info) => <NumericCell value={info.getValue()} />,
        size: 70,
      }),
      columnHelper.accessor("state.fuelMass", {
        id: "fuel",
        header: "Fuel",
        cell: (info) => (
          <div className="flex items-center gap-2 pr-4">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden min-w-[60px]">
              <div
                className="h-full bg-slate-500 transition-all duration-300"
                style={{ width: `${(info.getValue() / 410000) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 w-8 text-right">
              {(info.getValue() / 1000).toFixed(0)}k
            </span>
          </div>
        ),
        size: 120,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  useEffect(() => {
    if (selectedIndex !== -1) {
      const virtualIndex = rows.findIndex(
        (row) => row.original.index === selectedIndex,
      );
      if (virtualIndex !== -1) {
        rowVirtualizer.scrollToIndex(virtualIndex, { align: "auto" });
      }
    }
  }, [selectedIndex, rows, rowVirtualizer]);

  if (status === "error") {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 rounded-xl border border-red-900/20 text-slate-500 p-6">
        <AlertCircle className="w-10 h-10 text-red-500/40 mb-3" />
        <h3 className="text-slate-300 font-mono text-sm uppercase tracking-widest">
          Uplink Failure
        </h3>
        <p className="text-[10px] mt-2 opacity-50 text-center max-w-xs">
          Connection to the simulation server was lost. Please use the retry
          control to re-establish telemetry.
        </p>
      </div>
    );
  }

  if (
    status === "connecting" ||
    (status === "connected" && rockets.length === 0)
  ) {
    return (
      <div className="h-full flex flex-col bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-5 w-48 bg-slate-800" />
          <Skeleton className="h-5 w-32 bg-slate-800" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
      <div className="flex-1 overflow-auto custom-scrollbar" ref={parentRef}>
        <div style={{ minWidth: "max-content" }}>
          <div className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <div key={headerGroup.id} className="flex items-center">
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  const sortDirection = header.column.getIsSorted();
                  const isSorted = !!sortDirection;

                  return (
                    <div
                      key={header.id}
                      className={cn(
                        "h-10 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 select-none transition-colors whitespace-nowrap",
                        isSortable && "cursor-pointer hover:text-slate-300",
                        isSorted && "bg-slate-800/50 text-slate-200",
                      )}
                      style={{ width: header.getSize() }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="w-full">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </span>
                      {isSortable && (
                        <span
                          className={cn(
                            "transition-colors flex-shrink-0",
                            isSorted ? "text-white" : "text-slate-600",
                          )}
                        >
                          {sortDirection === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : sortDirection === "desc" ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isSelected = selectedIndex === row.original.index;

              return (
                <div
                  key={row.id}
                  onClick={() => setSelectedIndex(row.original.index)}
                  className={cn(
                    "absolute top-0 left-0 w-full flex items-center px-4 h-[44px] border-b border-slate-800/50 cursor-pointer transition-all hover:bg-slate-800/50",
                    isSelected &&
                      "bg-blue-500/10 border-l-2 border-l-blue-500 hover:bg-blue-500/15",
                  )}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className="text-sm"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
