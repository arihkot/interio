"use client";

import { useProject } from "../ProjectContext";
import { Plan2DViewer } from "@/components/Plan2DViewer";

export default function PlanPage() {
  const { project, selectedElementId, setSelectedElementId, file } = useProject();

  if (!project) {
    return <div className="page-wrapper"><p className="empty-state">Please upload a project first.</p></div>;
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--bg)" }}>
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <Plan2DViewer 
          plan={project.plan_2d} 
          selectedElementId={selectedElementId} 
          onSelectElement={setSelectedElementId} 
          file={file}
        />
      </div>

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "2.5rem", pointerEvents: "none", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ pointerEvents: "auto" }}>
          <h1 className="page-title" style={{ fontSize: "2rem", margin: 0, color: "var(--text)", textShadow: "0 2px 10px rgba(255,255,255,0.8)" }}>2D Detection Plan</h1>
          <p className="page-subtitle" style={{ fontSize: "1.05rem", marginTop: "0.25rem", display: "block" }}>Inspect the 2D layout and detected elements</p>
        </div>
      </div>
    </div>
  );
}
