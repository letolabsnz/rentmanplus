import type { FastifyInstance } from "fastify";
import { rentman } from "../rentman/client.js";
import { quantityByEquipmentId } from "./equipment.js";
import { requireAdmin } from "../auth.js";

export interface Stats {
  equipmentTypes: number;
  totalStockUnits: number;
  trackedSerials: number;
  projects: number;
  labelTemplates: number;
  labelsPrinted: number;
  crewAccounts: number;
}

export async function statsRoutes(app: FastifyInstance) {
  app.get("/api/stats", { preHandler: requireAdmin }, async (req) => {
    const [equipment, serials, quantities, projects, templates, labelsPrinted, users] = await Promise.all([
      rentman.listAllEquipment(),
      rentman.listAllSerialNumbers(),
      quantityByEquipmentId(),
      // Same 1500-item cap as GET /api/projects — fine for a headline
      // count at this account's scale, see that route's comment.
      rentman.listProjects({ limit: 1500 }),
      req.pb.collection("label_templates").getList(1, 1),
      req.pb.collection("logs").getList(1, 1, { filter: 'type = "print"' }),
      req.pb.collection("users").getList(1, 1),
    ]);

    const stats: Stats = {
      equipmentTypes: equipment.length,
      totalStockUnits: equipment.reduce(
        (sum, e) => sum + (typeof e.current_quantity === "number" ? e.current_quantity : (quantities.get(String(e.id)) ?? 0)),
        0,
      ),
      trackedSerials: serials.length,
      projects: projects.data.length,
      labelTemplates: templates.totalItems,
      labelsPrinted: labelsPrinted.totalItems,
      crewAccounts: users.totalItems,
    };
    return stats;
  });
}
