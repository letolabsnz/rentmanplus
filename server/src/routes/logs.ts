import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdmin } from "../auth.js";
import { logEvent } from "../log.js";
import { summarizeLogs, type RawLogRow } from "../logSummary.js";

const LIMIT = 200;

const eventBody = z.object({
  type: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
});

export async function logsRoutes(app: FastifyInstance) {
  app.get("/api/logs", { preHandler: requireAdmin }, async (req) => {
    const logs = await req.pb.collection("logs").getList<RawLogRow>(1, LIMIT, { sort: "-createdAt" });
    return summarizeLogs(req.pb, logs.items, { resolveSerials: true });
  });

  // Any authenticated user can log their own activity (page views, etc) —
  // only reading the aggregate feed above is admin-gated.
  app.post("/api/logs", async (req, reply) => {
    const parsed = eventBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const who = req.user.name || req.user.email;
    const record = await logEvent(req.pb, parsed.data.type, who, parsed.data.details ?? {});
    return record;
  });
}
