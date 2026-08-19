// crypto.randomUUID() only exists in "secure contexts" (HTTPS, or the
// localhost special-case) — it's undefined and throws on any plain-HTTP
// origin that isn't localhost, e.g. this app served over http://<lan-ip>.
// None of this app's ids need cryptographic randomness, just local
// uniqueness for React keys/element ids, so a plain generator avoids that
// restriction entirely instead of requiring HTTPS everywhere.
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
