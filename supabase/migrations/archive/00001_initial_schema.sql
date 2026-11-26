-- LexFlow / Karani Law Platform: Comprehensive Database Schema Migration
-- Includes Clients (with dual phones & company), Matters (with Fee Note & Document links),
-- Fee Notes / Bills of Costs (processed & draft with user tracking), Messages (WhatsApp/Email/Internal),
-- Notifications, Activity/Recents Audit Logs, and Storage Vault.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. FIRMS TABLE
CREATE TABLE IF NOT EXISTS public.firms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    firm_reg_no VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(100),
    address TEXT,
    po_box VARCHAR(255),
    kra_pin VARCHAR(100),
    bank_details TEXT,
    logo_url TEXT,
    managing_partner_name VARCHAR(255) DEFAULT 'Nyagah B. Kithinji',
    managing_partner_email VARCHAR(255) DEFAULT 'info@nbkco-advocates.com',
    managing_partner_phone VARCHAR(100) DEFAULT '+254 722 000 111',
    managing_partner_lsk VARCHAR(100) DEFAULT 'P.105/1992',
    company_email VARCHAR(255) DEFAULT 'info@nbkco-advocates.com',
    company_phone VARCHAR(100) DEFAULT '+254 (0)20 271 8890 / +254 722 000 111',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    lsk_no VARCHAR(100),
    role VARCHAR(50) DEFAULT 'advocate' CHECK (role IN ('senior_partner', 'partner', 'advocate', 'legal_assistant', 'finance_manager', 'admin', 'developer')),
    permissions JSONB DEFAULT '{"can_manage_matters": true, "can_approve_fee_notes": true, "can_access_taxation": true}'::jsonb,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. CLIENTS TABLE (Enhanced with company, primary & secondary phone)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    client_type VARCHAR(50) DEFAULT 'corporate' CHECK (client_type IN ('corporate', 'individual', 'trust', 'government')),
    email VARCHAR(255) NOT NULL,
    phone_primary VARCHAR(100) NOT NULL,
    phone_secondary VARCHAR(100),
    kra_pin VARCHAR(100),
    address TEXT,
    contact_person VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. MATTERS TABLE (Enhanced with fee note link & PDF/Excel document links)
CREATE TABLE IF NOT EXISTS public.matters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
    title VARCHAR(500) NOT NULL,
    cause_number VARCHAR(100),
    forum VARCHAR(100) DEFAULT 'High Court Commercial',
    applicant VARCHAR(255),
    applicant_role VARCHAR(100) DEFAULT 'Claimant',
    respondent VARCHAR(255),
    respondent_role VARCHAR(100) DEFAULT 'Respondent',
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_taxation', 'taxation_ready', 'judgment_rendered', 'closed')),
    claim_value NUMERIC(15, 2) DEFAULT 0.00,
    fee_note_link TEXT,
    pdf_link TEXT,
    excel_link TEXT,
    assigned_advocate_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. FOLDERS TABLE (Hierarchical File Manager Tree)
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. DOCUMENTS TABLE (Connected to Supabase Storage)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    version INT DEFAULT 1,
    tags TEXT[] DEFAULT '{}',
    is_confidential BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. FEE NOTES & BILLS OF COSTS TABLE (Enhanced with status: processed / draft, user generator & timestamps)
CREATE TABLE IF NOT EXISTS public.fee_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    bill_type VARCHAR(50) DEFAULT 'bill_of_costs' CHECK (bill_type IN ('bill_of_costs', 'fee_note', 'proforma_invoice')),
    court_schedule VARCHAR(50) DEFAULT 'schedule_6_high_court',
    claim_value NUMERIC(15, 2) DEFAULT 0.00,
    instruction_fee NUMERIC(15, 2) DEFAULT 0.00,
    getting_up_fee NUMERIC(15, 2) DEFAULT 0.00,
    disbursements_total NUMERIC(15, 2) DEFAULT 0.00,
    vat_amount NUMERIC(15, 2) DEFAULT 0.00,
    taxed_off_total NUMERIC(15, 2) DEFAULT 0.00,
    grand_total NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'processed' CHECK (status IN ('processed', 'draft', 'pending_approval', 'issued', 'in_taxation', 'taxed', 'paid', 'overdue')),
    generated_by_user VARCHAR(255) NOT NULL,
    generated_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    pdf_url TEXT,
    excel_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. FEE NOTE ITEMS (Itemized Folio Ledger)
CREATE TABLE IF NOT EXISTS public.fee_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fee_note_id UUID REFERENCES public.fee_notes(id) ON DELETE CASCADE,
    item_number INT NOT NULL,
    item_date DATE DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    item_type VARCHAR(50) DEFAULT 'drawing_folio',
    quantity NUMERIC(10, 2) DEFAULT 1.00,
    unit_rate NUMERIC(15, 2) DEFAULT 0.00,
    claimed_amount NUMERIC(15, 2) DEFAULT 0.00,
    taxed_off_amount NUMERIC(15, 2) DEFAULT 0.00,
    allowed_amount NUMERIC(15, 2) DEFAULT 0.00
);

-- 9. MESSAGES TABLE (WhatsApp, Email & Internal Lawyer Conversations)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    sender_id VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    recipient_id VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    channel VARCHAR(50) DEFAULT 'email' CHECK (channel IN ('whatsapp', 'email', 'internal')),
    message_type VARCHAR(50) DEFAULT 'client' CHECK (message_type IN ('client', 'internal')),
    message_text TEXT NOT NULL,
    attachment_name VARCHAR(255),
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'system' CHECK (category IN ('billing', 'hearing', 'message', 'system')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. ACTIVITY & RECENTS LOGS TABLE (Comprehensive System Recents)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) DEFAULT 'login' CHECK (action_type IN ('login', 'bill_created', 'message_sent', 'file_uploaded', 'reminder', 'settings_changed')),
    title VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_clients_firm ON public.clients(firm_id);
CREATE INDEX IF NOT EXISTS idx_matters_firm ON public.matters(firm_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON public.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_matter ON public.folders(matter_id);
CREATE INDEX IF NOT EXISTS idx_fee_notes_matter ON public.fee_notes(matter_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_firm ON public.activity_logs(firm_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- INITIAL SEED DATA
INSERT INTO public.firms (
    id, name, firm_reg_no, email, phone, address, po_box, kra_pin, bank_details,
    managing_partner_name, managing_partner_email, managing_partner_phone, managing_partner_lsk,
    company_email, company_phone
)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Nyagah B. Kithinji & Co. Advocates',
    'P.105/1992/2026',
    'info@nbkco-advocates.com',
    '+254 (0)20 271 8890 / +254 722 000 111',
    'Suite 4B, Mbaruk Road, Off Muchai Drive, Golf Course Estate',
    'P.O. Box 1992-00100, Nairobi',
    'P051123456Z',
    'KCB Bank Kenya Ltd | Kilimani Branch | A/C No: 1104889922 | Swift: KCBLKENX',
    'Nyagah B. Kithinji',
    'info@nbkco-advocates.com',
    '+254 722 000 111',
    'P.105/1992',
    'info@nbkco-advocates.com',
    '+254 (0)20 271 8890 / +254 722 000 111'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    firm_reg_no = EXCLUDED.firm_reg_no,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    po_box = EXCLUDED.po_box,
    kra_pin = EXCLUDED.kra_pin,
    bank_details = EXCLUDED.bank_details,
    managing_partner_name = EXCLUDED.managing_partner_name,
    managing_partner_email = EXCLUDED.managing_partner_email,
    managing_partner_phone = EXCLUDED.managing_partner_phone,
    managing_partner_lsk = EXCLUDED.managing_partner_lsk,
    company_email = EXCLUDED.company_email,
    company_phone = EXCLUDED.company_phone;

INSERT INTO public.users (id, firm_id, full_name, email, lsk_no, role)
VALUES 
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Karani Victor',
    'karani.victor@kithinjilegal.co.ke',
    'P.105/9920',
    'senior_partner'
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Razak Wako (P3L Developer)',
    'razak.admin@p3ldev.com',
    'P3L/DEV/2026/001',
    'developer'
) ON CONFLICT DO NOTHING;

 C R E A T E   T A B L E   I F   N O T   E X I S T S   s t a t u t o r y _ f e e s   ( 
     i d   U U I D   P R I M A R Y   K E Y   D E F A U L T   u u i d _ g e n e r a t e _ v 4 ( ) , 
     d e s c r i p t i o n   T E X T   N O T   N U L L , 
     a m o u n t   N U M E R I C   N O T   N U L L , 
     c r e a t e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E   D E F A U L T   N O W ( ) 
 ) ; 
 
 I N S E R T   I N T O   s t a t u t o r y _ f e e s   ( d e s c r i p t i o n ,   a m o u n t )   V A L U E S   
 ( ' P r o c e d u r a l   M e e t i n g ' ,   1 1 0 0 ) , 
 ( ' H e a r i n g   F u l l   D a y ' ,   1 0 0 0 0 ) , 
 ( ' H e a r i n g   H a l f   D a y ' ,   5 0 0 0 ) , 
 ( ' D r a w i n g   P l a i n t ' ,   5 0 0 ) 
 O N   C O N F L I C T   D O   N O T H I N G ; 
  
 