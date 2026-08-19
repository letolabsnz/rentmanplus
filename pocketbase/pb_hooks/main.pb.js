/// <reference path="../pb_data/types.d.ts" />

// Logs a "login" event into the generic logs collection on every genuinely
// successful password sign-in to the "users" collection. Login (unlike
// page views/prints) happens entirely browser<->PocketBase, bypassing our
// own Fastify server — a hook here is the only reliable place to catch it
// (a client-fired call after login could be skipped or spoofed).
//
// e.next() runs the real auth flow (password check, token issuance). If
// the password is wrong, e.next() throws and the code below never runs —
// only successful logins get logged.
onRecordAuthWithPasswordRequest((e) => {
  e.next();
  if (e.collection.name !== "users" || !e.record) return;
  const logs = e.app.findCollectionByNameOrId("logs");
  const record = new Record(logs, {
    type: "login",
    who: e.record.get("name") || e.record.get("email"),
    details: {},
    createdAt: new Date().toISOString(),
  });
  e.app.save(record);
}, "users");
