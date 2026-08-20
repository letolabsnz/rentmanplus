import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useToast } from "./ToastProvider";

// A handheld barcode/QR scanner acts like a keyboard: it types the scanned
// value into whatever's focused, then sends Enter. This stays enabled the
// whole time (never disabled while a lookup is in flight) and clears
// itself immediately on submit, before the network call — so rapid
// back-to-back scans never get dropped or concatenated into each other
// waiting on a slow one.
export default function ScanInput() {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    setValue("");
    try {
      const { id } = await api.searchAssets(q);
      navigate(`/assets/${id}`);
    } catch {
      showToast("error", `No asset found for "${q}"`);
    } finally {
      inputRef.current?.focus();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Scan or type serial…"
        className="bg-neutral-900 border border-neutral-800 rounded-md px-3 py-1.5 text-sm w-44 focus:outline-none focus:border-neutral-600"
      />
    </form>
  );
}
