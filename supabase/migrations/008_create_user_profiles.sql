-- Persistent user role profiles keyed by wallet address.
-- Keyed by wallet_address (not user_id) so the profile survives Supabase
-- anonymous-auth session resets (the wallet address is stable; user_id isn't).

CREATE TABLE IF NOT EXISTS user_profiles (
  wallet_address TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('client', 'freelancer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view own profile" ON user_profiles;
CREATE POLICY "view own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (
    wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  );

DROP POLICY IF EXISTS "insert own profile" ON user_profiles;
CREATE POLICY "insert own profile"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (
    wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  );

DROP POLICY IF EXISTS "update own profile" ON user_profiles;
CREATE POLICY "update own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (
    wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  )
  WITH CHECK (
    wallet_address = (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
  );
