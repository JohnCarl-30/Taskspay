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
    return <HeroLanding />;
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

function HeroLanding() {
  return (
    <div className="fade-in">
      <section className="py-14 md:py-20">
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full glass text-[10px] uppercase tracking-widest">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--accent)" }}
          />
          Live on Stellar Testnet
        </div>

        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-5">
          Trustless freelance escrow,
          <br />
          <span className="gradient-text">settled on Stellar.</span>
        </h1>

        <p className="text-sm md:text-base text-[var(--muted)] max-w-xl mb-8 leading-relaxed">
          AI-generated milestones. On-chain settlement in ~5 seconds. Sub-cent
          fees. Clients lock XLM in a Soroban smart contract and release per
          milestone — no intermediaries, no chargebacks.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-10">
          <div
            className="px-5 py-3 rounded-lg font-display text-xs font-bold uppercase tracking-wider"
            style={{
              background: "var(--accent)",
              color: "#0a0a0a",
            }}
          >
            Connect Freighter · top right ↗
          </div>
          {CONTRACT_ID && (
            <a
              href={EXPLORER_URL(CONTRACT_ID)}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-lg glass font-display text-xs font-bold uppercase tracking-wider no-underline"
            >
              View Live Contract ↗
            </a>
          )}
        </div>

        {CONTRACT_ID && (
          <div className="text-[10px] text-[var(--muted2)] font-mono break-all">
            Contract: {CONTRACT_ID}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
        <FeatureCard
          icon="✦"
          title="AI Milestones"
          desc="GPT-4o-mini splits any project description into 3–5 milestones with clear deliverables and fair payment splits."
        />
        <FeatureCard
          icon="⟐"
          title="Trustless Release"
          desc="XLM sits in a Soroban contract. Funds move to the freelancer automatically when the client releases a milestone."
        />
        <FeatureCard
          icon="⚡"
          title="Fast & Cheap"
          desc="Stellar fees under $0.01 per transaction. Finality in 3–5 seconds. No chargebacks, ever."
        />
      </div>

      <div className="glass p-6 md:p-8">
        <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-3">
          How it works
        </div>
        <ol className="space-y-3 text-sm">
          {[
            "Client connects Freighter and describes the project.",
            "AI proposes milestones with percentage splits; client adjusts.",
            "Client creates the escrow — XLM is locked in the smart contract.",
            "Freelancer submits work; AI flags gaps before the client reviews.",
            "Client approves → contract pays the freelancer automatically, per milestone.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="font-display text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent-border)",
                }}
              >
                {i + 1}
              </span>
              <span className="text-[var(--text)]">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: string;
  title: string;
  desc: string;
}

function FeatureCard({ icon, title, desc }: FeatureCardProps) {
  return (
    <div className="glass p-5">
      <div
        className="font-display text-2xl mb-3"
        style={{ color: "var(--accent)" }}
      >
        {icon}
      </div>
      <div className="font-display text-sm font-bold uppercase tracking-wider mb-2">
        {title}
      </div>
      <div className="text-xs text-[var(--muted)] leading-relaxed">{desc}</div>
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
