import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthRecord } from "../lib/pocketbase";

// Client-side gate is UX only — the real enforcement is server-side
// (requireAdmin in server/src/auth.ts, applied to /api/stats and /api/logs).
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const record = useAuthRecord();
  if (record?.isAdmin !== true) {
    return <Navigate to="/equipment" replace />;
  }
  return children;
}
