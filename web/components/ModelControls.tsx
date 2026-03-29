"use client";

type Props = {
  variant: "primary" | "alternative";
  detail: "simple" | "interior";
  onVariantChange: (variant: "primary" | "alternative") => void;
  onDetailChange: (detail: "simple" | "interior") => void;
  wallHeight: number;
  onWallHeightChange: (height: number) => void;
  showLoadBearingWalls: boolean;
  onShowLoadBearingWallsChange: (show: boolean) => void;
  showPartitionWalls: boolean;
  onShowPartitionWallsChange: (show: boolean) => void;
  selectedWallInfo?: {
    id: string;
    length: number;
    thickness: number;
    height: number;
    isLoadBearing: boolean;
    material: string;
  } | null;
  onRemoveWall?: (id: string) => void;
};

export function ModelControls({ 
  variant, detail, onVariantChange, onDetailChange,
  wallHeight, onWallHeightChange,
  showLoadBearingWalls, onShowLoadBearingWallsChange,
  showPartitionWalls, onShowPartitionWallsChange,
  selectedWallInfo, onRemoveWall
}: Props) {
  return (
    <section className="panel controls-panel" style={{ 
      boxShadow: "var(--shadow)", 
      background: "rgba(255, 255, 255, 0.9)", 
      backdropFilter: "blur(10px)",
      border: "none",
      padding: "1.5rem",
      borderRadius: "12px",
      fontSize: "0.875rem"
    }}>
      <div className="panel-header" style={{ marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.25rem 0" }}>Model Controls</h3>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Compare recommendation variant and detail level.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span style={{ fontWeight: 500 }}>Recommendation Set</span>
          <div className="toggle-group" style={{ padding: "2px" }}>
            <button
              type="button"
              className={variant === "primary" ? "active" : ""}
              onClick={() => onVariantChange("primary")}
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
            >
              Primary
            </button>
            <button
              type="button"
              className={variant === "alternative" ? "active" : ""}
              onClick={() => onVariantChange("alternative")}
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
            >
              Alternative
            </button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span style={{ fontWeight: 500 }}>3D Detail</span>
          <div className="toggle-group" style={{ padding: "2px" }}>
            <button
              type="button"
              className={detail === "simple" ? "active" : ""}
              onClick={() => onDetailChange("simple")}
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
            >
              Structure Only
            </button>
            <button
              type="button"
              className={detail === "interior" ? "active" : ""}
              onClick={() => onDetailChange("interior")}
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
            >
              Interior
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 500 }}>Wall Height: {wallHeight.toFixed(1)}m</span>
          </div>
          <input 
            type="range" 
            min="0.1" max="5.0" step="0.1" 
            value={wallHeight} 
            onChange={(e) => onWallHeightChange(parseFloat(e.target.value))} 
            style={{ width: "100%", cursor: "pointer", height: "4px" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 500 }}>
            <input 
              type="checkbox" 
              checked={showLoadBearingWalls} 
              onChange={(e) => onShowLoadBearingWallsChange(e.target.checked)} 
              style={{ width: "14px", height: "14px" }}
            />
            Show Load-Bearing Walls
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 500 }}>
            <input 
              type="checkbox" 
              checked={showPartitionWalls} 
              onChange={(e) => onShowPartitionWallsChange(e.target.checked)} 
              style={{ width: "14px", height: "14px" }}
            />
            Show Partition Walls
          </label>
        </div>
      </div>

      {selectedWallInfo && (
        <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(0,0,0,0.1)" }}>
          <div className="panel-header" style={{ marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "1rem", margin: "0 0 0.25rem 0" }}>Wall Details</h3>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              {selectedWallInfo.id.slice(0, 8)}
            </p>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Type:</span>
              <span style={{ fontWeight: 500 }}>{selectedWallInfo.isLoadBearing ? "Load Bearing" : "Partition"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Length:</span>
              <span style={{ fontWeight: 500 }}>{selectedWallInfo.length.toFixed(2)}m</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Thickness:</span>
              <span style={{ fontWeight: 500 }}>{selectedWallInfo.thickness.toFixed(2)}m</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Height:</span>
              <span style={{ fontWeight: 500 }}>{selectedWallInfo.height.toFixed(2)}m</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Material:</span>
              <span style={{ fontWeight: 500, textTransform: "capitalize" }}>
                {selectedWallInfo.material.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => onRemoveWall?.(selectedWallInfo.id)}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "rgba(239, 68, 68, 0.1)",
              color: "rgb(239, 68, 68)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 500,
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
            }}
          >
            Remove Wall
          </button>
        </div>
      )}
    </section>
  );
}
