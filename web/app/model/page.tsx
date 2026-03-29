"use client";

import { useProject } from "../ProjectContext";
import { Model3DViewer } from "@/components/Model3DViewer";
import { ModelControls } from "@/components/ModelControls";

export default function ModelPage() {
  const { project, activeModel, selectedElementId, setSelectedElementId, variant, detail, setVariant, setDetail } = useProject();

  if (!project) {
    return <div className="page-wrapper"><p className="empty-state">Please upload a project first.</p></div>;
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--bg)" }}>
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {activeModel ? (
          <Model3DViewer 
            model={activeModel} 
            selectedElementId={selectedElementId} 
            onSelectElement={setSelectedElementId} 
          />
        ) : (
          <div className="empty-state" style={{ height: "100%", border: "none" }}>
            <p>Model not available for these settings.</p>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "2.5rem", pointerEvents: "none", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ pointerEvents: "auto" }}>
          <h1 className="page-title" style={{ fontSize: "2rem", margin: 0, color: "var(--text)", textShadow: "0 2px 10px rgba(255,255,255,0.8)" }}>3D Model Render</h1>
          <p className="page-subtitle" style={{ fontSize: "1.05rem", marginTop: "0.25rem" }}>Interactive 3D visualization of the structure</p>
        </div>
        <div style={{ pointerEvents: "auto", minWidth: "350px" }}>
          <ModelControls variant={variant} detail={detail} onVariantChange={setVariant} onDetailChange={setDetail} />
        </div>
      </div>
    </div>
  );
}
