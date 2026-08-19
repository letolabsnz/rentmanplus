import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import LabelsList from "./LabelsList";
import PrinterSettings from "../components/PrinterSettings";
import GeneralSettings from "../components/GeneralSettings";

function tabClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900"
  }`;
}

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <nav className="flex gap-1 border-b border-neutral-800 pb-2">
        <NavLink to="/settings/general" className={tabClass}>
          General
        </NavLink>
        <NavLink to="/settings/labels" className={tabClass}>
          Label templates
        </NavLink>
        <NavLink to="/settings/printer" className={tabClass}>
          Printer
        </NavLink>
      </nav>
      <Routes>
        <Route index element={<Navigate to="general" replace />} />
        <Route path="general" element={<GeneralSettings />} />
        <Route path="labels" element={<LabelsList />} />
        <Route path="printer" element={<PrinterSettings />} />
      </Routes>
    </div>
  );
}
