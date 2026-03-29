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
    <div className="page-wrapper">
      <header className="page-header" style={{ alignItems: "center" }}>
        <div>
          <h1 className="page-title">3D Model Render</h1>
          <p className="page-subtitle">Interactive 3D visualization of the structure</p>
        </div>
        <ModelControls variant={variant} detail={detail} onVariantChange={setVariant} onDetailChange={setDetail} />
      </header>

      <div className="panel" style={{ height: "calc(100vh - 200px)" }}>
        {activeModel ? (
          <Model3DViewer 
            model={activeModel} 
            selectedElementId={selectedElementId} 
            onSelectElement={setSelectedElementId} 
          />
        ) : (
          <div className="empty-state">
            <p>Model not available for these settings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
