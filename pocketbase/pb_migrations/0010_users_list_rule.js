/// <reference path="../pb_data/types.d.ts" />

// The built-in users collection ships with listRule "id = @request.auth.id"
// — each user can only ever list themselves. Every other collection here
// was already opened to "any authenticated user" (see 0001), but this
// default slipped through, which quietly broke the "Crew accounts" stat
// (an admin's own query against users.getList always came back with
// totalItems: 1, since PocketBase's row-level rule filtered out everyone
// else before the count was even taken). email stays hidden from other
// users regardless, via the users collection's existing emailVisibility
// field default (false).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.listRule = "@request.auth.id != ''";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.listRule = "id = @request.auth.id";
    app.save(users);
  },
);
