"use client";

import { useRouter } from "next/navigation";
import { FileUploader } from "@/components/FileUploader";
import { LocationPicker } from "@/components/LocationPicker";
import { ProjectSummary } from "@/components/ProjectSummary";
import { getApiBase, processFloorPlan } from "@/lib/api";
import { useProject } from "./ProjectContext";
import { ArrowRight, FileUp } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const {
    location, setLocation,
    file, setFile,
    project, setProject,
    processing, setProcessing,
    error, setError,
    debugInfo, setDebugInfo,
    setSelectedElementId,
    clearState
  } = useProject();

  async function runPipeline() {
    if (!file || !location) return;
    setProcessing(true);
    setError(null);
    setDebugInfo(null);

    try {
      const response = await processFloorPlan({
        file,
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city,
        state: location.state
      });
      setProject(response.project);
      setSelectedElementId(response.project.recommendations[0]?.element_id ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process floor plan";
      setError(message);
      setDebugInfo(
        `API base: ${getApiBase()} | file: ${file.name} (${file.type || "unknown"}, ${file.size} bytes)`
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div>
          <h1 className="page-title">Project Setup</h1>
          <p className="page-subtitle">Initialize a new structural analysis project</p>
        </div>
        {project && (
          <button className="btn btn-outline" onClick={clearState}>
            Start New Project
          </button>
        )}
      </header>

      <div className="setup-container">
        <LocationPicker onConfirm={setLocation} />
        <FileUploader
          disabled={!location}
          onFileChange={setFile}
          file={file}
          onProcess={runPipeline}
          isProcessing={processing}
        />

        {error ? (
          <section className="error-banner">
            <strong>Upload failed:</strong> {error}
            {debugInfo ? <div className="debug-line">{debugInfo}</div> : null}
            <div className="debug-line">Tip: check backend `/health` and verify CORS/API base.</div>
          </section>
        ) : null}

        {!project ? (
          <section className="panel empty-state">
            <FileUp size={48} className="empty-icon" />
            <h2>Ready when you are</h2>
            <p>
              Confirm location and upload a floor plan to generate 2D detections, 3D models, material recommendations, and exportable catalogs.
            </p>
          </section>
        ) : (
          <div className="success-section">
            <div className="success-header">
              <h2>Project Generated Successfully</h2>
              <button className="btn btn-primary" onClick={() => router.push("/model")}>
                View Plans & Models <ArrowRight size={16} />
              </button>
            </div>
            <ProjectSummary project={project} />
          </div>
        )}
      </div>
    </div>
  );
}
