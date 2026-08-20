import type { FastifyInstance } from "fastify";
import { rentman } from "../rentman/client.js";
import { enrichSerialNumbers } from "./assets.js";

function idFromRef(ref: unknown): string | null {
  return typeof ref === "string" ? (ref.split("/").pop() ?? null) : null;
}

// Rentman's bulk /equipment list never populates current_quantity (it's
// always null there — confirmed against a live token; only the single-item
// GET computes it). stockmovements is the underlying ledger, and summing
// each equipment's `amount` entries reproduces the exact same number the
// single-item endpoint returns, so that's what powers "N in stock" instead.
export async function quantityByEquipmentId(): Promise<Map<string, number>> {
  const movements = await rentman.listAllStockMovements();
  const quantities = new Map<string, number>();
  for (const m of movements) {
    const equipmentId = idFromRef(m.equipment);
    if (!equipmentId || typeof m.amount !== "number") continue;
    quantities.set(equipmentId, (quantities.get(equipmentId) ?? 0) + m.amount);
  }
  return quantities;
}

// The workshop thinks in equipment *types* first ("14-35 1000W PACIFIC", 8 in
// stock) and drills into individual serials second — this is the primary
// browse experience, with /api/assets/:id still used for a single serial.
export async function equipmentRoutes(app: FastifyInstance) {
  app.get("/api/equipment", async () => {
    const [data, quantities] = await Promise.all([rentman.listAllEquipment(), quantityByEquipmentId()]);
    return {
      data: data.map((e) => ({
        ...e,
        current_quantity: e.current_quantity ?? quantities.get(String(e.id)) ?? 0,
      })),
    };
  });

  // Deliberately built from the same bulk, cached lists that back
  // GET /api/equipment and GET /api/assets rather than Rentman's per-item
  // getEquipment/listSerialNumbers(?equipment=) endpoints. Those per-item
  // calls can't be shared across different equipment ids, so browsing N
  // different items paid N multi-second Rentman round-trips even with
  // caching. This way, the whole catalog gets fetched (cached) once per
  // cache window no matter how many different items you look at.
  app.get("/api/equipment/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const [allEquipment, allSerials, allFolders, quantities] = await Promise.all([
      rentman.listAllEquipment(),
      rentman.listAllSerialNumbers(),
      rentman.listAllFolders(),
      quantityByEquipmentId(),
    ]);
    const equipment = allEquipment.find((e) => String(e.id) === id);
    if (!equipment) {
      return reply.code(404).send({ error: "Equipment not found" });
    }
    const serials = allSerials.filter((s) => idFromRef(s.equipment) === id);
    const folder = allFolders.find((f) => String(f.id) === idFromRef(equipment.folder));
    return {
      ...equipment,
      current_quantity: equipment.current_quantity ?? quantities.get(id) ?? 0,
      serialNumbers: await enrichSerialNumbers(serials),
      _folder: folder ?? null,
    };
  });
}
