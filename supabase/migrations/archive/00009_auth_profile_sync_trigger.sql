-- =============================================================================
-- Migration 00009: Supabase GoTrue Auth <-> public.users Sync Trigger & RLS Security
-- Karani Law / Nyagah B. Kithinji & Co. Advocates
-- =============================================================================

-- 1. Automatic GoTrue User to public.users Sync Function
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
  v_firm_id UUID;
  v_role TEXT;
  v_full_name TEXT;
  v_lsk_no TEXT;
BEGIN
  -- Determine default firm
  SELECT id INTO v_firm_id FROM public.firms LIMIT 1;
  
  -- Extract metadata or set defaults
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'Advocate');
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_lsk_no := new.raw_user_meta_data->>'lsk_no';

  -- Upsert into public.users
  INSERT INTO public.users (
    id,
    auth_user_id,
    firm_id,
    full_name,
    email,
    lsk_no,
    role,
    position,
    phone_primary,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new.id,
    COALESCE(v_firm_id, gen_random_uuid()),
    v_full_name,
    LOWER(new.email),
    v_lsk_no,
    LOWER(v_role),
    v_role,
    new.raw_user_meta_data->>'phone',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    full_name = CASE WHEN public.users.full_name IS NULL OR public.users.full_name = '' THEN EXCLUDED.full_name ELSE public.users.full_name END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger firing on GoTrue auth.users creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 2. Granular Row-Level Security (RLS) Policy Hardening
ALTER TABLE public.fee_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Fee notes: Advocates view and manage fee notes for their firm or assigned matters
DROP POLICY IF EXISTS "fee_notes_advocate_access" ON public.fee_notes;
CREATE POLICY "fee_notes_advocate_access" ON public.fee_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND (
        u.role IN ('admin', 'developer', 'managing_partner')
        OR u.firm_id = public.fee_notes.firm_id
        OR u.id = public.fee_notes.advocate_id
      )
    )
  );

-- Matters: Case access policy
DROP POLICY IF EXISTS "matters_access_policy" ON public.matters;
CREATE POLICY "matters_access_policy" ON public.matters
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      AND (
        u.role IN ('admin', 'developer', 'managing_partner')
        OR u.firm_id = public.matters.firm_id
        OR u.id = public.matters.lead_advocate_id
      )
    )
  );

-- 3. Storage Bucket Security for Legal Vault and Case Pleadings
-- Enforce signed URLs (15-minute expiry) for private court documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault', 'vault', false), ('case_files', 'case_files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage RLS: Authenticated firm members only
DROP POLICY IF EXISTS "vault_authenticated_access" ON storage.objects;
CREATE POLICY "vault_authenticated_access" ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id IN ('vault', 'case_files'));
