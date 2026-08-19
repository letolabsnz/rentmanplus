import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { printAsset, type PrintableAsset } from "../lib/print";

export default function BatchPrintBar({
  assets,
  onDone,
}: {
  assets: PrintableAsset[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: string[] } | null>(null);

  const { data: templates } = useQuery({ queryKey: ["labels"], queryFn: api.listLabels, enabled: open });

  async function printAllWith(templateId: number) {
    const template = templates?.find((t) => t.id === templateId);
    if (!template) return;
    setOpen(false);
    const failed: string[] = [];
    setProgress({ done: 0, total: assets.length, failed });

    // Sequential, not parallel — the printer processes one job at a time and
    // flooding it with concurrent requests risks jobs arriving out of order
    // or overwhelming the network backend.
    for (const [i, asset] of assets.entries()) {
      try {
        const result = await printAsset(asset, template);
        if (!result.ok) failed.push(asset.displayname ?? String(asset.id));
      } catch {
        failed.push(asset.displayname ?? String(asset.id));
      }
      setProgress({ done: i + 1, total: assets.length, failed: [...failed] });
    }

    if (failed.length === 0) {
      setTimeout(() => {
        setProgress(null);
        onDone();
      }, 1500);
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
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1 rounded-md bg-white text-black font-medium hover:bg-neutral-200"
      >
        Print labels
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
