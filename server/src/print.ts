import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const PRINT_DIR = path.resolve(import.meta.dirname, "../../print");
const PYTHON = path.join(PRINT_DIR, "venv/bin/python");
const SCRIPT = path.join(PRINT_DIR, "print_label.py");

export interface PrintResult {
  ok: boolean;
  message: string;
}

// pngBuffer must already be rendered at the printer's native resolution
// (696px wide for 62mm continuous media at 300dpi) — see web's label
// designer, which renders the same Konva stage used for editing.
//
// printerHost is the live value from the "settings" PocketBase collection
// (Settings > Printer in the UI) — callers should pass that in. Falls back
// to the PRINTER_HOST env var so a deployment keeps working before anyone's
// visited Settings yet.
export async function printLabelPng(
  pngBuffer: Buffer,
  label = "62",
  printerHost = process.env.PRINTER_HOST,
): Promise<PrintResult> {
  if (!printerHost) {
    return { ok: false, message: "No printer configured — set one on the Settings > Printer page." };
  }

  const dir = await mkdtemp(path.join(tmpdir(), "rentmanplus-label-"));
  const imagePath = path.join(dir, "label.png");
  try {
    await writeFile(imagePath, pngBuffer);
    return await new Promise<PrintResult>((resolve) => {
      const proc = spawn(PYTHON, [SCRIPT, "--image", imagePath, "--host", printerHost, "--label", label]);
      let stderr = "";
      proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
      proc.on("close", (code) => {
        resolve(code === 0 ? { ok: true, message: "Sent to printer" } : { ok: false, message: stderr || `print_label.py exited ${code}` });
      });
      proc.on("error", (err) => resolve({ ok: false, message: err.message }));
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
