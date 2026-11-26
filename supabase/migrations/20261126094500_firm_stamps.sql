CREATE TABLE IF NOT EXISTS public.firm_stamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    category TEXT NOT NULL,
    matter_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    description TEXT NOT NULL DEFAULT '',
    signatory TEXT NOT NULL,
    lsk_number TEXT NOT NULL DEFAULT '',
    target_domain TEXT NOT NULL,
    image_path TEXT NOT NULL,
    qr_code_path TEXT NOT NULL,
    merged_stamp_path TEXT NOT NULL,
    short_token TEXT NOT NULL,
    sha256_fingerprint TEXT NOT NULL,
    verification_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    is_default BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (firm_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS firm_stamps_one_default_per_firm
    ON public.firm_stamps (firm_id)
    WHERE is_default;

ALTER TABLE public.firm_stamps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS firm_stamps_select ON public.firm_stamps;
CREATE POLICY firm_stamps_select
    ON public.firm_stamps FOR SELECT TO authenticated
    USING (public.is_firm_member(firm_id));

DROP POLICY IF EXISTS firm_stamps_insert ON public.firm_stamps;
CREATE POLICY firm_stamps_insert
    ON public.firm_stamps FOR INSERT TO authenticated
    WITH CHECK (
        public.is_firm_member(firm_id)
        AND public.has_permission('profile.update_firm', firm_id, 'Firm')
    );

DROP POLICY IF EXISTS firm_stamps_update ON public.firm_stamps;
CREATE POLICY firm_stamps_update
    ON public.firm_stamps FOR UPDATE TO authenticated
    USING (
        public.is_firm_member(firm_id)
        AND public.has_permission('profile.update_firm', firm_id, 'Firm')
    )
    WITH CHECK (
        public.is_firm_member(firm_id)
        AND public.has_permission('profile.update_firm', firm_id, 'Firm')
    );

DROP POLICY IF EXISTS firm_stamps_delete ON public.firm_stamps;
CREATE POLICY firm_stamps_delete
    ON public.firm_stamps FOR DELETE TO authenticated
    USING (
        public.is_firm_member(firm_id)
        AND public.has_permission('profile.update_firm', firm_id, 'Firm')
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.firm_stamps TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'firm-stamps',
    'firm-stamps',
    true,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS firm_stamps_storage_insert ON storage.objects;
CREATE POLICY firm_stamps_storage_insert
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'firm-stamps'
        AND (storage.foldername(name))[1] = public.current_firm_id()::text
        AND public.has_permission('profile.update_firm', public.current_firm_id(), 'Firm')
    );

DROP POLICY IF EXISTS firm_stamps_storage_update ON storage.objects;
CREATE POLICY firm_stamps_storage_update
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'firm-stamps'
        AND (storage.foldername(name))[1] = public.current_firm_id()::text
        AND public.has_permission('profile.update_firm', public.current_firm_id(), 'Firm')
    )
    WITH CHECK (
        bucket_id = 'firm-stamps'
        AND (storage.foldername(name))[1] = public.current_firm_id()::text
        AND public.has_permission('profile.update_firm', public.current_firm_id(), 'Firm')
    );

DROP POLICY IF EXISTS firm_stamps_storage_delete ON storage.objects;
CREATE POLICY firm_stamps_storage_delete
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'firm-stamps'
        AND (storage.foldername(name))[1] = public.current_firm_id()::text
        AND public.has_permission('profile.update_firm', public.current_firm_id(), 'Firm')
    );

CREATE OR REPLACE FUNCTION public.set_firm_default_stamp(target_stamp_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    active_firm_id UUID := public.current_firm_id();
BEGIN
    IF active_firm_id IS NULL
       OR NOT public.has_permission('profile.update_firm', active_firm_id, 'Firm') THEN
        RAISE EXCEPTION 'You do not have permission to change the firm stamp.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.firm_stamps
        WHERE id = target_stamp_id AND firm_id = active_firm_id
    ) THEN
        RAISE EXCEPTION 'The selected stamp was not found for this firm.';
    END IF;

    UPDATE public.firm_stamps
    SET is_default = false, updated_at = now()
    WHERE firm_id = active_firm_id AND is_default;

    UPDATE public.firm_stamps
    SET is_default = true, updated_at = now()
    WHERE id = target_stamp_id AND firm_id = active_firm_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_firm_default_stamp(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_firm_default_stamp(UUID) TO authenticated;

CREATE POLICY firm_stamps_storage_public_read
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'firm-stamps');
