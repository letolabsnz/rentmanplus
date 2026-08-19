import type { FastifyInstance } from "fastify";
import { z } from "zod";

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

  app.post("/api/labels", async (req, reply) => {
    const parsed = templateBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    return req.pb.collection("label_templates").create(parsed.data);
  });

  app.put("/api/labels/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = templateBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    return req.pb.collection("label_templates").update(id, parsed.data);
  });

  app.delete("/api/labels/:id", async (req) => {
    const { id } = req.params as { id: string };
    await req.pb.collection("label_templates").delete(id);
    return { ok: true };
  });
}
