import { useState } from "react";
import { submitWork } from "../api/submissions";
import { getPublicKey } from "../freighter";
import type { WorkSubmission } from "../supabase";

export interface SubmissionFormProps {
  escrowId: string;
  milestoneIndex: number;
  milestoneName: string;
  milestoneDescription: string;
  onSubmitSuccess: (submission: WorkSubmission) => void;
  onSubmitError: (error: Error) => void;
}

interface ValidationErrors {
  description?: string;
  urls?: string[];
}

const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_URLS = 5;
const URL_REGEX = /^https?:\/\/[^\s]+$/;

export default function SubmissionForm({
  escrowId,
  milestoneIndex,
  milestoneName,
  milestoneDescription,
  onSubmitSuccess,
  onSubmitError,
}: SubmissionFormProps) {
  const [description, setDescription] = useState("");
  const [urls, setUrls] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const remainingChars = MAX_DESCRIPTION_LENGTH - description.length;

  // Check if form is valid for submit button state
  const isFormValid = (): boolean => {
    // Description must be present and within limits
    if (!description.trim() || description.length > MAX_DESCRIPTION_LENGTH) {
      return false;
    }

    // Check URL validity
    const nonEmptyUrls = urls.filter((url) => url.trim());
    
    // Check maximum URL count
    if (nonEmptyUrls.length > MAX_URLS) {
      return false;
    }

    // Check URL format for all non-empty URLs
    for (const url of nonEmptyUrls) {
      if (!URL_REGEX.test(url.trim())) {
        return false;
      }
    }

    return true;
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Validate description length (1-2000 characters)
    if (!description.trim()) {
      errors.description = "Description is required";
    } else if (description.trim().length < 1) {
      errors.description = "Description must be at least 1 character";
    } else if (description.length > MAX_DESCRIPTION_LENGTH) {
      errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`;
    }

    // Validate URLs (format and maximum count)
    const urlErrors: string[] = [];
    const nonEmptyUrls = urls.filter((url) => url.trim());

    // Check maximum URL count
    if (nonEmptyUrls.length > MAX_URLS) {
      errors.urls = urlErrors;
      urlErrors[0] = `Maximum ${MAX_URLS} URLs allowed`;
    } else {
      // Validate each URL format
      urls.forEach((url, index) => {
        if (url.trim() && !URL_REGEX.test(url.trim())) {
          urlErrors[index] = "Invalid URL format (must start with http:// or https://)";
        }
      });

      if (urlErrors.length > 0 && urlErrors.some(e => e)) {
        errors.urls = urlErrors;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUrl = () => {
    if (urls.length < MAX_URLS) {
      setUrls([...urls, ""]);
    }
  };

  const handleRemoveUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls.length > 0 ? newUrls : [""]);
    
    // Clear URL-specific errors
    if (validationErrors.urls) {
      const newUrlErrors = [...validationErrors.urls];
      newUrlErrors.splice(index, 1);
      setValidationErrors({
        ...validationErrors,
        urls: newUrlErrors.length > 0 ? newUrlErrors : undefined,
      });
    }
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);

    // Clear error for this URL field if it becomes valid
    if (validationErrors.urls && validationErrors.urls[index]) {
      const trimmedValue = value.trim();
      if (!trimmedValue || URL_REGEX.test(trimmedValue)) {
        const newUrlErrors = [...validationErrors.urls];
        newUrlErrors[index] = "";
        setValidationErrors({
          ...validationErrors,
          urls: newUrlErrors.some((e) => e) ? newUrlErrors : undefined,
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setValidationErrors({});

    try {
      // Get the current user's wallet address
      const submitterAddress = await getPublicKey();
      
      if (!submitterAddress) {
        throw new Error("Unable to get wallet address. Please connect your Freighter wallet.");
      }

      // Filter out empty URLs
      const nonEmptyUrls = urls.filter((url) => url.trim());

      // Call the actual API
      const submission = await submitWork({
        escrowId,
        milestoneIndex,
        submitterAddress,
        description: description.trim(),
        urls: nonEmptyUrls,
      });

      setSubmissionId(submission.id);
      onSubmitSuccess(submission);

      // Reset form after successful submission
      setTimeout(() => {
        setDescription("");
        setUrls([""]);
        setSubmissionId(null);
      }, 3000);
    } catch (error) {
      console.error("Submission error:", error);
      onSubmitError(error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="p-5 rounded-lg border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="font-display text-sm font-bold uppercase tracking-wider mb-4 pb-3 border-b border-[var(--border)]">
        Submit Work Evidence
      </div>

      {/* Milestone context */}
      <div className="mb-3.5">
        <label className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1.5 block">
          Milestone {milestoneIndex + 1}
        </label>
        <div
          className="p-3 rounded-lg text-xs"
          style={{ background: "var(--surface2)", border: "0.5px solid var(--border)" }}
        >
          <div className="font-medium mb-0.5">{milestoneName}</div>
          <div className="text-[var(--muted)]">{milestoneDescription}</div>
        </div>
      </div>

      {/* Work description */}
      <div className="mb-3.5">
        <label className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1.5 block">
          Work Description
        </label>
        <textarea
          value={description}
          onChange={(e) => {
            const val = e.target.value;
            setDescription(val);
            if (validationErrors.description && val.trim() && val.length <= MAX_DESCRIPTION_LENGTH) {
              setValidationErrors({ ...validationErrors, description: undefined });
            }
          }}
          placeholder="Describe the work you've completed for this milestone..."
          className="input-field resize-none h-28"
          maxLength={MAX_DESCRIPTION_LENGTH}
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-[var(--danger)]">{validationErrors.description ?? ""}</span>
          <span
            className="text-xs"
            style={{ color: remainingChars < 100 ? "var(--danger)" : "var(--muted)" }}
          >
            {remainingChars} remaining
          </span>
        </div>
      </div>

      {/* Supporting URLs */}
      <div className="mb-3.5">
        <label className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1.5 block">
          Supporting URLs (Optional)
        </label>
        {urls.map((url, index) => (
          <div key={index} className="flex items-start gap-2 mb-2">
            <div className="flex-1">
              <input
                type="text"
                value={url}
                onChange={(e) => handleUrlChange(index, e.target.value)}
                placeholder="https://github.com/your-work"
                className="input-field"
                disabled={isSubmitting}
              />
              {validationErrors.urls?.[index] && (
                <div className="text-xs text-[var(--danger)] mt-1">
                  {validationErrors.urls[index]}
                </div>
              )}
            </div>
            {urls.length > 1 && (
              <button
                onClick={() => handleRemoveUrl(index)}
                disabled={isSubmitting}
                className="px-3 py-2 text-xs rounded border-0 cursor-pointer"
                style={{ background: "var(--danger-dim)", color: "var(--danger)" }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {urls.length < MAX_URLS && (
          <button
            onClick={handleAddUrl}
            disabled={isSubmitting}
            className="text-xs text-[var(--accent)] uppercase tracking-wider mt-1 bg-transparent border-0 cursor-pointer"
          >
            + Add URL ({urls.length}/{MAX_URLS})
          </button>
        )}
      </div>

      {/* Success state */}
      {submissionId && (
        <div
          className="p-3 rounded-lg mb-3 animate-fade-in"
          style={{ background: "var(--accent-dim)", border: "0.5px solid var(--accent-border)" }}
        >
          <div className="text-xs font-medium text-[var(--accent)]">
            ✓ Submitted · ID {submissionId.slice(0, 8)}...
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !isFormValid()}
        className="w-full py-2.5 text-xs font-display font-bold uppercase tracking-wider border-0 rounded cursor-pointer transition-colors"
        style={{
          background: "var(--accent)",
          color: "#0a0a0a",
          opacity: isSubmitting || !isFormValid() ? 0.5 : 1,
          cursor: isSubmitting || !isFormValid() ? "not-allowed" : "pointer",
        }}
      >
        {isSubmitting ? "✦ Submitting..." : "Submit Work Evidence →"}
      </button>
    </div>
  );
}
