/// <reference path="../pb_data/types.d.ts" />

// Same gap as 0010 (which widened listRule) but for viewRule — single
// record lookups (getOne) are governed separately from list/search, and
// this got missed. Left at the default "id = @request.auth.id", any
// getOne() on another user's record 404s ("not found") even for an admin's
// own token — exactly what broke the new per-user activity endpoint.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.viewRule = "@request.auth.id != ''";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.viewRule = "id = @request.auth.id";
    app.save(users);
  },
);
