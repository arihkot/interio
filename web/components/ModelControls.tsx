"use client";

type Props = {
  variant: "primary" | "alternative";
  detail: "simple" | "interior";
  onVariantChange: (variant: "primary" | "alternative") => void;
  onDetailChange: (detail: "simple" | "interior") => void;
};

export function ModelControls({ variant, detail, onVariantChange, onDetailChange }: Props) {
  return (
    <section className="panel controls-panel">
      <div className="panel-header">
        <h3>Model Controls</h3>
        <p>Compare recommendation variant and detail level.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontWeight: 500 }}>Recommendation Set</span>
          <div className="toggle-group">
            <button
              type="button"
              className={variant === "primary" ? "active" : ""}
              onClick={() => onVariantChange("primary")}
            >
              Primary
            </button>
            <button
              type="button"
              className={variant === "alternative" ? "active" : ""}
              onClick={() => onVariantChange("alternative")}
            >
              Alternative
            </button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontWeight: 500 }}>3D Detail</span>
          <div className="toggle-group">
            <button
              type="button"
              className={detail === "simple" ? "active" : ""}
              onClick={() => onDetailChange("simple")}
            >
              Structure Only
            </button>
            <button
              type="button"
              className={detail === "interior" ? "active" : ""}
              onClick={() => onDetailChange("interior")}
            >
              Minimal Interior
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
