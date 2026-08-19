import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { rentman, type RentmanRecord } from "../rentman/client.js";
import { db } from "../db.js";
import { attachScanStatus } from "../scan.js";

function idFromRef(ref: unknown): string | null {
  return typeof ref === "string" ? (ref.split("/").pop() ?? null) : null;
}

// Resolves the "/equipment/123" style reference fields Rentman puts on a
// serial number into the equipment name/code/warehouse location the
// workshop actually cares about. Joins against the full equipment/location
// lists (bulk-fetched once, cached 60s) instead of resolving each ref with
// its own request — the catalog can have 1000+ unique equipment refs, and
// that many individual lookups reliably tripped Rentman's rate limit.
export async function enrichSerialNumbers(records: RentmanRecord[]) {
  const [allEquipment, allLocations, allFolders] = await Promise.all([
    rentman.listAllEquipment(),
    rentman.listStockLocations(),
    rentman.listAllFolders(),
  ]);
  const equipmentById = new Map(allEquipment.map((e) => [String(e.id), e]));
  const locationById = new Map(allLocations.data.map((l) => [String(l.id), l]));
  const folderById = new Map(allFolders.map((f) => [String(f.id), f]));

  return records.map((r) => {
    const equipment = equipmentById.get(idFromRef(r.equipment) ?? "") ?? null;
    return {
      ...r,
      _equipment: equipment,
      _location: locationById.get(idFromRef(r.asset_location) ?? "") ?? null,
      _folder: folderById.get(idFromRef(equipment?.folder) ?? "") ?? null,
    };
  });
}

async function scanOverlayFor(rentmanSerialNumberId: string) {
  const history = await db.scanEvent.findMany({
    where: { rentmanSerialNumberId },
    orderBy: { createdAt: "desc" },
  });
  return {
    status: history[0]?.direction === "OUT" ? "OUT" : "IN",
    lastEvent: history[0] ?? null,
    history,
  };
}

const scanBody = z.object({
  direction: z.enum(["OUT", "IN"]),
  projectId: z.string().optional(),
  who: z.string().optional(),
  note: z.string().optional(),
});

export async function assetRoutes(app: FastifyInstance) {
  app.get("/api/assets", async () => {
    const data = await rentman.listAllSerialNumbers();
    const enriched = await enrichSerialNumbers(data);
    return { data: await attachScanStatus(enriched) };
  });

  app.get("/api/assets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const asset = await rentman.getSerialNumber(id);
      const [enriched] = await enrichSerialNumbers([asset]);
      const lastSubproject =
        typeof asset.last_subproject === "string" ? await rentman.resolveRef(asset.last_subproject) : null;
      const overlay = await scanOverlayFor(id);
      return { ...enriched, _lastSubproject: lastSubproject, _scan: overlay };
    } catch (err) {
      req.log.error(err);
      return reply.code(404).send({ error: "Asset not found" });
    }
  });

  app.post("/api/assets/:id/scan", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = scanBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const event = await db.scanEvent.create({
      data: {
        rentmanSerialNumberId: id,
        direction: parsed.data.direction,
        projectId: parsed.data.projectId,
        who: parsed.data.who,
        note: parsed.data.note,
      },
    });
    return event;
  });

  app.get("/api/assets/:id/scans", async (req) => {
    const { id } = req.params as { id: string };
    return scanOverlayFor(id);
  });
}
