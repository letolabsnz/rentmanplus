import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function GeneralSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ["settings"], queryFn: api.getSettings });
  const [businessName, setBusinessName] = useState("");
  const [businessShortName, setBusinessShortName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName);
      setBusinessShortName(settings.businessShortName);
    }
  }, [settings]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await api.updateSettings({ businessName: businessName.trim(), businessShortName: businessShortName.trim() });
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <p className="text-neutral-500 text-sm">Loading…</p>;

  return (
    <div className="flex flex-col gap-4 max-w-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor="businessName" className="text-sm text-neutral-400">
          Business name
        </label>
        <input
          id="businessName"
          type="text"
          placeholder="e.g. Bay AV Workshop"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
        />
        <p className="text-xs text-neutral-500">Shown in the header alongside "Rentman+".</p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="businessShortName" className="text-sm text-neutral-400">
          Business short name
        </label>
        <input
          id="businessShortName"
          type="text"
          placeholder="e.g. Bay AV"
          value={businessShortName}
          onChange={(e) => setBusinessShortName(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
        />
        <p className="text-xs text-neutral-500">
          Used for the browser tab title instead, since there's little room there for the full name. Falls back to
          the business name, then "Rentman+", if left blank.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="text-sm px-3 py-1.5 rounded-md bg-white text-black font-medium hover:bg-neutral-200 disabled:opacity-50 w-fit"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-emerald-400">Saved</span>}
      </div>
    </div>
  );
}
