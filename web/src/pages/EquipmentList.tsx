import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, type Equipment } from "../lib/api";
import RefreshButton from "../components/RefreshButton";

export default function EquipmentList() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["equipment"],
    queryFn: api.listEquipment,
    // Matches the server's Rentman cache TTL (see rentman/client.ts) — polling
    // faster than that just forces an expensive full catalog + full
    // stock-movement-history re-walk against Rentman for no fresher data.
    refetchInterval: 5 * 60_000,
  });

  const filtered = useMemo(() => {
    const items = data?.data ?? [];
    if (!search.trim()) return items;
    const term = search.toLowerCase();
    return items.filter((e) => JSON.stringify(e).toLowerCase().includes(term));
  }, [data, search]);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Assets</h1>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search equipment, code, tag…"
            className="bg-neutral-900 border border-neutral-800 rounded-md px-3 py-1.5 text-sm w-72 focus:outline-none focus:border-neutral-600"
          />
          <RefreshButton queryKeys={[["equipment"]]} />
        </div>
      </div>

      {isLoading && <p className="text-neutral-500 text-sm">Loading…</p>}
      {error && (
        <p className="text-red-400 text-sm">
          Couldn't load equipment: {(error as Error).message}. Check RENTMAN_API_TOKEN in server/.env.
        </p>
      )}

      <div className="border border-neutral-800 rounded-lg divide-y divide-neutral-800 overflow-hidden">
        {filtered.map((item: Equipment) => (
          <Link
            key={item.id}
            to={`/equipment/${item.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-900 text-sm"
          >
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate">{item.displayname ?? item.name}</span>
              <span className="text-neutral-500 text-xs truncate">
                {item.code}
                {item.location_in_warehouse ? ` · ${item.location_in_warehouse}` : ""}
              </span>
            </div>
            <span className="text-neutral-400 text-xs shrink-0 bg-neutral-900 border border-neutral-800 rounded-full px-2 py-0.5">
              {item.current_quantity ?? 0} in stock
            </span>
          </Link>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="px-4 py-6 text-neutral-500 text-sm">No equipment found.</p>
        )}
      </div>
    </div>
  );
}
