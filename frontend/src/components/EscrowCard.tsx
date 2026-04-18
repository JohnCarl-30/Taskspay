import StatusBadge from "./StatusBadge";

interface Escrow {
  id: string;
  title: string;
  address: string;
  amount: number;
  status: "Pending" | "Released" | "Refunded";
  milestone: number;
  totalMilestones: number;
  tx_hash: string | null;
  hasPendingReview?: boolean;
}

interface EscrowCardProps {
  escrow: Escrow;
  onClick?: () => void;
}

const accentFor = (status: Escrow["status"]): string => {
  if (status === "Released") return "var(--accent)";
  if (status === "Refunded") return "var(--danger)";
  return "var(--pending)";
};

export default function EscrowCard({ escrow, onClick }: EscrowCardProps) {
  const progress =
    escrow.totalMilestones === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            ((escrow.status === "Released"
              ? escrow.totalMilestones
              : escrow.milestone - 1) /
              escrow.totalMilestones) *
              100
          )
        );

  const shortAddress =
    escrow.address.length > 14
      ? `${escrow.address.slice(0, 6)}…${escrow.address.slice(-6)}`
      : escrow.address;

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="glass w-full p-4 mb-3 text-left relative overflow-hidden animate-fade-in disabled:cursor-default"
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: accentFor(escrow.status) }}
      />

      <div className="flex items-center justify-between gap-4 pl-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={escrow.status} />
            {escrow.hasPendingReview && (
              <span
                className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded font-medium"
                style={{
                  color: "var(--pending)",
                  background: "var(--pending-dim)",
                  border: "0.5px solid var(--pending-border)",
                }}
              >
                Review Pending
              </span>
            )}
          </div>
          <div className="font-display text-sm font-bold truncate">
            {escrow.title}
          </div>
          <div className="text-[11px] font-mono text-[var(--muted)] mt-0.5 truncate">
            {shortAddress}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div
              className="flex-1 h-1 rounded-full overflow-hidden"
              style={{ background: "var(--surface2)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: accentFor(escrow.status),
                }}
              />
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] whitespace-nowrap">
              {escrow.status === "Released"
                ? "Completed"
                : `${escrow.milestone - 1}/${escrow.totalMilestones}`}
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-0.5">
            Amount
          </div>
          <div className="font-display text-lg font-bold leading-none">
            {escrow.amount}
          </div>
          <div className="text-[10px] text-[var(--muted)] mt-1">XLM</div>
        </div>

        {onClick && (
          <div
            className="ml-1 flex-shrink-0 font-display text-lg"
            style={{ color: "var(--accent)" }}
          >
            →
          </div>
        )}
      </div>
    </button>
  );
}
