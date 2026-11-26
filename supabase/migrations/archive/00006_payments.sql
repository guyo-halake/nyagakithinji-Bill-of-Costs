-- Confirmed payments used by revenue analytics. No payment is inferred from a fee note.
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
    fee_note_id UUID REFERENCES public.fee_notes(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'reversed')),
    received_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payments_access ON public.payments;
CREATE POLICY payments_access ON public.payments FOR ALL TO authenticated
USING (public.is_firm_member(firm_id) AND public.has_permission('feenotes.view', firm_id))
WITH CHECK (public.is_firm_member(firm_id) AND public.has_permission('feenotes.mark_paid', firm_id));

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
    END IF;
END;
$$;