"use client";

import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { ProcessedProject, Model3D } from "@/lib/types";

export type ConfirmedLocation = {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
};

type ProjectContextType = {
  location: ConfirmedLocation | null;
  setLocation: (loc: ConfirmedLocation | null) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  project: ProcessedProject | null;
  setProject: (p: ProcessedProject | null) => void;
  processing: boolean;
  setProcessing: (b: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
  debugInfo: string | null;
  setDebugInfo: (d: string | null) => void;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  variant: "primary" | "alternative";
  setVariant: (v: "primary" | "alternative") => void;
  detail: "simple" | "interior";
  setDetail: (d: "simple" | "interior") => void;
  activeModel: Model3D | null;
  clearState: () => void;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<ConfirmedLocation | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [project, setProject] = useState<ProcessedProject | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [variant, setVariant] = useState<"primary" | "alternative">("primary");
  const [detail, setDetail] = useState<"simple" | "interior">("simple");

  const activeModel = useMemo(() => {
    if (!project) return null;
    if (variant === "primary" && detail === "simple") return project.model_3d_primary_simple;
    if (variant === "primary" && detail === "interior") return project.model_3d_primary_interior;
    if (variant === "alternative" && detail === "simple") return project.model_3d_alternative_simple;
    return project.model_3d_alternative_interior;
  }, [project, variant, detail]);

  const clearState = () => {
    setFile(null);
    setProject(null);
    setError(null);
    setDebugInfo(null);
    setSelectedElementId(null);
  };

  return (
    <ProjectContext.Provider
      value={{
        location, setLocation,
        file, setFile,
        project, setProject,
        processing, setProcessing,
        error, setError,
        debugInfo, setDebugInfo,
        selectedElementId, setSelectedElementId,
        variant, setVariant,
        detail, setDetail,
        activeModel, clearState
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProject must be used within ProjectProvider");
  return context;
}
