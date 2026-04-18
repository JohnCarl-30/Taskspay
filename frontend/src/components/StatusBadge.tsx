interface StatusConfig {
  color: string;
  bg: string;
  border: string;
}

type EscrowStatus = "Pending" | "Released" | "Refunded" | "Disputed";

const configs: Record<EscrowStatus, StatusConfig> = {
  Pending: {
    color: "var(--pending)",
    bg: "var(--pending-dim)",
    border: "var(--pending-border)",
  },
  Released: {
    color: "var(--accent)",
    bg: "var(--accent-dim)",
    border: "var(--accent-border)",
  },
  Refunded: {
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.1)",
    border: "rgba(96,165,250,0.2)",
  },
  Disputed: {
    color: "var(--danger)",
    bg: "var(--danger-dim)",
    border: "var(--danger-border)",
  },
};

interface StatusBadgeProps {
  status: EscrowStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const c = configs[status] || configs.Pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest px-2 py-1 rounded font-medium"
      style={{
        color: c.color,
        background: c.bg,
        border: `0.5px solid ${c.border}`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: c.color }} />
      {status}
    </span>
  );
}