"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Layers,
  Box,
  Sparkles,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { useProject } from "./ProjectContext";
import { WalletConnect } from "@/components/WalletConnect";

export function Navigation() {
  const pathname = usePathname();
  const { project } = useProject();

  const navItems = [
    { name: "Home & Upload", href: "/", icon: Home, exact: true },
    { name: "2D Plan", href: "/plan", icon: Layers, exact: false },
    { name: "3D Model", href: "/model", icon: Box, exact: false },
    { name: "Recommendations", href: "/recommendations", icon: Sparkles, exact: false },
    { name: "Pricing & BOM", href: "/pricing", icon: CreditCard, exact: false },
    { name: "Assistant", href: "/chat", icon: MessageSquare, exact: false },
  ] as const;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-box"></div>
        <div>
          <h2>interio.</h2>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const isDisabled = !project && item.href !== "/";
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
              onClick={(e) => isDisabled && e.preventDefault()}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer" style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "auto" }}>
        <WalletConnect />
        {project && (
          <div className="status-badge">
            <span className="dot"></span> Project Loaded
          </div>
        )}
      </div>
    </aside>
  );
}
