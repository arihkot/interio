import { PricingDashboardResponse, ProcessResponse } from "@/lib/types";
import { MOCK_PROJECT, MOCK_PRICING } from "./mockData";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const IS_VERCEL = !!process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NEXT_PUBLIC_IS_VERCEL === "true";

export function getApiBase(): string {
  return API_BASE;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processFloorPlan(params: {
  file: File;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
}): Promise<ProcessResponse> {
  if (IS_VERCEL) {
    await sleep(2000); // Simulate processing delay
    return { project: MOCK_PROJECT };
  }

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
  if (IS_VERCEL && projectId === MOCK_PROJECT.project_id) {
    return { project: MOCK_PROJECT };
  }

  const response = await fetch(`${API_BASE}/api/project/${projectId}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch project ${projectId}: ${response.status}`);
  }
  return response.json();
}

export async function getPricing(projectId: string): Promise<PricingDashboardResponse> {
  if (IS_VERCEL && projectId === MOCK_PROJECT.project_id) {
    return MOCK_PRICING;
  }

  const response = await fetch(`${API_BASE}/api/pricing/${projectId}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch pricing for project ${projectId}: ${response.status}`);
  }
  return response.json();
}

export async function askChat(projectId: string, message: string): Promise<{ response: string }> {
  if (IS_VERCEL) {
    await sleep(1000);
    return { response: "I am a mocked assistant. In a full deployment with GPU support, I would analyze your floor plan and answer your query: " + message };
  }

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
  if (IS_VERCEL) return "#";
  return `${API_BASE}/api/export/pdf/${projectId}`;
}

export function modelExportUrl(projectId: string, variant: "primary" | "alternative", detail: "simple" | "interior"): string {
  if (IS_VERCEL) return "#";
  return `${API_BASE}/api/export/model-obj/${projectId}/${variant}/${detail}`;
}
