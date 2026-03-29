"use client";

import { ElementRecommendation } from "@/lib/types";
import { formatINR, percent } from "@/lib/format";

type Props = {
  recommendations: ElementRecommendation[];
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
};

function SourceBadge({ sourceType }: { sourceType: "observed" | "proxy" | "imputed" }) {
  const label = sourceType === "observed" ? "Observed" : sourceType === "proxy" ? "Proxy" : "Imputed";
  return <span className={`source-tag source-${sourceType}`}>{label}</span>;
}

export function RecommendationPanel({ recommendations, selectedElementId, onSelectElement }: Props) {
  return (
    <section className="panel rec-panel">
      <div className="panel-header">
        <h3>Material Recommendations</h3>
        <p>Primary and next-best alternatives with cost, lifecycle, and strength tradeoffs.</p>
      </div>

      <div className="rec-list">
        {recommendations.map((rec) => {
          const top = rec.options[0];
          const alt = rec.options[1];
          const active = selectedElementId === rec.element_id;
          return (
            <article
              key={rec.element_id}
              className={`rec-card ${active ? "active" : ""}`}
              onClick={() => onSelectElement(rec.element_id)}
            >
              <header>
                <h4>{rec.element_name}</h4>
                <span>{rec.element_type.replaceAll("_", " ")}</span>
              </header>

              <div className="rec-main-grid">
                <div>
                  <p className="muted">Primary</p>
                  <p className="mat-name" style={{ color: top.color }}>
                    {top.material_name}
                  </p>
                  <p>{formatINR(top.total_cost_inr)}</p>
                  <p>
                    Life {top.average_life_years}y · Maintenance {formatINR(top.annual_maintenance_inr)}/yr
                  </p>
                </div>
                <div>
                  <p className="muted">Alternative</p>
                  {alt ? (
                    <>
                      <p className="mat-name" style={{ color: alt.color }}>
                        {alt.material_name}
                      </p>
                      <p>{formatINR(alt.total_cost_inr)}</p>
                      <p>
                        Life {alt.average_life_years}y · Maintenance {formatINR(alt.annual_maintenance_inr)}/yr
                      </p>
                    </>
                  ) : (
                    <p>No alternative available</p>
                  )}
                </div>
              </div>

              <div className="score-grid">
                <span>Strength {percent(top.strength_score)}</span>
                <span>Durability {percent(top.durability_score)}</span>
                <span>Weather fit {percent(top.weather_fit_score)}</span>
                <span>Availability {percent(top.availability_score)}</span>
              </div>

              <div className="card-footer">
                <SourceBadge sourceType={top.price_source_type} />
                <strong>Tradeoff score: {top.tradeoff_score.toFixed(2)}</strong>
              </div>

              <p className="rationale">{top.rationale}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
