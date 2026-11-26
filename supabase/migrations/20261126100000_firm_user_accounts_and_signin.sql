ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_uidx
  ON public.users (lower(username))
  WHERE username IS NOT NULL AND username <> '';
