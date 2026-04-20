import { useState, useEffect } from "react";
import EscrowCard from "../components/EscrowCard";
import {
  TX_EXPLORER_URL,
  EXPLORER_URL,
  initializeContract,
  isContractInitialized,
  SETUP_HELP_COMMAND,
  XlmTokenSetupError,
} from "../stellar";
import { signTransaction } from "../freighter";

const CONTRACT_ID =
  (import.meta.env.VITE_CONTRACT_ID as string | undefined) ?? "";

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
  onConnect?: () => void;
}

export default function HomePage({
  wallet,
  balance,
  escrows,
  totalLocked,
  setPage,
  onViewEscrow,
  onConnect,
}: HomePageProps) {
  const [initializing, setInitializing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [checkingInit, setCheckingInit] = useState(true);
  const [initError, setInitError] = useState<{
    title: string;
    body: string;
    command?: string;
  } | null>(null);
  const [initSuccessHash, setInitSuccessHash] = useState<string | null>(null);

  useEffect(() => {
    const checkInitialization = async () => {
      setCheckingInit(true);
      try {
        const cached = localStorage.getItem("contractInitialized");
        if (cached === "true") {
          setInitialized(true);
          setCheckingInit(false);
          return;
        }

        const isInit = await isContractInitialized();
        setInitialized(isInit);

        if (isInit) {
          localStorage.setItem("contractInitialized", "true");
        }
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
    if (!wallet) return;
    setInitError(null);
    setInitSuccessHash(null);
    setInitializing(true);
    localStorage.removeItem("contractInitialized");

    // Step 1: submit the initialize tx — errors here are fatal and shown to the user.
    try {
      const result = await initializeContract(wallet.publicKey, signTransaction);
      setInitSuccessHash(result.hash);
      // Trust the landed tx: mark initialized immediately so the button disappears.
      setInitialized(true);
      localStorage.setItem("contractInitialized", "true");
    } catch (error) {
      const isSetupError =
        error instanceof XlmTokenSetupError ||
        (error instanceof Error && error.name === "XlmTokenSetupError");
      if (isSetupError) {
        setInitError({
          title: "Contract setup needed",
          body: (error as Error).message,
          command: SETUP_HELP_COMMAND,
        });
      } else {
        const message = error instanceof Error ? error.message : String(error);
        setInitError({ title: "Initialize failed", body: message });
      }
      setInitializing(false);
      return;
    }

    setInitializing(false);
  };

  const activity = escrows.slice(0, 5).map((e) => ({
    text: `Escrow initialized. ${e.amount.toFixed(2)} XLM locked. ${e.title}.`,
    done: e.status === "Released",
    active: e.status === "Pending",
    tx_hash: e.tx_hash,
  }));

  if (!wallet) {
    return <HeroLanding onConnect={onConnect} />;
  }

  return (
    <div className="fade-in">
      <div className="mb-1.5 text-xs uppercase tracking-widest text-[var(--muted2)]">
        Overview
      </div>
      <div className="mb-6 font-display text-2xl font-bold tracking-tight">
        Welcome back
      </div>

      {initError && (
        <SetupHelpCard
          title={initError.title}
          body={initError.body}
          command={initError.command}
          onDismiss={() => setInitError(null)}
        />
      )}

      {initSuccessHash && (
        <div
          className="glass p-4 mb-6 animate-fade-in"
          style={{ borderColor: "var(--accent-border)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                className="text-xs uppercase tracking-widest mb-1"
                style={{ color: "var(--accent)" }}
              >
                ✓ Contract initialized
              </div>
              <a
                href={TX_EXPLORER_URL(initSuccessHash)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--accent)] hover:underline"
              >
                TX: {initSuccessHash.slice(0, 10)}…{initSuccessHash.slice(-6)} ↗
              </a>
            </div>
            <button
              onClick={() => setInitSuccessHash(null)}
              className="text-[var(--muted)] bg-transparent border-0"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
            className="glass col-span-2 p-4 text-left disabled:opacity-60"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-sm font-bold uppercase tracking-wider mb-1">
                  {initializing ? "Initializing…" : "Initialize Contract"}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  One-time setup to enable XLM transfers. Needs the SAC ID in
                  your .env first.
                </div>
              </div>
              <div
                className="font-display text-xl font-bold"
                style={{ color: "var(--accent)" }}
              >
                ⚡
              </div>
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

function HeroLanding({ onConnect }: { onConnect?: () => void }) {
  return (
    <div className="fade-in min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-start justify-center px-6 md:px-12 lg:px-20 py-16 md:py-24 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 -z-10 opacity-30 animate-pulse"
          style={{
            background: "radial-gradient(circle at 20% 50%, var(--accent-dim), transparent 50%)",
            animation: "pulse 4s ease-in-out infinite"
          }} />

        <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest animate-fade-in"
          style={{ background: "var(--accent)", color: "#0a0a0a" }}>
          ⚡ Secure Payments on Stellar
        </div>

        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-6 max-w-4xl animate-fade-in">
          The Era of
          <br />
          <span className="gradient-text">Trustless</span>
          <br />
          Freelance.
        </h1>

        <p className="text-lg md:text-xl text-[var(--muted)] max-w-2xl mb-12 leading-relaxed animate-fade-in">
          Eliminate payment disputes with AI-generated milestones and automated on-chain settlements. Every deliverable is verified, every payment is guaranteed.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 animate-fade-in">
          <button
            onClick={onConnect}
            className="px-8 py-4 rounded-xl font-display text-sm font-bold uppercase tracking-wider cursor-pointer transition-all hover:scale-105 active:scale-95"
            style={{
              background: "var(--accent)",
              color: "#0a0a0a",
              boxShadow: "0 8px 32px rgba(200, 241, 53, 0.25)",
              border: "none",
            }}
          >
            Connect Wallet ↗
          </button>
          {CONTRACT_ID && (
            <a
              href={EXPLORER_URL(CONTRACT_ID)}
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 rounded-xl glass font-display text-sm font-bold uppercase tracking-wider no-underline transition-all hover:scale-105"
            >
              View Live Contract ↗
            </a>
          )}
        </div>

        {/* Hero Card with Escrow Details */}
        <div className="glass p-8 md:p-12 rounded-2xl w-full max-w-md mb-0 animate-fade-in"
          style={{ borderColor: "var(--accent-border)", animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="font-display text-sm font-bold uppercase tracking-wider">
              Smart Escrow #492
            </div>
            <div className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded"
              style={{ background: "var(--accent)", color: "#0a0a0a" }}>
              ACTIVE
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 hover:bg-[var(--surface2)] p-2 rounded transition-colors">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                ✓
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider mb-1">Milestone 1: Wireframes</div>
                <div className="text-xs text-[var(--muted)]">Verified by OpenAI</div>
              </div>
              <div className="text-xs font-bold ml-auto flex-shrink-0">250 XLM</div>
            </div>
            <div className="flex items-start gap-3 hover:bg-[var(--surface2)] p-2 rounded transition-colors">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs border flex-shrink-0"
                style={{ borderColor: "var(--accent-border)", color: "var(--accent)" }}>
                ⊙
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider mb-1">Milestone 2: Beta API</div>
                <div className="text-xs text-[var(--muted)]">Awaiting Submission</div>
              </div>
              <div className="text-xs font-bold ml-auto flex-shrink-0">500 XLM</div>
            </div>
            <div className="flex items-start gap-3 hover:bg-[var(--surface2)] p-2 rounded transition-colors opacity-60">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs border flex-shrink-0"
                style={{ borderColor: "var(--border)", color: "var(--muted2)" }}>
                ○
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider mb-1">Milestone 3: Deployment</div>
                <div className="text-xs text-[var(--muted)]">Not started</div>
              </div>
              <div className="text-xs font-bold ml-auto flex-shrink-0">250 XLM</div>
            </div>
          </div>

          <div className="border-t mt-6 pt-6" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-[var(--muted)] uppercase tracking-wider">Total in Escrow</div>
              <div className="font-display text-2xl font-bold">1,000.00</div>
            </div>
            <button 
              onClick={onConnect}
              className="w-full px-4 py-2 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
              style={{ background: "var(--accent)", color: "#0a0a0a", border: "none", cursor: "pointer" }}>
              Get Started ↗
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-20 px-6 md:px-12 lg:px-20 scroll-reveal" style={{ background: "var(--surface2)" }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4 text-center">
            Why Taskspay
          </h2>
          <p className="text-center text-[var(--muted)] mb-16 max-w-2xl mx-auto">
            The industry's first trustless escrow. No disputes. No delays. Pure certainty.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-8 rounded-2xl transition-all hover:scale-105 hover:border-[var(--accent-border)]" style={{ borderColor: "var(--border)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-6 text-2xl"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                🤖
              </div>
              <h3 className="font-display text-lg font-bold mb-3">AI-Powered Milestones</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Describe your project. Our AI instantly breaks it into fair, achievable milestones with built-in verification criteria.
              </p>
            </div>

            <div className="glass p-8 rounded-2xl transition-all hover:scale-105 hover:border-[var(--accent-border)]" style={{ borderColor: "var(--border)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-6 text-2xl"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                🔐
              </div>
              <h3 className="font-display text-lg font-bold mb-3">On-Chain Settlement</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                XLM locked on Stellar. Zero trust required. Payments execute automatically when milestones are verified.
              </p>
            </div>

            <div className="glass p-8 rounded-2xl transition-all hover:scale-105 hover:border-[var(--accent-border)]" style={{ borderColor: "var(--border)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-6 text-2xl"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                ⚡
              </div>
              <h3 className="font-display text-lg font-bold mb-3">Instant & Cheap</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                3-5 second finality. Under $0.01 per transaction. Keep 100% of your earnings—no platform cuts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 md:px-12 lg:px-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-8"
            style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
            Ready to Build
          </div>
          <h2 className="font-display text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Ready to Build with<br />
            <span className="gradient-text">Absolute Certainty?</span>
          </h2>
          <p className="text-lg text-[var(--muted)] mb-12 max-w-2xl mx-auto leading-relaxed">
            Join thousands of architects and freelancers who have secured over $50M in contracts using our trustless Stellar escrow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div
              className="px-10 py-5 rounded-xl font-display text-sm font-bold uppercase tracking-wider cursor-pointer transition-all hover:scale-105"
              style={{
                background: "var(--accent)",
                color: "#0a0a0a",
                boxShadow: "0 8px 32px rgba(200, 241, 53, 0.25)",
              }}
            >
              Create Your First Escrow
            </div>
            <a
              href="mailto:support@taskspay.com?subject=Talk%20to%20a%20Specialist&body=Hi%2C%20I%27d%20like%20to%20learn%20more%20about%20Taskspay."
              className="px-10 py-5 rounded-xl glass font-display text-sm font-bold uppercase tracking-wider no-underline transition-all hover:scale-105"
            >
              Talk to a Specialist
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[var(--muted2)] font-mono">
            {CONTRACT_ID && `Contract: ${CONTRACT_ID.slice(0, 8)}...${CONTRACT_ID.slice(-8)}`}
          </div>
          <div className="flex items-center gap-6">
            {CONTRACT_ID && (
              <a
                href={EXPLORER_URL(CONTRACT_ID)}
                target="_blank"
                rel="noreferrer"
                className="text-xs uppercase tracking-wider text-[var(--muted)] hover:text-[var(--accent)] no-underline transition-colors"
              >
                Explorer ↗
              </a>
            )}
            <a
              href="https://github.com/JohnCarl-30/Taskspay"
              target="_blank"
              rel="noreferrer"
              className="text-xs uppercase tracking-wider text-[var(--muted)] hover:text-[var(--accent)] no-underline transition-colors"
            >
              GitHub ↗
            </a>
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noreferrer"
              className="text-xs uppercase tracking-wider text-[var(--muted)] hover:text-[var(--accent)] no-underline transition-colors"
            >
              Stellar ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface SetupHelpCardProps {
  title: string;
  body: string;
  command?: string;
  onDismiss: () => void;
}

function SetupHelpCard({ title, body, command, onDismiss }: SetupHelpCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — ignore
    }
  };

  return (
    <div
      className="glass p-5 mb-6 animate-fade-in"
      style={{
        borderColor: "var(--pending-border)",
        background: "var(--pending-dim)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="font-display text-sm font-bold uppercase tracking-wider"
          style={{ color: "var(--pending)" }}
        >
          ⚠ {title}
        </div>
        <button
          onClick={onDismiss}
          className="text-[var(--muted)] bg-transparent border-0 text-xs"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <pre className="text-xs whitespace-pre-wrap text-[var(--text)] leading-relaxed mb-3 font-mono">
        {body}
      </pre>
      {command && (
        <div className="flex items-center gap-2">
          <code
            className="flex-1 px-3 py-2 rounded font-mono text-xs"
            style={{
              background: "var(--surface2)",
              border: "0.5px solid var(--border2)",
            }}
          >
            {command}
          </code>
          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded font-display text-xs font-bold uppercase tracking-wider"
            style={{
              background: "var(--accent)",
              color: "#0a0a0a",
              border: 0,
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      )}
      <a
        href="https://github.com/your-repo/taskspay/blob/main/XLM_TOKEN_SETUP.md"
        target="_blank"
        rel="noreferrer"
        className="inline-block mt-3 text-xs text-[var(--accent)] hover:underline"
      >
        Full setup guide →
      </a>
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
  if (accent) {
    return (
      <div
        className="p-4 rounded-[14px]"
        style={{
          background:
            "linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)",
          boxShadow: "var(--glow)",
          transition: "transform 0.2s ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.transform = "translateY(-2px)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      >
        <div
          className="text-xs uppercase tracking-widest mb-2"
          style={{ color: "rgba(0,0,0,0.55)" }}
        >
          {label}
        </div>
        <div
          className="font-display text-[26px] font-bold tracking-tight leading-none"
          style={{ color: "#0a0a0a" }}
        >
          {value}
        </div>
        <div className="text-xs mt-1" style={{ color: "rgba(0,0,0,0.5)" }}>
          {sub}
        </div>
      </div>
    );
  }
  return (
    <div className="glass p-4">
      <div className="text-xs uppercase tracking-widest mb-2 text-[var(--muted)]">
        {label}
      </div>
      <div className="font-display text-[26px] font-bold tracking-tight leading-none">
        {value}
      </div>
      <div className="text-xs mt-1 text-[var(--muted)]">{sub}</div>
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
    <button
      onClick={onClick}
      className="glass p-4 text-left flex items-center justify-between"
    >
      <div>
        <div className="font-display text-xs font-bold uppercase tracking-wider">
          {title}
        </div>
        <div className="text-xs text-[var(--muted)] mt-1">{desc}</div>
      </div>
      <div
        className="font-display text-xl font-bold"
        style={{ color: highlight ? "var(--accent)" : "var(--muted)" }}
      >
        {icon}
      </div>
    </button>
  );
}

interface SectionHeaderProps {
  title: string;
  onViewAll?: () => void;
  style?: React.CSSProperties;
}

function SectionHeader({ title, onViewAll, style }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3" style={style}>
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
    <div className="py-6 text-center text-xs text-[var(--muted)]">{label}</div>
  );
}
