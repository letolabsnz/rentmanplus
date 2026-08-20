import { api, type RentmanRecord, type SerialNumber } from "./api";
import { renderLabelToCanvas } from "./renderLabel";
import { renderCustomTextCanvas } from "./customLabel";
import {
  buildLabelContext,
  dotsPerMm,
  labelIdForWidth,
  SAMPLE_CONTEXT,
  type LabelDataContext,
  type LabelTemplateData,
} from "./labelSpec";

export type PrintableAsset = SerialNumber & { _lastSubproject?: RentmanRecord | null };

// Shared by every "print a template against some data" path — a specific
// serial (rentmanSerialNumberId set), an equipment type or hand-typed
// values (omitted).
export async function printRecord(
  context: LabelDataContext,
  template: LabelTemplateData & { id: string },
  rentmanSerialNumberId?: string,
): Promise<{ ok: boolean; message: string }> {
  const canvas = await renderLabelToCanvas(template, context, dotsPerMm(template.widthMm));
  const imageDataUrl = canvas.toDataURL("image/png");
  return api.print({ templateId: template.id, rentmanSerialNumberId, imageDataUrl, label: labelIdForWidth(template.widthMm) });
}

export function printAsset(asset: PrintableAsset, template: LabelTemplateData & { id: string }) {
  return printRecord(buildLabelContext(asset), template, String(asset.id));
}

// A real saved template, but the field values are typed in by hand instead
// of pulled from a real asset — see CustomLabelPage's "From template" mode.
export function printWithManualData(template: LabelTemplateData & { id: string }, context: LabelDataContext) {
  return printRecord(context, template);
}

// Not tied to any Rentman asset — for labeling cases, shelves, areas, etc.
// with arbitrary big text instead of pulling from a specific serial number.
export async function printCustomText(
  text: string,
  widthMm: number,
  heightMm: number,
  rotate90: boolean,
): Promise<{ ok: boolean; message: string }> {
  const canvas = await renderCustomTextCanvas(text, widthMm, heightMm, dotsPerMm(widthMm), rotate90, SAMPLE_CONTEXT);
  const imageDataUrl = canvas.toDataURL("image/png");
  return api.print({ customText: text, imageDataUrl, label: labelIdForWidth(widthMm) });
}
