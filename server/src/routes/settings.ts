import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getAllSettings, setSetting } from "../settings.js";

// Known settings and their defaults when no row exists for that key yet.
// Add a new one here (and wherever it's used) — no migration required, the
// key/value table just gets a new row the first time it's saved.
const DEFAULTS = {
  printerHost: "",
  businessName: "",
  businessShortName: "",
};

const settingsBody = z.object({
  printerHost: z.string().optional(),
  businessName: z.string().optional(),
  businessShortName: z.string().optional(),
});

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async (req) => {
    const stored = await getAllSettings(req.pb);
    return { ...DEFAULTS, ...stored };
  });

  app.put("/api/settings", async (req, reply) => {
    const parsed = settingsBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) await setSetting(req.pb, key, value);
    }
    const stored = await getAllSettings(req.pb);
    return { ...DEFAULTS, ...stored };
  });
}
