import type { FastifyInstance } from "fastify";
import { rentman, type RentmanRecord } from "../rentman/client.js";

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

export async function assetRoutes(app: FastifyInstance) {
  app.get("/api/assets", async () => {
    const data = await rentman.listAllSerialNumbers();
    return { data: await enrichSerialNumbers(data) };
  });

  // For a handheld barcode/QR scanner (acts as a keyboard: types the
  // scanned value, then Enter) — match against whichever field a given
  // label template happened to encode (id, serial, qrcodes, ref all show up
  // as scannable options in the label designer, see labelSpec.ts's
  // DATA_FIELDS), not just one specific field. Uses the same cached
  // Rentman list as everything else, so only the first scan after a cache
  // expiry pays the full-catalog cost.
  app.get("/api/assets/search", async (req, reply) => {
    const { q } = req.query as { q?: string };
    const term = q?.trim();
    if (!term) return reply.code(400).send({ error: "Missing q" });

    const data = await rentman.listAllSerialNumbers();
    const match = data.find(
      (s) => String(s.id) === term || s.serial === term || s.qrcodes === term || s.ref === term,
    );
    if (!match) return reply.code(404).send({ error: "No matching asset found" });
    return { id: String(match.id) };
  });

  app.get("/api/assets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const asset = await rentman.getSerialNumber(id);
      const [enriched] = await enrichSerialNumbers([asset]);
      const lastSubproject =
        typeof asset.last_subproject === "string" ? await rentman.resolveRef(asset.last_subproject) : null;
      return { ...enriched, _lastSubproject: lastSubproject };
    } catch (err) {
      req.log.error(err);
      return reply.code(404).send({ error: "Asset not found" });
    }
  });
}
