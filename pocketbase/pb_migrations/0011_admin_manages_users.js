/// <reference path="../pb_data/types.d.ts" />

// Lets an app-admin (isAdmin=true, not a PocketBase superuser) create, edit,
// and delete other users' accounts through the API — the new Users page.
// Previously: createRule was superuser-only (0001's "admin-provisioned
// accounts only" meant literally only via the PocketBase dashboard), and
// updateRule only ever allowed editing your own record ("id =
// @request.auth.id"), so an app-admin couldn't touch anyone else's account
// either. The isAdmin-field self-escalation protection from 0003 carries
// forward unchanged — you still can't grant yourself admin, only an
// existing admin can grant it (to themselves or anyone else).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule = "@request.auth.isAdmin = true";
    users.updateRule =
      "(id = @request.auth.id || @request.auth.isAdmin = true) && (@request.body.isAdmin:isset = false || @request.auth.isAdmin = true)";
    users.deleteRule = "@request.auth.isAdmin = true";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule = null;
    users.updateRule =
      "id = @request.auth.id && (@request.body.isAdmin:isset = false || @request.auth.isAdmin = true)";
    users.deleteRule = "id = @request.auth.id";
    app.save(users);
  },
);
