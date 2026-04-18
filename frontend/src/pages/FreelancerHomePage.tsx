import EscrowCard from "../components/EscrowCard";
import { TX_EXPLORER_URL } from "../stellar";
import type { Escrow } from "../App";

interface WalletState {
  publicKey: string;
  network: string;
}

interface FreelancerHomePageProps {
  wallet: WalletState | null;
  balance: string;
  escrows: Escrow[];
  setPage: (page: string) => void;
  onViewEscrow: (escrowId: string) => void;
}

function computeEarnings(escrow: Escrow): number {
  // Per-milestone payout = amount / totalMilestones (matches the contract's
  // integer-division pattern; good enough for a display estimate)
  const perMilestone = escrow.amount / escrow.totalMilestones;
  return perMilestone * escrow.paymentReleases.length;
}

export default function FreelancerHomePage({
  wallet,
  balance,
  escrows,
  setPage,
  onViewEscrow,
}: FreelancerHomePageProps) {
  const activeEscrows = escrows.filter((e) => e.status === "Pending");
  const pendingReviews = escrows.filter((e) => e.hasPendingReview);
  const totalEarned = escrows.reduce(
    (sum, e) => sum + computeEarnings(e),
    0
  );

  const paidMilestones = escrows
    .flatMap((e) =>
      e.paymentReleases.map((r) => ({
        escrowId: e.id,
        title: e.title,
        milestoneIndex: r.milestone_index,
        totalMilestones: e.totalMilestones,
        xlm: e.amount / e.totalMilestones,
        releasedAt: r.released_at,
        txHash: r.tx_hash ?? null,
      }))
    )
    .sort(
      (a, b) =>
        new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime()
    )
    .slice(0, 6);

  return (
    <div className="fade-in">
      <div className="mb-1.5 text-xs uppercase tracking-widest text-[var(--muted2)]">
        Freelancer Dashboard
      </div>
      <div className="mb-6 font-display text-2xl font-bold tracking-tight">
        Welcome back{wallet ? "" : ", Connect Wallet"}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          accent
          label="Wallet Balance"
          value={balance}
          sub="XLM · Testnet"
        />
        <StatCard
          label="Active Assignments"
          value={activeEscrows.length}
          sub={
            pendingReviews.length > 0
              ? `${pendingReviews.length} awaiting review`
              : "In progress"
          }
        />
        <StatCard
          label="Total Earned"
          value={totalEarned.toFixed(2)}
          sub="XLM released to you"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 mb-6">
        <QuickCard
          title="Transaction History"
          desc="Full ledger of your assignments and releases."
          icon="→"
          onClick={() => setPage("history")}
        />
      </div>

      <SectionHeader
        title="Active Assignments"
        onViewAll={() => setPage("history")}
      />
      {activeEscrows.length === 0 ? (
        <EmptyState label="No active assignments yet. Ask a client to fund an escrow with your wallet address." />
      ) : (
        activeEscrows.map((e) => (
          <EscrowCard key={e.id} escrow={e} onClick={() => onViewEscrow(e.id)} />
        ))
      )}

      <SectionHeader title="Recent Earnings" style={{ marginTop: 24 }} />
      {paidMilestones.length === 0 ? (
        <EmptyState label="No milestone payments yet." />
      ) : (
        <div>
          {paidMilestones.map((p, i) => (
            <div
              key={`${p.escrowId}-${p.milestoneIndex}`}
              className="flex items-start justify-between gap-3 py-3"
              style={{
                borderBottom:
                  i < paidMilestones.length - 1
                    ? "0.5px solid var(--border)"
                    : "none",
              }}
            >
              <div className="flex gap-2.5 flex-1">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                  style={{ background: "var(--accent)" }}
                />
                <div className="text-xs text-[var(--muted)] leading-relaxed">
                  <strong className="text-[var(--text)] font-medium">
                    +{p.xlm.toFixed(2)} XLM
                  </strong>{" "}
                  — milestone {p.milestoneIndex + 1}/{p.totalMilestones} of{" "}
                  <span className="text-[var(--text)]">{p.title}</span>
                </div>
              </div>
              {p.txHash ? (
                <a
                  href={TX_EXPLORER_URL(p.txHash)}
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
      )}
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
        style={{ color: accent ? "rgba(0,0,0,0.5)" : "var(--muted)" }}
      >
        {label}
      </div>
      <div
        className="font-display text-[26px] font-bold tracking-tight leading-none"
        style={{ color: accent ? "#0a0a0a" : "var(--text)" }}
      >
        {value}
      </div>
      <div
        className="text-xs mt-1"
        style={{ color: accent ? "rgba(0,0,0,0.4)" : "var(--muted)" }}
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
}

function QuickCard({ title, desc, icon, onClick }: QuickCardProps) {
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-lg border cursor-pointer transition-all duration-150 flex items-center justify-between"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div>
        <div className="font-display text-xs font-bold uppercase tracking-wider">
          {title}
        </div>
        <div className="text-xs text-[var(--muted)] mt-1">{desc}</div>
      </div>
      <div className="font-display text-xl font-bold text-[var(--muted)]">
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
