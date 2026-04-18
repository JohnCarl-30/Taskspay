import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

interface WalletState {
  publicKey: string;
  network: string;
}

interface TopbarProps {
  page: string;
  setPage: (page: string) => void;
  wallet: WalletState | null;
  onConnect: () => Promise<void>;
  role: "client" | "freelancer" | null;
}

export default function Topbar({
  page,
  setPage,
  wallet,
  onConnect,
  role,
}: TopbarProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    await onConnect();
    setIsConnecting(false);
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return addr.slice(0, 8) + "..." + addr.slice(-4);
  };

  const navItems =
    role === "freelancer"
      ? [
          { key: "home", label: "My Work" },
          { key: "history", label: "History" },
        ]
      : [
          { key: "home", label: "Home" },
          { key: "escrow", label: "New Escrow" },
          { key: "history", label: "History" },
        ];

  const roleBadgeStyle =
    role === "client"
      ? { color: "var(--accent)", background: "var(--accent-dim, rgba(200,241,53,0.15))" }
      : { color: "var(--pending)", background: "var(--pending-dim, rgba(245,166,35,0.15))" };

  return (
    <nav className="sticky top-0 z-100 flex items-center justify-between px-6 py-4 border-b bg-[var(--bg)] border-[var(--border)]">
      <div className="flex items-center gap-6">
        <div className="font-display text-sm font-bold text-[var(--accent)]">
          TasksPay
        </div>
        <div className="flex gap-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className="px-3 py-2 text-xs uppercase tracking-wider transition-all duration-150 border-0 bg-transparent rounded"
              style={{
                color: page === item.key ? "var(--text)" : "var(--muted)",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {wallet ? (
          <div className="flex items-center gap-3">
            {role && (
              <span
                className="text-xs uppercase tracking-widest px-2 py-0.5 rounded font-medium"
                style={roleBadgeStyle}
              >
                {role}
              </span>
            )}
            <div className="text-xs text-[var(--muted)] font-mono">
              {formatAddress(wallet.publicKey)}
            </div>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border-0 rounded bg-[var(--accent)] text-[#0a0a0a]"
            style={{ opacity: isConnecting ? 0.6 : 1 }}
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </nav>
  );
}
