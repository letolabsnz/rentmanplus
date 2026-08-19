import type { FastifyInstance } from "fastify";
import { rentman } from "../rentman/client.js";
import { attachScanStatus } from "../scan.js";
import { enrichSerialNumbers } from "./assets.js";

// The workshop thinks in equipment *types* first ("14-35 1000W PACIFIC", 8 in
// stock) and drills into individual serials second — this is the primary
// browse experience, with /api/assets/:id still used for a single serial.
export async function equipmentRoutes(app: FastifyInstance) {
  app.get("/api/equipment", async () => {
    const data = await rentman.listAllEquipment();
    return { data };
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
