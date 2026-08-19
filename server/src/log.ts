import type PocketBase from "pocketbase";

// Generic append-only event log (see pb_migrations/0004_generic_logs.js) —
// createdAt is a plain date field, not autodate, so it has to be set
// explicitly here rather than relying on PocketBase to stamp it.
export function logEvent(pb: PocketBase, type: string, who: string | null, details: Record<string, unknown> = {}) {
  return pb.collection("logs").create({
    type,
    who,
    details,
    createdAt: new Date().toISOString(),
  });
}
