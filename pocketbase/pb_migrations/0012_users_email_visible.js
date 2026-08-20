/// <reference path="../pb_data/types.d.ts" />

// emailVisibility hides the email *field value* from anyone but the
// record's own owner (or a superuser) — a separate, field-level control
// from listRule/viewRule, which only govern whether the row itself can be
// fetched at all. It defaults false on every existing account, which would
// make the new Users page show blank emails for everyone but yourself.
// New users get emailVisibility: true directly in their create payload
// (server/src/routes/users.ts) — this just backfills the accounts that
// already existed before that.
migrate(
  (app) => {
    const users = app.findAllRecords(app.findCollectionByNameOrId("users"));
    for (const user of users) {
      user.set("emailVisibility", true);
      app.save(user);
    }
  },
  (app) => {
    const users = app.findAllRecords(app.findCollectionByNameOrId("users"));
    for (const user of users) {
      user.set("emailVisibility", false);
      app.save(user);
    }
  },
);
