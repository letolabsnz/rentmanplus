/// <reference path="../pb_data/types.d.ts" />

// Replaces the fixed-column settings singleton (one row, one field per
// setting — printerHost, businessName, businessShortName) with a key/value
// table: one row per setting, "key" + "value" (text). A new setting from
// here on is just a new row the server reads/writes by key — no schema
// migration needed each time, which is the whole point of this change.
migrate(
  (app) => {
    const old = app.findCollectionByNameOrId("settings");
    const existing = app.findAllRecords(old)[0];
    const values = {
      printerHost: existing ? existing.get("printerHost") : "",
      businessName: existing ? existing.get("businessName") : "",
      businessShortName: existing ? existing.get("businessShortName") : "",
    };
    app.delete(old);

    const authRule = "@request.auth.id != ''";
    const settings = new Collection({
      type: "base",
      name: "settings",
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      fields: [
        { type: "text", name: "key", required: true },
        { type: "text", name: "value" },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_settings_key ON settings (key)"],
    });
    app.save(settings);

    for (const [key, value] of Object.entries(values)) {
      app.save(new Record(settings, { key, value: value || "" }));
    }
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("settings"));
    // Not reconstructing the old fixed-column shape on rollback.
  },
);
