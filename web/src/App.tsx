import { useEffect } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import EquipmentList from "./pages/EquipmentList";
import EquipmentDetail from "./pages/EquipmentDetail";
import AssetDetail from "./pages/AssetDetail";
import ProjectsList from "./pages/ProjectsList";
import ProjectDetail from "./pages/ProjectDetail";
import SettingsPage from "./pages/SettingsPage";
import LogsPage from "./pages/LogsPage";
import LabelEditor from "./pages/LabelEditor";
import LoginPage from "./pages/LoginPage";
import RequireAuth from "./components/RequireAuth";
import RequireAdmin from "./components/RequireAdmin";
import { pb, useAuthRecord } from "./lib/pocketbase";
import { api } from "./lib/api";

function navClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900"
  }`;
}

function usePageViewLogging() {
  const location = useLocation();
  useEffect(() => {
    api.logEvent("page_view", { path: location.pathname }).catch(() => {});
  }, [location.pathname]);
}

function AppShell() {
  const record = useAuthRecord();
  usePageViewLogging();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-800 px-4 py-3 flex items-center gap-6">
        <span className="font-semibold tracking-tight">Rentman+</span>
        <nav className="flex gap-1 flex-1">
          <NavLink to="/equipment" className={navClass}>
            Assets
          </NavLink>
          {record?.isAdmin === true && (
            <NavLink to="/logs" className={navClass}>
              Logs
            </NavLink>
          )}
          <NavLink to="/settings" className={navClass}>
            Settings
          </NavLink>
        </nav>
        <span className="text-sm text-neutral-500">{record?.name || record?.email}</span>
        <button
          onClick={() => pb.authStore.clear()}
          className="text-sm px-3 py-1.5 rounded-md border border-neutral-800 hover:bg-neutral-900"
        >
          Log out
        </button>
      </header>
      <main className="flex-1 p-4">
        <Routes>
          <Route path="/" element={<Navigate to="/equipment" replace />} />
          <Route path="/equipment" element={<EquipmentList />} />
          <Route path="/equipment/:id" element={<EquipmentDetail />} />
          <Route path="/assets/:id" element={<AssetDetail />} />
          <Route path="/projects" element={<ProjectsList />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route
            path="/logs"
            element={
              <RequireAdmin>
                <LogsPage />
              </RequireAdmin>
            }
          />
          <Route path="/labels/:id" element={<LabelEditor />} />
          <Route path="/settings/*" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
