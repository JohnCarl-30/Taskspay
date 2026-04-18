-- Migration: Create escrows table with all required columns
-- Feature: enhanced-amount-input
-- Task: 2.1 Create escrows table with all required columns
-- Requirements: 7.3, 12.3

-- Create escrows table
CREATE TABLE IF NOT EXISTS escrows (
  -- Primary key and timestamps
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- User & Addresses
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  freelancer_address TEXT NOT NULL,
  
  -- Escrow Details
  amount NUMERIC(20, 7) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  milestone_count INTEGER NOT NULL CHECK (milestone_count > 0),
  milestones JSONB NOT NULL,
  
  -- Transaction Info
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'refunded')),
  
  -- AI Verification
  verification_result JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_escrows_wallet_address ON escrows(wallet_address);
CREATE INDEX IF NOT EXISTS idx_escrows_created_at ON escrows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrows_user_id ON escrows(user_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);

-- Enable Row Level Security
ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own escrows"
  ON escrows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own escrows"
  ON escrows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own escrows"
  ON escrows FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on escrows table
CREATE TRIGGER update_escrows_updated_at
  BEFORE UPDATE ON escrows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE escrows IS 'Stores escrow transaction records with milestone details and verification results';
COMMENT ON COLUMN escrows.amount IS 'Total XLM amount for the escrow (up to 7 decimal places)';
COMMENT ON COLUMN escrows.milestone_count IS 'Number of milestones in the escrow';
COMMENT ON COLUMN escrows.milestones IS 'JSON array of milestone objects with name, description, percentage, and xlm amount';
COMMENT ON COLUMN escrows.verification_result IS 'AI verification result containing status, confidence, and feedback';
COMMENT ON COLUMN escrows.status IS 'Escrow status: pending (created), active (on blockchain), completed, or refunded';
