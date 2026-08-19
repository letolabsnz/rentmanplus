import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { printAsset, type PrintableAsset } from "../lib/print";

export default function PrintButton({ asset }: { asset: PrintableAsset }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: templates } = useQuery({ queryKey: ["labels"], queryFn: api.listLabels, enabled: open });

  async function printWith(templateId: string) {
    const template = templates?.find((t) => t.id === templateId);
    if (!template) return;
    setPrinting(true);
    setStatus(null);
    try {
      const result = await printAsset(asset, template);
      setStatus(result.ok ? "Printed" : `Failed: ${result.message}`);
    } catch (err) {
      setStatus(`Failed: ${(err as Error).message}`);
    } finally {
      setPrinting(false);
      setOpen(false);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => setStatus(null), 5000);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={printing}
        className="text-sm px-3 py-1.5 rounded-md border border-neutral-700 hover:bg-neutral-900 disabled:opacity-50"
      >
        {printing ? "Printing…" : "Print label"}
      </button>

      {status && <p className="absolute top-full right-0 mt-1 text-xs text-neutral-400 whitespace-nowrap">{status}</p>}

      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 border border-neutral-800 bg-neutral-950 rounded-lg shadow-lg z-10 overflow-hidden">
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
              onClick={() => printWith(t.id)}
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
