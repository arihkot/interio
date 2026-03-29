import { PricingDashboardResponse, ProcessResponse } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export function getApiBase(): string {
  return API_BASE;
}

export async function processFloorPlan(params: {
  file: File;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
}): Promise<ProcessResponse> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("latitude", String(params.latitude));
  form.append("longitude", String(params.longitude));
  if (params.city) form.append("city", params.city);
  if (params.state) form.append("state", params.state);

  const response = await fetch(`${API_BASE}/api/process`, {
    method: "POST",
    body: form
  });
  if (!response.ok) {
    let detail = "";
    try {
      const json = await response.json();
      detail = json?.detail ? ` - ${json.detail}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`Failed to process floor plan: ${response.status}${detail}`);
  }
  return response.json();
}

export async function getProject(projectId: string): Promise<ProcessResponse> {
  const response = await fetch(`${API_BASE}/api/project/${projectId}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch project ${projectId}: ${response.status}`);
  }
  return response.json();
}

export async function getPricing(projectId: string): Promise<PricingDashboardResponse> {
  const response = await fetch(`${API_BASE}/api/pricing/${projectId}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch pricing for project ${projectId}: ${response.status}`);
  }
  return response.json();
}

export async function askChat(projectId: string, message: string): Promise<{ response: string }> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ project_id: projectId, message })
  });
  if (!response.ok) {
    throw new Error("Chat request failed");
  }
  return response.json();
}

export function pdfExportUrl(projectId: string): string {
  return `${API_BASE}/api/export/pdf/${projectId}`;
}

export function modelExportUrl(projectId: string, variant: "primary" | "alternative", detail: "simple" | "interior"): string {
  return `${API_BASE}/api/export/model-obj/${projectId}/${variant}/${detail}`;
}
