"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { getPricing } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { PricingDashboardResponse } from "@/lib/types";

type Props = {
  projectId: string;
};

function SourceChip({ type }: { type: "observed" | "proxy" | "imputed" }) {
  const text = type === "observed" ? "Observed" : type === "proxy" ? "Proxy" : "Imputed";
  return <span className={`source-tag source-${type}`}>{text}</span>;
}

export function PricingDashboard({ projectId }: Props) {
  const [data, setData] = useState<PricingDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getPricing(projectId)
      .then((response) => {
        if (!mounted) return;
        setData(response);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load pricing");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  if (loading) return (
    <section className="panel" style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "3rem" }}>
      <Loader2 size={24} className="animate-spin" style={{ marginRight: "0.75rem", color: "var(--brand)" }} />
      <span>Loading pricing dashboard...</span>
    </section>
  );
  if (error || !data) return <section className="panel">{error ?? "No pricing data found"}</section>;

  return (
    <section className="panel pricing-panel">
      <div className="panel-header">
        <h3>Real-Time Material Pricing via World Bank</h3>
        <p>
          {data.location.city ?? "Selected location"}, {data.location.state ?? "India"} · {data.weather.climate_zone} climate
        </p>
      </div>

      <div className="pricing-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Rate</th>
              <th>Unit</th>
              <th>Source</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {data.prices.map((price) => (
              <tr key={price.material_key}>
                <td>{price.material_key.replaceAll("_", " ")}</td>
                <td>{formatINR(price.unit_cost_inr)}</td>
                <td>{price.unit}</td>
                <td>
                  <SourceChip type={price.source_type} />
                </td>
                <td>{Math.round(price.confidence * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="notes">
        {data.notes.map((note, index) => (
          <li key={`${note}-${index}`}>{note}</li>
        ))}
      </ul>
    </section>
  );
}
