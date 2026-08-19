import "dotenv/config";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assetRoutes } from "./routes/assets.js";
import { equipmentRoutes } from "./routes/equipment.js";
import { projectRoutes } from "./routes/projects.js";
import { labelRoutes } from "./routes/labels.js";
import { printRoutes } from "./routes/print.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default 1MB body limit is too tight once label templates/print jobs embed
// a base64 logo image or a printed label PNG.
const app = Fastify({ logger: true, bodyLimit: 15 * 1024 * 1024 });

await app.register(assetRoutes);
await app.register(equipmentRoutes);
await app.register(projectRoutes);
await app.register(labelRoutes);
await app.register(printRoutes);

// Serve the built web app (pnpm --filter web build) in production.
const webDist = path.resolve(__dirname, "../../web/dist");
await app.register(fastifyStatic, { root: webDist, wildcard: false });
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url?.startsWith("/api/")) {
    return reply.code(404).send({ error: "Not found" });
  }
  return reply.sendFile("index.html");
});

const port = Number(process.env.PORT ?? 3001);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
