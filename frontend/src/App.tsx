import { useState, useEffect, useCallback } from "react";
import Topbar from "./components/Topbar";
import HomePage from "./pages/HomePage";
import EscrowPage from "./pages/EscrowPage";
import EscrowDetailPage from "./pages/EscrowDetailPage";
import HistoryPage from "./pages/HistoryPage";
import RoleSelectionPage from "./pages/RoleSelectionPage";
import FreelancerHomePage from "./pages/FreelancerHomePage";
import { connectWallet, getPublicKey } from "./freighter";
import { getXLMBalance } from "./stellar";
import {
  authenticateWithWallet,
  fetchEscrowsByWallet,
  fetchFreelancerEscrows,
  getUserProfile,
  subscribeToEscrows,
  getCurrentUser,
  supabase,
  type EscrowRecord,
  type Milestone,
  type PaymentRelease,
} from "./supabase";

export type UserRole = "client" | "freelancer";

export interface Escrow {
  id: string;
  title: string;
  address: string;
  amount: number;
  status: "Pending" | "Released" | "Refunded";
  milestone: number;
  totalMilestones: number;
  tx_hash: string | null;
  on_chain_id: number | null;
  hasPendingReview: boolean;
  milestones: Milestone[];
  paymentReleases: PaymentRelease[];
}

interface WalletState {
  publicKey: string;
  network: string;
}

function mapStatus(status: EscrowRecord["status"]): Escrow["status"] {
  if (status === "completed") return "Released";
  if (status === "refunded") return "Refunded";
  return "Pending";
}

function mapEscrow(record: EscrowRecord, pendingReviewIds?: Set<string>): Escrow {
  const releases = record.payment_releases ?? [];
  const releasedIndices = new Set(releases.map((r) => r.milestone_index));
  const currentIndex = record.milestones.findIndex(
    (_, i) => !releasedIndices.has(i)
  );
  return {
    id: record.id,
    title: record.description,
    address: record.freelancer_address,
    amount: record.amount,
    status: mapStatus(record.status),
    milestone: currentIndex === -1 ? record.milestone_count : currentIndex + 1,
    totalMilestones: record.milestone_count,
    tx_hash: record.tx_hash,
    on_chain_id: record.on_chain_id,
    hasPendingReview: pendingReviewIds?.has(record.id) ?? false,
    milestones: record.milestones,
    paymentReleases: releases,
  };
}

export default function App() {
  const [page, setPage] = useState("home");
  const [selectedEscrowId, setSelectedEscrowId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [balance, setBalance] = useState("0.00");
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    getPublicKey()
      .then((pk) => {
        if (pk) setWallet({ publicKey: pk, network: "TESTNET" });
      })
      .catch(() => {});
    getCurrentUser()
      .then((user) => {
        if (user) setUserId(user.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!wallet?.publicKey) return;
    authenticateWithWallet(wallet.publicKey)
      .then((data) => {
        if (data.user) setUserId(data.user.id);
      })
      .catch(console.error);
  }, [wallet?.publicKey]);

  // Fetch role profile after wallet connects (or reset on disconnect).
  useEffect(() => {
    if (!wallet?.publicKey) {
      setRole(null);
      return;
    }
    setRoleLoading(true);
    getUserProfile(wallet.publicKey)
      .then((profile) => {
        setRole(profile?.role ?? null);
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
        setRole(null);
      })
      .finally(() => setRoleLoading(false));
  }, [wallet?.publicKey]);

  const refreshEscrows = useCallback(async () => {
    if (!wallet?.publicKey || !role) return;
    try {
      const records =
        role === "freelancer"
          ? await fetchFreelancerEscrows(wallet.publicKey)
          : await fetchEscrowsByWallet(wallet.publicKey);
      const ids = records.map((r) => r.id);
      const { data: pending } = ids.length
        ? await supabase
            .from("work_submissions")
            .select("escrow_id")
            .in("escrow_id", ids)
            .is("client_decision", null)
        : { data: [] };
      const pendingIds = new Set(
        (pending ?? []).map((s: { escrow_id: string }) => s.escrow_id)
      );
      setEscrows(records.map((r) => mapEscrow(r, pendingIds)));
    } catch (err) {
      console.error(err);
    }
  }, [wallet?.publicKey, role]);

  useEffect(() => {
    if (!wallet?.publicKey || !role) return;

    refreshEscrows();

    if (!userId) return;

    const channel = subscribeToEscrows(userId, (event, record) => {
      setEscrows((prev) => {
        if (event === "INSERT") {
          if (prev.some((e) => e.id === record.id)) return prev;
          return [mapEscrow(record), ...prev];
        }
        if (event === "UPDATE")
          return prev.map((e) => (e.id === record.id ? mapEscrow(record) : e));
        if (event === "DELETE") return prev.filter((e) => e.id !== record.id);
        return prev;
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [wallet?.publicKey, userId, role, refreshEscrows]);

  useEffect(() => {
    if (wallet?.publicKey) {
      getXLMBalance(wallet.publicKey).then(setBalance);
    }
  }, [wallet]);

  const handleConnect = async () => {
    setWalletError(null);
    try {
      const result = await connectWallet();
      setWallet(result);
    } catch (e: unknown) {
      setWalletError((e as Error).message);
    }
  };

  const handleAddEscrow = (record: EscrowRecord) => {
    setEscrows((prev) => {
      if (prev.some((e) => e.id === record.id)) return prev;
      return [mapEscrow(record), ...prev];
    });
  };

  const handleViewEscrow = (escrowId: string) => {
    setSelectedEscrowId(escrowId);
    setPage("escrow-detail");
  };

  const handleRoleSelected = (selectedRole: UserRole) => {
    setRole(selectedRole);
  };

  const handleSwitchRole = () => {
    setRole(null);
    setPage("home");
  };

  const totalLocked = escrows
    .filter((e) => e.status === "Pending")
    .reduce((sum, e) => sum + e.amount, 0);

  const needsRoleSelection = wallet && !roleLoading && role === null;
  const isReady = wallet && role !== null;
  // Freelancers cannot create escrows — redirect them home.
  const effectivePage =
    role === "freelancer" && page === "escrow" ? "home" : page;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Topbar
        page={effectivePage}
        setPage={setPage}
        wallet={wallet}
        onConnect={handleConnect}
        role={role}
        onSwitchRole={handleSwitchRole}
      />
      {walletError && (
        <div className="px-6 py-2 max-w-[960px] mx-auto">
          <div
            className="p-3 rounded-lg flex items-center justify-between text-xs"
            style={{
              background: "var(--danger-dim)",
              border: "0.5px solid var(--danger)",
            }}
          >
            <span className="text-[var(--danger)]">
              {walletError.includes("Freighter") ? (
                <>
                  Freighter wallet not found.{" "}
                  <a
                    href="https://www.freighter.app/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-[var(--danger)]"
                  >
                    Install the extension →
                  </a>
                </>
              ) : (
                walletError
              )}
            </span>
            <button
              onClick={() => setWalletError(null)}
              className="ml-4 text-[var(--danger)] bg-transparent border-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <main className="px-6 py-7 max-w-[960px] mx-auto">
        {!wallet && (
          <HomePage
            wallet={null}
            balance={balance}
            escrows={[]}
            totalLocked={0}
            setPage={setPage}
            onViewEscrow={handleViewEscrow}
          />
        )}

        {wallet && roleLoading && (
          <div className="py-20 text-center text-xs text-[var(--muted)]">
            Loading profile…
          </div>
        )}

        {needsRoleSelection && (
          <RoleSelectionPage
            walletAddress={wallet.publicKey}
            onRoleSelected={handleRoleSelected}
            onConnect={handleConnect}
          />
        )}

        {isReady && effectivePage === "home" && role === "client" && (
          <HomePage
            wallet={wallet}
            balance={balance}
            escrows={escrows}
            totalLocked={totalLocked}
            setPage={setPage}
            onViewEscrow={handleViewEscrow}
          />
        )}

        {isReady && effectivePage === "home" && role === "freelancer" && (
          <FreelancerHomePage
            wallet={wallet}
            balance={balance}
            escrows={escrows}
            setPage={setPage}
            onViewEscrow={handleViewEscrow}
          />
        )}

        {isReady && effectivePage === "escrow" && role === "client" && (
          <EscrowPage
            wallet={wallet}
            userId={userId}
            onAddEscrow={handleAddEscrow}
            setPage={setPage}
          />
        )}

        {isReady && effectivePage === "escrow-detail" && selectedEscrowId && (
          <EscrowDetailPage
            wallet={wallet}
            escrowId={selectedEscrowId}
            setPage={setPage}
            onEscrowUpdated={refreshEscrows}
          />
        )}

        {isReady && effectivePage === "history" && (
          <HistoryPage escrows={escrows} />
        )}
      </main>
    </div>
  );
}
