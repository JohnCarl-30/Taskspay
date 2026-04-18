import { useState, useEffect } from "react";
import EscrowCard from "../components/EscrowCard";
import { TX_EXPLORER_URL, initializeContract, isContractInitialized } from "../stellar";
import { signTransaction } from "../freighter";

interface Escrow {
  id: string;
  title: string;
  address: string;
  amount: number;
  status: "Pending" | "Released" | "Refunded";
  milestone: number;
  totalMilestones: number;
  tx_hash: string | null;
}

interface WalletState {
  publicKey: string;
  network: string;
}

interface HomePageProps {
  wallet: WalletState | null;
  balance: string;
  escrows: Escrow[];
  totalLocked: number;
  setPage: (page: string) => void;
  onViewEscrow: (escrowId: string) => void;
}

export default function HomePage({
  wallet,
  balance,
  escrows,
  totalLocked,
  setPage,
  onViewEscrow,
}: HomePageProps) {
  const [initializing, setInitializing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [checkingInit, setCheckingInit] = useState(true);

  // Check contract initialization status on component mount
  useEffect(() => {
    const checkInitialization = async () => {
      setCheckingInit(true);
      try {
        // Check if we've already cached this result (only cache true, not false)
        const cached = localStorage.getItem("contractInitialized");
        if (cached === "true") {
          setInitialized(true);
          setCheckingInit(false);
          return;
        }

        const isInit = await isContractInitialized();
        setInitialized(isInit);
        
        // Cache true result only (temporary - expires on page refresh)
        if (isInit) {
          localStorage.setItem("contractInitialized", "true");
        }
        
        console.log("Contract initialization status:", isInit);
      } catch (error) {
        console.error("Failed to check contract initialization:", error);
        setInitialized(false);
      } finally {
        setCheckingInit(false);
      }
    };

    checkInitialization();
  }, []);

  const activeEscrows = escrows.filter((e) => e.status === "Pending");

  const handleInitializeContract = async () => {
    if (!wallet) {
      alert("Connect your wallet first");
      return;
    }

    setInitializing(true);
    // Clear the cache since we're about to reinitialize
    localStorage.removeItem("contractInitialized");
    
    try {
      const result = await initializeContract(wallet.publicKey, signTransaction);
      alert(`✓ Contract initialized!\nTransaction: ${result.hash}`);
      
      // Wait a moment then re-check contract status to confirm
      await new Promise(resolve => setTimeout(resolve, 2000));
      const isInit = await isContractInitialized();
      setInitialized(isInit);
      
      if (isInit) {
        localStorage.setItem("contractInitialized", "true");
      }
      
      if (!isInit) {
        console.warn("Contract status verification failed - may still be initializing on-chain");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Failed to initialize: ${message}`);
    } finally {
      setInitializing(false);
    }
  };

  const activity = escrows.slice(0, 5).map((e) => ({
    text: `Escrow initialized. ${e.amount.toFixed(2)} XLM locked. ${e.title}.`,
    done: e.status === "Released",
    active: e.status === "Pending",
    tx_hash: e.tx_hash,
  }));

  return (
    <div className="fade-in">
      <div className="mb-1.5 text-xs uppercase tracking-widest text-[var(--muted2)]">
        Overview
      </div>
      <div className="mb-6 font-display text-2xl font-bold tracking-tight">
        {wallet ? "Welcome back" : "Welcome, Connect Wallet"}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          accent
          label="Wallet Balance"
          value={balance}
          sub="XLM · Testnet"
        />
        <StatCard
          label="Active Escrows"
          value={activeEscrows.length}
          sub="In progress"
        />
        <StatCard
          label="Total Locked"
          value={totalLocked.toFixed(2)}
          sub="XLM across escrows"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <QuickCard
          title="New Escrow"
          desc="Lock funds with AI milestone breakdown."
          icon="+"
          onClick={() => setPage("escrow")}
          highlight
        />
        <QuickCard
          title="Transaction History"
          desc="Full ledger of escrow activity."
          icon="→"
          onClick={() => setPage("history")}
        />
        {!initialized && wallet && !checkingInit && (
          <button
            onClick={handleInitializeContract}
            disabled={initializing}
            className="col-span-2 p-3 rounded-lg border text-left hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="font-display text-sm font-bold uppercase tracking-wider mb-1">
              {initializing ? "Initializing..." : "Initialize Contract"}
            </div>
            <div className="text-xs text-[var(--muted)]">
              Enable XLM transfers (one-time setup)
            </div>
          </button>
        )}
      </div>

      <SectionHeader
        title="Active Escrows"
        onViewAll={() => setPage("history")}
      />
      {activeEscrows.length === 0 ? (
        <EmptyState label="No active escrows. Create one to get started." />
      ) : (
        activeEscrows.map((e) => (
          <EscrowCard 
            key={e.id} 
            escrow={e} 
            onClick={() => onViewEscrow(e.id)}
          />
        ))
      )}

      <SectionHeader
        title="Recent Activity"
        onViewAll={() => setPage("history")}
        style={{ marginTop: 24 }}
      />
      <div>
        {activity.map((a, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 py-3"
            style={{
              borderBottom:
                i < activity.length - 1 ? "0.5px solid var(--border)" : "none",
            }}
          >
            <div className="flex gap-2.5 flex-1">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                style={{
                  background: a.done
                    ? "var(--accent)"
                    : a.active
                      ? "var(--pending)"
                      : "var(--muted2)",
                }}
              />
              <div className="text-xs text-[var(--muted)] leading-relaxed">
                <strong className="text-[var(--text)] font-medium">
                  {a.text.split(".")[0]}.
                </strong>{" "}
                {a.text.split(".").slice(1).join(".").trim()}
              </div>
            </div>
            {a.tx_hash ? (
              <a
                href={TX_EXPLORER_URL(a.tx_hash)}
                target="_blank"
                rel="noreferrer"
                className="text-xs uppercase tracking-wider text-[var(--accent)] whitespace-nowrap no-underline"
              >
                ↗ Explorer
              </a>
            ) : (
              <span className="text-xs uppercase tracking-wider text-[var(--muted2)] whitespace-nowrap">
                ↗ Explorer
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  accent?: boolean;
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div
      className="p-4 rounded-lg border"
      style={{
        background: accent ? "var(--accent)" : "var(--surface)",
        borderColor: accent ? "var(--accent)" : "var(--border)",
      }}
    >
      <div
        className="text-xs uppercase tracking-widest mb-2"
        style={{
          color: accent ? "rgba(0,0,0,0.5)" : "var(--muted)",
        }}
      >
        {label}
      </div>
      <div
        className="font-display text-[26px] font-bold tracking-tight leading-none"
        style={{
          color: accent ? "#0a0a0a" : "var(--text)",
        }}
      >
        {value}
      </div>
      <div
        className="text-xs mt-1"
        style={{
          color: accent ? "rgba(0,0,0,0.4)" : "var(--muted)",
        }}
      >
        {sub}
      </div>
    </div>
  );
}

interface QuickCardProps {
  title: string;
  desc: string;
  icon: string;
  onClick: () => void;
  highlight?: boolean;
}

function QuickCard({ title, desc, icon, onClick, highlight }: QuickCardProps) {
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-lg border cursor-pointer transition-all duration-150 flex items-center justify-between"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div>
        <div className="font-display text-xs font-bold uppercase tracking-wider">
          {title}
        </div>
        <div className="text-xs text-[var(--muted)] mt-1">{desc}</div>
      </div>
      <div
        className="font-display text-xl font-bold"
        style={{
          color: highlight ? "var(--accent)" : "var(--muted)",
        }}
      >
        {icon}
      </div>
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  onViewAll?: () => void;
  style?: React.CSSProperties;
}

function SectionHeader({ title, onViewAll, style }: SectionHeaderProps) {
  return (
    <div
      className="flex items-center justify-between mb-3"
      style={style}
    >
      <div className="font-display text-sm font-bold uppercase tracking-wider">
        {title}
      </div>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="text-xs uppercase tracking-wider text-[var(--muted)] border-0 bg-transparent"
        >
          View All →
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  label: string;
}

function EmptyState({ label }: EmptyStateProps) {
  return (
    <div className="py-6 text-center text-xs text-[var(--muted)]">
      {label}
    </div>
  );
}