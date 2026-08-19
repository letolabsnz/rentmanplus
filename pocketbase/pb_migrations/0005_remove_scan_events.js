/// <reference path="../pb_data/types.d.ts" />

// rentmanplus is going back to being a thin interface over Rentman +
// label printing — in/out and stock tracking becomes Rentman's own job
// (custom equipment states), not a parallel ledger this app maintains.
// scan_events had zero real rows at the time of this migration.
migrate(
  (app) => {
    app.delete(app.findCollectionByNameOrId("scan_events"));
  },
  (app) => {
    const authRule = "@request.auth.id != ''";
    const scanEvents = new Collection({
      type: "base",
      name: "scan_events",
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      fields: [
        { type: "text", name: "rentmanSerialNumberId", required: true },
        { type: "select", name: "direction", required: true, maxSelect: 1, values: ["OUT", "IN"] },
        { type: "text", name: "projectId" },
        { type: "text", name: "who" },
        { type: "text", name: "note" },
        { type: "autodate", name: "createdAt", onCreate: true },
      ],
    });
    app.save(scanEvents);
  },
);
