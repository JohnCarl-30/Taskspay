import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmationDialog from "./ConfirmationDialog";
import type { DeliveryVerification } from "../supabase";

describe("ConfirmationDialog", () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    milestoneName: "Initial Design",
    amount: 100.5,
    verification: null,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("displays milestone name and amount", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      expect(screen.getByText("Initial Design")).toBeInTheDocument();
      expect(screen.getByText("100.50 XLM")).toBeInTheDocument();
    });

    it("shows warning when no verification exists", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      expect(screen.getByText("No verification available")).toBeInTheDocument();
      expect(
        screen.getByText(
          "No work submission has been verified for this milestone."
        )
      ).toBeInTheDocument();
    });

    it("shows verification score and recommendation when available", () => {
      const verification: DeliveryVerification = {
        id: "v1",
        created_at: "2024-01-01T00:00:00Z",
        submission_id: "s1",
        score: 85,
        recommendation: "approve",
        feedback: "Great work!",
        gaps: null,
        raw_response: {},
      };

      render(<ConfirmationDialog {...defaultProps} verification={verification} />);

      expect(screen.getByText("Verification approved")).toBeInTheDocument();
      expect(screen.getByText(/Score: 85\/100/)).toBeInTheDocument();
      expect(screen.getByText('"Great work!"')).toBeInTheDocument();
    });

    it("shows strong warning for reject recommendation", () => {
      const verification: DeliveryVerification = {
        id: "v1",
        created_at: "2024-01-01T00:00:00Z",
        submission_id: "s1",
        score: 35,
        recommendation: "reject",
        feedback: "Does not meet requirements",
        gaps: null,
        raw_response: {},
      };

      render(<ConfirmationDialog {...defaultProps} verification={verification} />);

      expect(
        screen.getByText("Verification recommends rejection")
      ).toBeInTheDocument();
      expect(screen.getByText(/Score: 35\/100/)).toBeInTheDocument();
      expect(
        screen.getByText(/Consider requesting changes before releasing payment/)
      ).toBeInTheDocument();
    });

    it("shows caution for request_changes recommendation", () => {
      const verification: DeliveryVerification = {
        id: "v1",
        created_at: "2024-01-01T00:00:00Z",
        submission_id: "s1",
        score: 65,
        recommendation: "request_changes",
        feedback: "Minor improvements needed",
        gaps: null,
        raw_response: {},
      };

      render(<ConfirmationDialog {...defaultProps} verification={verification} />);

      expect(
        screen.getByText("Verification suggests changes")
      ).toBeInTheDocument();
      expect(screen.getByText(/Score: 65\/100/)).toBeInTheDocument();
      expect(
        screen.getByText(/Review feedback before proceeding/)
      ).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls onConfirm when confirm button clicked", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      const confirmButton = screen.getByText(/Confirm Release/);
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it("calls onCancel when cancel button clicked", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it("calls onCancel when backdrop is clicked", () => {
      const { container } = render(<ConfirmationDialog {...defaultProps} />);

      // Find the backdrop (first fixed div with z-40)
      const backdrop = container.querySelector(".fixed.z-40");
      expect(backdrop).toBeInTheDocument();

      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("closes on Escape key press", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      fireEvent.keyDown(window, { key: "Escape" });

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("confirms on Enter key press", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      fireEvent.keyDown(window, { key: "Enter" });

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("has proper dialog role and aria attributes", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "dialog-title");
    });

    it("has accessible title", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      const title = screen.getByText("Confirm Payment Release");
      expect(title).toHaveAttribute("id", "dialog-title");
    });

    it("focuses confirm button on mount", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      const confirmButton = screen.getByText(/Confirm Release/);
      expect(confirmButton).toHaveFocus();
    });

    it("displays keyboard hints", () => {
      render(<ConfirmationDialog {...defaultProps} />);

      expect(screen.getByText("Enter")).toBeInTheDocument();
      expect(screen.getByText("Esc")).toBeInTheDocument();
    });
  });
});
