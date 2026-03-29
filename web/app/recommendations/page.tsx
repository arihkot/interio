"use client";

import { useProject } from "../ProjectContext";
import { RecommendationPanel } from "@/components/RecommendationPanel";
import { ElementInspector } from "@/components/ElementInspector";

export default function RecommendationsPage() {
  const { project, selectedElementId, setSelectedElementId } = useProject();

  if (!project) {
    return <div className="page-wrapper"><p className="empty-state">Please upload a project first.</p></div>;
  }

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div>
          <h1 className="page-title">Recommendations & Insights</h1>
          <p className="page-subtitle">Material suggestions and element inspection</p>
        </div>
      </header>

      <div className="recs-layout">
        <div className="main-recs">
          <RecommendationPanel recommendations={project.recommendations} selectedElementId={selectedElementId} onSelectElement={setSelectedElementId} />
        </div>
        <div className="side-inspector">
          <ElementInspector project={project} selectedElementId={selectedElementId} />
        </div>
      </div>
    </div>
  );
}
