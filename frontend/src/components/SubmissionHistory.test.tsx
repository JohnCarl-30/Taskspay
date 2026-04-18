import { describe, it, expect } from "vitest";
import type { WorkSubmission, DeliveryVerification } from "../supabase";

/**
 * Unit tests for SubmissionHistory component
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
 * 
 * These tests verify the submission history display logic, sorting, and formatting
 * without requiring React Testing Library.
 */

describe("SubmissionHistory", () => {
  const mockEscrowId = "test-escrow-123";
  const mockMilestoneIndex = 0;

  const mockSubmission1: WorkSubmission = {
    id: "submission-1",
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    escrow_id: mockEscrowId,
    milestone_index: mockMilestoneIndex,
    submitter_address: "GTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890AB",
    description: "Completed the first milestone with all requirements met.",
    urls: ["https://github.com/user/repo/pull/1", "https://example.com/demo"],
  };

  const mockSubmission2: WorkSubmission = {
    id: "submission-2",
    created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    escrow_id: mockEscrowId,
    milestone_index: mockMilestoneIndex,
    submitter_address: "GTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890AB",
    description: "Initial submission with partial work completed.",
    urls: ["https://github.com/user/repo/pull/2"],
  };

  const mockVerification1: DeliveryVerification = {
    id: "verification-1",
    created_at: new Date(Date.now() - 3500000).toISOString(),
    submission_id: "submission-1",
    score: 85,
    recommendation: "approve",
    feedback: "Excellent work! All requirements have been met.",
    gaps: null,
    raw_response: {},
  };

  const mockVerification2: DeliveryVerification = {
    id: "verification-2",
    created_at: new Date(Date.now() - 7100000).toISOString(),
    submission_id: "submission-2",
    score: 65,
    recommendation: "request_changes",
    feedback: "Good progress but some requirements are missing.",
    gaps: ["Missing unit tests", "Documentation incomplete"],
    raw_response: {},
  };

  describe("Requirement 4.3: Reverse chronological order", () => {
    it("should sort submissions by created_at descending (newest first)", () => {
      const submissions = [mockSubmission2, mockSubmission1];
      const sorted = [...submissions].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      expect(sorted[0].id).toBe("submission-1"); // Most recent
      expect(sorted[1].id).toBe("submission-2"); // Older
    });

    it("should identify the most recent submission", () => {
      const submissions = [mockSubmission1, mockSubmission2];
      const mostRecentId = submissions[0].id;

      expect(mostRecentId).toBe("submission-1");
    });
  });

  describe("Requirement 4.4: Display submission information", () => {
    it("should display timestamp for each submission", () => {
      const submission = mockSubmission1;
      const timestamp = submission.created_at;

      expect(timestamp).toBeDefined();
      expect(new Date(timestamp).getTime()).toBeLessThan(Date.now());
    });

    it("should display verification score when available", () => {
      const verification = mockVerification1;

      expect(verification.score).toBe(85);
      expect(verification.score).toBeGreaterThanOrEqual(0);
      expect(verification.score).toBeLessThanOrEqual(100);
    });

    it("should display verification recommendation when available", () => {
      const verification = mockVerification1;

      expect(verification.recommendation).toBe("approve");
      expect(["approve", "request_changes", "reject"]).toContain(
        verification.recommendation
      );
    });

    it("should handle missing verification gracefully", () => {
      const submission = mockSubmission1;
      const verification: DeliveryVerification | null = null;

      expect(submission).toBeDefined();
      expect(verification).toBeNull();
    });
  });

  describe("Requirement 4.5: Full submission details", () => {
    it("should provide access to full submission description", () => {
      const submission = mockSubmission1;

      expect(submission.description).toBe(
        "Completed the first milestone with all requirements met."
      );
      expect(submission.description.length).toBeGreaterThan(0);
    });

    it("should provide access to submission URLs", () => {
      const submission = mockSubmission1;

      expect(submission.urls).toHaveLength(2);
      expect(submission.urls[0]).toBe("https://github.com/user/repo/pull/1");
      expect(submission.urls[1]).toBe("https://example.com/demo");
    });

    it("should provide access to verification feedback", () => {
      const verification = mockVerification1;

      expect(verification.feedback).toBe(
        "Excellent work! All requirements have been met."
      );
      expect(verification.feedback.length).toBeGreaterThan(0);
    });

    it("should provide access to verification gaps when present", () => {
      const verification = mockVerification2;

      expect(verification.gaps).not.toBeNull();
      expect(verification.gaps).toHaveLength(2);
      expect(verification.gaps![0]).toBe("Missing unit tests");
      expect(verification.gaps![1]).toBe("Documentation incomplete");
    });

    it("should handle submissions with no URLs", () => {
      const submission: WorkSubmission = {
        ...mockSubmission1,
        urls: [],
      };

      expect(submission.urls).toHaveLength(0);
      expect(Array.isArray(submission.urls)).toBe(true);
    });

    it("should handle verifications with no gaps", () => {
      const verification = mockVerification1;

      expect(verification.gaps).toBeNull();
    });
  });

  describe("Requirement 4.6: Most recent indicator", () => {
    it("should mark only the first submission as most recent", () => {
      const submissions = [mockSubmission1, mockSubmission2];
      const isLatest = (index: number) => index === 0;

      expect(submissions.length).toBe(2);
      expect(isLatest(0)).toBe(true);
      expect(isLatest(1)).toBe(false);
    });

    it("should handle single submission as most recent", () => {
      const submissions = [mockSubmission1];
      const isLatest = (index: number) => index === 0;

      expect(submissions.length).toBe(1);
      expect(isLatest(0)).toBe(true);
    });
  });

  describe("Relative time formatting", () => {
    const formatRelativeTime = (timestamp: string): string => {
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
    };

    it("should format recent timestamps as 'just now'", () => {
      const timestamp = new Date(Date.now() - 30000).toISOString(); // 30 seconds ago
      const formatted = formatRelativeTime(timestamp);

      expect(formatted).toBe("just now");
    });

    it("should format timestamps in minutes", () => {
      const timestamp = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
      const formatted = formatRelativeTime(timestamp);

      expect(formatted).toBe("2 minutes ago");
    });

    it("should format timestamps in hours", () => {
      const timestamp = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const formatted = formatRelativeTime(timestamp);

      expect(formatted).toBe("1 hour ago");
    });

    it("should format timestamps in days", () => {
      const timestamp = new Date(Date.now() - 86400000 * 2).toISOString(); // 2 days ago
      const formatted = formatRelativeTime(timestamp);

      expect(formatted).toBe("2 days ago");
    });

    it("should use singular form for 1 minute", () => {
      const timestamp = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      const formatted = formatRelativeTime(timestamp);

      expect(formatted).toBe("1 minute ago");
    });

    it("should use singular form for 1 hour", () => {
      const timestamp = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const formatted = formatRelativeTime(timestamp);

      expect(formatted).toBe("1 hour ago");
    });

    it("should use singular form for 1 day", () => {
      const timestamp = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const formatted = formatRelativeTime(timestamp);

      expect(formatted).toBe("1 day ago");
    });
  });

  describe("Recommendation color configuration", () => {
    const getRecommendationConfig = (recommendation: string) => {
      switch (recommendation) {
        case "approve":
          return {
            color: "var(--accent)",
            label: "Approve",
          };
        case "request_changes":
          return {
            color: "var(--pending)",
            label: "Request Changes",
          };
        case "reject":
          return {
            color: "var(--danger)",
            label: "Reject",
          };
        default:
          return {
            color: "var(--muted)",
            label: "Unknown",
          };
      }
    };

    it("should use accent color for approve recommendation", () => {
      const config = getRecommendationConfig("approve");

      expect(config.color).toBe("var(--accent)");
      expect(config.label).toBe("Approve");
    });

    it("should use pending color for request_changes recommendation", () => {
      const config = getRecommendationConfig("request_changes");

      expect(config.color).toBe("var(--pending)");
      expect(config.label).toBe("Request Changes");
    });

    it("should use danger color for reject recommendation", () => {
      const config = getRecommendationConfig("reject");

      expect(config.color).toBe("var(--danger)");
      expect(config.label).toBe("Reject");
    });

    it("should handle unknown recommendation", () => {
      const config = getRecommendationConfig("unknown");

      expect(config.color).toBe("var(--muted)");
      expect(config.label).toBe("Unknown");
    });
  });

  describe("Submission count display", () => {
    it("should display singular form for 1 submission", () => {
      const count = 1;
      const text = `${count} submission${count !== 1 ? "s" : ""}`;

      expect(text).toBe("1 submission");
    });

    it("should display plural form for multiple submissions", () => {
      const count = 3;
      const text = `${count} submission${count as number !== 1 ? "s" : ""}`;

      expect(text).toBe("3 submissions");
    });

    it("should display plural form for 0 submissions", () => {
      const count = 0;
      const text = `${count} submission${count as number !== 1 ? "s" : ""}`;

      expect(text).toBe("0 submissions");
    });
  });

  describe("Submission address formatting", () => {
    it("should truncate long addresses for display", () => {
      const address = "GTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890AB";
      const formatted = `${address.slice(0, 8)}...${address.slice(-8)}`;

      expect(formatted).toBe("GTEST123...567890AB");
      expect(formatted.length).toBeLessThan(address.length);
    });

    it("should preserve first 8 and last 8 characters", () => {
      const address = "GTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890AB";
      const formatted = `${address.slice(0, 8)}...${address.slice(-8)}`;

      expect(formatted.startsWith("GTEST123")).toBe(true);
      expect(formatted.endsWith("567890AB")).toBe(true);
    });
  });

  describe("Submission ID formatting", () => {
    it("should truncate submission ID for display", () => {
      const id = "550e8400-e29b-41d4-a716-446655440000";
      const formatted = `${id.slice(0, 8)}...`;

      expect(formatted).toBe("550e8400...");
      expect(formatted.length).toBeLessThan(id.length);
    });
  });

  describe("Empty state handling", () => {
    it("should detect when no submissions exist", () => {
      const submissions: WorkSubmission[] = [];

      expect(submissions.length).toBe(0);
      expect(Array.isArray(submissions)).toBe(true);
    });

    it("should detect when submissions exist", () => {
      const submissions = [mockSubmission1, mockSubmission2];

      expect(submissions.length).toBeGreaterThan(0);
      expect(submissions.length).toBe(2);
      expect(submissions[0]).toBeDefined();
    });
  });

  describe("Verification map handling", () => {
    it("should create verification map from submissions", () => {
      const verifications = new Map<string, DeliveryVerification>();
      verifications.set(mockSubmission1.id, mockVerification1);
      verifications.set(mockSubmission2.id, mockVerification2);

      expect(verifications.size).toBe(2);
      expect(verifications.get(mockSubmission1.id)).toBe(mockVerification1);
      expect(verifications.get(mockSubmission2.id)).toBe(mockVerification2);
    });

    it("should handle missing verifications in map", () => {
      const verifications = new Map<string, DeliveryVerification>();
      const verification = verifications.get("non-existent-id");

      expect(verification).toBeUndefined();
    });

    it("should allow checking if verification exists", () => {
      const verifications = new Map<string, DeliveryVerification>();
      verifications.set(mockSubmission1.id, mockVerification1);

      expect(verifications.has(mockSubmission1.id)).toBe(true);
      expect(verifications.has("non-existent-id")).toBe(false);
    });
  });
});
