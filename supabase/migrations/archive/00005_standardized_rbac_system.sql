-- Migration 00005: Standardized 7-Resource RBAC System with 4 Core Roles
-- Resources: matters, feenotes, vault, clients, database, profile, support
-- Scopes: Own, Assigned, Firm, Platform
-- Roles: Managing Partner & Exec, Senior Advocates & Lawyers, IT Dept & Support, Developer & System Admins

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PERMISSION CATALOG
CREATE TABLE IF NOT EXISTS public.permission_catalog (
    code TEXT PRIMARY KEY,
    resource TEXT NOT NULL CHECK (resource IN ('matters', 'feenotes', 'vault', 'clients', 'database', 'profile', 'support')),
    action TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    allowed_scopes TEXT[] NOT NULL DEFAULT '{"Own", "Assigned", "Firm", "Platform"}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ROLE TEMPLATES
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

-- 3. ROLE TEMPLATE PERMISSIONS
CREATE TABLE IF NOT EXISTS public.role_template_permissions (
    role_template_id UUID NOT NULL REFERENCES public.role_templates(id) ON DELETE CASCADE,
    permission_code TEXT NOT NULL REFERENCES public.permission_catalog(code) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK (scope IN ('Own', 'Assigned', 'Firm', 'Platform')),
    PRIMARY KEY (role_template_id, permission_code)
);

-- 4. USER ROLE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_template_id UUID NOT NULL REFERENCES public.role_templates(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_template_id)
);

-- 5. USER PERMISSION OVERRIDES (Granular User-Level Grants & Denials)
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    permission_code TEXT NOT NULL REFERENCES public.permission_catalog(code) ON DELETE CASCADE,
    effect TEXT NOT NULL CHECK (effect IN ('grant', 'deny')),
    scope TEXT NOT NULL CHECK (scope IN ('Own', 'Assigned', 'Firm', 'Platform')),
    reason TEXT NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ,
    changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, permission_code)
);

-- 6. PERMISSION AUDIT LOGS
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

-- Upgrade the legacy 00003 tables in place before inserting standardized rows.
ALTER TABLE public.permission_catalog ADD COLUMN IF NOT EXISTS allowed_scopes TEXT[] NOT NULL DEFAULT '{Own,Assigned,Firm,Platform}';
UPDATE public.role_template_permissions SET scope = CASE LOWER(scope) WHEN 'own' THEN 'Own' WHEN 'assigned' THEN 'Assigned' WHEN 'team' THEN 'Assigned' WHEN 'firm' THEN 'Firm' WHEN 'platform' THEN 'Platform' ELSE 'Firm' END;
UPDATE public.user_permission_overrides SET scope = CASE LOWER(scope) WHEN 'own' THEN 'Own' WHEN 'assigned' THEN 'Assigned' WHEN 'team' THEN 'Assigned' WHEN 'firm' THEN 'Firm' WHEN 'platform' THEN 'Platform' ELSE 'Firm' END;
ALTER TABLE public.role_template_permissions DROP CONSTRAINT IF EXISTS role_template_permissions_scope_check;
ALTER TABLE public.role_template_permissions ADD CONSTRAINT role_template_permissions_scope_check CHECK (scope IN ('Own', 'Assigned', 'Firm', 'Platform'));
ALTER TABLE public.user_permission_overrides DROP CONSTRAINT IF EXISTS user_permission_overrides_scope_check;
ALTER TABLE public.user_permission_overrides ADD CONSTRAINT user_permission_overrides_scope_check CHECK (scope IN ('Own', 'Assigned', 'Firm', 'Platform'));
ALTER TABLE public.user_permission_overrides ALTER COLUMN scope SET DEFAULT 'Firm';

-- ==============================================================================
-- POPULATE PERMISSION CATALOG (56 Standardized Permissions across 7 Resources)
-- ==============================================================================

INSERT INTO public.permission_catalog (code, resource, action, name, description, allowed_scopes)
VALUES
    -- 1. CLIENTS (8 permissions)
    ('clients.view', 'clients', 'view', 'View Clients Directory', 'View client profiles and directory records', '{"Own", "Assigned", "Firm", "Platform"}'),
    ('clients.view_sensitive', 'clients', 'view_sensitive', 'View Sensitive Client KYC', 'Inspect confidential KRA PINs, bank details, and compliance records', '{"Assigned", "Firm", "Platform"}'),
    ('clients.create', 'clients', 'create', 'Onboard Client', 'Register new individual and corporate clients', '{"Firm", "Platform"}'),
    ('clients.update', 'clients', 'update', 'Edit Client Records', 'Modify client addresses, emails, and contact persons', '{"Assigned", "Firm", "Platform"}'),
    ('clients.delete', 'clients', 'delete', 'Delete / Archive Client', 'Permanently delete or archive client profiles', '{"Firm", "Platform"}'),
    ('clients.export', 'clients', 'export', 'Export Client List', 'Export client registry to Excel/CSV spreadsheets', '{"Firm", "Platform"}'),
    ('clients.merge', 'clients', 'merge', 'Merge Duplicate Clients', 'Merge duplicate client entities and re-link active matters', '{"Firm", "Platform"}'),
    ('clients.audit_view', 'clients', 'audit_view', 'View Client Audit Log', 'Inspect interaction history and KYC modification logs', '{"Assigned", "Firm", "Platform"}'),

    -- 2. MATTERS (9 permissions)
    ('matters.view', 'matters', 'view', 'View Matters', 'Browse and read matter cause numbers, court forums, and case status', '{"Own", "Assigned", "Firm", "Platform"}'),
    ('matters.create', 'matters', 'create', 'Open New Case File', 'Register a new litigation, arbitration, or advisory matter', '{"Firm", "Platform"}'),
    ('matters.update', 'matters', 'update', 'Edit Matter Details', 'Update case numbers, parties, claim value, and court schedules', '{"Assigned", "Firm", "Platform"}'),
    ('matters.assign_advocate', 'matters', 'assign_advocate', 'Assign Lead Advocates', 'Assign handling counsel or associate legal team to case files', '{"Firm", "Platform"}'),
    ('matters.status_change', 'matters', 'status_change', 'Update Matter Workflow', 'Transition matter stages from Open to Taxation Ready to Closed', '{"Assigned", "Firm", "Platform"}'),
    ('matters.delete', 'matters', 'delete', 'Delete Case File', 'Permanently remove a matter and its associations (Strictly Restricted)', '{"Firm", "Platform"}'),
    ('matters.view_unassigned', 'matters', 'view_unassigned', 'View Unassigned Matters', 'Read access to firm matters not assigned to current user', '{"Firm", "Platform"}'),
    ('matters.export', 'matters', 'export', 'Export Matter Dossiers', 'Export litigation schedules and case summary reports', '{"Assigned", "Firm", "Platform"}'),
    ('matters.transfer', 'matters', 'transfer', 'Transfer Matter Ownership', 'Reassign primary advocacy lead to partner or external counsel', '{"Firm", "Platform"}'),

    -- 3. FEENOTES (10 permissions)
    ('feenotes.view', 'feenotes', 'view', 'View Fee Notes & BOC', 'Inspect itemized folios, statutory charges, and calculated bills', '{"Own", "Assigned", "Firm", "Platform"}'),
    ('feenotes.create_draft', 'feenotes', 'create_draft', 'Draft Bills of Costs', 'Generate draft fee notes and apply statutory Remuneration Schedules', '{"Own", "Assigned", "Firm", "Platform"}'),
    ('feenotes.edit_folios', 'feenotes', 'edit_folios', 'Edit Itemized Folios', 'Modify folio descriptions, unit rates, and itemized disbursements', '{"Own", "Assigned", "Firm", "Platform"}'),
    ('feenotes.approve', 'feenotes', 'approve', 'Partner Approval Sign-off', 'Approve draft fee notes for official issuance and client delivery', '{"Firm", "Platform"}'),
    ('feenotes.taxation_apply', 'feenotes', 'taxation_apply', 'Record Taxation Deductions', 'Apply Court/Arbitrator taxed-off sums and calculate taxed totals', '{"Assigned", "Firm", "Platform"}'),
    ('feenotes.issue', 'feenotes', 'issue', 'Issue Formal Fee Note', 'Lock itemized bill and issue formal sealed invoice to client', '{"Firm", "Platform"}'),
    ('feenotes.mark_paid', 'feenotes', 'mark_paid', 'Record Settlement / Payment', 'Record fee payments and reconcile trust account receipts', '{"Firm", "Platform"}'),
    ('feenotes.delete', 'feenotes', 'delete', 'Delete Fee Note', 'Remove draft or retracted bills from the ledger', '{"Firm", "Platform"}'),
    ('feenotes.export_pdf', 'feenotes', 'export_pdf', 'Export Sealed PDF', 'Generate stamped and watermarked formal legal Bill of Costs PDF', '{"Own", "Assigned", "Firm", "Platform"}'),
    ('feenotes.export_excel', 'feenotes', 'export_excel', 'Export Excel Ledger', 'Export itemized calculation spreadsheet for court registry filing', '{"Own", "Assigned", "Firm", "Platform"}'),

    -- 4. VAULT (8 permissions)
    ('vault.view', 'vault', 'view', 'Read & Download Files', 'Access and download court pleadings, evidence, and documents', '{"Own", "Assigned", "Firm", "Platform"}'),
    ('vault.view_confidential', 'vault', 'view_confidential', 'Access Privileged Vault', 'Inspect documents tagged as confidential legal strategy files', '{"Assigned", "Firm", "Platform"}'),
    ('vault.upload', 'vault', 'upload', 'Upload Case Documents', 'Upload pleadings and evidence into private Supabase storage', '{"Own", "Assigned", "Firm", "Platform"}'),
    ('vault.create_folder', 'vault', 'create_folder', 'Manage Matter Folders', 'Create and structure matter directory folders', '{"Assigned", "Firm", "Platform"}'),
    ('vault.delete', 'vault', 'delete', 'Delete Vault Files', 'Permanently remove files and folders from cloud storage', '{"Firm", "Platform"}'),
    ('vault.version_control', 'vault', 'version_control', 'Manage File Versions', 'Upload revisions, inspect diffs, and restore previous versions', '{"Assigned", "Firm", "Platform"}'),
    ('vault.share_external', 'vault', 'share_external', 'Generate Secure Share Link', 'Create secure expiring download links for clients and co-counsel', '{"Assigned", "Firm", "Platform"}'),
    ('vault.purge_archive', 'vault', 'purge_archive', 'Purge Storage Cache', 'Deep purge archived folders and optimize vault storage', '{"Firm", "Platform"}'),

    -- 5. DATABASE (8 permissions)
    ('database.view_health', 'database', 'view_health', 'View Database Health', 'Monitor connection pools, latency, and replication status', '{"Firm", "Platform"}'),
    ('database.run_migration', 'database', 'run_migration', 'Execute DDL Migrations', 'Apply SQL schema migrations and table structures', '{"Platform"}'),
    ('database.scale_rules', 'database', 'scale_rules', 'Manage Statutory Scales', 'Update statutory tariffs and Advocates Remuneration Order rules', '{"Firm", "Platform"}'),
    ('database.backup_export', 'database', 'backup_export', 'Trigger Backup Export', 'Generate cryptographic SQL data dumps and cold storage backups', '{"Firm", "Platform"}'),
    ('database.table_sync', 'database', 'table_sync', 'Realtime Table Re-sync', 'Force refresh of Supabase realtime subscriptions and channel state', '{"Firm", "Platform"}'),
    ('database.killswitch', 'database', 'killswitch', 'Emergency DB Killswitch', 'Trigger read-only lockdown during security incidents', '{"Platform"}'),
    ('database.query_console', 'database', 'query_console', 'Administrative SQL Console', 'Execute authenticated administrative SQL diagnostics', '{"Platform"}'),
    ('database.clear_cache', 'database', 'clear_cache', 'Flush Calculation Cache', 'Flush intermediate engine logs and cached calculation trees', '{"Platform"}'),

    -- 6. PROFILE (8 permissions)
    ('profile.view_own', 'profile', 'view_own', 'View Own Profile', 'Inspect personal account details, session tokens, and LSK details', '{"Own"}'),
    ('profile.update_own', 'profile', 'update_own', 'Edit Own Profile', 'Update personal contact details, password, and avatar', '{"Own"}'),
    ('profile.view_firm_users', 'profile', 'view_firm_users', 'View Staff Directory', 'Inspect firm staff member positions, roles, and LSK numbers', '{"Firm", "Platform"}'),
    ('profile.manage_users', 'profile', 'manage_users', 'Manage Staff Accounts', 'Create user accounts, reset passwords, and deactivate users', '{"Firm", "Platform"}'),
    ('profile.assign_roles', 'profile', 'assign_roles', 'Assign Role Templates', 'Assign role templates and grant/deny user permission overrides', '{"Firm", "Platform"}'),
    ('profile.update_firm', 'profile', 'update_firm', 'Edit Firm Identity', 'Update firm name, letterhead, VAT rate, and bank details', '{"Firm", "Platform"}'),
    ('profile.security_policy', 'profile', 'security_policy', 'Enforce Security Policies', 'Configure firm-wide 2FA, session timeout, and IP whitelists', '{"Firm", "Platform"}'),
    ('profile.view_audit_logs', 'profile', 'view_audit_logs', 'View Security Audit Logs', 'Inspect role changes, permission overrides, and security events', '{"Firm", "Platform"}'),

    -- 7. SUPPORT (7 permissions)
    ('support.ticket_create', 'support', 'ticket_create', 'Create Support Ticket', 'Submit technical support and bug report tickets', '{"Own", "Firm", "Platform"}'),
    ('support.ticket_view', 'support', 'ticket_view', 'View Support Queue', 'View pending and resolved support tickets across the firm', '{"Own", "Firm", "Platform"}'),
    ('support.ticket_resolve', 'support', 'ticket_resolve', 'Resolve Support Tickets', 'Update ticket resolution, assign technicians, and close issues', '{"Firm", "Platform"}'),
    ('support.broadcast_send', 'support', 'broadcast_send', 'Send System Announcements', 'Dispatch urgent notifications and system maintenance alerts', '{"Firm", "Platform"}'),
    ('support.inspect_logs', 'support', 'inspect_logs', 'Inspect Error Logs', 'View backend execution tracebacks and API errors', '{"Firm", "Platform"}'),
    ('support.remote_assist', 'support', 'remote_assist', 'Session Remote Assist', 'Provide live technical assistance and diagnostics', '{"Platform"}'),
    ('support.chat_internal', 'support', 'chat_internal', 'Internal Support Chat', 'Direct chat with IT and developer team for urgent assistance', '{"Own", "Firm", "Platform"}')
ON CONFLICT (code) DO UPDATE SET
    resource = EXCLUDED.resource,
    action = EXCLUDED.action,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    allowed_scopes = EXCLUDED.allowed_scopes;

-- ==============================================================================
-- POPULATE THE 4 EXACT SYSTEM ROLE TEMPLATES
-- ==============================================================================

INSERT INTO public.role_templates (firm_id, code, name, description, is_system)
VALUES
    (NULL, 'managing_partner_exec', 'Managing Partner and Executive', 'Full legal, executive, financial, and administrative authority across the firm', true),
    (NULL, 'senior_advocates_lawyers', 'Senior Advocates and Lawyers', 'Litigation case handling, statutory bill drafting, client correspondence, and evidence management', true),
    (NULL, 'it_dept_support', 'IT Department and Support', 'Technical infrastructure, help desk ticketing, user provisioning, 2FA/IP security, and error monitoring', true),
    (NULL, 'developer_sys_admin', 'Developer and System Administrators', 'Root infrastructure, database migrations, Python remuneration engine, and platform security', true)
ON CONFLICT (firm_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system;

-- ==============================================================================
-- MAP PERMISSIONS TO ROLE TEMPLATES WITH EXACT SCOPES
-- ==============================================================================

-- 1. Managing Partner and Executive (Firm-wide Authority)
INSERT INTO public.role_template_permissions (role_template_id, permission_code, scope)
SELECT t.id, p.code, 'Firm'
FROM public.role_templates t
CROSS JOIN public.permission_catalog p
WHERE t.code = 'managing_partner_exec'
  AND p.code IN (
    'clients.view', 'clients.view_sensitive', 'clients.create', 'clients.update', 'clients.delete', 'clients.export', 'clients.merge', 'clients.audit_view',
    'matters.view', 'matters.create', 'matters.update', 'matters.assign_advocate', 'matters.status_change', 'matters.delete', 'matters.view_unassigned', 'matters.export', 'matters.transfer',
    'feenotes.view', 'feenotes.create_draft', 'feenotes.edit_folios', 'feenotes.approve', 'feenotes.taxation_apply', 'feenotes.issue', 'feenotes.mark_paid', 'feenotes.delete', 'feenotes.export_pdf', 'feenotes.export_excel',
    'vault.view', 'vault.view_confidential', 'vault.upload', 'vault.create_folder', 'vault.delete', 'vault.version_control', 'vault.share_external',
    'profile.view_own', 'profile.update_own', 'profile.view_firm_users', 'profile.manage_users', 'profile.assign_roles', 'profile.update_firm', 'profile.security_policy', 'profile.view_audit_logs',
    'support.ticket_create', 'support.ticket_view', 'support.broadcast_send', 'support.chat_internal',
    'database.view_health', 'database.scale_rules'
  )
ON CONFLICT (role_template_id, permission_code) DO UPDATE SET scope = EXCLUDED.scope;

-- 2. Senior Advocates and Lawyers (Assigned & Own Scope)
INSERT INTO public.role_template_permissions (role_template_id, permission_code, scope)
SELECT t.id, p.code, 
    CASE 
        WHEN p.code IN ('clients.create', 'matters.create', 'profile.view_firm_users') THEN 'Firm'
        WHEN p.code IN ('profile.view_own', 'profile.update_own', 'feenotes.create_draft', 'support.ticket_create', 'support.ticket_view', 'support.chat_internal') THEN 'Own'
        ELSE 'Assigned'
    END
FROM public.role_templates t
CROSS JOIN public.permission_catalog p
WHERE t.code = 'senior_advocates_lawyers'
  AND p.code IN (
    'clients.view', 'clients.create', 'clients.update',
    'matters.view', 'matters.create', 'matters.update', 'matters.status_change', 'matters.export',
    'feenotes.view', 'feenotes.create_draft', 'feenotes.edit_folios', 'feenotes.taxation_apply', 'feenotes.export_pdf', 'feenotes.export_excel',
    'vault.view', 'vault.upload', 'vault.create_folder', 'vault.version_control', 'vault.share_external',
    'profile.view_own', 'profile.update_own', 'profile.view_firm_users',
    'support.ticket_create', 'support.ticket_view', 'support.chat_internal'
  )
ON CONFLICT (role_template_id, permission_code) DO UPDATE SET scope = EXCLUDED.scope;

-- 3. IT Department and Support (Technical and User Administration Scope)
INSERT INTO public.role_template_permissions (role_template_id, permission_code, scope)
SELECT t.id, p.code,
    CASE
        WHEN p.code IN ('profile.view_own', 'profile.update_own', 'support.ticket_create') THEN 'Own'
        ELSE 'Firm'
    END
FROM public.role_templates t
CROSS JOIN public.permission_catalog p
WHERE t.code = 'it_dept_support'
  AND p.code IN (
    'clients.audit_view',
    'matters.view',
    'vault.purge_archive',
    'database.view_health', 'database.table_sync', 'database.backup_export',
    'profile.view_own', 'profile.update_own', 'profile.view_firm_users', 'profile.manage_users', 'profile.security_policy', 'profile.view_audit_logs',
    'support.ticket_create', 'support.ticket_view', 'support.ticket_resolve', 'support.broadcast_send', 'support.inspect_logs', 'support.chat_internal'
  )
ON CONFLICT (role_template_id, permission_code) DO UPDATE SET scope = EXCLUDED.scope;

-- 4. Developer and System Administrators (Platform Root Scope - All 56 Permissions)
INSERT INTO public.role_template_permissions (role_template_id, permission_code, scope)
SELECT t.id, p.code, 'Platform'
FROM public.role_templates t
CROSS JOIN public.permission_catalog p
WHERE t.code = 'developer_sys_admin'
ON CONFLICT (role_template_id, permission_code) DO UPDATE SET scope = 'Platform';

-- ==============================================================================
-- DATABASE HELPER FUNCTIONS (Security Definer)
-- ==============================================================================

-- 1. Evaluates if active user has permission with requisite scope
DROP FUNCTION IF EXISTS public.has_permission(TEXT, UUID);
CREATE OR REPLACE FUNCTION public.has_permission(
    permission_key TEXT,
    target_firm_id UUID,
    required_scope TEXT DEFAULT 'Own'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_uid UUID;
    user_role_val TEXT;
BEGIN
    current_uid := auth.uid();
    
    -- Fast bypass if developer / system admin
    SELECT u.role INTO user_role_val
    FROM public.users u
    WHERE u.auth_user_id = current_uid AND u.is_active = true
    LIMIT 1;

    IF user_role_val IN ('admin', 'developer') THEN
        RETURN true;
    END IF;

    -- Return true if granted via overrides or role templates, and not explicitly denied
    RETURN EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.auth_user_id = current_uid
          AND u.firm_id = target_firm_id
          AND u.is_active = true
          AND (
              -- Direct override grant
              EXISTS (
                  SELECT 1
                  FROM public.user_permission_overrides o
                  WHERE o.user_id = u.id
                    AND o.permission_code = permission_key
                    AND o.effect = 'grant'
                    AND (o.expires_at IS NULL OR o.expires_at > NOW())
              )
              -- Role template grant
              OR EXISTS (
                  SELECT 1
                  FROM public.user_role_assignments a
                  JOIN public.role_template_permissions p ON p.role_template_id = a.role_template_id
                  WHERE a.user_id = u.id
                    AND p.permission_code = permission_key
              )
          )
          -- Exclude any active explicit deny
          AND NOT EXISTS (
              SELECT 1
              FROM public.user_permission_overrides denied
              WHERE denied.user_id = u.id
                AND denied.permission_code = permission_key
                AND denied.effect = 'deny'
                AND (denied.expires_at IS NULL OR denied.expires_at > NOW())
          )
    );
END;
$$;

-- 2. Fetch all effective permissions for a user
CREATE OR REPLACE FUNCTION public.get_effective_user_permissions(target_user_id UUID)
RETURNS TABLE (
    permission_code TEXT,
    resource TEXT,
    action TEXT,
    name TEXT,
    scope TEXT,
    source TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Explicit Overrides (Grant)
    SELECT 
        p.code AS permission_code,
        p.resource,
        p.action,
        p.name,
        o.scope,
        'override_grant' AS source
    FROM public.user_permission_overrides o
    JOIN public.permission_catalog p ON p.code = o.permission_code
    WHERE o.user_id = target_user_id
      AND o.effect = 'grant'
      AND (o.expires_at IS NULL OR o.expires_at > NOW())

    UNION ALL

    -- Role Template Permissions (Excluding Denies and Overrides)
    SELECT 
        p.code AS permission_code,
        p.resource,
        p.action,
        p.name,
        rp.scope,
        'role_template' AS source
    FROM public.user_role_assignments a
    JOIN public.role_template_permissions rp ON rp.role_template_id = a.role_template_id
    JOIN public.permission_catalog p ON p.code = rp.permission_code
    WHERE a.user_id = target_user_id
      AND NOT EXISTS (
          SELECT 1 FROM public.user_permission_overrides den
          WHERE den.user_id = target_user_id
            AND den.permission_code = p.code
            AND (den.expires_at IS NULL OR den.expires_at > NOW())
      );
$$;

-- ==============================================================================
-- ATTACH RLS POLICIES USING STANDARDIZED PERMISSIONS
-- ==============================================================================

-- Clients Table
DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select ON public.clients FOR SELECT TO authenticated 
USING (public.is_firm_member(firm_id) AND public.has_permission('clients.view', firm_id));

DROP POLICY IF EXISTS clients_insert ON public.clients;
CREATE POLICY clients_insert ON public.clients FOR INSERT TO authenticated 
WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('clients.create', firm_id));

DROP POLICY IF EXISTS clients_update ON public.clients;
CREATE POLICY clients_update ON public.clients FOR UPDATE TO authenticated 
USING (public.is_firm_member(firm_id) AND public.has_permission('clients.update', firm_id))
WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('clients.update', firm_id));

DROP POLICY IF EXISTS clients_delete ON public.clients;
CREATE POLICY clients_delete ON public.clients FOR DELETE TO authenticated 
USING (public.is_firm_member(firm_id) AND public.has_permission('clients.delete', firm_id));

-- Matters Table
DROP POLICY IF EXISTS matters_select ON public.matters;
CREATE POLICY matters_select ON public.matters FOR SELECT TO authenticated 
USING (public.is_firm_member(firm_id) AND public.has_permission('matters.view', firm_id));

DROP POLICY IF EXISTS matters_insert ON public.matters;
CREATE POLICY matters_insert ON public.matters FOR INSERT TO authenticated 
WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('matters.create', firm_id));

DROP POLICY IF EXISTS matters_update ON public.matters;
CREATE POLICY matters_update ON public.matters FOR UPDATE TO authenticated 
USING (public.is_firm_member(firm_id) AND public.has_permission('matters.update', firm_id))
WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('matters.update', firm_id));

DROP POLICY IF EXISTS matters_delete ON public.matters;
CREATE POLICY matters_delete ON public.matters FOR DELETE TO authenticated 
USING (public.is_firm_member(firm_id) AND public.has_permission('matters.delete', firm_id));

-- Fee Notes Table
DROP POLICY IF EXISTS fee_notes_select ON public.fee_notes;
CREATE POLICY fee_notes_select ON public.fee_notes FOR SELECT TO authenticated 
USING (public.is_firm_member(firm_id) AND public.has_permission('feenotes.view', firm_id));

DROP POLICY IF EXISTS fee_notes_insert ON public.fee_notes;
CREATE POLICY fee_notes_insert ON public.fee_notes FOR INSERT TO authenticated 
WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('feenotes.create_draft', firm_id));

DROP POLICY IF EXISTS fee_notes_update ON public.fee_notes;
CREATE POLICY fee_notes_update ON public.fee_notes FOR UPDATE TO authenticated 
USING (public.is_firm_member(firm_id) AND (
    public.has_permission('feenotes.edit_folios', firm_id) OR
    public.has_permission('feenotes.approve', firm_id) OR
    public.has_permission('feenotes.taxation_apply', firm_id) OR
    public.has_permission('feenotes.issue', firm_id) OR
    public.has_permission('feenotes.mark_paid', firm_id)
))
WITH CHECK (public.is_firm_member(firm_id));

DROP POLICY IF EXISTS fee_notes_delete ON public.fee_notes;
CREATE POLICY fee_notes_delete ON public.fee_notes FOR DELETE TO authenticated 
USING (public.is_firm_member(firm_id) AND public.has_permission('feenotes.delete', firm_id));

-- Documents / Vault
DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents FOR SELECT TO authenticated 
USING (public.is_firm_member(firm_id) AND public.has_permission('vault.view', firm_id));

DROP POLICY IF EXISTS documents_insert ON public.documents;
CREATE POLICY documents_insert ON public.documents FOR INSERT TO authenticated 
WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('vault.upload', firm_id));

DROP POLICY IF EXISTS documents_update ON public.documents;
CREATE POLICY documents_update ON public.documents FOR UPDATE TO authenticated 
USING (public.is_firm_member(firm_id) AND public.has_permission('vault.version_control', firm_id));

DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_delete ON public.documents FOR DELETE TO authenticated 
USING (public.is_firm_member(firm_id) AND public.has_permission('vault.delete', firm_id));

-- Seed Role Assignments for Seed Users
DO $$
DECLARE
    admin_uid UUID;
    advocate_uid UUID;
    admin_tpl_id UUID;
    advocate_tpl_id UUID;
BEGIN
    SELECT id INTO admin_uid FROM public.users WHERE email = 'vickarani@gmail.com' LIMIT 1;
    SELECT id INTO advocate_uid FROM public.users WHERE email = 'advocate@kithinjilegal.co.ke' LIMIT 1;
    
    SELECT id INTO admin_tpl_id FROM public.role_templates WHERE code = 'developer_sys_admin' LIMIT 1;
    SELECT id INTO advocate_tpl_id FROM public.role_templates WHERE code = 'senior_advocates_lawyers' LIMIT 1;

    IF admin_uid IS NOT NULL AND admin_tpl_id IS NOT NULL THEN
        INSERT INTO public.user_role_assignments (user_id, role_template_id)
        VALUES (admin_uid, admin_tpl_id)
        ON CONFLICT DO NOTHING;
    END IF;

    IF advocate_uid IS NOT NULL AND advocate_tpl_id IS NOT NULL THEN
        INSERT INTO public.user_role_assignments (user_id, role_template_id)
        VALUES (advocate_uid, advocate_tpl_id)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;
