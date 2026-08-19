import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

// Bypasses the server's 60s Rentman cache and refetches — for "I just
// changed this in Rentman and want to see it now" instead of waiting.
export default function RefreshButton({ queryKeys }: { queryKeys: string[][] }) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      await api.refresh();
      await Promise.all(queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <button
      onClick={refresh}
      disabled={refreshing}
      className="text-sm px-3 py-1.5 rounded-md border border-neutral-800 hover:bg-neutral-900 disabled:opacity-50"
    >
      {refreshing ? "Refreshing…" : "Refresh"}
    </button>
  );
}
