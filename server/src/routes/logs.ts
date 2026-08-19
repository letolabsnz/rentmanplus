import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { rentman } from "../rentman/client.js";
import { requireAdmin } from "../auth.js";
import { logEvent } from "../log.js";

export interface LogEntry {
  id: string;
  type: string;
  who: string | null;
  timestamp: string;
  summary: string;
  details: Record<string, unknown>;
}

const LIMIT = 200;

const eventBody = z.object({
  type: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
});

export async function logsRoutes(app: FastifyInstance) {
  app.get("/api/logs", { preHandler: requireAdmin }, async (req) => {
    const [logs, serials, templates] = await Promise.all([
      req.pb.collection("logs").getList(1, LIMIT, { sort: "-createdAt" }),
      rentman.listAllSerialNumbers(),
      req.pb.collection("label_templates").getFullList(),
    ]);
    const serialLabelById = new Map(serials.map((s) => [String(s.id), (s.displayname as string) ?? String(s.id)]));
    const labelFor = (id: string) => serialLabelById.get(id) ?? id;
    const templateNameById = new Map(templates.map((t) => [t.id, t.name as string]));

    const entries: LogEntry[] = logs.items.map((entry) => {
      const details = { ...(entry.details as Record<string, unknown>) };
      let summary = entry.type;
      if (entry.type === "print" && typeof details.customText === "string") {
        summary = `Printed custom label "${details.customText}"`;
      } else if (entry.type === "print") {
        const templateId = typeof details.template === "string" ? details.template : "";
        const serialId = typeof details.rentmanSerialNumberId === "string" ? details.rentmanSerialNumberId : "";
        details.templateName = templateNameById.get(templateId) ?? "deleted template";
        summary = `Printed "${details.templateName}" label`;
        if (serialId) {
          details.serialLabel = labelFor(serialId);
          summary += ` · ${details.serialLabel}`;
        } else {
          summary += " (manual field values)";
        }
      } else if (entry.type === "login") {
        summary = "Logged in";
      } else if (entry.type === "page_view") {
        summary = `Viewed ${details.path ?? "page"}`;
      } else if (entry.type === "label_created") {
        summary = `Created label template "${details.name ?? details.id}"`;
      } else if (entry.type === "label_updated") {
        summary = `Edited label template "${details.name ?? details.id}"`;
      } else if (entry.type === "label_deleted") {
        summary = `Deleted label template "${details.name ?? details.id}"`;
      }
      return {
        id: `log-${entry.id}`,
        type: entry.type,
        who: entry.who || null,
        timestamp: entry.createdAt,
        summary,
        details,
      };
    });

    return entries;
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
