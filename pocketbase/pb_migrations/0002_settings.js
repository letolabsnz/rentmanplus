/// <reference path="../pb_data/types.d.ts" />

// Singleton-style collection — always exactly one row. PocketBase record ids
// must be >= 15 chars, so this doesn't pin a fixed id; the server fetches it
// via getFirstListItem("") instead (see server/src/routes/settings.ts).
migrate(
  (app) => {
    const authRule = "@request.auth.id != ''";

    const settings = new Collection({
      type: "base",
      name: "settings",
      listRule: authRule,
      viewRule: authRule,
      updateRule: authRule,
      // No createRule/deleteRule — the single row is seeded below and isn't
      // meant to be created/removed through the API.
      fields: [
        {
          type: "text",
          name: "printerHost",
          hidden: false,
          // LAN IP of the Brother QL printer, e.g. "10.20.26.79" — see
          // print/print_label.py, which sends raw raster data to this
          // address over tcp://<host>:9100.
        },
      ],
    });
    app.save(settings);

    const record = new Record(settings, { printerHost: "" });
    app.save(record);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("settings"));
  },
);
