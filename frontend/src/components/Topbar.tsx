import { useState, useEffect, useRef } from "react";
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
  onSwitchRole?: () => void;
  onDisconnect?: () => void;
}

export default function Topbar({
  page,
  setPage,
  wallet,
  onConnect,
  role,
  onSwitchRole,
  onDisconnect,
}: TopbarProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setConfirmSwitch(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleConnect = async () => {
    setIsConnecting(true);
    await onConnect();
    setIsConnecting(false);
    setDropdownOpen(false);
    setConfirmSwitch(false);
  };

  const handleSwitchWalletClick = () => {
    setConfirmSwitch(true);
  };

  const handleDisconnectClick = () => {
    setDropdownOpen(false);
    setConfirmSwitch(false);
    if (onDisconnect) {
      onDisconnect();
    }
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
          <div className="flex items-center gap-3 relative">
            {role && onSwitchRole && (
              <button
                onClick={onSwitchRole}
                className="text-xs uppercase tracking-widest px-2 py-0.5 rounded font-medium border-0 cursor-pointer transition-opacity duration-150 hover:opacity-70"
                style={roleBadgeStyle}
                title="Click to switch role"
              >
                {role}
              </button>
            )}
            {role && !onSwitchRole && (
              <span
                className="text-xs uppercase tracking-widest px-2 py-0.5 rounded font-medium"
                style={roleBadgeStyle}
              >
                {role}
              </span>
            )}
            
            {/* Wallet Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={isConnecting}
                className="text-xs text-[var(--muted)] font-mono border-0 bg-transparent cursor-pointer transition-opacity duration-150 hover:opacity-70 px-2 py-1 rounded"
                title="Wallet options"
              >
                {isConnecting ? "Connecting..." : formatAddress(wallet.publicKey)}
              </button>
              
              {dropdownOpen && !confirmSwitch && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-lg border shadow-lg z-50"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <button
                    onClick={handleSwitchWalletClick}
                    className="w-full text-left px-4 py-2 text-xs uppercase tracking-wider border-0 bg-transparent cursor-pointer transition-all duration-150 hover:opacity-70"
                    style={{ color: "var(--text)" }}
                  >
                    Switch Wallet
                  </button>
                  <div style={{ borderTop: "0.5px solid var(--border)" }} />
                  <button
                    onClick={handleDisconnectClick}
                    className="w-full text-left px-4 py-2 text-xs uppercase tracking-wider border-0 bg-transparent cursor-pointer transition-all duration-150 hover:opacity-70"
                    style={{ color: "var(--danger)" }}
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {/* Confirmation Dialog */}
              {confirmSwitch && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-lg border shadow-lg z-50 p-4"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="text-xs mb-3" style={{ color: "var(--text)" }}>
                    {confirmSwitch ? "Disconnect and reset to initial state?" : ""}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmSwitch(false)}
                      className="flex-1 px-3 py-2 text-xs uppercase tracking-wider border rounded font-medium border-0 bg-transparent cursor-pointer transition-all duration-150"
                      style={{
                        color: "var(--muted)",
                        borderColor: "var(--border)",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDisconnectClick}
                      disabled={isConnecting}
                      className="flex-1 px-3 py-2 text-xs uppercase tracking-wider border-0 rounded font-medium cursor-pointer transition-all duration-150"
                      style={{
                        background: "var(--danger)",
                        color: "#fff",
                        opacity: isConnecting ? 0.6 : 1,
                      }}
                    >
                      {isConnecting ? "..." : "Confirm"}
                    </button>
                  </div>
                </div>
              )}
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
