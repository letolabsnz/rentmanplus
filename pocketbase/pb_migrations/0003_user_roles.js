/// <reference path="../pb_data/types.d.ts" />

// Adds isAdmin to the users collection (bool, unset = false = normal user).
// The updateRule addition is the important part here, not just the field:
// without it, a normal user could self-promote by PATCHing their own
// isAdmin directly against PocketBase's API (the default updateRule only
// checks "is this my own record", nothing field-specific). This only allows
// an isAdmin change in the request body when the requester is already an
// admin — everything else about a user's own record stays self-editable.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.add(
      new BoolField({
        name: "isAdmin",
      }),
    );
    users.updateRule =
      "id = @request.auth.id && (@request.body.isAdmin:isset = false || @request.auth.isAdmin = true)";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("isAdmin");
    users.updateRule = "id = @request.auth.id";
    app.save(users);
  },
);
