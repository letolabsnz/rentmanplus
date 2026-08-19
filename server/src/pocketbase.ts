import PocketBase from "pocketbase";

export const POCKETBASE_URL = process.env.POCKETBASE_URL ?? "http://localhost:8080";

if (!process.env.POCKETBASE_URL) {
  console.warn(
    "[pocketbase] POCKETBASE_URL is not set — defaulting to http://localhost:8080. Set it in server/.env for Docker.",
  );
}

// Builds a client authenticated as the calling user (their own Bearer token,
// not a superuser) — PocketBase's collection API rules are the actual
// authorization boundary, matching the app's existing flat "any crew member
// can do anything" trust model. See auth.ts, which validates the token and
// attaches this per-request.
export function clientForToken(token: string): PocketBase {
  const pb = new PocketBase(POCKETBASE_URL);
  pb.authStore.save(token, null);
  // The SDK's auto-cancellation kills "duplicate" concurrent requests to the
  // same collection+method (keyed by "GET /api/collections/x/records") —
  // meant for a long-lived browser client where a user might fire the same
  // search twice. This client is fresh per Fastify request and never reused,
  // so there's nothing to dedupe against; without this, a route that
  // Promise.all's two reads against the same collection (e.g. stats.ts)
  // would have one silently cancelled out from under it.
  pb.autoCancellation(false);
  return pb;
}
