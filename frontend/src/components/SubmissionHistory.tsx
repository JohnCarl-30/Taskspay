import { useState, useEffect } from "react";
import { fetchMilestoneSubmissions } from "../api/submissions";
import { fetchVerificationCached } from "../api/verifications";
import type { WorkSubmission, DeliveryVerification } from "../supabase";

export interface SubmissionHistoryProps {
  escrowId: string;
  milestoneIndex: number;
  onSelectSubmission?: (submission: WorkSubmission) => void;
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  } else {
    return then.toLocaleDateString();
  }
}

/**
 * Get color configuration based on recommendation
 */
function getRecommendationConfig(recommendation: string) {
  switch (recommendation) {
    case "approve":
      return {
        color: "var(--accent)",
        bg: "var(--accent-dim)",
        border: "var(--accent-border)",
        label: "Approve",
      };
    case "request_changes":
      return {
        color: "var(--pending)",
        bg: "var(--pending-dim)",
        border: "var(--pending-border)",
        label: "Request Changes",
      };
    case "reject":
      return {
        color: "var(--danger)",
        bg: "var(--danger-dim)",
        border: "var(--danger-border)",
        label: "Reject",
      };
    default:
      return {
        color: "var(--muted)",
        bg: "var(--surface2)",
        border: "var(--border)",
        label: "Unknown",
      };
  }
}

/**
 * Loading skeleton for submission cards
 */
function SubmissionSkeleton() {
  return (
    <div
      className="p-4 rounded-lg border animate-pulse"
      style={{
        background: "var(--surface2)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="h-4 w-32 rounded"
          style={{ background: "var(--surface3)" }}
        />
        <div
          className="h-6 w-20 rounded"
          style={{ background: "var(--surface3)" }}
        />
      </div>
      <div
        className="h-3 w-full rounded mb-2"
        style={{ background: "var(--surface3)" }}
      />
      <div
        className="h-3 w-3/4 rounded"
        style={{ background: "var(--surface3)" }}
      />
    </div>
  );
}

/**
 * Submission card component
 */
interface SubmissionCardProps {
  submission: WorkSubmission;
  verification: DeliveryVerification | null;
  isLatest: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function SubmissionCard({
  submission,
  verification,
  isLatest,
  isExpanded,
  onToggleExpand,
}: SubmissionCardProps) {
  const relativeTime = formatRelativeTime(submission.created_at);
  const config = verification
    ? getRecommendationConfig(verification.recommendation)
    : null;

  return (
    <div
      className="rounded-lg border transition-all cursor-pointer"
      style={{
        background: "var(--surface2)",
        borderColor: isExpanded ? "var(--accent-border)" : "var(--border)",
      }}
      onClick={onToggleExpand}
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          {/* Timestamp and Latest Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted)] font-mono">
              {relativeTime}
            </span>
            {isLatest && (
              <span
                className="text-xs uppercase tracking-widest px-2 py-0.5 rounded font-medium"
                style={{
                  color: "var(--accent)",
                  background: "var(--accent-dim)",
                  border: "0.5px solid var(--accent-border)",
                }}
              >
                Most Recent
              </span>
            )}
          </div>

          {/* Expand/Collapse Icon */}
          <span
            className="text-[var(--muted)] transition-transform text-xs"
            style={{
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </div>

        {/* Client Decision Badge */}
        {submission.client_decision && (
          <div className="mb-2">
            <span
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest px-2.5 py-1 rounded font-medium"
              style={{
                color: submission.client_decision === "accepted" ? "var(--accent)" : "var(--danger)",
                background: submission.client_decision === "accepted" ? "var(--accent-dim)" : "var(--danger-dim)",
                border: `0.5px solid ${submission.client_decision === "accepted" ? "var(--accent-border)" : "var(--danger)"}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: submission.client_decision === "accepted" ? "var(--accent)" : "var(--danger)" }}
              />
              Client: {submission.client_decision === "accepted" ? "Accepted" : "Rejected"}
            </span>
          </div>
        )}

        {/* Score and AI Recommendation */}
        {verification ? (
          <div className="flex items-center gap-3">
            {/* Score Badge */}
            <div
              className="flex items-center justify-center w-12 h-12 rounded-full font-display font-bold text-sm"
              style={{
                background: config!.bg,
                color: config!.color,
                border: `1px solid ${config!.border}`,
              }}
            >
              {verification.score}
            </div>

            {/* AI Recommendation Badge */}
            <span
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest px-2.5 py-1 rounded font-medium"
              style={{
                color: config!.color,
                background: config!.bg,
                border: `0.5px solid ${config!.border}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: config!.color }}
              />
              AI: {config!.label}
            </span>
          </div>
        ) : (
          <div className="text-xs text-[var(--muted)] italic">
            Verification pending...
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div
          className="px-4 pb-4 border-t animate-fade-in"
          style={{ borderColor: "var(--border)" }}
        >
          {/* Verification Feedback */}
          {verification && (
            <div className="mt-3 mb-3">
              <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1.5">
                AI Feedback
              </div>
              <div className="text-sm leading-relaxed text-[var(--text)]">
                {verification.feedback}
              </div>
            </div>
          )}

          {/* Gaps (if present) */}
          {verification && verification.gaps && verification.gaps.length > 0 && (
            <div
              className="p-3 rounded-lg mb-3"
              style={{
                background: "var(--surface)",
                border: "0.5px solid var(--border)",
              }}
            >
              <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1.5">
                Identified Gaps
              </div>
              <ul className="list-disc list-inside space-y-1">
                {verification.gaps.map((gap, index) => (
                  <li key={index} className="text-xs text-[var(--text)]">
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submission Description */}
          <div className="mb-3">
            <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1.5">
              Description
            </div>
            <div className="text-sm leading-relaxed text-[var(--text)] whitespace-pre-wrap">
              {submission.description}
            </div>
          </div>

          {/* Submission URLs */}
          {submission.urls && submission.urls.length > 0 && (
            <div className="mb-3">
              <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1.5">
                Supporting URLs
              </div>
              <ul className="space-y-1">
                {submission.urls.map((url, index) => (
                  <li key={index}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent)] hover:underline break-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submission Metadata */}
          <div
            className="pt-3 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="text-xs text-[var(--muted)]">
              Submitted by: {submission.submitter_address.slice(0, 8)}...
              {submission.submitter_address.slice(-8)}
            </div>
            <div className="text-xs text-[var(--muted)] mt-1">
              Submission ID: {submission.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SubmissionHistory component
 * Displays chronological list of all submissions and verifications for a milestone
 */
const VISIBLE_COUNT = 2;

export default function SubmissionHistory({
  escrowId,
  milestoneIndex,
  onSelectSubmission,
}: SubmissionHistoryProps) {
  const [submissions, setSubmissions] = useState<WorkSubmission[]>([]);
  const [verifications, setVerifications] = useState<
    Map<string, DeliveryVerification>
  >(new Map());
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [showAll, setShowAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch submissions and verifications on mount
  useEffect(() => {
    const loadSubmissions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all submissions for this milestone
        const fetchedSubmissions = await fetchMilestoneSubmissions(
          escrowId,
          milestoneIndex
        );
        setSubmissions(fetchedSubmissions);

        // Fetch verifications for each submission
        const verificationsMap = new Map<string, DeliveryVerification>();
        await Promise.all(
          fetchedSubmissions.map(async (submission) => {
            try {
              const verification = await fetchVerificationCached(submission.id);
              if (verification) {
                verificationsMap.set(submission.id, verification);
              }
            } catch (err) {
              console.error(
                `Failed to fetch verification for submission ${submission.id}:`,
                err
              );
              // Continue loading other verifications even if one fails
            }
          })
        );
        setVerifications(verificationsMap);
      } catch (err) {
        console.error("Failed to load submissions:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load submission history"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadSubmissions();
  }, [escrowId, milestoneIndex]);

  // Handle submission card click
  const handleToggleExpand = (submissionId: string) => {
    const newSelectedId =
      selectedSubmissionId === submissionId ? null : submissionId;
    setSelectedSubmissionId(newSelectedId);

    // Call optional callback
    if (newSelectedId && onSelectSubmission) {
      const submission = submissions.find((s) => s.id === newSelectedId);
      if (submission) {
        onSelectSubmission(submission);
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className="p-5 rounded-lg border"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)]">
          Submission History
        </div>
        <div className="space-y-3">
          <SubmissionSkeleton />
          <SubmissionSkeleton />
          <SubmissionSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="p-5 rounded-lg border"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)]">
          Submission History
        </div>
        <div
          className="p-4 rounded-lg text-center"
          style={{
            background: "var(--danger-dim)",
            border: "0.5px solid var(--danger-border)",
          }}
        >
          <div className="text-sm text-[var(--danger)] mb-1">
            Failed to load submissions
          </div>
          <div className="text-xs text-[var(--muted)]">{error}</div>
        </div>
      </div>
    );
  }

  // Empty state
  if (submissions.length === 0) {
    return (
      <div
        className="p-5 rounded-lg border"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)]">
          Submission History
        </div>
        <div
          className="p-8 rounded-lg text-center"
          style={{
            background: "var(--surface2)",
            border: "0.5px solid var(--border)",
          }}
        >
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm text-[var(--text)] mb-1">
            No submissions yet
          </div>
          <div className="text-xs text-[var(--muted)]">
            Work submissions for this milestone will appear here
          </div>
        </div>
      </div>
    );
  }

  // Submissions list
  const visibleSubmissions = showAll ? submissions : submissions.slice(0, VISIBLE_COUNT);
  const hiddenCount = submissions.length - VISIBLE_COUNT;

  return (
    <div
      className="p-5 rounded-lg border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)] flex items-center justify-between">
        <span>Submission History</span>
        <span className="text-xs text-[var(--muted)] font-mono normal-case tracking-normal">
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3">
        {visibleSubmissions.map((submission, index) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            verification={verifications.get(submission.id) || null}
            isLatest={index === 0}
            isExpanded={selectedSubmissionId === submission.id}
            onToggleExpand={() => handleToggleExpand(submission.id)}
          />
        ))}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full py-2 text-xs uppercase tracking-widest rounded border transition-colors cursor-pointer"
          style={{
            background: "transparent",
            color: "var(--muted)",
            borderColor: "var(--border)",
          }}
        >
          {showAll ? "Show less" : `Show ${hiddenCount} older submission${hiddenCount !== 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
