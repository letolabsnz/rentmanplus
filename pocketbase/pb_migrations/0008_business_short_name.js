/// <reference path="../pb_data/types.d.ts" />

// Separate from businessName — the browser tab has little room, so a long
// business name there gets truncated/ugly. businessShortName is what the
// tab title uses; businessName is what shows in the header.
migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId("settings");
    settings.fields.add(new TextField({ name: "businessShortName" }));
    app.save(settings);
  },
  (app) => {
    const settings = app.findCollectionByNameOrId("settings");
    settings.fields.removeByName("businessShortName");
    app.save(settings);
  },
);
