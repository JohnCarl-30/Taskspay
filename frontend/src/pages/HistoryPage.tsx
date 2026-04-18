import EscrowCard from "../components/EscrowCard";

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

interface HistoryPageProps {
  escrows: Escrow[];
}

export default function HistoryPage({ escrows }: HistoryPageProps) {
  const released = escrows.filter((e) => e.status === "Released");
  const pending = escrows.filter((e) => e.status === "Pending");

  return (
    <div className="fade-in">
      <div className="mb-1.5 text-xs uppercase tracking-widest text-[var(--muted2)]">
        Ledger
      </div>
      <div className="mb-6 font-display text-2xl font-bold tracking-tight">
        History
      </div>

      <div className="grid grid-cols-3 gap-3 mb-7">
        <MiniStat label="Total Escrows" value={escrows.length} />
        <MiniStat
          label="Released"
          value={released.length}
          color="var(--accent)"
        />
        <MiniStat
          label="Pending"
          value={pending.length}
          color="var(--pending)"
        />
      </div>

      {pending.length > 0 && (
        <>
          <SectionTitle>Active</SectionTitle>
          {pending.map((e) => (
            <EscrowCard key={e.id} escrow={e} />
          ))}
        </>
      )}

      {released.length > 0 && (
        <>
          <SectionTitle style={{ marginTop: 20 }}>Released</SectionTitle>
          {released.map((e) => (
            <EscrowCard key={e.id} escrow={e} />
          ))}
        </>
      )}

      {escrows.length === 0 && (
        <div className="py-10 text-center text-xs text-[var(--muted)]">
          No escrow history yet.
        </div>
      )}
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: number;
  color?: string;
}

function MiniStat({ label, value, color }: MiniStatProps) {
  return (
    <div
      className="p-3.5 rounded-lg border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1.5">
        {label}
      </div>
      <div
        className="font-display text-2xl font-bold"
        style={{
          color: color || "var(--text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

interface SectionTitleProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

function SectionTitle({ children, style }: SectionTitleProps) {
  return (
    <div
      className="font-display text-sm font-bold uppercase tracking-wider mb-3"
      style={style}
    >
      {children}
    </div>
  );
}