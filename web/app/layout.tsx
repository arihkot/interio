import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interio",
  description: "Autonomous Structural Intelligence System"
};

import { ProjectProvider } from "./ProjectContext";
import { Navigation } from "./Navigation";

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ProjectProvider>
          <div className="layout-container">
            <Navigation />
            <main className="content-container">{children}</main>
          </div>
        </ProjectProvider>
      </body>
    </html>
  );
}
