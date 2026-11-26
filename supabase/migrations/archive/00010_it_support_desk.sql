-- Migration 00010: Authentic Enterprise IT Support Desk Tables
-- Designed for Nyagah B. Kithinji & Co. Advocates & P3L Developers

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY,
    firm_id TEXT NOT NULL DEFAULT 'P.105/1992',
    created_by_name TEXT NOT NULL,
    created_by_email TEXT NOT NULL,
    created_by_role TEXT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General System Inquiry',
    priority TEXT NOT NULL DEFAULT 'P2 - High',
    status TEXT NOT NULL DEFAULT 'Open',
    matter_id TEXT,
    matter_title TEXT,
    fee_note_id TEXT,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_role TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id TEXT NOT NULL DEFAULT 'P.105/1992',
    sender_name TEXT NOT NULL,
    sender_role TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users and public key users access
CREATE POLICY "Allow read support_tickets" ON public.support_tickets FOR SELECT USING (true);
CREATE POLICY "Allow insert support_tickets" ON public.support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update support_tickets" ON public.support_tickets FOR UPDATE USING (true);

CREATE POLICY "Allow read support_ticket_messages" ON public.support_ticket_messages FOR SELECT USING (true);
CREATE POLICY "Allow insert support_ticket_messages" ON public.support_ticket_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read support_chat_messages" ON public.support_chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow insert support_chat_messages" ON public.support_chat_messages FOR INSERT WITH CHECK (true);
