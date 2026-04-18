import { useState, useEffect } from "react";
import SubmissionForm from "../components/SubmissionForm";
import VerificationReport from "../components/VerificationReport";
import SubmissionHistory from "../components/SubmissionHistory";
import ReleaseFundsButton from "../components/ReleaseFundsButton";
import { supabase } from "../supabase";
import { fetchMilestoneSubmissions } from "../api/submissions";
import { fetchVerificationCached, verifyWorkSubmission } from "../api/verifications";
import type { WorkSubmission, DeliveryVerification } from "../supabase";

interface Milestone {
  name: string;
  description: string;
  percentage: number;
  xlm: number;
  status: "pending" | "active" | "completed";
}

interface EscrowDetail {
  id: string;
  title: string;
  freelancerAddress: string;
  totalAmount: number;
  milestones: Milestone[];
  currentMilestoneIndex: number;
  on_chain_id: number | null;
}

interface WalletState {
  publicKey: string;
  network: string;
}

interface EscrowDetailPageProps {
  wallet: WalletState | null;
  escrowId: string;
  setPage: (page: string) => void;
}

export default function EscrowDetailPage({
  wallet,
  escrowId,
  setPage,
}: EscrowDetailPageProps) {
  const [escrow, setEscrow] = useState<EscrowDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<WorkSubmission | null>(null);
  const [latestVerification, setLatestVerification] = useState<DeliveryVerification | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const fetchEscrow = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("escrows")
          .select("*")
          .eq("id", escrowId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Escrow not found");

        const releases: Array<{ milestone_index: number }> =
          data.payment_releases ?? [];
        const releasedIndices = new Set(releases.map((r) => r.milestone_index));
        const currentIndex = data.milestones.findIndex(
          (_: unknown, i: number) => !releasedIndices.has(i)
        );

        setEscrow({
          id: data.id,
          title: data.description,
          freelancerAddress: data.freelancer_address,
          totalAmount: data.amount,
          currentMilestoneIndex:
            currentIndex === -1 ? data.milestones.length - 1 : currentIndex,
          on_chain_id: data.on_chain_id,
          milestones: data.milestones.map(
            (
              m: { name: string; description: string; percentage: number; xlm: number },
              i: number
            ) => ({
              ...m,
              status: releasedIndices.has(i)
                ? ("completed" as const)
                : i === currentIndex
                  ? ("active" as const)
                  : ("pending" as const),
            })
          ),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load escrow");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEscrow();
  }, [escrowId]);

  // Fetch latest submission and verification for current milestone
  useEffect(() => {
    if (!escrow) return;

    const fetchLatestVerification = async () => {
      try {
        const submissions = await fetchMilestoneSubmissions(
          escrow.id,
          escrow.currentMilestoneIndex
        );

        if (submissions.length > 0) {
          const latest = submissions[0]; // Already sorted by created_at DESC
          setLatestSubmission(latest);

          // Fetch verification for latest submission
          const verification = await fetchVerificationCached(latest.id);
          setLatestVerification(verification);
        }
      } catch (err) {
        console.error("Failed to fetch latest verification:", err);
      }
    };

    fetchLatestVerification();
  }, [escrow]);

  // Set up realtime subscriptions for new submissions and verifications
  useEffect(() => {
    if (!escrow) return;

    // Subscribe to work submissions for this escrow
    const submissionChannel = supabase
      .channel(`work_submissions:${escrow.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "work_submissions",
          filter: `escrow_id=eq.${escrow.id}`,
        },
        (payload) => {
          const newSubmission = payload.new as WorkSubmission;
          
          // Only update if it's for the current milestone
          if (newSubmission.milestone_index === escrow.currentMilestoneIndex) {
            console.log("New submission received:", newSubmission.id);
            setLatestSubmission(newSubmission);
            setLatestVerification(null); // Clear verification until new one arrives
          }
        }
      )
      .subscribe();

    // Subscribe to delivery verifications
    const verificationChannel = supabase
      .channel(`delivery_verifications:${escrow.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "delivery_verifications",
        },
        async (payload) => {
          const newVerification = payload.new as DeliveryVerification;
          
          // Check if this verification is for the latest submission
          if (latestSubmission && newVerification.submission_id === latestSubmission.id) {
            console.log("New verification received:", newVerification.id);
            setLatestVerification(newVerification);
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      submissionChannel.unsubscribe();
      verificationChannel.unsubscribe();
    };
  }, [escrow, latestSubmission]);

  const handleSubmitSuccess = async (submission: WorkSubmission) => {
    setSuccessMessage("Work submitted! Running AI verification...");
    setErrorMessage(null);
    setLatestSubmission(submission);
    setLatestVerification(null);

    if (escrow) {
      const milestone = escrow.milestones[escrow.currentMilestoneIndex];
      setIsVerifying(true);
      try {
        const verification = await verifyWorkSubmission(submission, {
          name: milestone.name,
          description: milestone.description,
          percentage: milestone.percentage,
          xlm: milestone.xlm,
        });
        setLatestVerification(verification);
        setSuccessMessage("Work submitted! AI verification complete.");
      } catch (err) {
        console.error("Verification failed:", err);
        setSuccessMessage("Work submitted! Verification unavailable.");
      } finally {
        setIsVerifying(false);
      }
    }

    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleSubmitError = (error: Error) => {
    console.error("Submission error:", error);
    setErrorMessage(error.message || "Failed to submit work. Please try again.");
    setSuccessMessage(null);
  };

  const handleReleaseFundsSuccess = async () => {
    setSuccessMessage("Payment released successfully!");
    setErrorMessage(null);
    
    // Refresh escrow data to update milestone status
    try {
      const { data, error: fetchError } = await supabase
        .from("escrows")
        .select("*")
        .eq("id", escrowId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error("Escrow not found");

      const releases: Array<{ milestone_index: number }> =
        data.payment_releases ?? [];
      const releasedIndices = new Set(releases.map((r) => r.milestone_index));
      const currentIndex = data.milestones.findIndex(
        (_: unknown, i: number) => !releasedIndices.has(i)
      );

      setEscrow({
        id: data.id,
        title: data.description,
        freelancerAddress: data.freelancer_address,
        totalAmount: data.amount,
        currentMilestoneIndex:
          currentIndex === -1 ? data.milestones.length - 1 : currentIndex,
        on_chain_id: data.on_chain_id,
        milestones: data.milestones.map(
          (
            m: { name: string; description: string; percentage: number; xlm: number },
            i: number
          ) => ({
            ...m,
            status: releasedIndices.has(i)
              ? ("completed" as const)
              : i === currentIndex
                ? ("active" as const)
                : ("pending" as const),
          })
        ),
      });
    } catch (err) {
      console.error("Failed to refresh escrow data:", err);
    }

    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleReleaseFundsError = (error: Error) => {
    console.error("Release funds error:", error);
    setErrorMessage(error.message || "Failed to release funds. Please try again.");
    setSuccessMessage(null);
  };

  if (isLoading) {
    return (
      <div className="fade-in">
        <div className="mb-1.5 text-xs uppercase tracking-widest text-[var(--muted2)]">
          Loading...
        </div>
        <div className="mb-6 font-display text-2xl font-bold tracking-tight">
          Escrow Details
        </div>
        <div className="text-xs text-[var(--muted)]">Loading escrow data...</div>
      </div>
    );
  }

  if (error || !escrow) {
    return (
      <div className="fade-in">
        <div className="mb-1.5 text-xs uppercase tracking-widest text-[var(--muted2)]">
          Error
        </div>
        <div className="mb-6 font-display text-2xl font-bold tracking-tight">
          Escrow Not Found
        </div>
        <div className="text-xs text-[var(--danger)] mb-4">
          {error || "Unable to load escrow details"}
        </div>
        <button
          onClick={() => setPage("home")}
          className="text-xs uppercase tracking-wider text-[var(--accent)]"
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  const activeMilestone = escrow.milestones[escrow.currentMilestoneIndex];
  const isActiveMilestone =
    activeMilestone !== undefined &&
    activeMilestone.status !== "completed";

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-1.5 text-xs uppercase tracking-widest text-[var(--muted2)]">
        <button
          onClick={() => setPage("home")}
          className="text-[var(--muted2)] hover:text-[var(--accent)] transition-colors border-0 bg-transparent cursor-pointer"
        >
          ← Dashboard
        </button>
      </div>
      <div className="mb-6 font-display text-2xl font-bold tracking-tight">
        {escrow.title}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div
          className="p-3 rounded-lg mb-4 animate-fade-in"
          style={{
            background: "var(--accent-dim)",
            border: "0.5px solid var(--accent-border)",
          }}
        >
          <div className="text-xs font-medium text-[var(--accent)]">
            ✓ {successMessage}
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          className="p-3 rounded-lg mb-4 animate-fade-in"
          style={{
            background: "var(--danger-dim)",
            border: "0.5px solid var(--danger)",
          }}
        >
          <div className="text-xs font-medium text-[var(--danger)]">
            ✗ {errorMessage}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Left Column - Escrow Info & Milestones */}
        <div>
          {/* Escrow Summary */}
          <div
            className="p-5 rounded-lg border mb-4"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)]">
              Escrow Summary
            </div>
            <div className="space-y-2.5">
              <SummaryRow label="Freelancer" value={escrow.freelancerAddress} />
              <SummaryRow label="Total Amount" value={`${escrow.totalAmount.toFixed(2)} XLM`} />
              <SummaryRow label="Total Milestones" value={`${escrow.milestones.length}`} />
              <SummaryRow 
                label="Current Milestone" 
                value={`${escrow.currentMilestoneIndex + 1} of ${escrow.milestones.length}`} 
              />
            </div>
          </div>

          {/* Milestones List */}
          <div
            className="p-5 rounded-lg border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)]">
              Milestones
            </div>
            <div className="space-y-2">
              {escrow.milestones.map((milestone, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border flex items-center gap-3"
                  style={{
                    background: milestone.status === "active" ? "var(--surface2)" : "var(--bg)",
                    borderColor: milestone.status === "active" ? "var(--accent-border)" : "var(--border)",
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                    style={{
                      background: 
                        milestone.status === "completed" ? "var(--accent)" :
                        milestone.status === "active" ? "var(--accent-dim)" : "var(--muted2)",
                      border: milestone.status === "active" ? "0.5px solid var(--accent-border)" : "none",
                      color: milestone.status === "completed" ? "#0a0a0a" : 
                             milestone.status === "active" ? "var(--accent)" : "var(--muted)",
                    }}
                  >
                    {milestone.status === "completed" ? "✓" : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium mb-0.5">
                      {milestone.name}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {milestone.description}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-sm font-bold text-[var(--accent)]">
                      {milestone.percentage}%
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      {milestone.xlm.toFixed(2)} XLM
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Submission Form, Verification Report, and History */}
        <div>
          {isActiveMilestone ? (
            <>
              <SubmissionForm
                escrowId={escrow.id}
                milestoneIndex={escrow.currentMilestoneIndex}
                milestoneName={activeMilestone.name}
                milestoneDescription={activeMilestone.description}
                onSubmitSuccess={handleSubmitSuccess}
                onSubmitError={handleSubmitError}
              />

              {/* AI verifying spinner */}
              {isVerifying && (
                <div
                  className="mt-4 p-4 rounded-lg border text-xs"
                  style={{
                    background: "rgba(200,241,53,0.04)",
                    border: "0.5px solid rgba(200,241,53,0.15)",
                  }}
                >
                  <div
                    className="text-[var(--accent)] uppercase tracking-widest"
                    style={{ animation: "pulse 1.2s ease-in-out infinite" }}
                  >
                    ✦ AI is verifying your submission...
                  </div>
                  <div className="text-[var(--muted)] mt-1">
                    Checking work against milestone requirements.
                  </div>
                </div>
              )}

              {/* Display Verification Report if verification exists */}
              {latestVerification && latestSubmission && (
                <div className="mt-4">
                  <VerificationReport
                    verification={latestVerification}
                    submission={latestSubmission}
                    showFullSubmission={false}
                  />
                </div>
              )}

              {/* Release Funds Button - only show for active milestone when wallet connected and on_chain_id exists */}
              {wallet && escrow.on_chain_id && (
                <div className="mt-4">
                  <ReleaseFundsButton
                    escrowId={escrow.id}
                    onChainEscrowId={escrow.on_chain_id}
                    milestoneIndex={escrow.currentMilestoneIndex}
                    milestoneName={activeMilestone.name}
                    milestoneAmount={activeMilestone.xlm}
                    clientAddress={wallet.publicKey}
                    verification={latestVerification}
                    onSuccess={handleReleaseFundsSuccess}
                    onError={handleReleaseFundsError}
                  />
                </div>
              )}

              {/* Display Submission History in expandable section */}
              <div className="mt-4">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full p-4 rounded-lg border flex items-center justify-between transition-colors"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                    cursor: "pointer",
                  }}
                >
                  <span className="font-display text-sm font-bold uppercase tracking-wider">
                    Submission History
                  </span>
                  <span
                    className="text-[var(--muted)] transition-transform"
                    style={{
                      transform: showHistory ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▼
                  </span>
                </button>

                {showHistory && (
                  <div className="mt-2 animate-fade-in">
                    <SubmissionHistory
                      escrowId={escrow.id}
                      milestoneIndex={escrow.currentMilestoneIndex}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              className="p-5 rounded-lg border"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)]">
                Submit Work Evidence
              </div>
              <div className="text-xs text-[var(--muted)] text-center py-8">
                No active milestone available for submission.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
