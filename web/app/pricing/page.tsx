"use client";

import { useProject } from "../ProjectContext";
import { PricingDashboard } from "@/components/PricingDashboard";

export default function PricingPage() {
  const { project } = useProject();

  if (!project) {
    return <div className="page-wrapper"><p className="empty-state">Please upload a project first.</p></div>;
  }

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div>
          <h1 className="page-title">Pricing Dashboard</h1>
          <p className="page-subtitle">Bill of materials and cost estimation</p>
        </div>
      </header>
      <PricingDashboard projectId={project.project_id} />
    </div>
  );
}
