"use client";

import { useState } from "react";
import { useProject } from "../ProjectContext";
import { Model3DViewer } from "@/components/Model3DViewer";
import { ModelControls } from "@/components/ModelControls";

export default function ModelPage() {
  const { project, activeModel, selectedElementId, setSelectedElementId, variant, detail, setVariant, setDetail, file } = useProject();
  
  const [wallHeight, setWallHeight] = useState(3.0);
  const [showLoadBearingWalls, setShowLoadBearingWalls] = useState(true);
  const [showPartitionWalls, setShowPartitionWalls] = useState(true);
  const [showFloorOverlay, setShowFloorOverlay] = useState(false);
  const [hiddenWallIds, setHiddenWallIds] = useState<string[]>([]);

  const handleRemoveWall = (id: string) => {
    setHiddenWallIds(prev => [...prev, id]);
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const selectedWallInfo = (() => {
    if (!activeModel || !selectedElementId) return null;
    const wall3D = activeModel.walls.find(w => w.source_wall_id === selectedElementId);
    if (!wall3D) return null;
    const wall2D = project?.plan_2d?.walls.find(w => w.id === selectedElementId);
    
    // Calculate length from 3D coordinates if 2D is not available
    const dx = wall3D.end.x - wall3D.start.x;
    const dz = wall3D.end.z - wall3D.start.z;
    const length = wall2D?.length_m ?? Math.sqrt(dx * dx + dz * dz);
    
    return {
      id: selectedElementId,
      length,
      thickness: wall3D.thickness_m,
      height: wallHeight,
      isLoadBearing: wall2D?.is_load_bearing ?? true,
      material: wall3D.material_key
    };
  })();

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
            wallHeight={wallHeight}
            showLoadBearingWalls={showLoadBearingWalls}
            showPartitionWalls={showPartitionWalls}
            plan2d={project.plan_2d}
            hiddenWallIds={hiddenWallIds}
            file={file}
            showFloorOverlay={showFloorOverlay}
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
        <div style={{ pointerEvents: "auto", minWidth: "300px" }}>
          <ModelControls 
            variant={variant} 
            detail={detail} 
            onVariantChange={setVariant} 
            onDetailChange={setDetail}
            wallHeight={wallHeight}
            onWallHeightChange={setWallHeight}
            showLoadBearingWalls={showLoadBearingWalls}
            onShowLoadBearingWallsChange={setShowLoadBearingWalls}
            showPartitionWalls={showPartitionWalls}
            onShowPartitionWallsChange={setShowPartitionWalls}
            showFloorOverlay={showFloorOverlay}
            onShowFloorOverlayChange={setShowFloorOverlay}
            selectedWallInfo={selectedWallInfo}
            onRemoveWall={handleRemoveWall}
          />
          
          {hiddenWallIds.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <button 
                onClick={() => setHiddenWallIds([])}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  background: "var(--bg)",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)"
                }}
              >
                Restore Hidden Walls ({hiddenWallIds.length})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
