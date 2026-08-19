import type { FastifyInstance } from "fastify";
import { rentman } from "../rentman/client.js";

export async function projectRoutes(app: FastifyInstance) {
  app.get("/api/projects", async (req) => {
    // Unlike equipment/serial numbers (a bounded, all-relevant-now catalog),
    // a workshop's project history can span years — so this takes the single
    // largest page the API allows (1500) rather than walking every page like
    // listAllEquipment/listAllSerialNumbers do. Revisit with real filtering
    // (e.g. by date) if the project count ever exceeds that.
    const query = req.query as { limit?: string; offset?: string };
    return rentman.listProjects({
      limit: query.limit ? Number(query.limit) : 1500,
      offset: query.offset ? Number(query.offset) : undefined,
    });
  });

  app.get("/api/projects/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const [project, subprojects] = await Promise.all([
        rentman.getProject(id),
        rentman.listSubprojects(id),
      ]);
      return { ...project, subprojects: subprojects.data };
    } catch (err) {
      req.log.error(err);
      return reply.code(404).send({ error: "Project not found" });
    }
  });

  app.get("/api/projects/:id/equipment", async (req) => {
    // projectequipment has no `project`/`subproject` field of its own — it's
    // scoped via projectequipmentgroup, which does: group-by-project, then
    // equipment-lines-by-group. Confirmed against the live API (both accept
    // a `?project=` / `?equipment_group=` filter param).
    const { id } = req.params as { id: string };
    const groups = await rentman.listProjectEquipmentGroups({ project: `/projects/${id}` });
    const lineLists = await Promise.all(
      groups.data.map((g) => rentman.listProjectEquipment({ equipment_group: `/projectequipmentgroup/${g.id}` })),
    );
    return { lines: lineLists.flatMap((l) => l.data), groups: groups.data };
  });
}
