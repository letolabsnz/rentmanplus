/// <reference path="../pb_data/types.d.ts" />

// Generalizes print_jobs into a generic append-only event log — "type" is a
// free-text string (not a select) so new event kinds (login, page_view, ...)
// don't need a schema migration to add. "createdAt" is a plain date field,
// not autodate: autodate fields force "now" on create even from a migration
// (confirmed empirically), which would have overwritten every migrated
// print job's real timestamp with today's date. Server code sets it
// explicitly on every write instead (see server/src/routes/logs.ts).
migrate(
  (app) => {
    const authRule = "@request.auth.id != ''";
    const adminRule = "@request.auth.isAdmin = true";

    const logs = new Collection({
      type: "base",
      name: "logs",
      listRule: adminRule,
      viewRule: adminRule,
      createRule: authRule,
      // No updateRule/deleteRule — append-only, superuser-only to edit/remove.
      fields: [
        { type: "text", name: "type", required: true },
        { type: "text", name: "who" },
        { type: "json", name: "details", maxSize: 200000 },
        { type: "date", name: "createdAt", required: true },
      ],
      indexes: ["CREATE INDEX idx_logs_type_created ON logs (type, createdAt)"],
    });
    app.save(logs);

    const printJobs = app.findCollectionByNameOrId("print_jobs");
    const oldRows = app.findAllRecords(printJobs);
    for (const row of oldRows) {
      const rec = new Record(logs, {
        type: "print",
        who: row.get("who"),
        details: {
          template: row.get("template"),
          rentmanSerialNumberId: row.get("rentmanSerialNumberId"),
        },
        createdAt: row.get("printedAt"),
      });
      app.save(rec);
    }

    app.delete(printJobs);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("logs"));
    // Not reconstructing print_jobs on rollback — see
    // print_jobs_backup.json (repo root, gitignored) for the pre-migration
    // export if this ever needs to be restored by hand.
  },
);
