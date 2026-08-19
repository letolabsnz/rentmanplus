import { api, type RentmanRecord, type SerialNumber } from "./api";
import { renderLabelToCanvas } from "./renderLabel";
import { buildLabelContext, dotsPerMm, labelIdForWidth, type LabelTemplateData } from "./labelSpec";

export type PrintableAsset = SerialNumber & { _lastSubproject?: RentmanRecord | null };

export async function printAsset(
  asset: PrintableAsset,
  template: LabelTemplateData & { id: string },
): Promise<{ ok: boolean; message: string }> {
  const context = buildLabelContext(asset);
  const canvas = await renderLabelToCanvas(template, context, dotsPerMm(template.widthMm));
  const imageDataUrl = canvas.toDataURL("image/png");
  return api.print({
    templateId: template.id,
    rentmanSerialNumberId: String(asset.id),
    imageDataUrl,
    label: labelIdForWidth(template.widthMm),
  });
}
