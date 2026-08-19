import type { SerialNumber, RentmanRecord } from "./api";

export type ElementType = "text" | "barcode" | "qr" | "staticText" | "image";

export interface LabelElement {
  id: string;
  type: ElementType;
  x: number; // mm from left
  y: number; // mm from top
  width: number; // mm
  height: number; // mm
  dataField?: DataFieldKey; // text/barcode/qr
  text?: string; // literal content, staticText only
  fontSize?: number; // mm-ish character height, text/staticText only
  bold?: boolean;
  align?: "left" | "center" | "right"; // text/staticText only, defaults to left
  valign?: "top" | "middle" | "bottom"; // text/staticText only, defaults to top
  wrap?: boolean; // text/staticText only — wrap to multiple lines within width/height instead of squishing onto one line
  padding?: number; // mm inset on all sides, text/staticText only
  lockAspect?: boolean; // resize keeps width:height fixed — QR codes and images generally want this
  imageData?: string; // data: URL, image only — a logo/icon baked into the template
  folderLevels?: number[]; // dataField === "equipmentFolder" only — 1-indexed path segments to include; empty/unset = full path
  rotation?: 0 | 90 | 180 | 270; // any element type — rotates around the box's own center
}

export interface LabelTemplateData {
  id?: string;
  name: string;
  widthMm: number;
  heightMm: number;
  elements: LabelElement[];
}

// Keys and labels mirror Rentman's own field names as closely as possible
// (confirmed against a live token — see server/src/routes/assets.ts) rather
// than inventing our own names for them. "equipment*" / "location*" /
// "project" are resolved from the serial number's reference fields
// (equipment, asset_location, last_subproject) since Rentman doesn't embed
// those records inline.
export type DataFieldKey =
  | "displayname"
  | "serial"
  | "ref"
  | "qrcodes"
  | "tags"
  | "remark"
  | "nextInspection"
  | "equipmentName"
  | "equipmentCode"
  | "equipmentTags"
  | "equipmentFolder"
  | "locationInWarehouse"
  | "location"
  | "project";

export const DATA_FIELDS: { key: DataFieldKey; label: string }[] = [
  { key: "displayname", label: "Display name" },
  { key: "serial", label: "Serial" },
  { key: "ref", label: "Reference" },
  { key: "qrcodes", label: "QR codes" },
  { key: "tags", label: "Tags" },
  { key: "remark", label: "Remark" },
  { key: "nextInspection", label: "Next inspection" },
  { key: "equipmentName", label: "Name (equipment)" },
  { key: "equipmentCode", label: "Code (equipment)" },
  { key: "equipmentTags", label: "Tags (equipment)" },
  { key: "equipmentFolder", label: "Folder (equipment)" },
  { key: "locationInWarehouse", label: "Location in warehouse (equipment)" },
  { key: "location", label: "Stock location" },
  { key: "project", label: "Current project" },
];

export type LabelDataContext = Record<DataFieldKey, string>;

// Placeholder values the designer renders with when there's no real asset
// in hand yet (i.e. whenever you're just building/editing a template).
export const SAMPLE_CONTEXT: LabelDataContext = {
  displayname: "LX1435PAC1",
  serial: "LX1435PAC1",
  ref: "REF-001",
  qrcodes: "1003508",
  tags: "fixture",
  remark: "",
  nextInspection: "",
  equipmentName: "14-35 1000W PACIFIC",
  equipmentCode: "LX1435PAC",
  equipmentTags: "fixture",
  equipmentFolder: "Old Inventory/LX/Fixture",
  locationInWarehouse: "Lock Up",
  location: "Bay AV Workshop",
  project: "Sample Project",
};

export function buildLabelContext(asset: SerialNumber & { _lastSubproject?: RentmanRecord | null }): LabelDataContext {
  return {
    displayname: asset.displayname ?? "",
    serial: asset.serial ?? "",
    ref: asset.ref ?? "",
    qrcodes: asset.qrcodes ?? "",
    tags: asset.tags ?? "",
    remark: asset.remark ?? "",
    nextInspection: asset.next_inspection ? new Date(asset.next_inspection).toLocaleDateString() : "",
    equipmentName: (asset._equipment?.displayname as string) ?? (asset._equipment?.name as string) ?? "",
    equipmentCode: (asset._equipment?.code as string) ?? "",
    equipmentTags: (asset._equipment?.tags as string) ?? "",
    equipmentFolder:
      (asset._folder?.path as string) ?? (asset._folder?.displayname as string) ?? (asset._folder?.name as string) ?? "",
    locationInWarehouse: (asset._equipment?.location_in_warehouse as string) ?? "",
    location: (asset._location?.displayname as string) ?? "",
    project: asset._lastSubproject
      ? ((asset._lastSubproject.displayname as string) ?? (asset._lastSubproject.name as string) ?? "")
      : "",
  };
}

// Rentman's folder "path" is slash-separated from root to leaf (e.g.
// "Old Inventory/LX/Fixture"). `levels` picks specific 1-indexed segments —
// e.g. [2] for just "LX" — joined back with "/"; empty/unset keeps the
// full path. Levels beyond what a given item's folder actually has are
// silently skipped rather than erroring, since depth varies per item.
export function applyFolderLevels(fullPath: string, levels?: number[]): string {
  if (!levels || levels.length === 0) return fullPath;
  const segments = fullPath.split("/");
  return levels
    .slice()
    .sort((a, b) => a - b)
    .map((level) => segments[level - 1])
    .filter((s): s is string => Boolean(s))
    .join("/");
}

// Matches the brother_ql continuous-label identifiers and their exact
// printable dot width (confirmed against brother_ql.labels.ALL_LABELS) —
// the print render must land on these pixel widths exactly.
export const TAPE_WIDTHS = [
  { mm: 12, labelId: "12", printDots: 106 },
  { mm: 29, labelId: "29", printDots: 306 },
  { mm: 62, labelId: "62", printDots: 696 },
] as const;

export function dotsPerMm(widthMm: number): number {
  const spec = TAPE_WIDTHS.find((w) => w.mm === widthMm);
  return spec ? spec.printDots / spec.mm : 300 / 25.4;
}

export function labelIdForWidth(widthMm: number): string {
  return TAPE_WIDTHS.find((w) => w.mm === widthMm)?.labelId ?? "62";
}

export const SIZE_PRESETS: { name: string; widthMm: number; heightMm: number }[] = [
  { name: "Large", widthMm: 62, heightMm: 100 },
  { name: "Medium", widthMm: 62, heightMm: 29 },
  { name: "Small", widthMm: 29, heightMm: 15 },
];
