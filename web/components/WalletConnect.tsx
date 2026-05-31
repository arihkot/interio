"use client";

import { useState, useEffect } from "react";
import { isAllowed, setAllowed, getAddress } from "@stellar/freighter-api";
import { Wallet } from "lucide-react";

export function WalletConnect() {
  const [pubKey, setPubKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const allowed = await isAllowed();
      if (allowed.isAllowed) {
        const info = await getAddress();
        if (info.address) {
          setPubKey(info.address);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function connect() {
    setConnecting(true);
    try {
      await setAllowed();
      const info = await getAddress();
      if (info.address) {
        setPubKey(info.address);
      }
    } catch (err) {
      console.error("Failed to connect Freighter:", err);
    } finally {
      setConnecting(false);
    }
  }

  if (pubKey) {
    return (
      <div className="status-badge wallet-connected" style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--surface-alt)", color: "var(--text)", padding: "0.5rem 1rem", borderRadius: "99px", fontSize: "0.85rem", fontWeight: 500 }}>
        <span className="dot" style={{ background: "var(--success)" }}></span>
        <span className="wallet-name">{pubKey.substring(0, 4)}...{pubKey.substring(pubKey.length - 4)}</span>
      </div>
    );
  }

  return (
    <button 
      onClick={connect} 
      disabled={connecting}
      className="btn btn-outline wallet-connect-btn"
      title="Connect Freighter Wallet"
      style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", justifyContent: "center", whiteSpace: "nowrap" }}
    >
      <Wallet size={16} className="wallet-icon" />
      <span className="wallet-label">{connecting ? "Connecting..." : "Connect Freighter"}</span>
    </button>
  );
}
