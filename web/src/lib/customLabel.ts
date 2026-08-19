import { wrapText } from "./renderLabel";
import type { LabelElement, LabelTemplateData } from "./labelSpec";

const PADDING_MM = 3;
// Purely for text measurement precision — any consistent scale works here
// since we're solving for the mm font size, independent of final print
// resolution (the real render applies its own dots-per-mm separately).
const MEASURE_SCALE = 20;

// Finds the largest font size (mm) whose word-wrapped text still fits
// within the label — "big text, readable from a distance" means using as
// much of the label as the text allows, not a fixed size that's too small
// for a short label or overflows a long one.
export function fitFontSizeMm(text: string, widthMm: number, heightMm: number): number {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return 8;

  const innerW = (widthMm - PADDING_MM * 2) * MEASURE_SCALE;
  const innerH = (heightMm - PADDING_MM * 2) * MEASURE_SCALE;
  const maxSizeMm = Math.max(2, Math.min(heightMm, 40));

  for (let sizeMm = maxSizeMm; sizeMm >= 2; sizeMm -= 0.5) {
    const fontPx = sizeMm * MEASURE_SCALE;
    ctx.font = `bold ${fontPx}px sans-serif`;
    const lines = wrapText(ctx, text, innerW);
    const lineHeight = fontPx * 1.2;
    const blockHeight = lines.length * lineHeight;
    const longestLine = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (blockHeight <= innerH && longestLine <= innerW) return sizeMm;
  }
  return 2;
}

// A one-off, unsaved template — the whole label is a single big centered
// staticText element sized to fill it. Not persisted to label_templates;
// see /api/print's customText path in server/src/routes/print.ts.
export function buildCustomTextTemplate(text: string, widthMm: number, heightMm: number): LabelTemplateData {
  const element: LabelElement = {
    id: "custom-text",
    type: "staticText",
    x: 0,
    y: 0,
    width: widthMm,
    height: heightMm,
    text,
    fontSize: fitFontSizeMm(text, widthMm, heightMm),
    bold: true,
    align: "center",
    valign: "middle",
    wrap: true,
    padding: PADDING_MM,
  };
  return { name: "Custom text", widthMm, heightMm, elements: [element] };
}
