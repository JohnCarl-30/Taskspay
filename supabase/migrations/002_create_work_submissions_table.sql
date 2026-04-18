-- Migration: Create work_submissions table for AI-powered delivery verification
-- Feature: ai-delivery-verification
-- Task: 1.1 Create work_submissions table migration
-- Requirements: 1.2, 1.5, 6.1, 6.2, 6.3, 6.4, 6.6

-- Create work_submissions table
CREATE TABLE IF NOT EXISTS work_submissions (
  -- Primary key and timestamps
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign keys
  escrow_id UUID NOT NULL REFERENCES escrows(id) ON DELETE CASCADE,
  milestone_index INTEGER NOT NULL CHECK (milestone_index >= 0),
  
  -- Submitter info
  submitter_address TEXT NOT NULL,
  
  -- Submission content
  description TEXT NOT NULL CHECK (char_length(description) <= 2000),
  urls TEXT[] NOT NULL DEFAULT '{}' CHECK (array_length(urls, 1) IS NULL OR array_length(urls, 1) <= 5),
  
  -- Constraints
  CONSTRAINT unique_escrow_milestone_submission UNIQUE (escrow_id, milestone_index, created_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_submissions_escrow_id ON work_submissions(escrow_id);
CREATE INDEX IF NOT EXISTS idx_work_submissions_milestone ON work_submissions(escrow_id, milestone_index);
CREATE INDEX IF NOT EXISTS idx_work_submissions_created_at ON work_submissions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE work_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view submissions for their escrows"
  ON work_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM escrows
      WHERE escrows.id = work_submissions.escrow_id
      AND escrows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert submissions for their escrows"
  ON work_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM escrows
      WHERE escrows.id = work_submissions.escrow_id
      AND escrows.user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE work_submissions IS 'Stores freelancer work submissions for milestone completion verification';
COMMENT ON COLUMN work_submissions.escrow_id IS 'Reference to the parent escrow contract';
COMMENT ON COLUMN work_submissions.milestone_index IS 'Zero-based index of the milestone this submission is for';
COMMENT ON COLUMN work_submissions.submitter_address IS 'Stellar public key of the freelancer submitting the work';
COMMENT ON COLUMN work_submissions.description IS 'Text description of completed work (max 2000 characters)';
COMMENT ON COLUMN work_submissions.urls IS 'Array of URLs providing evidence of work completion (max 5 URLs)';
