"use client";

import { ProcessedProject } from "@/lib/types";
import { formatINR } from "@/lib/format";

type Props = {
  project: ProcessedProject;
  selectedElementId: string | null;
};

function labeled(text: string) {
  return text.replaceAll("_", " ");
}

export function ElementInspector({ project, selectedElementId }: Props) {
  if (!selectedElementId) {
    return (
      <section className="panel inspector-panel">
        <div className="panel-header">
          <h3>Element Inspector</h3>
          <p>Select a wall/room/opening in 2D or 3D to view detailed data.</p>
        </div>
      </section>
    );
  }

  const room = project.plan_2d.rooms.find((item) => item.id === selectedElementId);
  const wall = project.plan_2d.walls.find((item) => item.id === selectedElementId);
  const opening = project.plan_2d.openings.find((item) => item.id === selectedElementId);
  const recommendation = project.recommendations.find((item) => {
    if (item.element_id === selectedElementId) return true;
    if (wall && item.element_id === wall.id) return true;
    if (opening && item.element_id === opening.wall_id) return true;
    return false;
  });

  const explanation = recommendation
    ? project.explainability.per_element_explanations[recommendation.element_id]
    : null;

  return (
    <section className="panel inspector-panel">
      <div className="panel-header">
        <h3>Element Inspector · {selectedElementId}</h3>
        <p>Detailed card for hovered/clicked block in synchronized 2D and 3D views.</p>
      </div>

      <div className="inspector-grid">
        <article>
          <h4>Geometry</h4>
          {room ? (
            <ul>
              <li>Room name: {room.name}</li>
              <li>Area: {room.area_m2.toFixed(2)} m2</li>
              <li>Centroid: ({room.centroid.x.toFixed(2)}, {room.centroid.y.toFixed(2)})</li>
              <li>Detection confidence: {Math.round(room.confidence * 100)}%</li>
            </ul>
          ) : null}
          {wall ? (
            <ul>
              <li>Wall type: {wall.is_load_bearing ? "Load-bearing" : "Partition"}</li>
              <li>Length: {wall.length_m.toFixed(2)} m</li>
              <li>Thickness: {wall.thickness_m.toFixed(2)} m</li>
              <li>Detection confidence: {Math.round(wall.confidence * 100)}%</li>
            </ul>
          ) : null}
          {opening ? (
            <ul>
              <li>Opening type: {opening.opening_type}</li>
              <li>Wall linked: {opening.wall_id}</li>
              <li>Width x Height: {opening.width_m.toFixed(2)} m x {opening.height_m.toFixed(2)} m</li>
              <li>Detection confidence: {Math.round(opening.confidence * 100)}%</li>
            </ul>
          ) : null}
        </article>

        <article>
          <h4>Material and Cost</h4>
          {recommendation ? (
            <>
              <p>
                Element: {recommendation.element_name} ({labeled(recommendation.element_type)})
              </p>
              <p>
                Quantity: {recommendation.quantity} {recommendation.unit}
              </p>
              {recommendation.options.slice(0, 2).map((option, index) => (
                <div key={option.material_key} className="inspector-option">
                  <strong style={{ color: option.color }}>
                    {index === 0 ? "Primary" : "Alternative"}: {option.material_name}
                  </strong>
                  <ul>
                    <li>Total cost: {formatINR(option.total_cost_inr)}</li>
                    <li>Annual maintenance: {formatINR(option.annual_maintenance_inr)}</li>
                    <li>Average life: {option.average_life_years.toFixed(0)} years</li>
                    <li>Tradeoff score: {option.tradeoff_score.toFixed(2)}</li>
                    <li>Price source: {option.price_source_type}</li>
                  </ul>
                </div>
              ))}
            </>
          ) : (
            <p>No direct material recommendation tied to this item.</p>
          )}
        </article>

        <article>
          <h4>Explainability</h4>
          <p>{explanation ?? "Select a structural element to see model-backed rationale."}</p>
          <p>
            Weather context: {project.weather.climate_zone} · {project.weather.temperature_c.toFixed(1)} C ·
            Humidity {project.weather.humidity_pct.toFixed(0)}%
          </p>
          <p>
            Selection source: {project.selection_source === "llm_guided_lifecycle" ? "LLM-guided lifecycle" : "Score engine"}
          </p>
        </article>
      </div>
    </section>
  );
}
