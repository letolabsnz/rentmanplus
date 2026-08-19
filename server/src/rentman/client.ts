// Thin typed wrapper around the Rentman public API (https://api.rentman.net).
//
// Field shapes below are deliberately loose (Record<string, unknown> style)
// because the public docs don't expose the full response schema — the first
// real task in phase 1 is to call `getSerialNumber`/`getEquipment` against a
// live token, log the raw response, and tighten these types to match.

const BASE_URL = process.env.RENTMAN_BASE_URL ?? "https://api.rentman.net";
const TOKEN = process.env.RENTMAN_API_TOKEN;

if (!TOKEN) {
  console.warn(
    "[rentman] RENTMAN_API_TOKEN is not set — Rentman API calls will fail. Copy server/.env.example to server/.env and fill it in.",
  );
}

export interface RentmanListResponse<T> {
  data: T[];
  itemCount?: number;
  limit?: number;
  offset?: number;
  next_page_url?: string | null;
}

export type RentmanRecord = Record<string, unknown> & { id: string };

// The equipment/stock-movement lists this backs are the full catalog + the
// entire historical movement ledger (no filtering) — walking every page of
// both from Rentman is expensive, and it only gets slower as the ledger
// grows. 60s meant the web app's 60s poll (see EquipmentList/ProjectsList)
// forced a full re-walk every single minute, forever. 5 minutes still keeps
// data reasonably fresh; the "Refresh" button bypasses this for an
// immediate read.
const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { expiresAt: number; value: unknown }>();

async function rentmanFetch<T>(path: string, searchParams?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/json",
      },
    });

    if (res.status === 429 && attempt < maxAttempts) {
      const retryAfterMs = Number(res.headers.get("Retry-After")) * 1000 || 500 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Rentman API ${res.status} ${res.statusText} for ${path}: ${body}`);
    }

    const json = (await res.json()) as T;
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: json });
    return json;
  }
  throw new Error(`Rentman API rate limit exceeded for ${path} after ${maxAttempts} attempts`);
}

function list<T = RentmanRecord>(resource: string) {
  return (params?: Record<string, string | number | undefined>) =>
    rentmanFetch<RentmanListResponse<T>>(`/${resource}`, params);
}

function item<T = RentmanRecord>(resource: string) {
  return (id: string) => rentmanFetch<{ data: T }>(`/${resource}/${id}`).then((r) => r.data);
}

// Rentman caps every list request at 1500 items and cursor-paginates beyond
// that (`next_page_url`) — the workshop's full equipment/serial catalog is
// usually well over the old 200-per-page default, so anything meant to show
// "everything" needs to walk every page rather than just the first.
function listAll<T = RentmanRecord>(resource: string) {
  return async (params?: Record<string, string | number | undefined>): Promise<T[]> => {
    let page = await rentmanFetch<RentmanListResponse<T>>(`/${resource}`, { limit: 1500, ...params });
    const all = [...page.data];
    while (page.next_page_url) {
      page = await rentmanFetch<RentmanListResponse<T>>(page.next_page_url);
      all.push(...page.data);
    }
    return all;
  };
}

export const rentman = {
  listEquipment: list("equipment"),
  listAllEquipment: listAll("equipment"),
  getEquipment: item("equipment"),

  listSerialNumbers: list("serialnumbers"),
  listAllSerialNumbers: listAll("serialnumbers"),
  getSerialNumber: item("serialnumbers"),

  listProjects: list("projects"),
  listAllProjects: listAll("projects"),
  getProject: item("projects"),

  listSubprojects: (projectId: string) =>
    rentmanFetch<RentmanListResponse<RentmanRecord>>(`/projects/${projectId}/subprojects`),

  listProjectEquipment: list("projectequipment"),
  listAllProjectEquipment: listAll("projectequipment"),
  listProjectEquipmentGroups: list("projectequipmentgroup"),
  listAllProjectEquipmentGroups: listAll("projectequipmentgroup"),

  listStockLocations: list("stocklocations"),
  listAllFolders: listAll("folders"),
  listAllStockMovements: listAll("stockmovements"),

  // Rentman relates records by path-style references, e.g. an equipment
  // field like "/equipment/2989" rather than an embedded object or bare id.
  resolveRef: (ref: string | null | undefined): Promise<RentmanRecord | null> => {
    if (!ref) return Promise.resolve(null);
    return rentmanFetch<{ data: RentmanRecord }>(ref).then((r) => r.data);
  },
};

export function clearRentmanCache() {
  cache.clear();
}
