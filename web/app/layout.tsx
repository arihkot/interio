import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interio",
  description: "Autonomous Structural Intelligence System"
};

import { ProjectProvider } from "./ProjectContext";
import { Navigation } from "./Navigation";

const IS_VERCEL = !!process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NEXT_PUBLIC_IS_VERCEL === "true";

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ProjectProvider>
          {IS_VERCEL && (
            <div style={{
              background: "#fffbeb",
              color: "#92400e",
              padding: "0.75rem 1rem",
              textAlign: "center",
              fontSize: "0.875rem",
              borderBottom: "1px solid #fde68a",
              position: "sticky",
              top: 0,
              zIndex: 1000
            }}>
              <strong>Serverless Demo Mode:</strong> This project requires a GPU for full computer vision and ML floor plan processing. Due to unavailability of GPUs during serverless deployment, this version uses pre-processed mock data and only a limited set of features are accessible.
            </div>
          )}
          <div className="layout-container" style={{ height: IS_VERCEL ? "calc(100vh - 42px)" : "100vh" }}>
            <Navigation />
            <main className="content-container">{children}</main>
          </div>
        </ProjectProvider>
      </body>
    </html>
  );
}
