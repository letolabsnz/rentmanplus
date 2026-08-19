import { db } from "./db.js";

// Attaches each record's current in/out status (from our own scan ledger —
// Rentman's API has no write access to serial number status, see the plan)
// by looking up the latest ScanEvent per asset in one batched query.
export async function attachScanStatus<T extends { id: string | number }>(
  records: T[],
): Promise<(T & { _status: "OUT" | "IN" })[]> {
  const ids = records.map((r) => String(r.id));
  const events = await db.scanEvent.findMany({
    where: { rentmanSerialNumberId: { in: ids } },
    orderBy: { createdAt: "desc" },
  });
  const latestByAsset = new Map<string, (typeof events)[number]>();
  for (const e of events) {
    if (!latestByAsset.has(e.rentmanSerialNumberId)) latestByAsset.set(e.rentmanSerialNumberId, e);
  }
  return records.map((r) => ({
    ...r,
    _status: latestByAsset.get(String(r.id))?.direction === "OUT" ? ("OUT" as const) : ("IN" as const),
  }));
}
