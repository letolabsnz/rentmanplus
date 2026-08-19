import type PocketBase from "pocketbase";

interface SettingRow {
  id: string;
  key: string;
  value: string;
}

// Adding a new setting anywhere in the app is just: read/write its key
// through these two functions — no PocketBase schema migration needed,
// unlike the old one-fixed-column-per-setting design (see pb_migrations
// 0009_settings_key_value.js for why).
export async function getAllSettings(pb: PocketBase): Promise<Record<string, string>> {
  const rows = await pb.collection("settings").getFullList<SettingRow>();
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  return result;
}

export async function setSetting(pb: PocketBase, key: string, value: string): Promise<void> {
  const existing = await pb
    .collection("settings")
    .getFirstListItem<SettingRow>(pb.filter("key = {:key}", { key }))
    .catch(() => null);
  if (existing) {
    await pb.collection("settings").update(existing.id, { value });
  } else {
    await pb.collection("settings").create({ key, value });
  }
}
