CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    fee_note_id UUID REFERENCES public.fee_notes(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'reversed')),
    received_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash',
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS phone_number TEXT,
    ADD COLUMN IF NOT EXISTS client_email TEXT,
    ADD COLUMN IF NOT EXISTS account_number TEXT,
    ADD COLUMN IF NOT EXISTS provider_reference TEXT;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_access ON public.payments;
CREATE POLICY payments_access ON public.payments FOR ALL TO authenticated
USING (public.is_firm_member(firm_id) AND public.has_permission('feenotes.view', firm_id))
WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('feenotes.mark_paid', firm_id));

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
