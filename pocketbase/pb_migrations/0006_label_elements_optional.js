/// <reference path="../pb_data/types.d.ts" />

// PocketBase's "required" check on a JSON field treats "[]" as empty and
// rejects it — but a brand-new template legitimately starts with zero
// elements (see LabelEditor's default state), so every fresh "New template"
// save was failing with a 400 until an element got added first.
migrate(
  (app) => {
    const labelTemplates = app.findCollectionByNameOrId("label_templates");
    labelTemplates.fields.add(new JSONField({ name: "elements", required: false, maxSize: 2000000 }));
    app.save(labelTemplates);
  },
  (app) => {
    const labelTemplates = app.findCollectionByNameOrId("label_templates");
    labelTemplates.fields.add(new JSONField({ name: "elements", required: true, maxSize: 2000000 }));
    app.save(labelTemplates);
  },
);
