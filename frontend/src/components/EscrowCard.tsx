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
}

interface EscrowCardProps {
  escrow: Escrow;
  onClick?: () => void;
}

export default function EscrowCard({ escrow, onClick }: EscrowCardProps) {
  return (
    <div
      onClick={onClick}
      className="p-4 mb-2 rounded-lg border transition-all duration-150 flex items-center justify-between animate-fade-in"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div className="flex flex-col gap-1">
        <StatusBadge status={escrow.status} />
        <div className="font-display text-sm font-bold mt-1">
          {escrow.title}
        </div>
        <div className="text-xs text-[var(--muted)]">{escrow.address}</div>
      </div>

      <div className="text-right">
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
    </div>
  );
}