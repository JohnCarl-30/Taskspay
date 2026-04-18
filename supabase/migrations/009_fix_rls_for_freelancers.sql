-- Extend RLS so freelancers can read escrows assigned to them and the related
-- work_submissions / delivery_verifications. Also allow freelancers to INSERT
-- their own work submissions.

-- ── escrows ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own escrows" ON escrows;
CREATE POLICY "Users can view their own escrows" ON escrows
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
    OR freelancer_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  );

-- ── work_submissions ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view submissions for their escrows" ON work_submissions;
CREATE POLICY "Users can view submissions for their escrows"
  ON work_submissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM escrows
      WHERE escrows.id = work_submissions.escrow_id
        AND (
          escrows.user_id = auth.uid()
          OR escrows.wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
          OR escrows.freelancer_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert submissions for their escrows" ON work_submissions;
CREATE POLICY "Users can insert submissions for their escrows"
  ON work_submissions FOR INSERT TO authenticated
  WITH CHECK (
    submitter_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
    AND EXISTS (
      SELECT 1 FROM escrows
      WHERE escrows.id = escrow_id
        AND escrows.freelancer_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
    )
  );

-- Allow the freelancer (submitter) to update their own submission
-- (client_decision is updated by the client; this covers other fields if needed).
DROP POLICY IF EXISTS "Users can update their own submissions" ON work_submissions;
CREATE POLICY "Users can update submissions for their escrows"
  ON work_submissions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM escrows
      WHERE escrows.id = work_submissions.escrow_id
        AND (
          escrows.user_id = auth.uid()
          OR escrows.wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
          OR escrows.freelancer_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
        )
    )
  );

-- ── delivery_verifications ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view verifications for their escrow submissions" ON delivery_verifications;
CREATE POLICY "Users can view verifications for their escrow submissions"
  ON delivery_verifications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_submissions ws
      JOIN escrows e ON e.id = ws.escrow_id
      WHERE ws.id = delivery_verifications.submission_id
        AND (
          e.user_id = auth.uid()
          OR e.wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
          OR e.freelancer_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
        )
    )
  );

-- Speeds up freelancer dashboard queries.
CREATE INDEX IF NOT EXISTS idx_escrows_freelancer_address
  ON escrows(freelancer_address);
