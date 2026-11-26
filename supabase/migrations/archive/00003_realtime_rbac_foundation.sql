-- Realtime, Supabase Auth linkage, and database-enforced RBAC foundation.
-- Existing seed data is preserved. Users are linked to auth.users when accounts are provisioned.

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS position TEXT,
    ADD COLUMN IF NOT EXISTS phone_primary TEXT,
    ADD COLUMN IF NOT EXISTS phone_secondary TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_uidx
    ON public.users(auth_user_id)
    WHERE auth_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.permission_catalog (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (firm_id, code)
);

CREATE TABLE IF NOT EXISTS public.role_template_permissions (
    role_template_id UUID NOT NULL REFERENCES public.role_templates(id) ON DELETE CASCADE,
    permission_code TEXT NOT NULL REFERENCES public.permission_catalog(code) ON DELETE CASCADE,
    scope TEXT NOT NULL DEFAULT 'firm' CHECK (scope IN ('own', 'assigned', 'team', 'firm', 'platform')),
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
    scope TEXT NOT NULL DEFAULT 'firm' CHECK (scope IN ('own', 'assigned', 'team', 'firm', 'platform')),
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

INSERT INTO public.permission_catalog (code, name, description, resource, action)
VALUES
    ('client.view', 'View clients', 'View client records permitted by scope', 'client', 'view'),
    ('client.create', 'Create clients', 'Create client records', 'client', 'create'),
    ('client.update', 'Edit clients', 'Edit client records', 'client', 'update'),
    ('client.delete', 'Delete clients', 'Delete client records', 'client', 'delete'),
    ('matter.view', 'View matters', 'View matters permitted by scope', 'matter', 'view'),
    ('matter.create', 'Create matters', 'Create matters', 'matter', 'create'),
    ('matter.update', 'Edit matters', 'Edit matters', 'matter', 'update'),
    ('matter.delete', 'Delete matters', 'Delete matters', 'matter', 'delete'),
    ('fee_note.create', 'Create fee notes', 'Create bills and fee notes', 'fee_note', 'create'),
    ('fee_note.view', 'View fee notes', 'View bills and fee notes', 'fee_note', 'view'),
    ('fee_note.approve', 'Approve fee notes', 'Approve fee notes for issue', 'fee_note', 'approve'),
    ('fee_note.export', 'Export fee notes', 'Export fee notes and bills', 'fee_note', 'export'),
    ('document.view', 'View documents', 'View documents permitted by scope', 'document', 'view'),
    ('document.upload', 'Upload documents', 'Upload documents to a matter', 'document', 'upload'),
    ('document.delete', 'Delete documents', 'Delete documents', 'document', 'delete'),
    ('message.use', 'Use messages', 'Send internal and client messages', 'message', 'use'),
    ('user.manage', 'Manage users', 'Create, disable, and update firm users', 'user', 'manage'),
    ('permission.manage', 'Manage permissions', 'Assign templates and permission overrides', 'permission', 'manage'),
    ('firm.settings', 'Manage firm settings', 'Update firm settings', 'firm', 'settings'),
    ('audit.view', 'View audit logs', 'View permission and system audit logs', 'audit', 'view')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_templates (firm_id, code, name, description, is_system)
VALUES
    (NULL, 'managing_partner', 'Managing Partner', 'Full firm oversight and approval authority', true),
    (NULL, 'partner', 'Partner', 'Partner-level matter and billing authority', true),
    (NULL, 'senior_associate', 'Senior Associate', 'Senior legal practitioner access', true),
    (NULL, 'associate', 'Associate', 'Assigned matter working access', true),
    (NULL, 'legal_assistant', 'Legal Assistant', 'Operational support access', true),
    (NULL, 'finance_manager', 'Finance Manager', 'Billing and financial reporting access', true),
    (NULL, 'auditor', 'Read-Only Auditor', 'Read-only firm audit access', true)
ON CONFLICT (firm_id, code) DO NOTHING;

INSERT INTO public.role_template_permissions (role_template_id, permission_code, scope)
SELECT t.id, p.code, 'firm'
FROM public.role_templates t
JOIN public.permission_catalog p ON (
    t.code = 'managing_partner'
    OR (t.code = 'partner' AND p.code IN ('client.view', 'client.create', 'client.update', 'matter.view', 'matter.create', 'matter.update', 'fee_note.view', 'fee_note.create', 'fee_note.approve', 'fee_note.export', 'document.view', 'document.upload', 'document.delete', 'message.use', 'audit.view'))
    OR (t.code = 'senior_associate' AND p.code IN ('client.view', 'client.create', 'client.update', 'matter.view', 'matter.create', 'matter.update', 'fee_note.view', 'fee_note.create', 'fee_note.export', 'document.view', 'document.upload', 'message.use'))
    OR (t.code = 'associate' AND p.code IN ('client.view', 'matter.view', 'matter.create', 'matter.update', 'fee_note.view', 'fee_note.create', 'document.view', 'document.upload', 'message.use'))
    OR (t.code = 'legal_assistant' AND p.code IN ('client.view', 'matter.view', 'fee_note.view', 'document.view', 'document.upload', 'message.use'))
    OR (t.code = 'finance_manager' AND p.code IN ('client.view', 'matter.view', 'fee_note.view', 'fee_note.create', 'fee_note.approve', 'fee_note.export', 'audit.view'))
    OR (t.code = 'auditor' AND p.code IN ('client.view', 'matter.view', 'fee_note.view', 'document.view', 'audit.view'))
)
ON CONFLICT (role_template_id, permission_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_firm_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT firm_id FROM public.users WHERE auth_user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_firm_member(target_firm_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT target_firm_id IS NOT NULL AND target_firm_id = public.current_firm_id();
$$;

CREATE OR REPLACE FUNCTION public.has_permission(permission_key TEXT, target_firm_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = public.current_profile_id()
          AND u.firm_id = target_firm_id
          AND (
              u.role IN ('admin', 'developer')
              OR EXISTS (
                  SELECT 1
                  FROM public.user_permission_overrides o
                  WHERE o.user_id = u.id
                    AND o.permission_code = permission_key
                    AND o.effect = 'grant'
                    AND (o.expires_at IS NULL OR o.expires_at > NOW())
              )
              OR EXISTS (
                  SELECT 1
                  FROM public.user_role_assignments a
                  JOIN public.role_template_permissions p ON p.role_template_id = a.role_template_id
                  WHERE a.user_id = u.id
                    AND p.permission_code = permission_key
              )
          )
          AND NOT EXISTS (
              SELECT 1
              FROM public.user_permission_overrides denied
              WHERE denied.user_id = u.id
                AND denied.permission_code = permission_key
                AND denied.effect = 'deny'
                AND (denied.expires_at IS NULL OR denied.expires_at > NOW())
          )
    );
$$;

ALTER TABLE public.permission_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_template_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS permission_catalog_read ON public.permission_catalog;
CREATE POLICY permission_catalog_read ON public.permission_catalog FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS role_templates_read ON public.role_templates;
CREATE POLICY role_templates_read ON public.role_templates FOR SELECT TO authenticated
USING (firm_id IS NULL OR public.is_firm_member(firm_id));

DROP POLICY IF EXISTS role_template_permissions_read ON public.role_template_permissions;
CREATE POLICY role_template_permissions_read ON public.role_template_permissions FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.role_templates t
    WHERE t.id = role_template_id AND (t.firm_id IS NULL OR public.is_firm_member(t.firm_id))
));

DROP POLICY IF EXISTS user_roles_same_firm ON public.user_role_assignments;
CREATE POLICY user_roles_same_firm ON public.user_role_assignments FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = user_id AND public.is_firm_member(u.firm_id)
));

DROP POLICY IF EXISTS user_overrides_same_firm ON public.user_permission_overrides;
CREATE POLICY user_overrides_same_firm ON public.user_permission_overrides FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = user_id AND public.is_firm_member(u.firm_id)
));

DROP POLICY IF EXISTS permission_audit_same_firm ON public.permission_audit_logs;
CREATE POLICY permission_audit_same_firm ON public.permission_audit_logs FOR SELECT TO authenticated
USING (public.is_firm_member(firm_id));

DROP POLICY IF EXISTS users_same_firm_read ON public.users;
CREATE POLICY users_same_firm_read ON public.users FOR SELECT TO authenticated
USING (public.is_firm_member(firm_id));

DROP POLICY IF EXISTS firms_member_read ON public.firms;
CREATE POLICY firms_member_read ON public.firms FOR SELECT TO authenticated
USING (public.is_firm_member(id));

-- Firm isolation policies for existing tenant tables.
DROP POLICY IF EXISTS clients_firm_access ON public.clients;
CREATE POLICY clients_select ON public.clients FOR SELECT TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('client.view', firm_id));
CREATE POLICY clients_insert ON public.clients FOR INSERT TO authenticated WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('client.create', firm_id));
CREATE POLICY clients_update ON public.clients FOR UPDATE TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('client.update', firm_id)) WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('client.update', firm_id));
CREATE POLICY clients_delete ON public.clients FOR DELETE TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('client.delete', firm_id));

DROP POLICY IF EXISTS matters_firm_access ON public.matters;
CREATE POLICY matters_select ON public.matters FOR SELECT TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('matter.view', firm_id));
CREATE POLICY matters_insert ON public.matters FOR INSERT TO authenticated WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('matter.create', firm_id));
CREATE POLICY matters_update ON public.matters FOR UPDATE TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('matter.update', firm_id)) WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('matter.update', firm_id));
CREATE POLICY matters_delete ON public.matters FOR DELETE TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('matter.delete', firm_id));

DROP POLICY IF EXISTS folders_firm_access ON public.folders;
CREATE POLICY folders_access ON public.folders FOR ALL TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('document.view', firm_id)) WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('document.upload', firm_id));

DROP POLICY IF EXISTS documents_firm_access ON public.documents;
CREATE POLICY documents_select ON public.documents FOR SELECT TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('document.view', firm_id));
CREATE POLICY documents_insert ON public.documents FOR INSERT TO authenticated WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('document.upload', firm_id));
CREATE POLICY documents_update ON public.documents FOR UPDATE TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('document.upload', firm_id)) WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('document.upload', firm_id));
CREATE POLICY documents_delete ON public.documents FOR DELETE TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('document.delete', firm_id));

DROP POLICY IF EXISTS fee_notes_firm_access ON public.fee_notes;
CREATE POLICY fee_notes_select ON public.fee_notes FOR SELECT TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('fee_note.view', firm_id));
CREATE POLICY fee_notes_insert ON public.fee_notes FOR INSERT TO authenticated WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('fee_note.create', firm_id));
CREATE POLICY fee_notes_update ON public.fee_notes FOR UPDATE TO authenticated USING (public.is_firm_member(firm_id) AND (public.has_permission('fee_note.create', firm_id) OR public.has_permission('fee_note.approve', firm_id))) WITH CHECK (public.is_firm_member(firm_id) AND (public.has_permission('fee_note.create', firm_id) OR public.has_permission('fee_note.approve', firm_id)));
CREATE POLICY fee_notes_delete ON public.fee_notes FOR DELETE TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('fee_note.create', firm_id));

ALTER TABLE public.fee_note_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fee_note_items_access ON public.fee_note_items;
CREATE POLICY fee_note_items_access ON public.fee_note_items FOR ALL TO authenticated
USING (EXISTS (
        SELECT 1 FROM public.fee_notes f
        WHERE f.id = fee_note_id
            AND public.is_firm_member(f.firm_id)
            AND public.has_permission('fee_note.view', f.firm_id)
))
WITH CHECK (EXISTS (
        SELECT 1 FROM public.fee_notes f
        WHERE f.id = fee_note_id
            AND public.is_firm_member(f.firm_id)
            AND public.has_permission('fee_note.create', f.firm_id)
));

DROP POLICY IF EXISTS messages_firm_access ON public.messages;
CREATE POLICY messages_access ON public.messages FOR ALL TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('message.use', firm_id)) WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('message.use', firm_id));

DROP POLICY IF EXISTS notifications_firm_access ON public.notifications;
CREATE POLICY notifications_access ON public.notifications FOR ALL TO authenticated USING (user_id = public.current_profile_id()) WITH CHECK (user_id = public.current_profile_id());

DROP POLICY IF EXISTS activity_logs_firm_access ON public.activity_logs;
CREATE POLICY activity_logs_select ON public.activity_logs FOR SELECT TO authenticated USING (public.is_firm_member(firm_id) AND public.has_permission('audit.view', firm_id));
CREATE POLICY activity_logs_insert ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.is_firm_member(firm_id));

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clients') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'matters') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.matters;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fee_notes') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_notes;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'documents') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'activity_logs') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
        END IF;
    END IF;
END;
$$;