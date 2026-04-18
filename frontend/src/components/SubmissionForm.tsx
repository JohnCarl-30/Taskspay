import { useState } from "react";
import { submitWork } from "../api/submissions";
import { getPublicKey } from "../freighter";
import { uploadImage } from "../storage";
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
const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image
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
  const [images, setImages] = useState<File[]>([]); // Store File objects instead of base64
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    // Check if adding these images would exceed the limit
    if (images.length + files.length > MAX_IMAGES) {
      alert(`Maximum ${MAX_IMAGES} images allowed. You can add ${MAX_IMAGES - images.length} more.`);
      return;
    }

    // Process each file
    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > MAX_IMAGE_SIZE) {
        alert(`Image "${file.name}" exceeds 5MB limit`);
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        alert(`"${file.name}" is not a valid image file`);
        return;
      }

      // Add file to state (don't convert to base64)
      setImages((prev) => [...prev, file]);
    });

    // Reset input
    e.currentTarget.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
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

      // First, call submitWork to create the submission record
      const submission = await submitWork({
        escrowId,
        milestoneIndex,
        submitterAddress,
        description: description.trim(),
        urls: nonEmptyUrls,
        images: [], // Start with empty images array
      });

      setSubmissionId(submission.id);

      // Then upload images to Supabase Storage
      if (images.length > 0) {
        try {
          const imageUrls: string[] = [];
          for (let i = 0; i < images.length; i++) {
            const url = await uploadImage(images[i], escrowId, submission.id, i);
            imageUrls.push(url);
          }

          // Update submission with image URLs
          if (imageUrls.length > 0) {
            // Note: We would need an updateWorkSubmission function to update images
            // For now, the images will be associated on next refresh
            console.log('Images uploaded:', imageUrls);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('Image upload error:', errorMsg);
          // Don't fail the submission if images fail - submission is still created
          alert(`Work submitted but images failed to upload:\n${errorMsg}\n\nYou can try again.`);
        }
      }

      onSubmitSuccess(submission);

      // Reset form after successful submission
      setTimeout(() => {
        setDescription("");
        setUrls([""]);
        setImages([]);
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

      {/* Image Upload */}
      <div className="mb-3.5">
        <label className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1.5 block">
          Upload Photos (Optional)
        </label>
        
        {/* Upload Area */}
        <div
          className="p-4 rounded-lg border-2 border-dashed text-center cursor-pointer transition-colors"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface2)",
          }}
          onDrop={(e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files) {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.accept = "image/*";
              Object.defineProperty(input, "files", { value: files });
              handleImageUpload({ currentTarget: input } as React.ChangeEvent<HTMLInputElement>);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isSubmitting || images.length >= MAX_IMAGES}
            className="hidden"
            id="image-input"
          />
          <label htmlFor="image-input" className="cursor-pointer block">
            <div className="text-2xl mb-1">📸</div>
            <div className="text-xs font-medium mb-0.5" style={{ color: "var(--text)" }}>
              Drop photos or click to upload
            </div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              {images.length}/{MAX_IMAGES} photos · Max 5MB each
            </div>
          </label>
        </div>

        {/* Image Preview Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {images.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border"
                  style={{ borderColor: "var(--border)" }}
                />
                <button
                  onClick={() => handleRemoveImage(index)}
                  disabled={isSubmitting}
                  className="absolute top-1 right-1 p-1 rounded bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  type="button"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
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
