"use client";

import { modelExportUrl, pdfExportUrl } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { ProcessedProject } from "@/lib/types";
import { FileText, Box, Download } from "lucide-react";

type Props = {
  project: ProcessedProject;
};

export function ProjectSummary({ project }: Props) {
  const cost = project.cost_summary;

  return (
    <section className="panel summary-panel">
      <div className="panel-header">
        <h3>Project Summary</h3>
        <p>
          {project.location.city ?? "Selected city"}, {project.location.state ?? "India"} · {project.weather.climate_zone}
        </p>
      </div>

      <div className="summary-grid">
        <article>
          <h4>Primary Total</h4>
          <p>{formatINR(cost.primary_total_cost_inr)}</p>
        </article>
        <article>
          <h4>Alternative Total</h4>
          <p>{formatINR(cost.alternative_total_cost_inr)}</p>
        </article>
        <article>
          <h4>Annual Maintenance</h4>
          <p>{formatINR(cost.annual_maintenance_inr)}</p>
        </article>
        <article>
          <h4>30y Lifecycle</h4>
          <p>{formatINR(cost.lifecycle_cost_30y_inr)}</p>
        </article>
        <article>
          <h4>Average Service Life</h4>
          <p>{cost.average_life_years} years</p>
        </article>
        <article>
          <h4>Elements</h4>
          <p>{cost.element_count}</p>
        </article>
      </div>

      <div className="summary-text-grid">
        <article>
          <h4>Executive Explainability</h4>
          <p>{project.explainability.executive_summary}</p>
        </article>
        <article>
          <h4>Structural Concerns</h4>
          <ul>
            {project.explainability.structural_concerns.map((concern) => (
              <li key={concern}>{concern}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="export-row">
        <a href={pdfExportUrl(project.project_id)} target="_blank" rel="noreferrer" className="btn btn-primary">
          <FileText size={16} /> Export PDF Catalog
        </a>
        <a
          href={modelExportUrl(project.project_id, "primary", "simple")}
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline"
        >
          <Box size={16} /> Export 3D OBJ (Primary)
        </a>
        <a
          href={modelExportUrl(project.project_id, "alternative", "interior")}
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline"
        >
          <Download size={16} /> Export 3D OBJ (Alt)
        </a>
      </div>
    </section>
  );
}
