import { useState } from "react";
import type { DeliveryVerification, WorkSubmission } from "../supabase";

export interface VerificationReportProps {
  verification: DeliveryVerification;
  submission: WorkSubmission;
  showFullSubmission?: boolean;
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
 * Circular progress indicator for score display
 */
function CircularProgress({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const dashOffset = circumference - progress;

  // Determine color based on score
  let strokeColor = "var(--danger)";
  if (score >= 80) {
    strokeColor = "var(--accent)";
  } else if (score >= 50) {
    strokeColor = "var(--pending)";
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--surface3)"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.5s ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="font-display text-2xl font-bold">{score}</div>
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider">
            Score
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerificationReport({
  verification,
  submission,
  showFullSubmission = false,
}: VerificationReportProps) {
  const [isExpanded, setIsExpanded] = useState(showFullSubmission);
  const config = getRecommendationConfig(verification.recommendation);
  const relativeTime = formatRelativeTime(verification.created_at);

  return (
    <div
      className="p-5 rounded-lg border animate-fade-in"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header */}
      <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)] flex items-center justify-between">
        <span>AI Verification Report</span>
        <span className="text-xs text-[var(--muted)] font-mono normal-case tracking-normal">
          {relativeTime}
        </span>
      </div>

      {/* Score and Recommendation Section */}
      <div className="flex items-start gap-6 mb-5">
        {/* Circular Score Display */}
        <div className="flex-shrink-0">
          <CircularProgress score={verification.score} />
        </div>

        {/* Recommendation and Feedback */}
        <div className="flex-1">
          {/* Recommendation Badge */}
          <div className="mb-3">
            <span
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest px-3 py-1.5 rounded font-medium"
              style={{
                color: config.color,
                background: config.bg,
                border: `0.5px solid ${config.border}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: config.color }}
              />
              {config.label}
            </span>
          </div>

          {/* Feedback Text */}
          <div className="text-sm leading-relaxed text-[var(--text)]">
            {verification.feedback}
          </div>
        </div>
      </div>

      {/* Gaps Section (if present) */}
      {verification.gaps && verification.gaps.length > 0 && (
        <div
          className="p-4 rounded-lg mb-4"
          style={{
            background: "var(--surface2)",
            border: "0.5px solid var(--border)",
          }}
        >
          <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
            Identified Gaps
          </div>
          <ul className="list-disc list-inside space-y-1.5">
            {verification.gaps.map((gap, index) => (
              <li key={index} className="text-sm text-[var(--text)]">
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expandable Submission Content */}
      <div
        className="rounded-lg border"
        style={{
          background: "var(--surface2)",
          borderColor: "var(--border)",
        }}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <span className="text-xs uppercase tracking-widest text-[var(--muted)]">
            View Full Submission
          </span>
          <span
            className="text-[var(--muted)] transition-transform"
            style={{
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 animate-fade-in">
            {/* Submission Description */}
            <div className="mb-4">
              <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
                Description
              </div>
              <div className="text-sm leading-relaxed text-[var(--text)] whitespace-pre-wrap">
                {submission.description}
              </div>
            </div>

            {/* Submission URLs */}
            {submission.urls && submission.urls.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
                  Supporting URLs
                </div>
                <ul className="space-y-1.5">
                  {submission.urls.map((url, index) => (
                    <li key={index}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--accent)] hover:underline break-all"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Submission Metadata */}
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <div className="text-xs text-[var(--muted)]">
                Submitted by: {submission.submitter_address.slice(0, 8)}...
                {submission.submitter_address.slice(-8)}
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">
                Submitted: {formatRelativeTime(submission.created_at)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
