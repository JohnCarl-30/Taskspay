import { useState } from "react";
import { upsertUserProfile } from "../supabase";

interface RoleSelectionPageProps {
  walletAddress: string;
  onRoleSelected: (role: "client" | "freelancer") => void;
}

export default function RoleSelectionPage({
  walletAddress,
  onRoleSelected,
}: RoleSelectionPageProps) {
  const [isLoading, setIsLoading] = useState<"client" | "freelancer" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (role: "client" | "freelancer") => {
    setIsLoading(role);
    setError(null);
    try {
      await upsertUserProfile(walletAddress, role);
      onRoleSelected(role);
    } catch (e) {
      setError((e as Error).message);
      setIsLoading(null);
    }
  };

  return (
    <div className="fade-in max-w-[520px] mx-auto pt-8">
      <div className="mb-1.5 text-xs uppercase tracking-widest text-[var(--muted2)]">
        Getting Started
      </div>
      <div className="mb-2 font-display text-2xl font-bold tracking-tight">
        How will you use TasksPay?
      </div>
      <div className="mb-8 text-xs text-[var(--muted)]">
        Choose your role. This is stored per wallet and loads automatically next
        time you connect.
      </div>

      <div className="grid grid-cols-1 gap-3">
        <RoleCard
          title="I'm a Client"
          desc="Post projects, lock XLM in escrow, release milestone payments as work is delivered."
          icon="◈"
          highlight
          loading={isLoading === "client"}
          disabled={isLoading !== null}
          onClick={() => handleSelect("client")}
        />
        <RoleCard
          title="I'm a Freelancer"
          desc="Accept assigned work, submit deliverables for each milestone, and receive XLM when the client approves."
          icon="◇"
          loading={isLoading === "freelancer"}
          disabled={isLoading !== null}
          onClick={() => handleSelect("freelancer")}
        />
      </div>

      {error && (
        <div
          className="mt-4 p-3 rounded-lg text-xs"
          style={{
            background: "var(--danger-dim)",
            border: "0.5px solid var(--danger)",
            color: "var(--danger)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

interface RoleCardProps {
  title: string;
  desc: string;
  icon: string;
  highlight?: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}

function RoleCard({
  title,
  desc,
  icon,
  highlight,
  loading,
  disabled,
  onClick,
}: RoleCardProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className="p-5 rounded-lg border transition-all duration-150 flex items-center justify-between"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled && !loading ? 0.5 : 1,
      }}
    >
      <div className="flex-1">
        <div className="font-display text-sm font-bold uppercase tracking-wider">
          {title}
        </div>
        <div className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
          {desc}
        </div>
      </div>
      <div
        className="font-display text-2xl font-bold ml-4"
        style={{
          color: highlight ? "var(--accent)" : "var(--muted)",
        }}
      >
        {loading ? "…" : icon}
      </div>
    </div>
  );
}
