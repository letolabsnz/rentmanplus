import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdmin } from "../auth.js";
import { logEvent } from "../log.js";
import { summarizeLogs, type RawLogRow } from "../logSummary.js";

const createBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  isAdmin: z.boolean().optional(),
});

const updateBody = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  isAdmin: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

// All admin-only — see pb_migrations/0011_admin_manages_users.js for the
// PocketBase-side rules this relies on (an app-admin's own token can
// create/edit/delete other users' accounts, not just their own).
export async function usersRoutes(app: FastifyInstance) {
  app.get("/api/users", { preHandler: requireAdmin }, async (req) => {
    return req.pb.collection("users").getFullList({ sort: "name" });
  });

  app.post("/api/users", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { password, ...rest } = parsed.data;
    const created = await req.pb.collection("users").create({
      ...rest,
      password,
      passwordConfirm: password,
      // Otherwise blank for everyone but the account itself — see
      // pb_migrations/0012_users_email_visible.js.
      emailVisibility: true,
    });
    const who = req.user.name || req.user.email;
    await logEvent(req.pb, "user_created", who, { id: created.id, name: created.name, email: created.email });
    return created;
  });

  app.put("/api/users/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { password, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data.password = password;
      data.passwordConfirm = password;
    }
    const updated = await req.pb.collection("users").update(id, data);
    const who = req.user.name || req.user.email;
    await logEvent(req.pb, "user_updated", who, { id: updated.id, name: updated.name });
    return updated;
  });

  // Accurate per-user counts (previously computed client-side by filtering
  // the global /api/logs feed, which is capped at 200 most-recent rows
  // system-wide — anyone whose activity wasn't in that recent window was
  // silently undercounted, e.g. showing 15 prints for someone who'd
  // actually printed far more). getList(1,1,{filter}).totalItems reflects
  // the true count regardless of how much other activity exists. No Rentman
  // calls here at all — see summarizeLogs's resolveSerials option — so this
  // stays fast independent of the Rentman-catalog cache state.
  app.get("/api/users/:id/activity", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = await req.pb
      .collection("users")
      .getOne(id)
      .catch(() => null);
    if (!user) return reply.code(404).send({ error: "User not found" });
    const who = user.name || user.email;

    const countFor = (type: string) =>
      req.pb
        .collection("logs")
        .getList(1, 1, { filter: req.pb.filter("who = {:who} && type = {:type}", { who, type }) });

    const [prints, logins, pageViews, recentRaw] = await Promise.all([
      countFor("print"),
      countFor("login"),
      countFor("page_view"),
      req.pb.collection("logs").getList<RawLogRow>(1, 100, {
        filter: req.pb.filter("who = {:who}", { who }),
        sort: "-createdAt",
      }),
    ]);

    return {
      stats: { prints: prints.totalItems, logins: logins.totalItems, pageViews: pageViews.totalItems },
      recent: await summarizeLogs(req.pb, recentRaw.items),
    };
  });

  app.delete("/api/users/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (id === req.user.id) {
      return reply.code(400).send({ error: "Can't delete your own account" });
    }
    const existing = await req.pb
      .collection("users")
      .getOne(id)
      .catch(() => null);
    await req.pb.collection("users").delete(id);
    const who = req.user.name || req.user.email;
    await logEvent(req.pb, "user_deleted", who, { id, name: existing?.name ?? id });
    return { ok: true };
  });
}
