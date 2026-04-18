import { useState, useEffect } from "react";
import Topbar from "./components/Topbar";
import HomePage from "./pages/HomePage";
import EscrowPage from "./pages/EscrowPage";
import EscrowDetailPage from "./pages/EscrowDetailPage";
import HistoryPage from "./pages/HistoryPage";
import { connectWallet, getPublicKey } from "./freighter";
import { getXLMBalance } from "./stellar";
import {
  authenticateWithWallet,
  fetchUserEscrowsCached,
  subscribeToEscrows,
  getCurrentUser,
  type EscrowRecord,
} from "./supabase";

export interface Escrow {
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

function mapStatus(status: EscrowRecord["status"]): Escrow["status"] {
  if (status === "completed") return "Released";
  if (status === "refunded") return "Refunded";
  return "Pending";
}

function mapEscrow(record: EscrowRecord): Escrow {
  return {
    id: record.id,
    title: record.description,
    address: record.freelancer_address,
    amount: record.amount,
    status: mapStatus(record.status),
    milestone: 1,
    totalMilestones: record.milestone_count,
    tx_hash: record.tx_hash,
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

  useEffect(() => {
    if (!userId) return;

    fetchUserEscrowsCached(userId)
      .then((records) => setEscrows(records.map(mapEscrow)))
      .catch(console.error);

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
  }, [userId]);

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

  const totalLocked = escrows
    .filter((e) => e.status === "Pending")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Topbar
        page={page}
        setPage={setPage}
        wallet={wallet}
        onConnect={handleConnect}
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
        {page === "home" && (
          <HomePage
            wallet={wallet}
            balance={balance}
            escrows={escrows}
            totalLocked={totalLocked}
            setPage={setPage}
            onViewEscrow={handleViewEscrow}
          />
        )}
        {page === "escrow" && (
          <EscrowPage
            wallet={wallet}
            userId={userId}
            onAddEscrow={handleAddEscrow}
            setPage={setPage}
          />
        )}
        {page === "escrow-detail" && selectedEscrowId && (
          <EscrowDetailPage
            wallet={wallet}
            escrowId={selectedEscrowId}
            setPage={setPage}
          />
        )}
        {page === "history" && <HistoryPage escrows={escrows} />}
      </main>
    </div>
  );
}