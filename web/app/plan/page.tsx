"use client";

import { useProject } from "../ProjectContext";
import { Plan2DViewer } from "@/components/Plan2DViewer";

export default function PlanPage() {
  const { project, selectedElementId, setSelectedElementId } = useProject();

  if (!project) {
    return <div className="page-wrapper"><p className="empty-state">Please upload a project first.</p></div>;
  }

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div>
          <h1 className="page-title">2D Detection Plan</h1>
          <p className="page-subtitle">Inspect the 2D layout and detected elements</p>
        </div>
      </header>

      <div className="panel" style={{ height: "calc(100vh - 200px)" }}>
        <Plan2DViewer 
          plan={project.plan_2d} 
          selectedElementId={selectedElementId} 
          onSelectElement={setSelectedElementId} 
        />
      </div>
    </div>
  );
}
