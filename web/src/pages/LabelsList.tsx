import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { LabelTemplateData } from "../lib/labelSpec";

// A template as it comes back from GET /api/labels, minus the DB-assigned
// fields that shouldn't be carried over when re-importing (id would collide,
// createdAt/updatedAt aren't meaningful for a freshly created row).
type ExportedTemplate = Omit<LabelTemplateData, "id">;

function isExportedTemplate(value: unknown): value is ExportedTemplate {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return typeof t.name === "string" && typeof t.widthMm === "number" && typeof t.heightMm === "number" && Array.isArray(t.elements);
}

export default function LabelsList() {
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useQuery({ queryKey: ["labels"], queryFn: api.listLabels });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function remove(id: string) {
    if (!confirm("Delete this label template?")) return;
    await api.deleteLabel(id);
    queryClient.invalidateQueries({ queryKey: ["labels"] });
  }

  function exportAll() {
    if (!templates || templates.length === 0) return;
    const payload: ExportedTemplate[] = templates.map(({ name, widthMm, heightMm, elements }) => ({
      name,
      widthMm,
      heightMm,
      elements,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `label-templates-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importFromFile(file: File) {
    setImporting(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      const valid = candidates.filter(isExportedTemplate);
      if (valid.length === 0) {
        alert("No valid label templates found in that file.");
        return;
      }
      let failed = 0;
      for (const template of valid) {
        try {
          await api.createLabel(template);
        } catch {
          failed++;
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["labels"] });
      const skipped = candidates.length - valid.length;
      alert(
        `Imported ${valid.length - failed} template${valid.length - failed === 1 ? "" : "s"}.` +
          (failed ? ` ${failed} failed.` : "") +
          (skipped ? ` ${skipped} skipped (not a valid template).` : ""),
      );
    } catch {
      alert("Couldn't read that file — make sure it's a label templates JSON export.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <button
            onClick={exportAll}
            disabled={!templates || templates.length === 0}
            className="text-sm px-3 py-1.5 rounded-md border border-neutral-800 hover:bg-neutral-900 disabled:opacity-50"
          >
            Export all
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="text-sm px-3 py-1.5 rounded-md border border-neutral-800 hover:bg-neutral-900 disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void importFromFile(file);
            }}
          />
          <Link
            to="/labels/new"
            className="text-sm px-3 py-1.5 rounded-md bg-white text-black font-medium hover:bg-neutral-200"
          >
            New template
          </Link>
        </div>
      </div>

      {isLoading && <p className="text-neutral-500 text-sm">Loading…</p>}

      <div className="border border-neutral-800 rounded-lg divide-y divide-neutral-800 overflow-hidden">
        {templates?.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-900">
            <Link to={`/labels/${t.id}`} className="flex flex-col">
              <span className="font-medium">{t.name}</span>
              <span className="text-neutral-500 text-xs">
                {t.widthMm}×{t.heightMm}mm · {t.elements.length} element{t.elements.length === 1 ? "" : "s"}
              </span>
            </Link>
            <button onClick={() => remove(t.id)} className="text-neutral-600 hover:text-red-400 text-xs">
              Delete
            </button>
          </div>
        ))}
        {!isLoading && templates?.length === 0 && (
          <p className="px-4 py-6 text-neutral-500 text-sm">No templates yet — create one to start printing labels.</p>
        )}
      </div>
    </div>
  );
}
