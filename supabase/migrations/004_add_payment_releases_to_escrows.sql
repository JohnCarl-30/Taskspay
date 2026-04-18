-- Migration: Add payment_releases column to escrows table
-- Feature: ai-delivery-verification
-- Task: 1.3 Add payment_releases column to escrows table
-- Requirements: 5.5

-- Add payment_releases column to track verification displayed at payment release
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS payment_releases JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN escrows.payment_releases IS 'Audit trail of payment releases with verification data. Array of objects containing milestone_index, released_at, verification_id, score, and recommendation';

-- Example structure:
-- [
--   {
--     "milestone_index": 0,
--     "released_at": "2024-01-15T10:30:00Z",
--     "verification_id": "uuid",
--     "score": 85,
--     "recommendation": "approve"
--   }
-- ]
