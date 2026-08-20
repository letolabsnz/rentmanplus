import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { logEvent } from "../log.js";
import { requireAdmin } from "../auth.js";

const elementSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "barcode", "qr", "staticText", "image"]),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  dataField: z.string().optional(), // e.g. "displayname", "equipmentName", "qrcodes" — for text/barcode/qr
  text: z.string().optional(), // literal content for staticText
  fontSize: z.number().optional(),
  bold: z.boolean().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  valign: z.enum(["top", "middle", "bottom"]).optional(),
  wrap: z.boolean().optional(),
  breakWords: z.boolean().optional(),
  padding: z.number().optional(),
  lockAspect: z.boolean().optional(),
  imageData: z.string().optional(), // data: URL, image only
  folderLevels: z.array(z.number()).optional(),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(),
});

const templateBody = z.object({
  name: z.string().min(1),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  elements: z.array(elementSchema),
});

export async function labelRoutes(app: FastifyInstance) {
  // GET stays open to every authenticated user — printing (any crew member)
  // needs to list/read templates. Creating/editing/deleting is admin-only,
  // same as the Settings > Label templates page that's the only way to
  // reach those actions.
  app.get("/api/labels", async (req) => {
    return req.pb.collection("label_templates").getFullList({ sort: "name" });
  });

  app.get("/api/labels/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      return await req.pb.collection("label_templates").getOne(id);
    } catch {
      return reply.code(404).send({ error: "Template not found" });
    }
  });

  app.post("/api/labels", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = templateBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const created = await req.pb.collection("label_templates").create(parsed.data);
    const who = req.user.name || req.user.email;
    await logEvent(req.pb, "label_created", who, { id: created.id, name: created.name });
    return created;
  });

  app.put("/api/labels/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = templateBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const updated = await req.pb.collection("label_templates").update(id, parsed.data);
    const who = req.user.name || req.user.email;
    await logEvent(req.pb, "label_updated", who, { id: updated.id, name: updated.name });
    return updated;
  });

  app.delete("/api/labels/:id", { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    // Fetched before deleting purely so the log entry can name the
    // template — it's gone from label_templates after this either way.
    const existing = await req.pb
      .collection("label_templates")
      .getOne(id)
      .catch(() => null);
    await req.pb.collection("label_templates").delete(id);
    const who = req.user.name || req.user.email;
    await logEvent(req.pb, "label_deleted", who, { id, name: existing?.name ?? id });
    return { ok: true };
  });
}
