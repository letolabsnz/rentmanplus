import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db.js";
import { printLabelPng } from "../print.js";

const printBody = z.object({
  templateId: z.number(),
  rentmanSerialNumberId: z.string(),
  who: z.string().optional(),
  imageDataUrl: z.string().startsWith("data:image/png;base64,"),
  label: z.string(),
});

export async function printRoutes(app: FastifyInstance) {
  app.post("/api/print", async (req, reply) => {
    const parsed = printBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { templateId, rentmanSerialNumberId, who, imageDataUrl, label } = parsed.data;

    const png = Buffer.from(imageDataUrl.slice("data:image/png;base64,".length), "base64");
    const result = await printLabelPng(png, label);

    if (result.ok) {
      await db.printJob.create({ data: { templateId, rentmanSerialNumberId, who } });
    }

    return reply.code(result.ok ? 200 : 502).send(result);
  });
}
