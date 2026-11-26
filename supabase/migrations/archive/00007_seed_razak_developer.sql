-- Seed the requested developer profile and link it to Supabase Auth by email.
-- The Auth invitation is created outside SQL; this migration is safe before or after that invite.

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS position TEXT,
    ADD COLUMN IF NOT EXISTS phone_primary TEXT,
    ADD COLUMN IF NOT EXISTS phone_secondary TEXT;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('senior_partner', 'partner', 'advocate', 'legal_assistant', 'finance_manager', 'admin', 'developer'));

INSERT INTO public.users (
    id,
    firm_id,
    full_name,
    email,
    lsk_no,
    role,
    position,
    phone_primary,
    is_active
)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Razak Wako',
    'razakwako45@gmail.com',
    'P3L/DEV/2026/045',
    'developer',
    'Developer & System Administrator',
    '+254141888585',
    true
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    firm_id = EXCLUDED.firm_id,
    role = EXCLUDED.role,
    position = EXCLUDED.position,
    phone_primary = EXCLUDED.phone_primary,
    is_active = true;

CREATE OR REPLACE FUNCTION public.link_auth_user_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.users
    SET auth_user_id = NEW.id,
        email = COALESCE(NEW.email, email)
    WHERE lower(email) = lower(NEW.email);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_auth_user_to_profile_trigger ON auth.users;
CREATE TRIGGER link_auth_user_to_profile_trigger
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.link_auth_user_to_profile();

UPDATE public.users profile
SET auth_user_id = auth_profile.id
FROM auth.users auth_profile
WHERE lower(auth_profile.email) = lower(profile.email)
  AND profile.email = 'razakwako45@gmail.com';

INSERT INTO public.user_role_assignments (user_id, role_template_id, assigned_by)
SELECT profile.id, template.id, profile.id
FROM public.users profile
JOIN public.role_templates template ON template.code = 'developer_sys_admin' AND template.firm_id IS NULL
WHERE profile.email = 'razakwako45@gmail.com'
ON CONFLICT (user_id, role_template_id) DO NOTHING;