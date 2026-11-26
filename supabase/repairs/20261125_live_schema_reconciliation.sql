BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS position TEXT,
    ADD COLUMN IF NOT EXISTS phone_primary TEXT,
    ADD COLUMN IF NOT EXISTS phone_secondary TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_uidx
    ON public.users (auth_user_id)
    WHERE auth_user_id IS NOT NULL;

UPDATE public.users AS profile
SET auth_user_id = auth_profile.id,
    updated_at = NOW()
FROM auth.users AS auth_profile
WHERE profile.auth_user_id IS NULL
  AND lower(profile.email) = lower(auth_profile.email);

CREATE OR REPLACE FUNCTION public.link_auth_user_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.users
    SET auth_user_id = NEW.id,
        updated_at = NOW()
    WHERE lower(email) = lower(NEW.email)
      AND auth_user_id IS DISTINCT FROM NEW.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_auth_user_to_profile_trigger ON auth.users;
CREATE TRIGGER link_auth_user_to_profile_trigger
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.link_auth_user_to_profile();

CREATE TABLE IF NOT EXISTS public.global_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_name TEXT NOT NULL DEFAULT 'Karani Law',
    domain TEXT NOT NULL DEFAULT 'karanilaw.com',
    theme_color TEXT NOT NULL DEFAULT '#000000',
    logo_url TEXT,
    vat_rate NUMERIC NOT NULL DEFAULT 16.0,
    rounding_rules BOOLEAN NOT NULL DEFAULT true,
    watermark_text TEXT NOT NULL DEFAULT 'DRAFT',
    pdf_margin NUMERIC NOT NULL DEFAULT 15.0,
    max_file_size_mb INTEGER NOT NULL DEFAULT 50,
    allowed_file_types TEXT[] NOT NULL DEFAULT ARRAY['.pdf', '.docx', '.xlsx'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permission_catalog (
    code TEXT PRIMARY KEY,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY['Own', 'Assigned', 'Firm', 'Platform'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS role_templates_global_code_uidx
    ON public.role_templates (code)
    WHERE firm_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS role_templates_firm_code_uidx
    ON public.role_templates (firm_id, code)
    WHERE firm_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.role_template_permissions (
    role_template_id UUID NOT NULL REFERENCES public.role_templates(id) ON DELETE CASCADE,
    permission_code TEXT NOT NULL REFERENCES public.permission_catalog(code) ON DELETE CASCADE,
    scope TEXT NOT NULL DEFAULT 'Firm'
        CHECK (scope IN ('Own', 'Assigned', 'Firm', 'Platform')),
    PRIMARY KEY (role_template_id, permission_code)
);

CREATE TABLE IF NOT EXISTS public.user_role_assignments (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_template_id UUID NOT NULL REFERENCES public.role_templates(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_template_id)
);

CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    permission_code TEXT NOT NULL REFERENCES public.permission_catalog(code) ON DELETE CASCADE,
    effect TEXT NOT NULL CHECK (effect IN ('grant', 'deny')),
    scope TEXT NOT NULL DEFAULT 'Firm'
        CHECK (scope IN ('Own', 'Assigned', 'Firm', 'Platform')),
    reason TEXT NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ,
    changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, permission_code)
);

CREATE TABLE IF NOT EXISTS public.permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    permission_code TEXT,
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'email',
    message_type TEXT NOT NULL DEFAULT 'client',
    message_text TEXT NOT NULL,
    attachment_name TEXT,
    attachment_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'system',
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT id
    FROM public.users
    WHERE auth_user_id = auth.uid() AND is_active = true
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_firm_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT firm_id
    FROM public.users
    WHERE auth_user_id = auth.uid() AND is_active = true
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_firm_member(target_firm_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE auth_user_id = auth.uid()
          AND is_active = true
          AND firm_id = target_firm_id
    );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(
    permission_key TEXT,
    target_firm_id UUID,
    required_scope TEXT DEFAULT 'Own'
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users AS profile
        WHERE profile.auth_user_id = auth.uid()
          AND profile.is_active = true
          AND (
              profile.role IN ('admin', 'developer')
              OR (
                  profile.firm_id = target_firm_id
                  AND (
                      EXISTS (
                          SELECT 1
                          FROM public.user_permission_overrides AS permission_override
                          WHERE permission_override.user_id = profile.id
                            AND permission_override.permission_code = permission_key
                            AND permission_override.effect = 'grant'
                            AND (permission_override.expires_at IS NULL
                                 OR permission_override.expires_at > NOW())
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM public.user_role_assignments AS assignment
                          JOIN public.role_template_permissions AS template_permission
                            ON template_permission.role_template_id = assignment.role_template_id
                          WHERE assignment.user_id = profile.id
                            AND template_permission.permission_code = permission_key
                            AND (
                                template_permission.scope = required_scope
                                OR template_permission.scope IN ('Firm', 'Platform')
                            )
                      )
                  )
              )
          )
          AND NOT EXISTS (
              SELECT 1
              FROM public.user_permission_overrides AS denied
              WHERE denied.user_id = profile.id
                AND denied.permission_code = permission_key
                AND denied.effect = 'deny'
                AND (denied.expires_at IS NULL OR denied.expires_at > NOW())
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.set_admin_audit_actor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.user_id := auth.uid();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_admin_audit_actor_trigger ON public.admin_audit_logs;
CREATE TRIGGER set_admin_audit_actor_trigger
BEFORE INSERT ON public.admin_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_admin_audit_actor();

ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_template_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_same_firm_read ON public.users;
DROP POLICY IF EXISTS users_select_self_or_firm ON public.users;
CREATE POLICY users_select_self_or_firm ON public.users
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid() OR public.is_firm_member(firm_id));

DROP POLICY IF EXISTS firms_member_read ON public.firms;
DROP POLICY IF EXISTS firms_select_member ON public.firms;
CREATE POLICY firms_select_member ON public.firms
    FOR SELECT TO authenticated
    USING (public.is_firm_member(id));

DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select ON public.clients
    FOR SELECT TO authenticated
    USING (public.is_firm_member(firm_id));

DROP POLICY IF EXISTS matters_select ON public.matters;
CREATE POLICY matters_select ON public.matters
    FOR SELECT TO authenticated
    USING (public.is_firm_member(firm_id));

DROP POLICY IF EXISTS fee_notes_select ON public.fee_notes;
CREATE POLICY fee_notes_select ON public.fee_notes
    FOR SELECT TO authenticated
    USING (public.is_firm_member(firm_id));

INSERT INTO public.permission_catalog (
    code,
    resource,
    action,
    name,
    description,
    allowed_scopes
)
VALUES (
    'boc.save_database',
    'boc_builder',
    'save_database',
    'Save Fee Note to Database',
    'Persist fee notes and their line items to the firm database.',
    ARRAY['Own', 'Assigned', 'Firm', 'Platform']
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_templates (firm_id, code, name, description, is_system)
VALUES (
    NULL,
    'senior_advocates_lawyers',
    'Senior Advocates & Lead Counsel',
    'Litigation case handling, statutory bill drafting, client representation, and evidence management.',
    TRUE
)
ON CONFLICT (code) WHERE firm_id IS NULL DO NOTHING;

INSERT INTO public.role_template_permissions (role_template_id, permission_code, scope)
SELECT id, 'boc.save_database', 'Firm'
FROM public.role_templates
WHERE firm_id IS NULL
  AND code = 'senior_advocates_lawyers'
ON CONFLICT (role_template_id, permission_code)
DO UPDATE SET scope = EXCLUDED.scope;

INSERT INTO public.user_role_assignments (user_id, role_template_id)
SELECT profile.id, template.id
FROM public.users AS profile
JOIN public.role_templates AS template
  ON template.firm_id IS NULL
 AND template.code = 'senior_advocates_lawyers'
WHERE profile.is_active = TRUE
  AND profile.auth_user_id IS NOT NULL
  AND profile.firm_id IS NOT NULL
  AND lower(profile.role) = 'advocate'
ON CONFLICT (user_id, role_template_id) DO NOTHING;

DROP POLICY IF EXISTS fee_notes_insert ON public.fee_notes;
CREATE POLICY fee_notes_insert ON public.fee_notes
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_firm_member(firm_id)
        AND public.has_permission('boc.save_database', firm_id, 'Firm')
    );

DROP POLICY IF EXISTS fee_notes_update ON public.fee_notes;
CREATE POLICY fee_notes_update ON public.fee_notes
    FOR UPDATE TO authenticated
    USING (
        public.is_firm_member(firm_id)
        AND public.has_permission('boc.save_database', firm_id, 'Firm')
    )
    WITH CHECK (
        public.is_firm_member(firm_id)
        AND public.has_permission('boc.save_database', firm_id, 'Firm')
    );

DROP POLICY IF EXISTS fee_note_items_select ON public.fee_note_items;
CREATE POLICY fee_note_items_select ON public.fee_note_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.fee_notes AS note
            WHERE note.id = fee_note_id
              AND public.is_firm_member(note.firm_id)
        )
    );

DROP POLICY IF EXISTS fee_note_items_insert ON public.fee_note_items;
CREATE POLICY fee_note_items_insert ON public.fee_note_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.fee_notes AS note
            WHERE note.id = fee_note_id
              AND public.is_firm_member(note.firm_id)
              AND public.has_permission('boc.save_database', note.firm_id, 'Firm')
        )
    );

DROP POLICY IF EXISTS fee_note_items_update ON public.fee_note_items;
CREATE POLICY fee_note_items_update ON public.fee_note_items
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.fee_notes AS note
            WHERE note.id = fee_note_id
              AND public.is_firm_member(note.firm_id)
              AND public.has_permission('boc.save_database', note.firm_id, 'Firm')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.fee_notes AS note
            WHERE note.id = fee_note_id
              AND public.is_firm_member(note.firm_id)
              AND public.has_permission('boc.save_database', note.firm_id, 'Firm')
        )
    );

DROP POLICY IF EXISTS fee_note_items_delete ON public.fee_note_items;
CREATE POLICY fee_note_items_delete ON public.fee_note_items
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.fee_notes AS note
            WHERE note.id = fee_note_id
              AND public.is_firm_member(note.firm_id)
              AND public.has_permission('boc.save_database', note.firm_id, 'Firm')
        )
    );

DROP POLICY IF EXISTS role_templates_read ON public.role_templates;
CREATE POLICY role_templates_read ON public.role_templates
    FOR SELECT TO authenticated
    USING (firm_id IS NULL OR public.is_firm_member(firm_id));

DROP POLICY IF EXISTS role_templates_admin_write ON public.role_templates;
CREATE POLICY role_templates_admin_write ON public.role_templates
    FOR ALL TO authenticated
    USING (public.has_permission('profile.assign_roles', COALESCE(firm_id, public.current_firm_id())))
    WITH CHECK (public.has_permission('profile.assign_roles', COALESCE(firm_id, public.current_firm_id())));

DROP POLICY IF EXISTS permission_catalog_read ON public.permission_catalog;
CREATE POLICY permission_catalog_read ON public.permission_catalog
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS permission_catalog_admin_write ON public.permission_catalog;
CREATE POLICY permission_catalog_admin_write ON public.permission_catalog
    FOR ALL TO authenticated
    USING (public.has_permission('profile.assign_roles', public.current_firm_id()))
    WITH CHECK (public.has_permission('profile.assign_roles', public.current_firm_id()));

DROP POLICY IF EXISTS role_template_permissions_read ON public.role_template_permissions;
CREATE POLICY role_template_permissions_read ON public.role_template_permissions
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1
        FROM public.role_templates AS template
        WHERE template.id = role_template_id
          AND (template.firm_id IS NULL OR public.is_firm_member(template.firm_id))
    ));

DROP POLICY IF EXISTS role_template_permissions_admin_write ON public.role_template_permissions;
CREATE POLICY role_template_permissions_admin_write ON public.role_template_permissions
    FOR ALL TO authenticated
    USING (public.has_permission('profile.assign_roles', public.current_firm_id()))
    WITH CHECK (public.has_permission('profile.assign_roles', public.current_firm_id()));

DROP POLICY IF EXISTS user_roles_same_firm ON public.user_role_assignments;
CREATE POLICY user_roles_same_firm ON public.user_role_assignments
    FOR SELECT TO authenticated
    USING (user_id = public.current_profile_id()
           OR public.has_permission('profile.assign_roles', public.current_firm_id()));

DROP POLICY IF EXISTS user_role_assignments_admin_write ON public.user_role_assignments;
CREATE POLICY user_role_assignments_admin_write ON public.user_role_assignments
    FOR ALL TO authenticated
    USING (public.has_permission('profile.assign_roles', public.current_firm_id()))
    WITH CHECK (public.has_permission('profile.assign_roles', public.current_firm_id()));

DROP POLICY IF EXISTS user_overrides_same_firm ON public.user_permission_overrides;
CREATE POLICY user_overrides_same_firm ON public.user_permission_overrides
    FOR SELECT TO authenticated
    USING (user_id = public.current_profile_id()
           OR public.has_permission('profile.assign_roles', public.current_firm_id()));

DROP POLICY IF EXISTS user_permission_overrides_admin_write ON public.user_permission_overrides;
CREATE POLICY user_permission_overrides_admin_write ON public.user_permission_overrides
    FOR ALL TO authenticated
    USING (public.has_permission('profile.assign_roles', public.current_firm_id()))
    WITH CHECK (public.has_permission('profile.assign_roles', public.current_firm_id()));

DROP POLICY IF EXISTS permission_audit_same_firm ON public.permission_audit_logs;
CREATE POLICY permission_audit_same_firm ON public.permission_audit_logs
    FOR SELECT TO authenticated
    USING (public.is_firm_member(firm_id)
           AND public.has_permission('audit.view', firm_id));

DROP POLICY IF EXISTS admin_audit_insert ON public.admin_audit_logs;
CREATE POLICY admin_audit_insert ON public.admin_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS admin_audit_read ON public.admin_audit_logs;
CREATE POLICY admin_audit_read ON public.admin_audit_logs
    FOR SELECT TO authenticated
    USING (public.has_permission('audit.view', public.current_firm_id()));

DROP POLICY IF EXISTS global_settings_read ON public.global_settings;
CREATE POLICY global_settings_read ON public.global_settings
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS global_settings_update ON public.global_settings;
CREATE POLICY global_settings_update ON public.global_settings
    FOR UPDATE TO authenticated
    USING (public.has_permission('profile.update_firm', public.current_firm_id()))
    WITH CHECK (public.has_permission('profile.update_firm', public.current_firm_id()));

DROP POLICY IF EXISTS messages_select_firm ON public.messages;
CREATE POLICY messages_select_firm ON public.messages
    FOR SELECT TO authenticated
    USING (public.is_firm_member(firm_id));

DROP POLICY IF EXISTS messages_insert_firm ON public.messages;
CREATE POLICY messages_insert_firm ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (public.is_firm_member(firm_id));

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = public.current_profile_id());

DROP POLICY IF EXISTS notifications_insert_firm ON public.notifications;
CREATE POLICY notifications_insert_firm ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (public.is_firm_member(firm_id));

GRANT SELECT ON public.users, public.firms, public.clients, public.matters, public.fee_notes,
    public.global_settings, public.permission_catalog, public.role_templates,
    public.role_template_permissions, public.user_role_assignments,
    public.user_permission_overrides, public.permission_audit_logs,
    public.admin_audit_logs, public.messages, public.notifications
TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.role_templates, public.permission_catalog,
    public.role_template_permissions, public.user_role_assignments,
    public.user_permission_overrides, public.admin_audit_logs,
    public.permission_audit_logs, public.global_settings, public.messages,
    public.notifications
TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
