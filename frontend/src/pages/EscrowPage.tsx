import { useState } from "react";
import { generateMilestones } from "../openai";
import type { Milestone } from "../openai";
import { createEscrow, EXPLORER_URL } from "../stellar";
import { signTransaction } from "../freighter";
import { insertEscrow, updateEscrow, authenticateWithWallet, type EscrowRecord } from "../supabase";

const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || "YOUR_CONTRACT_ID";

interface WalletState {
  publicKey: string;
  network: string;
}

interface EscrowPageProps {
  wallet: WalletState | null;
  userId: string | null;
  onAddEscrow: (escrow: EscrowRecord) => void;
  setPage: (page: string) => void;
}

export default function EscrowPage({
  wallet,
  userId,
  onAddEscrow,
}: EscrowPageProps) {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [aiStatus, setAiStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [txStatus, setTxStatus] = useState<
    "idle" | "signing" | "submitted" | "error"
  >("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  const isReady =
    address.trim() &&
    parseFloat(amount) > 0 &&
    description.trim() &&
    milestones.length > 0;

  const handleGenerateMilestones = async () => {
    if (!description.trim() || !amount) return;
    setAiStatus("loading");
    setMilestones([]);
    try {
      const result = await generateMilestones(
        description,
        parseFloat(amount)
      );
      setMilestones(result);
      setAiStatus("done");
    } catch (e) {
      console.error(e);
      setAiStatus("error");
    }
  };

  const handleInitEscrow = async () => {
    if (!isReady) return;
    if (!wallet) {
      alert("Connect your Freighter wallet first.");
      return;
    }

    setTxStatus("signing");
    let txHash: string | null = null;
    try {
      const result = await createEscrow(
        wallet.publicKey,
        address.trim(),
        amount,
        milestones.length,
        signTransaction
      );
      txHash = result.hash;
      setTxHash(result.hash);
      setTxStatus("submitted");
    } catch (e) {
      console.error("Blockchain error:", e);
      setTxStatus("error");
      return;
    }

    // Resolve userId — authenticate now if the session hasn't come through yet
    let resolvedUserId = userId;
    if (!resolvedUserId && wallet) {
      try {
        const auth = await authenticateWithWallet(wallet.publicKey);
        resolvedUserId = auth.user?.id ?? null;
      } catch (e) {
        console.error("Auth error:", e);
      }
    }

    // Save to Supabase (separate from blockchain — don't override tx success)
    if (resolvedUserId) {
      try {
        const record = await insertEscrow({
          user_id: resolvedUserId,
          wallet_address: wallet.publicKey,
          freelancer_address: address.trim(),
          amount: parseFloat(amount),
          description: description,
          milestone_count: milestones.length,
          milestones: milestones,
        });
        await updateEscrow(record.id, { tx_hash: txHash, status: "active" });
        onAddEscrow({ ...record, tx_hash: txHash, status: "active" });
      } catch (e) {
        console.error("Database save error:", e);
        // Show inline warning without hiding blockchain success
        alert("Escrow created on-chain but failed to save to database. Check if Supabase migrations are applied.");
      }
    } else {
      alert("Escrow created on-chain but wallet is not authenticated with the database. Reconnect your wallet.");
    }
  };

  return (
    <div className="fade-in">
      <div className="mb-1.5 text-xs uppercase tracking-widest text-[var(--muted2)]">
        Dashboard
      </div>
      <div className="mb-6 font-display text-2xl font-bold tracking-tight">
        New Escrow
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormCard title="Transaction Entry">
            <Field label="Freelancer Stellar Address">
              <input
                type="text"
                placeholder="G...ABCD"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="Total Amount (XLM)">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="Project Description">
              <textarea
                placeholder="e.g. Build a landing page for my e-commerce store with 3 sections and mobile responsiveness..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field resize-none h-20"
              />
            </Field>

            <button
              onClick={handleGenerateMilestones}
              disabled={aiStatus === "loading"}
              className="w-full py-2.5 text-xs font-display font-bold uppercase tracking-wider border-0 rounded cursor-pointer transition-colors bg-[var(--accent)] text-[#0a0a0a] mb-2.5"
              style={{ opacity: aiStatus === "loading" ? 0.7 : 1 }}
            >
              {aiStatus === "loading"
                ? "✦ Generating..."
                : "✦ Generate AI Milestone Breakdown"}
            </button>

            <button
              onClick={handleInitEscrow}
              disabled={!isReady || txStatus === "signing"}
              className="w-full py-2.5 text-xs font-display font-bold uppercase tracking-wider rounded cursor-pointer transition-all border"
              style={{
                background: "transparent",
                color: isReady ? "var(--text)" : "var(--muted)",
                borderColor: isReady ? "var(--border2)" : "var(--border)",
                opacity: isReady ? 1 : 0.5,
              }}
            >
              {txStatus === "signing"
                ? "Waiting for Freighter..."
                : txStatus === "submitted"
                  ? "✓ Escrow Initialized!"
                  : "Initialize Escrow →"}
            </button>

            {txStatus === "submitted" && txHash && (
              <div className="mt-2.5 text-xs text-[var(--accent)] text-center">
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent)] no-underline"
                >
                  ↗ View on Stellar Explorer
                </a>
              </div>
            )}

            {txStatus === "error" && (
              <div className="mt-2.5 text-xs text-[var(--danger)] text-center">
                Transaction failed. Check console for details.
              </div>
            )}
          </FormCard>
        </div>

        <div>
          <FormCard title="Transaction Summary" className="mb-3">
            <SummaryRow
              label="Payment amount"
              value={
                amount
                  ? `${parseFloat(amount).toFixed(2)} XLM`
                  : "0.00 XLM"
              }
            />
            <SummaryRow label="Network fee" value="<0.01 XLM" />
            <SummaryRow
              label="Milestones"
              value={
                milestones.length > 0
                  ? `${milestones.length} milestones`
                  : "—"
              }
            />
            <SummaryRow
              label="AI Status"
              value={
                aiStatus === "idle"
                  ? "Not generated"
                  : aiStatus === "loading"
                    ? "Generating..."
                    : aiStatus === "done"
                      ? "✓ Generated"
                      : "Error"
              }
              valueColor={
                aiStatus === "done"
                  ? "var(--accent)"
                  : aiStatus === "loading"
                    ? "var(--pending)"
                    : aiStatus === "error"
                      ? "var(--danger)"
                      : "var(--muted)"
              }
            />
            <div className="flex items-center justify-between pt-3.5 mt-1">
              <span className="font-display text-sm font-bold uppercase tracking-wider">
                Total to Lock
              </span>
              <span className="font-display text-xl font-bold text-[var(--accent)] tracking-tight">
                {amount
                  ? `${parseFloat(amount).toFixed(2)} XLM`
                  : "0.00 XLM"}
              </span>
            </div>
          </FormCard>

          <div
            className="p-3 rounded-lg border mb-3 text-xs text-[var(--muted)]"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="text-xs uppercase tracking-widest mb-1">
              Contract ID
            </div>
            <div className="text-[var(--accent)] break-all">
              {CONTRACT_ID}
            </div>
            <a
              href={EXPLORER_URL(CONTRACT_ID)}
              target="_blank"
              rel="noreferrer"
              className="text-xs no-underline uppercase tracking-wider text-[var(--muted)] mt-1.5 inline-block"
            >
              ↗ View on Explorer
            </a>
          </div>

          {aiStatus === "loading" && (
            <div
              className="p-3 rounded-lg mb-3"
              style={{
                background: "rgba(200,241,53,0.04)",
                border: "0.5px solid rgba(200,241,53,0.15)",
              }}
            >
              <div
                className="text-xs uppercase tracking-widest text-[var(--accent)] mb-1"
                style={{ animation: "pulse 1.2s ease-in-out infinite" }}
              >
                ✦ OpenAI is analyzing your project...
              </div>
              <div className="text-xs text-[var(--muted)] leading-relaxed">
                Breaking down your project into fair, structured
                milestones with suggested payment splits.
              </div>
            </div>
          )}

          {milestones.map((m, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border mb-2 flex items-center gap-3 animate-slide-in"
              style={{
                background: "var(--surface2)",
                borderColor: "var(--border)",
                animationDelay: `${i * 0.08}s`,
                opacity: 0,
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                style={{
                  background: "var(--accent-dim)",
                  border: "0.5px solid var(--accent-border)",
                  color: "var(--accent)",
                }}
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium mb-0.5">
                  {m.name}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {m.description}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-sm font-bold text-[var(--accent)]">
                  {m.percentage}%
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  {m.xlm.toFixed(2)} XLM
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface FormCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function FormCard({ title, children, className }: FormCardProps) {
  return (
    <div
      className={`p-5 rounded-lg border ${className || ""}`}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)]">
        {title}
      </div>
      {children}
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div className="mb-3.5">
      <label className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

function SummaryRow({ label, value, valueColor }: SummaryRowProps) {
  return (
    <div
      className="flex items-center justify-between py-2.5 border-b text-xs"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium" style={{ color: valueColor || "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}