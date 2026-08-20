import type PocketBase from "pocketbase";
import { rentman } from "./rentman/client.js";

export interface LogEntry {
  id: string;
  type: string;
  who: string | null;
  timestamp: string;
  summary: string;
  details: Record<string, unknown>;
}

export interface RawLogRow {
  id: string;
  type: string;
  who: string;
  createdAt: string;
  details: unknown;
}

// resolveSerials pulls in Rentman's full serial-number catalog to turn a
// print's rentmanSerialNumberId into a readable asset name — that's the
// only part of this that ever needs Rentman at all (template names come
// from label_templates, a PocketBase collection). The main admin /api/logs
// feed wants that polish; a single user's own activity view doesn't need
// to pay for it (see server/src/routes/users.ts) — false skips the Rentman
// call entirely and just shows the raw serial id, which is what makes that
// view fast and Rentman-independent like the user expects it to be.
export async function summarizeLogs(
  pb: PocketBase,
  rows: RawLogRow[],
  { resolveSerials = false }: { resolveSerials?: boolean } = {},
): Promise<LogEntry[]> {
  const templates = await pb.collection("label_templates").getFullList();
  const templateNameById = new Map(templates.map((t) => [t.id, t.name as string]));

  let labelFor = (id: string) => id;
  if (resolveSerials) {
    const serials = await rentman.listAllSerialNumbers();
    const serialLabelById = new Map(serials.map((s) => [String(s.id), (s.displayname as string) ?? String(s.id)]));
    labelFor = (id: string) => serialLabelById.get(id) ?? id;
  }

  return rows.map((entry) => {
    const details = { ...(entry.details as Record<string, unknown>) };
    let summary = entry.type;
    if (entry.type === "print" && typeof details.customText === "string") {
      summary = `Printed custom label "${details.customText}"`;
    } else if (entry.type === "print") {
      const templateId = typeof details.template === "string" ? details.template : "";
      const serialId = typeof details.rentmanSerialNumberId === "string" ? details.rentmanSerialNumberId : "";
      details.templateName = templateNameById.get(templateId) ?? "deleted template";
      summary = `Printed "${details.templateName}" label`;
      if (serialId) {
        details.serialLabel = labelFor(serialId);
        summary += ` · ${details.serialLabel}`;
      } else {
        summary += " (manual field values)";
      }
    } else if (entry.type === "login") {
      summary = "Logged in";
    } else if (entry.type === "page_view") {
      summary = `Viewed ${details.path ?? "page"}`;
    } else if (entry.type === "label_created") {
      summary = `Created label template "${details.name ?? details.id}"`;
    } else if (entry.type === "label_updated") {
      summary = `Edited label template "${details.name ?? details.id}"`;
    } else if (entry.type === "label_deleted") {
      summary = `Deleted label template "${details.name ?? details.id}"`;
    } else if (entry.type === "user_created") {
      summary = `Created user "${details.name ?? details.email ?? details.id}"`;
    } else if (entry.type === "user_updated") {
      summary = `Edited user "${details.name ?? details.id}"`;
    } else if (entry.type === "user_deleted") {
      summary = `Deleted user "${details.name ?? details.id}"`;
    }
    return {
      id: `log-${entry.id}`,
      type: entry.type,
      who: entry.who || null,
      timestamp: entry.createdAt,
      summary,
      details,
    };
  });
}
