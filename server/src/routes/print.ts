import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { printLabelPng } from "../print.js";
import { logEvent } from "../log.js";
import { getAllSettings } from "../settings.js";

// Three shapes: a real asset's serial printed against a saved template; a
// saved template printed with manually-typed field values instead of a real
// asset (rentmanSerialNumberId omitted — see CustomLabelPage.tsx's "From
// template" mode); or a one-off custom-text label with no template at all.
const printBody = z.union([
  z.object({
    templateId: z.string(),
    rentmanSerialNumberId: z.string().optional(),
    imageDataUrl: z.string().startsWith("data:image/png;base64,"),
    label: z.string(),
  }),
  z.object({
    customText: z.string().min(1),
    imageDataUrl: z.string().startsWith("data:image/png;base64,"),
    label: z.string(),
  }),
]);

export async function printRoutes(app: FastifyInstance) {
  app.post("/api/print", async (req, reply) => {
    const parsed = printBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { imageDataUrl, label } = parsed.data;

    const settings = await getAllSettings(req.pb);
    const png = Buffer.from(imageDataUrl.slice("data:image/png;base64,".length), "base64");
    const result = await printLabelPng(png, label, settings.printerHost || undefined);

    if (result.ok) {
      // "who" is the logged-in account, not client input — see auth.ts.
      const who = req.user.name || req.user.email;
      const details =
        "templateId" in parsed.data
          ? { template: parsed.data.templateId, rentmanSerialNumberId: parsed.data.rentmanSerialNumberId ?? null }
          : { customText: parsed.data.customText };
      await logEvent(req.pb, "print", who, details);
    }

    return reply.code(result.ok ? 200 : 502).send(result);
  });
}
