import type { FastifyInstance } from "fastify";
import { z } from "zod";

const settingsBody = z.object({
  printerHost: z.string(),
});

// Singleton "settings" collection (always exactly one row, seeded by the
// pb_migrations) — printer address lives here instead of only in
// server/.env, so it's editable at runtime from Settings > Printer.
export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async (req) => {
    return req.pb.collection("settings").getFirstListItem("");
  });

  app.put("/api/settings", async (req, reply) => {
    const parsed = settingsBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const current = await req.pb.collection("settings").getFirstListItem("");
    return req.pb.collection("settings").update(current.id, parsed.data);
  });
}
