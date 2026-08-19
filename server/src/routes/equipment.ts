import type { FastifyInstance } from "fastify";
import { rentman } from "../rentman/client.js";
import { attachScanStatus } from "../scan.js";
import { enrichSerialNumbers } from "./assets.js";

function idFromRef(ref: unknown): string | null {
  return typeof ref === "string" ? (ref.split("/").pop() ?? null) : null;
}

// The workshop thinks in equipment *types* first ("14-35 1000W PACIFIC", 8 in
// stock) and drills into individual serials second — this is the primary
// browse experience, with /api/assets/:id still used for a single serial.
export async function equipmentRoutes(app: FastifyInstance) {
  app.get("/api/equipment", async () => {
    const [data, movements] = await Promise.all([rentman.listAllEquipment(), rentman.listAllStockMovements()]);

    // Rentman's bulk /equipment list never populates current_quantity (it's
    // always null there — confirmed against a live token; only the
    // single-item GET computes it). stockmovements is the underlying
    // ledger, and summing each equipment's `amount` entries reproduces the
    // exact same number the single-item endpoint returns, so that's what
    // powers the "N in stock" figure here instead.
    const quantityByEquipmentId = new Map<string, number>();
    for (const m of movements) {
      const equipmentId = idFromRef(m.equipment);
      if (!equipmentId || typeof m.amount !== "number") continue;
      quantityByEquipmentId.set(equipmentId, (quantityByEquipmentId.get(equipmentId) ?? 0) + m.amount);
    }

    return {
      data: data.map((e) => ({
        ...e,
        current_quantity: e.current_quantity ?? quantityByEquipmentId.get(String(e.id)) ?? 0,
      })),
    };
  });

  app.get("/api/equipment/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const [equipment, serials] = await Promise.all([
        rentman.getEquipment(id),
        rentman.listAllSerialNumbers({ equipment: `/equipment/${id}` }),
      ]);
      const enriched = await enrichSerialNumbers(serials);
      return { ...equipment, serialNumbers: await attachScanStatus(enriched) };
    } catch (err) {
      req.log.error(err);
      return reply.code(404).send({ error: "Equipment not found" });
    }
  });
}
