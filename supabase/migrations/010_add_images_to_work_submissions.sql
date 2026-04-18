-- Migration: Add images column to work_submissions table
-- Purpose: Allow freelancers to upload photos/images as part of work submission

ALTER TABLE work_submissions 
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}' 
  CHECK (array_length(images, 1) IS NULL OR array_length(images, 1) <= 10);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_work_submissions_images 
  ON work_submissions USING GIN (images);

-- Add comment explaining the images column
COMMENT ON COLUMN work_submissions.images IS 'Array of base64-encoded images or image URLs (max 10 images)';
