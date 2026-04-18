-- Migration: Create delivery_verifications table for AI-powered delivery verification
-- Feature: ai-delivery-verification
-- Task: 1.2 Create delivery_verifications table migration
-- Requirements: 2.3, 2.4, 2.5, 2.6, 6.1, 6.2, 6.3, 6.5, 6.6

-- Create delivery_verifications table
CREATE TABLE IF NOT EXISTS delivery_verifications (
  -- Primary key and timestamps
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key
  submission_id UUID NOT NULL REFERENCES work_submissions(id) ON DELETE CASCADE,
  
  -- Verification results
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('approve', 'request_changes', 'reject')),
  feedback TEXT NOT NULL,
  gaps TEXT[],
  
  -- Audit trail
  raw_response JSONB NOT NULL,
  
  -- One verification per submission
  CONSTRAINT unique_submission_verification UNIQUE (submission_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_verifications_submission_id ON delivery_verifications(submission_id);
CREATE INDEX IF NOT EXISTS idx_delivery_verifications_score ON delivery_verifications(score);
CREATE INDEX IF NOT EXISTS idx_delivery_verifications_recommendation ON delivery_verifications(recommendation);

-- Enable Row Level Security
ALTER TABLE delivery_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view verifications for their escrow submissions"
  ON delivery_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_submissions
      JOIN escrows ON escrows.id = work_submissions.escrow_id
      WHERE work_submissions.id = delivery_verifications.submission_id
      AND escrows.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert verifications"
  ON delivery_verifications FOR INSERT
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE delivery_verifications IS 'Stores AI-powered verification results for work submissions';
COMMENT ON COLUMN delivery_verifications.submission_id IS 'Reference to the work submission being verified';
COMMENT ON COLUMN delivery_verifications.score IS 'AI-generated confidence score from 0-100 indicating how well submission meets requirements';
COMMENT ON COLUMN delivery_verifications.recommendation IS 'AI recommendation: approve (>=80), request_changes (50-79), or reject (<50)';
COMMENT ON COLUMN delivery_verifications.feedback IS 'AI-generated explanation of the score and recommendation';
COMMENT ON COLUMN delivery_verifications.gaps IS 'Array of specific missing elements when score < 80';
COMMENT ON COLUMN delivery_verifications.raw_response IS 'Complete OpenAI API response for audit trail';

