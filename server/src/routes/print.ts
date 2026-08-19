import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { printLabelPng } from "../print.js";
import { logEvent } from "../log.js";
import { getAllSettings } from "../settings.js";

const printBody = z.object({
  templateId: z.string(),
  rentmanSerialNumberId: z.string(),
  imageDataUrl: z.string().startsWith("data:image/png;base64,"),
  label: z.string(),
});

export async function printRoutes(app: FastifyInstance) {
  app.post("/api/print", async (req, reply) => {
    const parsed = printBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { templateId, rentmanSerialNumberId, imageDataUrl, label } = parsed.data;

    const settings = await getAllSettings(req.pb);
    const png = Buffer.from(imageDataUrl.slice("data:image/png;base64,".length), "base64");
    const result = await printLabelPng(png, label, settings.printerHost || undefined);

    if (result.ok) {
      // "who" is the logged-in account, not client input — see auth.ts.
      const who = req.user.name || req.user.email;
      await logEvent(req.pb, "print", who, { template: templateId, rentmanSerialNumberId });
    }

    return reply.code(result.ok ? 200 : 502).send(result);
  });
}
