/// <reference path="../pb_data/types.d.ts" />

// Full datastore for rentmanplus — replaces the old Prisma/SQLite schema
// (ScanEvent, LabelTemplate, PrintJob). See server/scripts/migrate-to-pocketbase.ts
// for the one-off data migration from the old dev.db into these collections.
migrate(
  (app) => {
    // Admin-provisioned accounts only — the built-in users collection ships
    // with public self-registration enabled by default; lock that down so
    // accounts can only be created via the PocketBase admin dashboard.
    const users = app.findCollectionByNameOrId("users");
    users.createRule = null;
    app.save(users);

    const authRule = "@request.auth.id != ''";

    const scanEvents = new Collection({
      type: "base",
      name: "scan_events",
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      // No update/delete routes today — left unset (superuser-only), same
      // as the old ScanEvent table having no update/delete API surface.
      fields: [
        { type: "text", name: "rentmanSerialNumberId", required: true },
        {
          type: "select",
          name: "direction",
          required: true,
          maxSelect: 1,
          values: ["OUT", "IN"],
        },
        { type: "text", name: "projectId" },
        { type: "text", name: "who" },
        { type: "text", name: "note" },
        { type: "autodate", name: "createdAt", onCreate: true },
      ],
      indexes: [
        "CREATE INDEX idx_scan_events_serial_created ON scan_events (rentmanSerialNumberId, createdAt)",
      ],
    });
    app.save(scanEvents);

    const labelTemplates = new Collection({
      type: "base",
      name: "label_templates",
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { type: "text", name: "name", required: true },
        { type: "number", name: "widthMm", required: true },
        { type: "number", name: "heightMm", required: true },
        { type: "json", name: "elements", required: true, maxSize: 2000000 },
        { type: "autodate", name: "createdAt", onCreate: true },
        { type: "autodate", name: "updatedAt", onCreate: true, onUpdate: true },
      ],
    });
    app.save(labelTemplates);

    const printJobs = new Collection({
      type: "base",
      name: "print_jobs",
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      fields: [
        {
          type: "relation",
          name: "template",
          collectionId: labelTemplates.id,
          maxSelect: 1,
          cascadeDelete: false, // deleting a template just detaches the print job, matches the old onDelete: SetNull
        },
        { type: "text", name: "rentmanSerialNumberId", required: true },
        { type: "text", name: "who" },
        { type: "autodate", name: "printedAt", onCreate: true },
      ],
    });
    app.save(printJobs);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("print_jobs"));
    app.delete(app.findCollectionByNameOrId("label_templates"));
    app.delete(app.findCollectionByNameOrId("scan_events"));

    const users = app.findCollectionByNameOrId("users");
    users.createRule = "";
    app.save(users);
  },
);
