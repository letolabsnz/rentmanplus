import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type LogEntry, type Stats } from "../lib/api";

const TILES: { key: keyof Stats; label: string }[] = [
  { key: "equipmentTypes", label: "Equipment types" },
  { key: "totalStockUnits", label: "Total stock units" },
  { key: "trackedSerials", label: "Tracked serial numbers" },
  { key: "projects", label: "Projects" },
  { key: "labelTemplates", label: "Label templates" },
  { key: "labelsPrinted", label: "Labels printed" },
  { key: "crewAccounts", label: "Crew accounts" },
];

function exportLogs(logs: LogEntry[]) {
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LogsPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
  });
  const { data: logs, isLoading: logsLoading, error: logsError } = useQuery({
    queryKey: ["logs"],
    queryFn: api.getLogs,
  });

  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const types = useMemo(() => (logs ? Array.from(new Set(logs.map((l) => l.type))).sort() : []), [logs]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    const term = search.trim().toLowerCase();
    return logs.filter((entry) => {
      if (typeFilter !== "all" && entry.type !== typeFilter) return false;
      if (!term) return true;
      return (
        entry.summary.toLowerCase().includes(term) ||
        (entry.who ?? "").toLowerCase().includes(term) ||
        JSON.stringify(entry.details).toLowerCase().includes(term)
      );
    });
  }, [logs, typeFilter, search]);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Logs</h1>

        {statsLoading && <p className="text-neutral-500 text-sm">Loading…</p>}
        {statsError && <p className="text-red-400 text-sm">Couldn't load stats: {(statsError as Error).message}</p>}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TILES.map(({ key, label }) => (
              <div key={key} className="border border-neutral-800 rounded-lg p-4 flex flex-col gap-1">
                <span className="text-sm text-neutral-500">{label}</span>
                <span className="text-2xl font-semibold">{stats[key].toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-neutral-400">
            System logs {logs && `(${filteredLogs.length}/${logs.length})`}
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-neutral-600"
            >
              <option value="all">all types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search who / summary / details"
              className="bg-neutral-900 border border-neutral-800 rounded-md px-2 py-1.5 text-xs font-mono w-64 focus:outline-none focus:border-neutral-600"
            />
            <button
              onClick={() => exportLogs(filteredLogs)}
              disabled={!logs || filteredLogs.length === 0}
              className="text-xs px-2.5 py-1.5 rounded-md border border-neutral-800 hover:bg-neutral-900 disabled:opacity-50"
            >
              Export JSON
            </button>
          </div>
        </div>

        {logsLoading && <p className="text-neutral-500 text-sm">Loading…</p>}
        {logsError && <p className="text-red-400 text-sm">Couldn't load logs: {(logsError as Error).message}</p>}

        {logs && (
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <div className="max-h-[36rem] overflow-y-auto overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead className="sticky top-0 bg-neutral-950">
                  <tr className="border-b border-neutral-800 text-left text-neutral-500">
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Timestamp</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Type</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Who</th>
                    <th className="px-3 py-2 font-medium">Summary</th>
                    <th className="px-3 py-2 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {filteredLogs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-neutral-900/50 align-top">
                      <td className="px-3 py-2 whitespace-nowrap text-neutral-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{entry.type}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{entry.who || "—"}</td>
                      <td className="px-3 py-2">{entry.summary}</td>
                      <td className="px-3 py-2 text-neutral-500 break-all max-w-xs">
                        {JSON.stringify(entry.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLogs.length === 0 && (
                <p className="px-3 py-6 text-neutral-500 text-sm">
                  {logs.length === 0 ? "No activity yet." : "No log entries match this filter."}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
