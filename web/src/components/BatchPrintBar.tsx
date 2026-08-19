import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { printAsset, type PrintableAsset } from "../lib/print";
import { useToast } from "./ToastProvider";

export default function BatchPrintBar({
  assets,
  onDone,
}: {
  assets: PrintableAsset[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copies, setCopies] = useState(1);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: string[] } | null>(null);
  const { showToast } = useToast();

  const { data: templates } = useQuery({ queryKey: ["labels"], queryFn: api.listLabels, enabled: open });

  async function printAllWith(templateId: string) {
    const template = templates?.find((t) => t.id === templateId);
    if (!template) return;
    setOpen(false);
    const failed: string[] = [];
    const total = assets.length * copies;
    setProgress({ done: 0, total, failed });

    // Sequential, not parallel — the printer processes one job at a time and
    // flooding it with concurrent requests risks jobs arriving out of order
    // or overwhelming the network backend.
    let done = 0;
    for (const asset of assets) {
      for (let copy = 0; copy < copies; copy++) {
        try {
          const result = await printAsset(asset, template);
          if (!result.ok) failed.push(asset.displayname ?? String(asset.id));
        } catch {
          failed.push(asset.displayname ?? String(asset.id));
        }
        done++;
        setProgress({ done, total, failed: [...failed] });
      }
    }

    if (failed.length === 0) {
      showToast("success", `Printed ${total} label${total === 1 ? "" : "s"}`);
      setTimeout(() => {
        setProgress(null);
        onDone();
      }, 1500);
    } else {
      showToast("error", `${failed.length}/${total} labels failed to print: ${failed.join(", ")}`);
    }
  }

  if (progress) {
    return (
      <div className="flex items-center gap-3 border border-neutral-800 rounded-lg px-4 py-2 text-sm bg-neutral-950">
        <span>
          Printing {progress.done}/{progress.total}…
        </span>
        {progress.failed.length > 0 && (
          <span className="text-red-400">Failed: {progress.failed.join(", ")}</span>
        )}
        {progress.done === progress.total && progress.failed.length > 0 && (
          <button onClick={() => setProgress(null)} className="text-neutral-500 hover:text-white ml-auto">
            Dismiss
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-3 border border-neutral-800 rounded-lg px-4 py-2 text-sm bg-neutral-950">
      <span className="font-medium">{assets.length} selected</span>

      <label className="flex items-center gap-2 text-neutral-500">
        Copies each
        <input
          type="number"
          min={1}
          value={copies}
          onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
          className="w-14 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-white"
        />
      </label>

      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1 rounded-md bg-white text-black font-medium hover:bg-neutral-200"
      >
        Print {assets.length * copies} label{assets.length * copies === 1 ? "" : "s"}
      </button>
      <button onClick={onDone} className="text-neutral-500 hover:text-white ml-auto">
        Clear selection
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 border border-neutral-800 bg-neutral-950 rounded-lg shadow-lg z-10 overflow-hidden">
          {templates === undefined && <p className="px-3 py-3 text-sm text-neutral-500">Loading templates…</p>}
          {templates?.length === 0 && (
            <p className="px-3 py-3 text-sm text-neutral-500">
              No label templates yet.{" "}
              <Link to="/labels/new" className="text-white underline">
                Create one
              </Link>
              .
            </p>
          )}
          {templates?.map((t) => (
            <button
              key={t.id}
              onClick={() => printAllWith(t.id)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-900"
            >
              {t.name}
              <span className="text-neutral-500"> · {t.widthMm}×{t.heightMm}mm</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
