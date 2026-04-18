-- Migration: Add images column to work_submissions table
-- Purpose: Allow freelancers to upload photos/images as part of work submission
-- Images are stored in Supabase Storage, this column stores the URLs

ALTER TABLE work_submissions 
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}' 
  CHECK (array_length(images, 1) IS NULL OR array_length(images, 1) <= 10);

-- Add comment explaining the images column
COMMENT ON COLUMN work_submissions.images IS 'Array of image URLs stored in Supabase Storage (max 10 images)';
