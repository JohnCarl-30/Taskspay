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
}

export default function Topbar({ page, setPage, wallet, onConnect }: TopbarProps) {
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

  const navItems = [
    { key: "home", label: "Home" },
    { key: "escrow", label: "New Escrow" },
    { key: "history", label: "History" },
  ];

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