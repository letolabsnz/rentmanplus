import type { LabelTemplateData } from "./labelSpec";
import { pb } from "./pocketbase";

export type RentmanRecord = Record<string, unknown> & { id: string };

export interface RentmanListResponse<T = RentmanRecord> {
  data: T[];
  meta?: Record<string, unknown>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// Confirmed against a live Rentman token — see server/src/routes/assets.ts.
export interface SerialNumber extends RentmanRecord {
  displayname: string;
  serial: string;
  equipment: string;
  asset_location: string | null;
  ref: string;
  qrcodes: string;
  tags: string;
  active: boolean;
  next_inspection: string | null;
  last_subproject: string | null;
  remark: string;
  _equipment: RentmanRecord | null;
  _location: RentmanRecord | null;
  _folder: RentmanRecord | null;
}

// Confirmed against a live Rentman token — see server/src/routes/equipment.ts.
export interface Equipment extends RentmanRecord {
  displayname: string;
  name: string;
  code: string;
  tags: string;
  current_quantity: number;
  current_quantity_excl_cases: number;
  location_in_warehouse: string;
  image: string | null;
}

export const api = {
  listAssets: () => request<RentmanListResponse<SerialNumber>>("/api/assets"),
  getAsset: (id: string) => request<SerialNumber & { _lastSubproject: RentmanRecord | null }>(`/api/assets/${id}`),

  listEquipment: () => request<RentmanListResponse<Equipment>>("/api/equipment"),
  getEquipment: (id: string) => request<Equipment & { serialNumbers: SerialNumber[] }>(`/api/equipment/${id}`),

  listProjects: () => request<RentmanListResponse>("/api/projects"),
  getProject: (id: string) => request<RentmanRecord & { subprojects: RentmanRecord[] }>(`/api/projects/${id}`),
  getProjectEquipment: (id: string) =>
    request<{ lines: RentmanRecord[]; groups: RentmanRecord[] }>(`/api/projects/${id}/equipment`),

  listLabels: () => request<(LabelTemplateData & { id: string })[]>("/api/labels"),
  getLabel: (id: string) => request<LabelTemplateData & { id: string }>(`/api/labels/${id}`),
  createLabel: (template: LabelTemplateData) =>
    request<LabelTemplateData & { id: string }>("/api/labels", { method: "POST", body: JSON.stringify(template) }),
  updateLabel: (id: string, template: LabelTemplateData) =>
    request<LabelTemplateData & { id: string }>(`/api/labels/${id}`, {
      method: "PUT",
      body: JSON.stringify(template),
    }),
  deleteLabel: (id: string) => request<{ ok: true }>(`/api/labels/${id}`, { method: "DELETE" }),

  print: (args: { templateId: string; rentmanSerialNumberId: string; imageDataUrl: string; label: string }) =>
    request<{ ok: boolean; message: string }>("/api/print", { method: "POST", body: JSON.stringify(args) }),

  // Bypasses the server's 60s Rentman cache — use when you need a
  // guaranteed-fresh read right now (e.g. "I just added this in Rentman").
  refresh: () => request<{ ok: boolean }>("/api/refresh", { method: "POST" }),

  getSettings: () => request<Settings>("/api/settings"),
  updateSettings: (settings: { printerHost: string }) =>
    request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(settings) }),

  getStats: () => request<Stats>("/api/stats"),
  getLogs: () => request<LogEntry[]>("/api/logs"),
  logEvent: (type: string, details?: Record<string, unknown>) =>
    request<LogEntry>("/api/logs", { method: "POST", body: JSON.stringify({ type, details }) }),
};

export interface Settings {
  id: string;
  printerHost: string;
}

export interface Stats {
  equipmentTypes: number;
  totalStockUnits: number;
  trackedSerials: number;
  projects: number;
  labelTemplates: number;
  labelsPrinted: number;
  crewAccounts: number;
}

export interface LogEntry {
  id: string;
  type: string;
  who: string | null;
  timestamp: string;
  summary: string;
  details: Record<string, unknown>;
}

// Best-effort helpers for reading Rentman's loosely-typed records — field
// names get tightened once we confirm the real shape against a live token.
export function pick(record: RentmanRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return "—";
}
