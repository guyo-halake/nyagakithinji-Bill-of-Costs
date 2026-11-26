-- Private document storage and restricted platform-admin settings.

INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-vault', 'legal-vault', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS legal_vault_read ON storage.objects;
CREATE POLICY legal_vault_read ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'legal-vault'
    AND (storage.foldername(name))[1] = public.current_firm_id()::text
);

DROP POLICY IF EXISTS legal_vault_insert ON storage.objects;
CREATE POLICY legal_vault_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'legal-vault'
    AND (storage.foldername(name))[1] = public.current_firm_id()::text
);

DROP POLICY IF EXISTS legal_vault_update ON storage.objects;
CREATE POLICY legal_vault_update ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'legal-vault'
    AND (storage.foldername(name))[1] = public.current_firm_id()::text
)
WITH CHECK (
    bucket_id = 'legal-vault'
    AND (storage.foldername(name))[1] = public.current_firm_id()::text
);

DROP POLICY IF EXISTS legal_vault_delete ON storage.objects;
CREATE POLICY legal_vault_delete ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'legal-vault'
    AND (storage.foldername(name))[1] = public.current_firm_id()::text
    AND public.has_permission('document.delete', public.current_firm_id())
);

DROP POLICY IF EXISTS "Allow authenticated read access to global_settings" ON public.global_settings;
CREATE POLICY global_settings_read ON public.global_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated update to global_settings" ON public.global_settings;
CREATE POLICY global_settings_update ON public.global_settings FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'developer') AND is_active = true
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'developer') AND is_active = true
));

DROP POLICY IF EXISTS "Allow authenticated insert to admin_audit_logs" ON public.admin_audit_logs;
CREATE POLICY admin_audit_insert ON public.admin_audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow authenticated read access to admin_audit_logs" ON public.admin_audit_logs;
CREATE POLICY admin_audit_read ON public.admin_audit_logs FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'developer') AND is_active = true
));