"use client";

import { useState } from "react";
import { modelExportUrl, pdfExportUrl } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { ProcessedProject } from "@/lib/types";
import { FileText, Box, Download, Coins, ExternalLink, Loader2 } from "lucide-react";

type Props = {
  project: ProcessedProject;
};

export function ProjectSummary({ project }: Props) {
  const cost = project.cost_summary;
  const [mintStatus, setMintStatus] = useState<string | null>(null);
  const [mintUrl, setMintUrl] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);

  const handleMintNFT = async () => {
    try {
      setIsMinting(true);
      setMintStatus("Funding account & minting on Stellar Testnet...");
      setMintUrl(null);
      
      const res = await fetch(`http://localhost:8000/api/web3/mint/${project.project_id}`, {
        method: 'POST'
      });
      
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setMintStatus(`Success! View your asset on Stellar Testnet.`);
        setMintUrl(data.explorer_url);
      } else {
        setMintStatus(`Minting failed: ${data.message || data.detail}`);
      }
    } catch (err) {
      console.error(err);
      setMintStatus("Minting failed due to a network error.");
    } finally {
      setIsMinting(false);
    }
  };

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

      <div className="export-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
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
        <button 
          onClick={handleMintNFT} 
          disabled={isMinting}
          className="btn btn-outline"
          style={{ background: "#000", color: "#fff", borderColor: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          {isMinting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Minting...
            </>
          ) : (
            <>
              <Coins size={16} /> Mint as Stellar NFT
            </>
          )}
        </button>
      </div>
      {mintStatus && (
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(0,0,0,0.05)", borderRadius: "6px", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{mintStatus}</span>
          {mintUrl && (
            <a href={mintUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <ExternalLink size={14} /> View Transaction
            </a>
          )}
        </div>
      )}
    </section>
  );
}
