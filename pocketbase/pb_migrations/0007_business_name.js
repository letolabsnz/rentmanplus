/// <reference path="../pb_data/types.d.ts" />

// businessName labels this particular deployment (e.g. which workshop's
// instance this is) — shown in the app header/tab title. Lives on the same
// settings singleton as printerHost.
migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId("settings");
    settings.fields.add(new TextField({ name: "businessName" }));
    app.save(settings);
  },
  (app) => {
    const settings = app.findCollectionByNameOrId("settings");
    settings.fields.removeByName("businessName");
    app.save(settings);
  },
);
