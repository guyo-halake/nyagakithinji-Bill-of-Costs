BEGIN;

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
CREATE POLICY fee_notes_insert
    ON public.fee_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_firm_member(firm_id)
        AND public.has_permission('boc.save_database', firm_id, 'Firm')
    );

DROP POLICY IF EXISTS fee_notes_update ON public.fee_notes;
CREATE POLICY fee_notes_update
    ON public.fee_notes
    FOR UPDATE
    TO authenticated
    USING (
        public.is_firm_member(firm_id)
        AND public.has_permission('boc.save_database', firm_id, 'Firm')
    )
    WITH CHECK (
        public.is_firm_member(firm_id)
        AND public.has_permission('boc.save_database', firm_id, 'Firm')
    );

DROP POLICY IF EXISTS fee_note_items_select ON public.fee_note_items;
CREATE POLICY fee_note_items_select
    ON public.fee_note_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.fee_notes AS note
            WHERE note.id = fee_note_id
              AND public.is_firm_member(note.firm_id)
        )
    );

DROP POLICY IF EXISTS fee_note_items_insert ON public.fee_note_items;
CREATE POLICY fee_note_items_insert
    ON public.fee_note_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.fee_notes AS note
            WHERE note.id = fee_note_id
              AND public.is_firm_member(note.firm_id)
              AND public.has_permission('boc.save_database', note.firm_id, 'Firm')
        )
    );

DROP POLICY IF EXISTS fee_note_items_update ON public.fee_note_items;
CREATE POLICY fee_note_items_update
    ON public.fee_note_items
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.fee_notes AS note
            WHERE note.id = fee_note_id
              AND public.is_firm_member(note.firm_id)
              AND public.has_permission('boc.save_database', note.firm_id, 'Firm')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.fee_notes AS note
            WHERE note.id = fee_note_id
              AND public.is_firm_member(note.firm_id)
              AND public.has_permission('boc.save_database', note.firm_id, 'Firm')
        )
    );

DROP POLICY IF EXISTS fee_note_items_delete ON public.fee_note_items;
CREATE POLICY fee_note_items_delete
    ON public.fee_note_items
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.fee_notes AS note
            WHERE note.id = fee_note_id
              AND public.is_firm_member(note.firm_id)
              AND public.has_permission('boc.save_database', note.firm_id, 'Firm')
        )
    );

COMMIT;
