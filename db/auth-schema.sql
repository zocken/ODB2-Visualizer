-- E-Mail-Bestätigung und Passwortvergabe bei der ersten Anmeldung sind getrennt.
CREATE TABLE IF NOT EXISTS auth_users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  display_name text NOT NULL DEFAULT '',
  password_hash text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);
CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('verify', 'setup', 'reset')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE(user_id, kind)
);
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 1
);
-- Serialize admin mutations so concurrent requests cannot remove all administrators.
CREATE TABLE IF NOT EXISTS auth_admin_guard (id integer PRIMARY KEY CHECK (id = 1));
INSERT INTO auth_admin_guard(id) VALUES (1) ON CONFLICT DO NOTHING;

-- TOTP-Geheimnisse sind mit einem separaten Laufzeitschlüssel verschlüsselt.
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS mfa_secret text;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS mfa_enabled_at timestamptz;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS mfa_last_counter bigint NOT NULL DEFAULT -1;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS mfa_pending_secret text;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS mfa_pending_expires timestamptz;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS mfa_recovery_hashes text[] NOT NULL DEFAULT '{}';
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS mfa_verified boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS auth_mfa_challenges (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth_users(id) ON DELETE CASCADE,
  credential_hash text NOT NULL,
  factor_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0
);
