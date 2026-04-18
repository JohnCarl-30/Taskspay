-- Allow users to read/write their own escrows by wallet_address, not just user_id.
-- This fixes the issue where a new anonymous session creates a new user_id,
-- making old escrows invisible even though the same wallet is connected.

-- SELECT: own user_id OR matching wallet address from JWT metadata
DROP POLICY IF EXISTS "Users can view their own escrows" ON escrows;
CREATE POLICY "Users can view their own escrows" ON escrows
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  );

-- INSERT: allow authenticated users to insert their own
DROP POLICY IF EXISTS "Users can insert their own escrows" ON escrows;
CREATE POLICY "Users can insert their own escrows" ON escrows
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: own user_id OR matching wallet address
DROP POLICY IF EXISTS "Users can update their own escrows" ON escrows;
CREATE POLICY "Users can update their own escrows" ON escrows
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  );
