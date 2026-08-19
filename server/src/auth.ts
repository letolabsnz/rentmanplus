import type { FastifyReply, FastifyRequest } from "fastify";
import type { RecordModel } from "pocketbase";
import { clientForToken } from "./pocketbase.js";

declare module "fastify" {
  interface FastifyRequest {
    // Set by requireAuth below — a PocketBase client authenticated as the
    // calling user, and the user's own auth record (used to auto-fill
    // "who" on scans/prints instead of trusting client input).
    pb: import("pocketbase").default;
    user: RecordModel;
  }
}

// Verifies the Authorization: Bearer <token> header against PocketBase and
// attaches an authenticated client + the user record to the request.
//
// Registered directly as a root-level app.addHook("preHandler", requireAuth)
// in index.ts — deliberately NOT wrapped in app.register(), since a hook
// added inside a register()'d plugin only applies within that plugin's own
// encapsulation scope in Fastify, not to sibling route plugins.
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  if (!req.raw.url?.startsWith("/api/")) return;

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) {
    return reply.code(401).send({ error: "Missing Authorization header" });
  }

  const pb = clientForToken(token);
  try {
    const { record } = await pb.collection("users").authRefresh();
    req.pb = pb;
    req.user = record;
  } catch {
    return reply.code(401).send({ error: "Invalid or expired session" });
  }
}

// Route-specific preHandler (added on top of the global requireAuth, not
// instead of it) for admin-only endpoints like /api/stats and /api/logs.
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (req.user?.isAdmin !== true) {
    return reply.code(403).send({ error: "Admins only" });
  }
}
