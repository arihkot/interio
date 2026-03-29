"use client";

import { useProject } from "../ProjectContext";
import { ChatPanel } from "@/components/ChatPanel";

export default function ChatPage() {
  const { project } = useProject();

  if (!project) {
    return <div className="page-wrapper"><p className="empty-state">Please upload a project first.</p></div>;
  }

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div>
          <h1 className="page-title">AI Assistant</h1>
          <p className="page-subtitle">Chat with your structural intelligence model</p>
        </div>
      </header>
      <div className="chat-container-lg">
        <ChatPanel projectId={project.project_id} />
      </div>
    </div>
  );
}
