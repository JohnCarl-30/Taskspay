import { useState, useEffect } from "react";
import SubmissionForm from "../components/SubmissionForm";
import VerificationReport from "../components/VerificationReport";
import SubmissionHistory from "../components/SubmissionHistory";
import ReleaseFundsButton from "../components/ReleaseFundsButton";
import { supabase, updateWorkSubmission } from "../supabase";
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
  clientAddress: string;
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
  onEscrowUpdated?: () => void;
}

export default function EscrowDetailPage({
  wallet,
  escrowId,
  setPage,
  onEscrowUpdated,
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
  const [isRejecting, setIsRejecting] = useState(false);

  const refreshEscrow = async () => {
    const { data, error: fetchError } = await supabase
      .from("escrows")
      .select("*")
      .eq("id", escrowId)
      .single();
    if (fetchError || !data) return;
    const releases: Array<{ milestone_index: number }> = data.payment_releases ?? [];
    const releasedIndices = new Set(releases.map((r) => r.milestone_index));
    const currentIndex = data.milestones.findIndex(
      (_: unknown, i: number) => !releasedIndices.has(i)
    );
    setEscrow({
      id: data.id,
      title: data.description,
      clientAddress: data.wallet_address,
      freelancerAddress: data.freelancer_address,
      totalAmount: data.amount,
      currentMilestoneIndex: currentIndex === -1 ? data.milestones.length - 1 : currentIndex,
      on_chain_id: data.on_chain_id,
      milestones: data.milestones.map(
        (m: { name: string; description: string; percentage: number; xlm: number }, i: number) => ({
          ...m,
          status: releasedIndices.has(i)
            ? ("completed" as const)
            : i === currentIndex
              ? ("active" as const)
              : ("pending" as const),
        })
      ),
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        await refreshEscrow();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load escrow");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [escrowId]);

  useEffect(() => {
    if (!escrow) return;
    const load = async () => {
      try {
        const submissions = await fetchMilestoneSubmissions(escrow.id, escrow.currentMilestoneIndex);
        if (submissions.length > 0) {
          const latest = submissions[0];
          setLatestSubmission(latest);
          const verification = await fetchVerificationCached(latest.id);
          setLatestVerification(verification);
        } else {
          setLatestSubmission(null);
          setLatestVerification(null);
        }
      } catch (err) {
        console.error("Failed to fetch latest submission:", err);
      }
    };
    load();
  }, [escrow?.id, escrow?.currentMilestoneIndex]);

  useEffect(() => {
    if (!escrow) return;

    const submissionChannel = supabase
      .channel(`work_submissions:${escrow.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "work_submissions",
        filter: `escrow_id=eq.${escrow.id}`,
      }, (payload) => {
        const s = payload.new as WorkSubmission;
        if (s.milestone_index === escrow.currentMilestoneIndex) {
          setLatestSubmission(s);
          setLatestVerification(null);
        }
      })
      .subscribe();

    const verificationChannel = supabase
      .channel(`delivery_verifications:${escrow.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "delivery_verifications",
      }, (payload) => {
        const v = payload.new as DeliveryVerification;
        if (latestSubmission && v.submission_id === latestSubmission.id) {
          setLatestVerification(v);
        }
      })
      .subscribe();

    return () => {
      submissionChannel.unsubscribe();
      verificationChannel.unsubscribe();
    };
  }, [escrow, latestSubmission]);

  const handleSubmitSuccess = async (submission: WorkSubmission) => {
    setSuccessMessage("Work submitted! Running AI analysis...");
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
        setSuccessMessage("Work submitted! Waiting for client review.");
      } catch {
        setSuccessMessage("Work submitted! Waiting for client review.");
      } finally {
        setIsVerifying(false);
      }
    }
    setTimeout(() => setSuccessMessage(null), 6000);
  };

  const handleSubmitError = (error: Error) => {
    setErrorMessage(error.message || "Failed to submit work.");
    setSuccessMessage(null);
  };

  const handleReject = async () => {
    if (!latestSubmission) return;
    setIsRejecting(true);
    try {
      const updated = await updateWorkSubmission(latestSubmission.id, { client_decision: "rejected" });
      setLatestSubmission(updated);
      setSuccessMessage("Work rejected. Freelancer will be notified to resubmit.");
      onEscrowUpdated?.();
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to reject submission.");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleReleaseFundsSuccess = async () => {
    if (latestSubmission) {
      try {
        const updated = await updateWorkSubmission(latestSubmission.id, { client_decision: "accepted" });
        setLatestSubmission(updated);
      } catch (err) {
        console.error("Failed to mark submission accepted:", err);
      }
    }
    setSuccessMessage("Payment released! Milestone complete.");
    setErrorMessage(null);
    try {
      await refreshEscrow();
    } catch (err) {
      console.error("Failed to refresh escrow:", err);
    }
    onEscrowUpdated?.();
    setTimeout(() => setSuccessMessage(null), 6000);
  };

  const handleReleaseFundsError = (error: Error) => {
    setErrorMessage(error.message || "Failed to release funds.");
    setSuccessMessage(null);
  };

  if (isLoading) {
    return (
      <div className="fade-in">
        <div className="mb-1.5 text-xs uppercase tracking-widest text-[var(--muted2)]">Loading...</div>
        <div className="mb-6 font-display text-2xl font-bold tracking-tight">Escrow Details</div>
        <div className="text-xs text-[var(--muted)]">Loading escrow data...</div>
      </div>
    );
  }

  if (error || !escrow) {
    return (
      <div className="fade-in">
        <div className="mb-1.5 text-xs uppercase tracking-widest text-[var(--muted2)]">Error</div>
        <div className="mb-6 font-display text-2xl font-bold tracking-tight">Escrow Not Found</div>
        <div className="text-xs text-[var(--danger)] mb-4">{error || "Unable to load escrow details"}</div>
        <button onClick={() => setPage("home")} className="text-xs uppercase tracking-wider text-[var(--accent)]">
          ← Back to Home
        </button>
      </div>
    );
  }

  const activeMilestone = escrow.milestones[escrow.currentMilestoneIndex];
  const isActiveMilestone = activeMilestone !== undefined && activeMilestone.status !== "completed";

  // Role detection based on connected wallet
  const isClient = wallet?.publicKey === escrow.clientAddress;
  const isFreelancer = !isClient && wallet?.publicKey === escrow.freelancerAddress;
  const isViewer = !isClient && !isFreelancer;

  const canDecide =
    isClient &&
    !!escrow.on_chain_id &&
    latestSubmission !== null &&
    latestSubmission.client_decision === null &&
    !isVerifying;

  return (
    <div className="fade-in">
      <div className="mb-1.5 text-xs uppercase tracking-widest text-[var(--muted2)]">
        <button
          onClick={() => setPage("home")}
          className="text-[var(--muted2)] hover:text-[var(--accent)] transition-colors border-0 bg-transparent cursor-pointer"
        >
          ← Dashboard
        </button>
      </div>
      <div className="mb-2 font-display text-2xl font-bold tracking-tight">{escrow.title}</div>

      {/* Role badge */}
      <div className="mb-4 flex items-center gap-2">
        {isClient && (
          <span
            className="text-xs uppercase tracking-widest px-2.5 py-1 rounded font-medium"
            style={{ color: "var(--accent)", background: "var(--accent-dim)", border: "0.5px solid var(--accent-border)" }}
          >
            Client
          </span>
        )}
        {isFreelancer && (
          <span
            className="text-xs uppercase tracking-widest px-2.5 py-1 rounded font-medium"
            style={{ color: "var(--pending)", background: "var(--pending-dim)", border: "0.5px solid var(--pending-border)" }}
          >
            Freelancer
          </span>
        )}
        {isViewer && wallet && (
          <span
            className="text-xs uppercase tracking-widest px-2.5 py-1 rounded font-medium"
            style={{ color: "var(--muted)", background: "var(--surface2)", border: "0.5px solid var(--border)" }}
          >
            Viewer
          </span>
        )}
      </div>

      {successMessage && (
        <div className="p-3 rounded-lg mb-4 animate-fade-in" style={{ background: "var(--accent-dim)", border: "0.5px solid var(--accent-border)" }}>
          <div className="text-xs font-medium text-[var(--accent)]">✓ {successMessage}</div>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 rounded-lg mb-4 animate-fade-in" style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)" }}>
          <div className="text-xs font-medium text-[var(--danger)]">✗ {errorMessage}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Left Column */}
        <div>
          <div className="p-5 rounded-lg border mb-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)]">
              Escrow Summary
            </div>
            <div className="space-y-2.5">
              <SummaryRow label="Client" value={`${escrow.clientAddress.slice(0, 8)}...${escrow.clientAddress.slice(-8)}`} />
              <SummaryRow label="Freelancer" value={`${escrow.freelancerAddress.slice(0, 8)}...${escrow.freelancerAddress.slice(-8)}`} />
              <SummaryRow label="Total Amount" value={`${escrow.totalAmount.toFixed(2)} XLM`} />
              <SummaryRow label="Current Milestone" value={`${escrow.currentMilestoneIndex + 1} of ${escrow.milestones.length}`} />
            </div>
          </div>

          <div className="p-5 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
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
                      background: milestone.status === "completed" ? "var(--accent)" : milestone.status === "active" ? "var(--accent-dim)" : "var(--muted2)",
                      border: milestone.status === "active" ? "0.5px solid var(--accent-border)" : "none",
                      color: milestone.status === "completed" ? "#0a0a0a" : milestone.status === "active" ? "var(--accent)" : "var(--muted)",
                    }}
                  >
                    {milestone.status === "completed" ? "✓" : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium mb-0.5">{milestone.name}</div>
                    <div className="text-xs text-[var(--muted)]">{milestone.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-sm font-bold text-[var(--accent)]">{milestone.percentage}%</div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">{milestone.xlm.toFixed(2)} XLM</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {isActiveMilestone ? (
            <>
              {/* ── FREELANCER VIEW ── */}
              {isFreelancer && (
                <>
                  <SubmissionForm
                    escrowId={escrow.id}
                    milestoneIndex={escrow.currentMilestoneIndex}
                    milestoneName={activeMilestone.name}
                    milestoneDescription={activeMilestone.description}
                    onSubmitSuccess={handleSubmitSuccess}
                    onSubmitError={handleSubmitError}
                  />

                  {isVerifying && (
                    <div className="mt-4 p-4 rounded-lg text-xs" style={{ background: "rgba(200,241,53,0.04)", border: "0.5px solid rgba(200,241,53,0.15)" }}>
                      <div className="text-[var(--accent)] uppercase tracking-widest" style={{ animation: "pulse 1.2s ease-in-out infinite" }}>
                        ✦ AI is analyzing your submission...
                      </div>
                      <div className="text-[var(--muted)] mt-1">Generating a report for the client.</div>
                    </div>
                  )}

                  {latestVerification && latestSubmission && (
                    <div className="mt-4">
                      <VerificationReport verification={latestVerification} submission={latestSubmission} showFullSubmission={false} />
                    </div>
                  )}

                  {latestSubmission && latestSubmission.client_decision === null && !isVerifying && (
                    <div className="mt-4 p-4 rounded-lg" style={{ background: "var(--pending-dim)", border: "0.5px solid var(--pending-border)" }}>
                      <div className="text-xs font-medium text-[var(--pending)]">Awaiting client review</div>
                      <div className="text-xs text-[var(--muted)] mt-1">The client will accept or reject your submission.</div>
                    </div>
                  )}

                  {latestSubmission?.client_decision === "rejected" && (
                    <div className="mt-4 p-4 rounded-lg" style={{ background: "var(--danger-dim)", border: "0.5px solid var(--danger)" }}>
                      <div className="text-xs font-medium text-[var(--danger)]">✗ Work rejected</div>
                      <div className="text-xs text-[var(--muted)] mt-1">The client has requested changes. Review the AI feedback above and resubmit.</div>
                    </div>
                  )}

                  {latestSubmission?.client_decision === "accepted" && (
                    <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--accent-dim)", border: "0.5px solid var(--accent-border)" }}>
                      <div className="text-xs font-medium text-[var(--accent)]">✓ Work accepted — funds released!</div>
                    </div>
                  )}
                </>
              )}

              {/* ── CLIENT VIEW ── */}
              {isClient && (
                <>
                  {!latestSubmission ? (
                    <div className="p-5 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                      <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)]">
                        Pending Review
                      </div>
                      <div className="py-8 text-center">
                        <div className="text-3xl mb-3">⏳</div>
                        <div className="text-xs font-medium text-[var(--text)] mb-1">Waiting for freelancer</div>
                        <div className="text-xs text-[var(--muted)]">
                          The freelancer hasn't submitted work for this milestone yet.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Submission preview */}
                      <div className="p-5 rounded-lg border mb-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                        <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)] flex items-center justify-between">
                          <span>Freelancer Submission</span>
                          {latestSubmission.client_decision === null && !isVerifying && (
                            <span className="text-xs font-mono normal-case tracking-normal px-2 py-0.5 rounded" style={{ background: "var(--pending-dim)", color: "var(--pending)", border: "0.5px solid var(--pending-border)" }}>
                              Awaiting decision
                            </span>
                          )}
                          {latestSubmission.client_decision === "accepted" && (
                            <span className="text-xs font-mono normal-case tracking-normal px-2 py-0.5 rounded" style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "0.5px solid var(--accent-border)" }}>
                              Accepted
                            </span>
                          )}
                          {latestSubmission.client_decision === "rejected" && (
                            <span className="text-xs font-mono normal-case tracking-normal px-2 py-0.5 rounded" style={{ background: "var(--danger-dim)", color: "var(--danger)", border: "0.5px solid var(--danger)" }}>
                              Rejected
                            </span>
                          )}
                        </div>
                        <div className="mb-3">
                          <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1.5">Description</div>
                          <div className="text-sm leading-relaxed text-[var(--text)] whitespace-pre-wrap">{latestSubmission.description}</div>
                        </div>
                        {latestSubmission.urls && latestSubmission.urls.length > 0 && (
                          <div>
                            <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1.5">Supporting Links</div>
                            <ul className="space-y-1">
                              {latestSubmission.urls.map((url, i) => (
                                <li key={i}>
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:underline break-all">
                                    ↗ {url}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* AI Analysis */}
                      {isVerifying && (
                        <div className="mb-4 p-4 rounded-lg text-xs" style={{ background: "rgba(200,241,53,0.04)", border: "0.5px solid rgba(200,241,53,0.15)" }}>
                          <div className="text-[var(--accent)] uppercase tracking-widest" style={{ animation: "pulse 1.2s ease-in-out infinite" }}>
                            ✦ AI is analyzing the submission...
                          </div>
                        </div>
                      )}

                      {latestVerification && latestSubmission && (
                        <div className="mb-4">
                          <VerificationReport verification={latestVerification} submission={latestSubmission} showFullSubmission={false} />
                        </div>
                      )}

                      {/* Decision section */}
                      {canDecide && (
                        <div className="p-5 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                          <div className="font-display text-sm font-bold uppercase tracking-wider mb-1 pb-3 border-b border-[var(--border)]">
                            Your Decision
                          </div>
                          <div className="text-xs text-[var(--muted)] mb-3 pt-3">
                            {latestVerification
                              ? `AI scores this submission ${latestVerification.score}/100 and recommends ${latestVerification.recommendation.replace("_", " ")}.`
                              : "Review the submission above and approve to release funds or reject to request changes."}
                          </div>

                          {/* Client override note - always show to remind client they have final say */}
                          {(!latestVerification || latestVerification.recommendation !== "approve") && (
                            <div
                              className="p-4 rounded-lg mb-4 flex items-start gap-3 border"
                              style={{
                                background: "rgba(245, 166, 35, 0.08)",
                                borderColor: "rgba(245, 166, 35, 0.3)",
                              }}
                            >
                              <div className="text-lg flex-shrink-0 mt-0.5">ℹ️</div>
                              <div>
                                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--pending)" }}>
                                  You have final say
                                </div>
                                <div className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>
                                  AI is advisory only. If you've reviewed the work and are satisfied, <strong>you can approve regardless of the AI score.</strong>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-3">
                            <div className="flex-1">
                              <ReleaseFundsButton
                                escrowId={escrow.id}
                                onChainEscrowId={escrow.on_chain_id!}
                                milestoneIndex={escrow.currentMilestoneIndex}
                                milestoneName={activeMilestone.name}
                                milestoneAmount={activeMilestone.xlm}
                                clientAddress={wallet!.publicKey}
                                verification={latestVerification}
                                onSuccess={handleReleaseFundsSuccess}
                                onError={handleReleaseFundsError}
                              />
                            </div>
                            <button
                              onClick={handleReject}
                              disabled={isRejecting}
                              className="px-5 py-3 text-xs font-display font-bold uppercase tracking-wider rounded cursor-pointer self-start"
                              style={{
                                background: "var(--danger-dim)",
                                color: "var(--danger)",
                                border: "0.5px solid var(--danger)",
                                opacity: isRejecting ? 0.5 : 1,
                                cursor: isRejecting ? "not-allowed" : "pointer",
                                minHeight: "44px",
                              }}
                            >
                              {isRejecting ? "..." : "Reject"}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── VIEWER / WRONG WALLET ── */}
              {isViewer && (
                <div className="p-5 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)]">
                    Access Restricted
                  </div>
                  <div className="py-6 text-center">
                    <div className="text-3xl mb-3">🔒</div>
                    <div className="text-xs font-medium text-[var(--text)] mb-2">Wrong wallet connected</div>
                    <div className="text-xs text-[var(--muted)] leading-relaxed">
                      Connect the <strong>client wallet</strong> to review and approve submissions, or the <strong>freelancer wallet</strong> to submit work.
                    </div>
                  </div>
                </div>
              )}

              {/* Submission History — visible to all */}
              <div className="mt-4">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full p-4 rounded-lg border flex items-center justify-between"
                  style={{ background: "var(--surface)", borderColor: "var(--border)", cursor: "pointer" }}
                >
                  <span className="font-display text-sm font-bold uppercase tracking-wider">Submission History</span>
                  <span className="text-[var(--muted)] transition-transform" style={{ transform: showHistory ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {showHistory && (
                  <div className="mt-2 animate-fade-in">
                    <SubmissionHistory escrowId={escrow.id} milestoneIndex={escrow.currentMilestoneIndex} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-5 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)]">
                All Milestones Complete
              </div>
              <div className="text-xs text-[var(--muted)] text-center py-8">
                All milestones have been completed and paid.
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
      <span className="font-medium font-mono">{value}</span>
    </div>
  );
}
