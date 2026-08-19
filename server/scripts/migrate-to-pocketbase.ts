// One-off migration: server/prisma/dev.db (Prisma/SQLite) -> PocketBase.
// Run manually, once, before removing Prisma from a deployment:
//
//   POCKETBASE_URL=http://localhost:8080 PB_SUPERUSER_EMAIL=... PB_SUPERUSER_PASSWORD=... \
//     pnpm --filter server exec tsx scripts/migrate-to-pocketbase.ts
//
// Read-only against dev.db — never touches or deletes it, so it's safe to
// re-run (it'll just create duplicate PocketBase records if run twice).
//
// Lives outside src/ on purpose: not part of the tsc build (tsconfig.json
// only includes src/), run directly via tsx instead. node:sqlite isn't in
// this project's @types/node yet, hence the light `any` casts on row shapes
// below — irrelevant to tsx, which transpiles without type-checking.
import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PocketBase from "pocketbase";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_DB_PATH = path.resolve(__dirname, "../prisma/dev.db");

const POCKETBASE_URL = process.env.POCKETBASE_URL ?? "http://localhost:8080";
const SUPERUSER_EMAIL = process.env.PB_SUPERUSER_EMAIL;
const SUPERUSER_PASSWORD = process.env.PB_SUPERUSER_PASSWORD;

interface LabelTemplateRow {
  id: number;
  name: string;
  widthMm: number;
  heightMm: number;
  elementsJson: string;
}

interface ScanEventRow {
  id: number;
  rentmanSerialNumberId: string;
  direction: "OUT" | "IN";
  projectId: string | null;
  who: string | null;
  note: string | null;
}

interface PrintJobRow {
  id: number;
  templateId: number | null;
  rentmanSerialNumberId: string;
  who: string | null;
}

async function main() {
  if (!SUPERUSER_EMAIL || !SUPERUSER_PASSWORD) {
    console.error("Set PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD (see pocketbase/.env) before running this.");
    process.exit(1);
  }

  const db = new DatabaseSync(DEV_DB_PATH, { readOnly: true });
  const pb = new PocketBase(POCKETBASE_URL);
  await pb.collection("_superusers").authWithPassword(SUPERUSER_EMAIL, SUPERUSER_PASSWORD);

  const templates = db.prepare("SELECT * FROM LabelTemplate").all() as unknown as LabelTemplateRow[];
  const templateIdMap = new Map<number, string>();
  for (const t of templates) {
    const created = await pb.collection("label_templates").create({
      name: t.name,
      widthMm: t.widthMm,
      heightMm: t.heightMm,
      elements: JSON.parse(t.elementsJson),
    });
    templateIdMap.set(t.id, created.id);
  }
  console.log(`label_templates: migrated ${templates.length} rows`);

  const scans = db.prepare("SELECT * FROM ScanEvent").all() as unknown as ScanEventRow[];
  for (const s of scans) {
    await pb.collection("scan_events").create({
      rentmanSerialNumberId: s.rentmanSerialNumberId,
      direction: s.direction,
      projectId: s.projectId,
      who: s.who,
      note: s.note,
    });
  }
  console.log(`scan_events: migrated ${scans.length} rows`);

  const printJobs = db.prepare("SELECT * FROM PrintJob").all() as unknown as PrintJobRow[];
  let unresolvedTemplates = 0;
  for (const p of printJobs) {
    const template = p.templateId != null ? templateIdMap.get(p.templateId) : undefined;
    if (p.templateId != null && !template) unresolvedTemplates++;
    await pb.collection("print_jobs").create({
      template: template ?? null,
      rentmanSerialNumberId: p.rentmanSerialNumberId,
      who: p.who,
    });
  }
  console.log(
    `print_jobs: migrated ${printJobs.length} rows` +
      (unresolvedTemplates ? ` (${unresolvedTemplates} had an unresolvable template id, left unset)` : ""),
  );

  db.close();
  console.log("Done. server/prisma/dev.db is untouched — keep it as a backup.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
