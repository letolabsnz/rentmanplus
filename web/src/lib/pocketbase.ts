import { useEffect, useState } from "react";
import PocketBase, { type RecordModel } from "pocketbase";

// Talks directly to the PocketBase container (not proxied through our own
// server) — this is PocketBase's standard, supported usage pattern. Needs a
// LAN-reachable address in production, same as PRINTER_HOST does for the
// label printer.
export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL ?? "http://localhost:8080");

// Reads pb.authStore.record reactively — a plain read only reflects
// whatever was cached at the last login/authRefresh, so anything (isAdmin,
// name) that can change server-side needs this instead of pb.authStore.record
// directly, or the UI won't update until a full reload.
export function useAuthRecord(): RecordModel | null {
  const [record, setRecord] = useState(pb.authStore.record);
  useEffect(() => pb.authStore.onChange(() => setRecord(pb.authStore.record)), []);
  return record;
}
