import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import EquipmentList from "./pages/EquipmentList";
import EquipmentDetail from "./pages/EquipmentDetail";
import AssetDetail from "./pages/AssetDetail";
import ProjectsList from "./pages/ProjectsList";
import ProjectDetail from "./pages/ProjectDetail";
import LabelsList from "./pages/LabelsList";
import LabelEditor from "./pages/LabelEditor";

function navClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900"
  }`;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-800 px-4 py-3 flex items-center gap-6">
        <span className="font-semibold tracking-tight">Rentman+</span>
        <nav className="flex gap-1">
          <NavLink to="/equipment" className={navClass}>
            Assets
          </NavLink>
          <NavLink to="/labels" className={navClass}>
            Labels
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 p-4">
        <Routes>
          <Route path="/" element={<Navigate to="/equipment" replace />} />
          <Route path="/equipment" element={<EquipmentList />} />
          <Route path="/equipment/:id" element={<EquipmentDetail />} />
          <Route path="/assets/:id" element={<AssetDetail />} />
          <Route path="/projects" element={<ProjectsList />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/labels" element={<LabelsList />} />
          <Route path="/labels/:id" element={<LabelEditor />} />
        </Routes>
      </main>
    </div>
  );
}
