import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { renderLabelToCanvas } from "../lib/renderLabel";
import { buildCustomTextTemplate } from "../lib/customLabel";
import { printCustomText, printWithManualData } from "../lib/print";
import {
  DATA_FIELDS,
  SAMPLE_CONTEXT,
  SIZE_PRESETS,
  TAPE_WIDTHS,
  type DataFieldKey,
  type LabelDataContext,
  type LabelTemplateData,
} from "../lib/labelSpec";
import { useToast } from "../components/ToastProvider";
import { api } from "../lib/api";

const PREVIEW_SCALE = 6; // px per mm — matches LabelEditor's on-screen scale

type Mode = "text" | "template";

function tabClass(active: boolean) {
  return `px-3 py-1.5 rounded-md text-sm font-medium ${
    active ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900"
  }`;
}

export default function CustomLabelPage() {
  const [mode, setMode] = useState<Mode>("text");

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Custom label</h1>
        <p className="text-neutral-500 text-sm">Print a label that isn't tied to any Rentman asset.</p>
      </div>

      <div className="flex items-center gap-1 border border-neutral-800 rounded-md p-0.5 w-fit">
        <button className={tabClass(mode === "text")} onClick={() => setMode("text")}>
          Big text
        </button>
        <button className={tabClass(mode === "template")} onClick={() => setMode("template")}>
          From template
        </button>
      </div>

      {mode === "text" ? <BigTextMode /> : <FromTemplateMode />}
    </div>
  );
}

function BigTextMode() {
  const [text, setText] = useState("");
  const [widthMm, setWidthMm] = useState(62);
  const [heightMm, setHeightMm] = useState(29);
  const [printing, setPrinting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const template = buildCustomTextTemplate(text || "Sample text", widthMm, heightMm);
    renderLabelToCanvas(template, SAMPLE_CONTEXT, PREVIEW_SCALE).then((rendered) => {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      canvas.getContext("2d")?.drawImage(rendered, 0, 0);
    });
    return () => {
      cancelled = true;
    };
  }, [text, widthMm, heightMm]);

  async function print() {
    if (!text.trim()) return;
    setPrinting(true);
    try {
      const template = buildCustomTextTemplate(text, widthMm, heightMm);
      const result = await printCustomText(text, template);
      if (result.ok) {
        showToast("success", "Printed");
      } else {
        showToast("error", `Print failed: ${result.message}`);
      }
    } catch (err) {
      showToast("error", `Print failed: ${(err as Error).message}`);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-neutral-500 text-sm -mt-2">
        Type anything and it's sized as large as will fit — good for cases, shelves, or areas.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="customText" className="text-sm text-neutral-400">
          Label text
        </label>
        <textarea
          id="customText"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Jam Stands"
          rows={2}
          className="bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-600 resize-none"
        />
      </div>

      <SizePicker widthMm={widthMm} heightMm={heightMm} onWidth={setWidthMm} onHeight={setHeightMm} />

      <div className="flex items-center justify-center border border-neutral-800 rounded-lg p-6 bg-neutral-950 overflow-auto">
        <canvas ref={canvasRef} className="bg-white" />
      </div>

      <button
        onClick={print}
        disabled={printing || !text.trim()}
        className="text-sm px-4 py-2 rounded-md bg-white text-black font-medium hover:bg-neutral-200 disabled:opacity-50 w-fit self-end"
      >
        {printing ? "Printing…" : "Print"}
      </button>
    </div>
  );
}

function usedDataFields(template: LabelTemplateData): DataFieldKey[] {
  const keys = new Set<DataFieldKey>();
  for (const el of template.elements) {
    if (el.dataField) keys.add(el.dataField);
  }
  return DATA_FIELDS.filter((f) => keys.has(f.key)).map((f) => f.key);
}

const EMPTY_CONTEXT: LabelDataContext = Object.fromEntries(DATA_FIELDS.map((f) => [f.key, ""])) as LabelDataContext;

function FromTemplateMode() {
  const { data: templates } = useQuery({ queryKey: ["labels"], queryFn: api.listLabels });
  const [templateId, setTemplateId] = useState("");
  const [fieldValues, setFieldValues] = useState<Partial<LabelDataContext>>({});
  const [printing, setPrinting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showToast } = useToast();

  const template = templates?.find((t) => t.id === templateId);
  const fields = useMemo(() => (template ? usedDataFields(template) : []), [template]);
  const context: LabelDataContext = { ...EMPTY_CONTEXT, ...fieldValues };

  useEffect(() => {
    if (!template) return;
    let cancelled = false;
    renderLabelToCanvas(template, context, PREVIEW_SCALE).then((rendered) => {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      canvas.getContext("2d")?.drawImage(rendered, 0, 0);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- context is derived fresh every render from fieldValues
  }, [template, fieldValues]);

  async function print() {
    if (!template) return;
    setPrinting(true);
    try {
      const result = await printWithManualData(template, context);
      if (result.ok) {
        showToast("success", "Printed");
      } else {
        showToast("error", `Print failed: ${result.message}`);
      }
    } catch (err) {
      showToast("error", `Print failed: ${(err as Error).message}`);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-neutral-500 text-sm -mt-2">
        Pick a template, type in the field values it needs, and print — no asset required.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="template" className="text-sm text-neutral-400">
          Template
        </label>
        <select
          id="template"
          value={templateId}
          onChange={(e) => {
            setTemplateId(e.target.value);
            setFieldValues({});
          }}
          className="bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
        >
          <option value="">Select a template…</option>
          {templates?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.widthMm}×{t.heightMm}mm)
            </option>
          ))}
        </select>
      </div>

      {template && (
        <>
          {fields.length === 0 ? (
            <p className="text-neutral-500 text-sm">
              This template has no asset-data fields — it'll print exactly as designed.
            </p>
          ) : (
            <div className="flex flex-col gap-3 border border-neutral-800 rounded-lg p-3">
              {fields.map((key) => {
                const label = DATA_FIELDS.find((f) => f.key === key)?.label ?? key;
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <label htmlFor={`field-${key}`} className="text-sm text-neutral-400">
                      {label}
                    </label>
                    <input
                      id={`field-${key}`}
                      type="text"
                      value={fieldValues[key] ?? ""}
                      onChange={(e) => setFieldValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-center border border-neutral-800 rounded-lg p-6 bg-neutral-950 overflow-auto">
            <canvas ref={canvasRef} className="bg-white" />
          </div>

          <button
            onClick={print}
            disabled={printing}
            className="text-sm px-4 py-2 rounded-md bg-white text-black font-medium hover:bg-neutral-200 disabled:opacity-50 w-fit self-end"
          >
            {printing ? "Printing…" : "Print"}
          </button>
        </>
      )}
    </div>
  );
}

function SizePicker({
  widthMm,
  heightMm,
  onWidth,
  onHeight,
}: {
  widthMm: number;
  heightMm: number;
  onWidth: (mm: number) => void;
  onHeight: (mm: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 border border-neutral-800 rounded-lg p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-neutral-500">Preset</span>
        {SIZE_PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => {
              onWidth(p.widthMm);
              onHeight(p.heightMm);
            }}
            className="px-2 py-1 rounded border border-neutral-800 hover:bg-neutral-900"
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-neutral-500">Tape width</span>
        <select
          value={widthMm}
          onChange={(e) => onWidth(Number(e.target.value))}
          className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1"
        >
          {TAPE_WIDTHS.map((w) => (
            <option key={w.mm} value={w.mm}>
              {w.mm}mm
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-neutral-500">Length</span>
        <input
          type="number"
          min={5}
          value={heightMm}
          onChange={(e) => onHeight(Number(e.target.value))}
          className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 w-20"
        />
        <span className="text-neutral-500">mm</span>
      </div>
    </div>
  );
}
