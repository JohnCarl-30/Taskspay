import { useEffect } from "react";
import type { DeliveryVerification } from "../supabase";

/**
 * ConfirmationDialog Component
 * 
 * Accessibility Features (WCAG AA Compliant):
 * - Modal dialog with proper ARIA attributes (role="dialog", aria-modal="true")
 * - Focus trap: Tab navigation cycles between dialog buttons only
 * - Auto-focus: Confirm button receives focus on mount
 * - Keyboard shortcuts: Enter to confirm, Escape to cancel
 * - Minimum 44x44px touch targets for all buttons
 * - Focus states: Visible focus rings with scale transform
 * - Screen reader support: Descriptive aria-labels on all interactive elements
 */

export interface ConfirmationDialogProps {
  milestoneName: string;
  amount: number;
  verification: DeliveryVerification | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Get warning configuration based on verification status
 */
function getWarningConfig(verification: DeliveryVerification | null) {
  if (!verification) {
    return {
      level: "warning",
      color: "var(--pending)",
      bg: "var(--pending-dim)",
      border: "var(--pending-border)",
      icon: "⚠",
      message: "No verification available",
      detail: "No work submission has been verified for this milestone.",
    };
  }

  if (verification.recommendation === "reject") {
    return {
      level: "danger",
      color: "var(--danger)",
      bg: "var(--danger-dim)",
      border: "var(--danger-border)",
      icon: "⚠",
      message: "Verification recommends rejection",
      detail: `Score: ${verification.score}/100 - Consider requesting changes before releasing payment.`,
    };
  }

  if (verification.recommendation === "request_changes") {
    return {
      level: "caution",
      color: "var(--pending)",
      bg: "var(--pending-dim)",
      border: "var(--pending-border)",
      icon: "⚠",
      message: "Verification suggests changes",
      detail: `Score: ${verification.score}/100 - Review feedback before proceeding.`,
    };
  }

  // approve recommendation
  return {
    level: "success",
    color: "var(--accent)",
    bg: "var(--accent-dim)",
    border: "var(--accent-border)",
    icon: "✓",
    message: "Verification approved",
    detail: `Score: ${verification.score}/100 - Work meets requirements.`,
  };
}

export default function ConfirmationDialog({
  milestoneName,
  amount,
  verification,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const warningConfig = getWarningConfig(verification);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter") {
        onConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm, onCancel]);

  // Focus trap - focus first button on mount and trap focus within dialog
  useEffect(() => {
    const confirmButton = document.getElementById("confirm-release-button");
    const cancelButton = document.getElementById("cancel-release-button");
    
    if (confirmButton) {
      confirmButton.focus();
    }

    // Focus trap handler
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = [cancelButton, confirmButton].filter(Boolean);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleTabKey);
    return () => window.removeEventListener('keydown', handleTabKey);
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 animate-fade-in"
        style={{
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div
          className="w-full max-w-md p-6 rounded-lg border animate-fade-in pointer-events-auto"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-5">
            <h2
              id="dialog-title"
              className="font-display text-lg font-bold mb-1"
            >
              Confirm Payment Release
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Review the details before releasing funds
            </p>
          </div>

          {/* Milestone Details */}
          <div
            className="p-4 rounded-lg mb-4"
            style={{
              background: "var(--surface2)",
              border: "0.5px solid var(--border)",
            }}
          >
            <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
              Milestone
            </div>
            <div className="font-medium text-sm mb-3">{milestoneName}</div>

            <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
              Payment Amount
            </div>
            <div className="font-display text-2xl font-bold">
              {amount.toFixed(2)} XLM
            </div>
          </div>

          {/* Verification Status / Warning */}
          <div
            className="p-4 rounded-lg mb-5"
            style={{
              background: warningConfig.bg,
              border: `0.5px solid ${warningConfig.border}`,
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className="text-xl flex-shrink-0"
                style={{ color: warningConfig.color }}
              >
                {warningConfig.icon}
              </span>
              <div className="flex-1">
                <div
                  className="text-sm font-medium mb-1"
                  style={{ color: warningConfig.color }}
                >
                  {warningConfig.message}
                </div>
                <div className="text-xs text-[var(--text)]">
                  {warningConfig.detail}
                </div>
                {verification?.feedback && (
                  <div className="text-xs text-[var(--muted)] mt-2 italic">
                    "{verification.feedback}"
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              id="cancel-release-button"
              onClick={onCancel}
              className="flex-1 py-2.5 text-xs font-display font-bold uppercase tracking-wider border rounded cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[var(--border2)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
              style={{
                background: "transparent",
                borderColor: "var(--border2)",
                color: "var(--text)",
                minHeight: "44px",
              }}
              aria-label="Cancel payment release"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              onFocus={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Cancel
            </button>
            <button
              id="confirm-release-button"
              onClick={onConfirm}
              className="flex-1 py-2.5 text-xs font-display font-bold uppercase tracking-wider border-0 rounded cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
              style={{
                background: "var(--accent)",
                color: "#0a0a0a",
                minHeight: "44px",
              }}
              aria-label={`Confirm release of ${amount.toFixed(2)} XLM for ${milestoneName}`}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              onFocus={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Confirm Release →
            </button>
          </div>

          {/* Keyboard Hints */}
          <div className="mt-4 text-center text-xs text-[var(--muted)]">
            Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface3)] font-mono">Enter</kbd> to confirm or{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface3)] font-mono">Esc</kbd> to cancel
          </div>
        </div>
      </div>
    </>
  );
}
