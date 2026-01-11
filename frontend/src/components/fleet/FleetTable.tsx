import { useRef, useMemo, useState } from "react";
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
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
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
        size: 60,
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
        size: 100,
      }),
      columnHelper.accessor("state.y", {
        id: "altitude",
        header: "Alt (m)",
        cell: (info) => (
          <div className="text-right font-mono pr-4 text-slate-300">
            {info.getValue().toFixed(1)}
          </div>
        ),
        size: 90,
      }),
      columnHelper.accessor("state.vy", {
        id: "velocity",
        header: "Vel (m/s)",
        cell: (info) => (
          <div className="text-right font-mono pr-4 text-slate-300">
            {info.getValue().toFixed(1)}
          </div>
        ),
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
        size: 100,
      }),
      columnHelper.accessor("state.fuelMass", {
        id: "fuel",
        header: "Fuel",
        cell: (info) => (
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden min-w-[80px] mr-4">
            <div
              className="h-full bg-slate-500 transition-all duration-300"
              style={{ width: `${(info.getValue() / 400000) * 100}%` }}
            />
          </div>
        ),
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
      <div className="bg-slate-950 border-b border-slate-800">
        {table.getHeaderGroups().map((headerGroup) => (
          <div key={headerGroup.id} className="flex items-center px-4 py-3">
            {headerGroup.headers.map((header) => {
              const isSortable = header.column.getCanSort();
              const sortDirection = header.column.getIsSorted();

              return (
                <div
                  key={header.id}
                  className={cn(
                    "text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 select-none",
                    isSortable && "cursor-pointer hover:text-slate-300",
                  )}
                  style={{
                    width: header.getSize() === 150 ? "auto" : header.getSize(),
                    flex: header.getSize() === 150 ? 1 : "none",
                  }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                  {isSortable && (
                    <span className="text-slate-600">
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
        ref={parentRef}
        className="flex-1 overflow-auto bg-slate-900 custom-scrollbar"
      >
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
                    style={{
                      width:
                        cell.column.getSize() === 150
                          ? "auto"
                          : cell.column.getSize(),
                      flex: cell.column.getSize() === 150 ? 1 : "none",
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
