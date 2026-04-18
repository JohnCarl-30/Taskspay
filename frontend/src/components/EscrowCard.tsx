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

export default function EscrowCard({ escrow, onClick }: EscrowCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full p-4 mb-2 rounded-lg border transition-all duration-150 flex items-center justify-between animate-fade-in hover:shadow-md disabled:hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-0"
      style={{
        background: "var(--surface)",
        borderColor: onClick ? "var(--border)" : "var(--border)",
        cursor: onClick ? "pointer" : "default",
        ...(onClick && {
          '--hover-border': 'var(--accent)',
          '--hover-bg': 'var(--accent-dim)',
        } as React.CSSProperties),
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          const el = e.currentTarget;
          el.style.borderColor = 'var(--accent)';
          el.style.backgroundColor = 'var(--accent-dim)';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'var(--border)';
        el.style.backgroundColor = 'var(--surface)';
      }}
    >
      <div className="flex flex-col gap-1 text-left flex-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={escrow.status} />
          {escrow.hasPendingReview && (
            <span
              className="text-xs uppercase tracking-widest px-2 py-0.5 rounded font-medium"
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
        <div className="font-display text-sm font-bold mt-1">
          {escrow.title}
        </div>
        <div className="text-xs text-[var(--muted)]">{escrow.address}</div>
      </div>

      <div className="text-right flex items-center gap-3">
        <div>
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-0.5">
            Amount
          </div>
          <div className="font-display text-base font-bold">
            {escrow.amount} XLM
          </div>
          <div className="text-xs text-[var(--muted)] mt-0.5">
            {escrow.status === "Released"
              ? "Completed"
              : `Milestone ${escrow.milestone}/${escrow.totalMilestones}`}
          </div>
        </div>
        {onClick && (
          <div className="text-[var(--accent)] ml-2 flex-shrink-0">
            →
          </div>
        )}
      </div>
    </button>
  );
}