-- ====================================================================
-- MIGRATION 00008: STATUTORY REMUNERATION TABLES & FIRM PROFILE EXTENSIONS
-- Authentic Advocates (Remuneration) Order (Legal Notice 64 of 1962, as amended up to
-- L.N. 35/2014, L.N. 45/2014, L.N. 268/2017 & L.N. 221/2023)
-- ====================================================================

-- 1. Extend public.firms with Managing Partner & Company Contact Columns
ALTER TABLE public.firms
ADD COLUMN IF NOT EXISTS managing_partner_name VARCHAR(255) DEFAULT 'Nyagah B. Kithinji',
ADD COLUMN IF NOT EXISTS managing_partner_email VARCHAR(255) DEFAULT 'info@nbkco-advocates.com',
ADD COLUMN IF NOT EXISTS managing_partner_phone VARCHAR(100) DEFAULT '+254 722 000 111',
ADD COLUMN IF NOT EXISTS managing_partner_lsk VARCHAR(100) DEFAULT 'P.105/1992',
ADD COLUMN IF NOT EXISTS company_email VARCHAR(255) DEFAULT 'info@nbkco-advocates.com',
ADD COLUMN IF NOT EXISTS company_phone VARCHAR(100) DEFAULT '+254 (0)20 271 8890 / +254 722 000 111';

-- Update the primary firm record with exact firm credentials
UPDATE public.firms
SET 
    name = 'Nyagah B. Kithinji & Co. Advocates',
    firm_reg_no = 'P.105/1992/2026',
    email = 'info@nbkco-advocates.com',
    phone = '+254 (0)20 271 8890 / +254 722 000 111',
    address = 'Suite 4B, Mbaruk Road, Off Muchai Drive, Golf Course Estate',
    po_box = 'P.O. Box 1992-00100, Nairobi',
    kra_pin = 'P051123456Z',
    bank_details = 'KCB Bank Kenya Ltd | Kilimani Branch | A/C No: 1104889922 | Swift: KCBLKENX',
    managing_partner_name = 'Nyagah B. Kithinji',
    managing_partner_email = 'info@nbkco-advocates.com',
    managing_partner_phone = '+254 722 000 111',
    managing_partner_lsk = 'P.105/1992',
    company_email = 'info@nbkco-advocates.com',
    company_phone = '+254 (0)20 271 8890 / +254 722 000 111'
WHERE id = 'a0000000-0000-0000-0000-000000000001' OR firm_reg_no = 'P.105/1992/2026';

-- 2. Statutory Schedules Table (All 12 Official Schedules of the Remuneration Order)
CREATE TABLE IF NOT EXISTS public.statutory_schedules (
    id VARCHAR(50) PRIMARY KEY,
    schedule_number INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    citation VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Statutory Scale Brackets (Ad Valorem Tiers)
CREATE TABLE IF NOT EXISTS public.statutory_scale_brackets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id VARCHAR(50) REFERENCES public.statutory_schedules(id) ON DELETE CASCADE,
    scale_type VARCHAR(100) NOT NULL,
    min_value NUMERIC NOT NULL,
    max_value NUMERIC,
    base_fee NUMERIC NOT NULL,
    excess_rate_percent NUMERIC NOT NULL DEFAULT 0.0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Statutory Prescribed Unit Rates (Folios, Attendances, Service, Letters)
CREATE TABLE IF NOT EXISTS public.statutory_prescribed_rates (
    id VARCHAR(50) PRIMARY KEY,
    item_key VARCHAR(100) NOT NULL UNIQUE,
    item_name VARCHAR(255) NOT NULL,
    unit VARCHAR(100) NOT NULL,
    rate_kes NUMERIC NOT NULL,
    schedule_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Statutory Rules Table (Interest, Taxed-Off Penalty, Uplifts, Getting-Up)
CREATE TABLE IF NOT EXISTS public.statutory_rules (
    id VARCHAR(50) PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    rule_number VARCHAR(100) NOT NULL,
    rate_or_ratio NUMERIC NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS and public read policies
ALTER TABLE public.statutory_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_scale_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_prescribed_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read statutory schedules') THEN
        CREATE POLICY "Public read statutory schedules" ON public.statutory_schedules FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read statutory scale brackets') THEN
        CREATE POLICY "Public read statutory scale brackets" ON public.statutory_scale_brackets FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read statutory prescribed rates') THEN
        CREATE POLICY "Public read statutory prescribed rates" ON public.statutory_prescribed_rates FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read statutory rules') THEN
        CREATE POLICY "Public read statutory rules" ON public.statutory_rules FOR SELECT USING (true);
    END IF;
END $$;

-- SEED DATA: All 12 Statutory Schedules (Exact legal order)
INSERT INTO public.statutory_schedules (id, schedule_number, name, citation, category, description) VALUES
('sched_1', 1, 'Sales, Purchases, Mortgages & Charges', 'Schedule 1, L.N. 35/2014', 'Conveyancing', 'Conveyancing of immovable property, sales, purchases, transfers, legal charges, and mortgages.'),
('sched_2', 2, 'Leases & Tenancy Agreements at a Rack Rent', 'Schedule 2, L.N. 35/2014', 'Leases & Tenancies', 'Agreements for lease, commercial and residential leases, tenancy agreements calculated on annual rent.'),
('sched_3', 3, 'Formation, Incorporation & Registration of Companies', 'Schedule 3, L.N. 35/2014', 'Corporate & Commercial', 'Incorporation of companies with share capital, registration of foreign companies (minimum KES 60,000).'),
('sched_4', 4, 'Trade Marks', 'Schedule 4, L.N. 35/2014', 'Intellectual Property', 'Registration, oppositions, registered users, assignments, and renewals of trade marks.'),
('sched_5', 5, 'Fees Not Otherwise Prescribed & Chattels Transfer', 'Schedule 5, L.N. 35/2014', 'General & Securities', 'Non-contentious business, hourly rates, written opinions, debt collection, and Chattels Transfer instruments.'),
('sched_6', 6, 'Costs of Proceedings in the High Court', 'Schedule 6, L.N. 35/2014', 'Litigation', 'High Court, Environment & Land Court (ELC), Employment & Labour Relations Court (ELRC), Court of Appeal, Supreme Court.'),
('sched_7', 7, 'Costs of Proceedings in Subordinate Courts', 'Schedule 7, L.N. 45/2014', 'Litigation', 'Litigation in Subordinate / Resident Magistrate Courts across lower and higher scales.'),
('sched_8', 8, 'Tribunal under Landlord and Tenant Act (Cap. 301 - BPRT)', 'Schedule 8, L.N. 35/2014', 'Tribunals', 'Business Premises Rent Tribunal (BPRT) contentious references, distress for rent, and possession claims.'),
('sched_9', 9, 'Tribunal under Rent Restriction Act (Cap. 296 - RRT)', 'Schedule 9, L.N. 35/2014', 'Tribunals', 'Rent Restriction Tribunal (RRT) residential tenancy disputes, repairs, and assessment proceedings.'),
('sched_10', 10, 'Probate and Administration', 'Schedule 10, L.N. 35/2014', 'Probate & Estate', 'Grants of probate, letters of administration, resealing, testate and intestate distribution.'),
('sched_11', 11, 'Proceedings Before Tribunals Other Than Schedules 8 & 9', 'Schedule 11, L.N. 35/2014', 'Tribunals', 'Co-operative Tribunal, Tax Appeals Tribunal (TAT), Political Parties Disputes Tribunal, Energy & Petroleum Tribunal.'),
('sched_12', 12, 'Patents, Utility Models & Industrial Designs', 'Schedule 12, L.N. 35/2014', 'Intellectual Property', 'Registration of patents, utility models, industrial designs, KIPI proceedings, and Industrial Property Tribunal appeals.')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    citation = EXCLUDED.citation,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- SEED DATA: Statutory Scale Brackets (Authentic Tiers)
DELETE FROM public.statutory_scale_brackets;

-- Schedule 1: First Scale (Sales & Purchases)
INSERT INTO public.statutory_scale_brackets (schedule_id, scale_type, min_value, max_value, base_fee, excess_rate_percent, description) VALUES
('sched_1', 'conveyancing_sale', 0, 5000000, 35000, 0.02, 'First KES 5,000,000 at 2.0% (Mandatory minimum KES 35,000)'),
('sched_1', 'conveyancing_sale', 5000000, 100000000, 100000, 0.015, 'KES 5,000,001 - 100,000,000: KES 100,000 + 1.5% of excess over 5M'),
('sched_1', 'conveyancing_sale', 100000000, 250000000, 1525000, 0.0125, 'KES 100,000,001 - 250,000,000: KES 1,525,000 + 1.25% of excess over 100M'),
('sched_1', 'conveyancing_sale', 250000000, 1000000000, 3400000, 0.01, 'KES 250,000,001 - 1,000,000,000: KES 3,400,000 + 1.0% of excess over 250M'),
('sched_1', 'conveyancing_sale', 1000000000, NULL, 10900000, 0.001, 'Over KES 1,000,000,000: KES 10,900,000 + 0.1% of excess over 1B');

-- Schedule 1: Second Scale (Mortgages, Charges & Debentures)
INSERT INTO public.statutory_scale_brackets (schedule_id, scale_type, min_value, max_value, base_fee, excess_rate_percent, description) VALUES
('sched_1', 'mortgage_grantee', 0, 2500000, 28000, 0.02, 'Up to KES 2,500,000: 2.0% (Mandatory minimum KES 28,000)'),
('sched_1', 'mortgage_grantee', 2500000, 5000000, 50000, 0.0175, 'KES 2,500,001 - 5,000,000: KES 50,000 + 1.75% of excess over 2.5M'),
('sched_1', 'mortgage_grantee', 5000000, 100000000, 93750, 0.01, 'KES 5,000,001 - 100,000,000: KES 93,750 + 1.0% of excess over 5M'),
('sched_1', 'mortgage_grantee', 100000000, 250000000, 1043750, 0.0075, 'KES 100,000,001 - 250,000,000: KES 1,043,750 + 0.75% of excess over 100M'),
('sched_1', 'mortgage_grantee', 250000000, 1000000000, 2168750, 0.0015, 'KES 250,000,001 - 1,000,000,000: KES 2,168,750 + 0.15% of excess over 250M'),
('sched_1', 'mortgage_grantee', 1000000000, NULL, 3293750, 0.001, 'Over KES 1,000,000,000: KES 3,293,750 + 0.1% of excess over 1B');

-- Schedule 2: Leases & Tenancy Agreements (Based on Annual Rent)
INSERT INTO public.statutory_scale_brackets (schedule_id, scale_type, min_value, max_value, base_fee, excess_rate_percent, description) VALUES
('sched_2', 'lease_annual_rent', 0, 500000, 20000, 0.15, 'Annual rent up to KES 500,000: 15% of annual rent (Minimum KES 20,000)'),
('sched_2', 'lease_annual_rent', 500000, 3000000, 75000, 0.03, 'KES 500,001 - 3,000,000: KES 75,000 + 3.0% of excess over 500k'),
('sched_2', 'lease_annual_rent', 3000000, NULL, 150000, 0.01, 'Over KES 3,000,000: KES 75,000 + 1.0% of excess over 3M');

-- Schedule 6: High Court Item 1(a) Undefended
INSERT INTO public.statutory_scale_brackets (schedule_id, scale_type, min_value, max_value, base_fee, excess_rate_percent, description) VALUES
('sched_6', 'high_court_undefended_1a', 0, 500000, 45000, 0.0, 'Up to KES 500,000: KES 45,000 (minimum statutory floor KES 75,000 where plaint filed)'),
('sched_6', 'high_court_undefended_1a', 500000, 750000, 65000, 0.0, 'KES 500,001 - 750,000: Fixed scale fee KES 65,000'),
('sched_6', 'high_court_undefended_1a', 750000, 1000000, 75000, 0.0, 'KES 750,001 - 1,000,000: Fixed scale fee KES 75,000'),
('sched_6', 'high_court_undefended_1a', 1000000, 20000000, 75000, 0.0175, 'KES 1,000,001 - 20,000,000: KES 75,000 + 1.75% of excess over 1M'),
('sched_6', 'high_court_undefended_1a', 20000000, NULL, 407500, 0.015, 'Over KES 20,000,000: KES 407,500 + 1.5% of excess over 20M');

-- Schedule 6: High Court Item 1(b) Defended
INSERT INTO public.statutory_scale_brackets (schedule_id, scale_type, min_value, max_value, base_fee, excess_rate_percent, description) VALUES
('sched_6', 'high_court_defended_1b', 0, 500000, 75000, 0.0, 'Up to KES 500,000: Mandatory statutory floor KES 75,000'),
('sched_6', 'high_court_defended_1b', 500000, 750000, 90000, 0.0, 'KES 500,001 - 750,000: Fixed scale fee KES 90,000'),
('sched_6', 'high_court_defended_1b', 750000, 1000000, 120000, 0.0, 'KES 750,001 - 1,000,000: Fixed scale fee KES 120,000'),
('sched_6', 'high_court_defended_1b', 1000000, 20000000, 120000, 0.02, 'KES 1,000,001 - 20,000,000: KES 120,000 + 2.0% of excess over 1M'),
('sched_6', 'high_court_defended_1b', 20000000, NULL, 500000, 0.015, 'Over KES 20,000,000: KES 500,000 + 1.5% of excess over 20M');

-- Schedule 7: Subordinate Courts (Magistrate Higher Scale, L.N. 45/2014)
INSERT INTO public.statutory_scale_brackets (schedule_id, scale_type, min_value, max_value, base_fee, excess_rate_percent, description) VALUES
('sched_7', 'magistrate_higher_scale', 0, 50000, 15000, 0.0, 'Up to KES 50,000: Fixed higher scale KES 15,000'),
('sched_7', 'magistrate_higher_scale', 50000, 100000, 30000, 0.0, 'KES 50,001 - 100,000: Fixed higher scale KES 30,000'),
('sched_7', 'magistrate_higher_scale', 100000, 200000, 40000, 0.0, 'KES 100,001 - 200,000: Fixed higher scale KES 40,000'),
('sched_7', 'magistrate_higher_scale', 200000, 500000, 65000, 0.0, 'KES 200,001 - 500,000: Fixed higher scale KES 65,000'),
('sched_7', 'magistrate_higher_scale', 500000, 1000000, 90000, 0.0, 'KES 500,001 - 1,000,000: Fixed higher scale KES 90,000'),
('sched_7', 'magistrate_higher_scale', 1000000, 2000000, 120000, 0.0, 'KES 1,000,001 - 2,000,000: Fixed higher scale KES 120,000'),
('sched_7', 'magistrate_higher_scale', 2000000, NULL, 120000, 0.025, 'Over KES 2,000,000: KES 120,000 + 2.5% of excess over 2M');

-- Schedule 8: BPRT Tribunal (Cap. 301)
INSERT INTO public.statutory_scale_brackets (schedule_id, scale_type, min_value, max_value, base_fee, excess_rate_percent, description) VALUES
('sched_8', 'bprt_higher_scale', 0, 10000, 5000, 0.0, 'Up to KES 10,000: KES 5,000'),
('sched_8', 'bprt_higher_scale', 10000, 20000, 8000, 0.0, 'KES 10,001 - 20,000: KES 8,000'),
('sched_8', 'bprt_higher_scale', 20000, 50000, 15000, 0.0, 'KES 20,001 - 50,000: KES 15,000'),
('sched_8', 'bprt_higher_scale', 50000, 100000, 22500, 0.0, 'KES 50,001 - 100,000: KES 22,500'),
('sched_8', 'bprt_higher_scale', 100000, 250000, 35000, 0.0, 'KES 100,001 - 250,000: KES 35,000'),
('sched_8', 'bprt_higher_scale', 250000, NULL, 35000, 0.02, 'Over KES 250,000: KES 35,000 + 2.0% of excess over 250k');

-- Schedule 9: Rent Restriction Tribunal (Cap. 296 - RRT)
INSERT INTO public.statutory_scale_brackets (schedule_id, scale_type, min_value, max_value, base_fee, excess_rate_percent, description) VALUES
('sched_9', 'rrt_higher_scale', 0, 1000, 2352, 0.0, 'Up to KES 1,000: Higher scale KES 2,352'),
('sched_9', 'rrt_higher_scale', 1000, 2000, 4116, 0.0, 'KES 1,001 - 2,000: Higher scale KES 4,116'),
('sched_9', 'rrt_higher_scale', 2000, 3500, 4998, 0.0, 'KES 2,001 - 3,500: Higher scale KES 4,998'),
('sched_9', 'rrt_higher_scale', 3500, 5000, 8232, 0.0, 'KES 3,501 - 5,000: Higher scale KES 8,232'),
('sched_9', 'rrt_higher_scale', 5000, 7500, 10584, 0.0, 'KES 5,001 - 7,500: Higher scale KES 10,584'),
('sched_9', 'rrt_higher_scale', 7500, 10000, 11760, 0.0, 'KES 7,501 - 10,000: Higher scale KES 11,760'),
('sched_9', 'rrt_higher_scale', 10000, 20000, 14700, 0.0, 'KES 10,001 - 20,000: Higher scale KES 14,700'),
('sched_9', 'rrt_higher_scale', 20000, 50000, 17640, 0.0, 'KES 20,001 - 50,000: Higher scale KES 17,640'),
('sched_9', 'rrt_higher_scale', 50000, NULL, 17640, 0.02, 'Over KES 50,000: KES 17,640 + 2.0% of excess over 50k');

-- Schedule 10: Probate & Estate Administration
INSERT INTO public.statutory_scale_brackets (schedule_id, scale_type, min_value, max_value, base_fee, excess_rate_percent, description) VALUES
('sched_10', 'probate_grant', 0, 1000000, 45000, 0.05, 'First KES 1,000,000 at 5% (Mandatory minimum KES 45,000)'),
('sched_10', 'probate_grant', 1000000, NULL, 50000, 0.01, 'Over KES 1,000,000: KES 50,000 + 1.0% of excess over 1M');

-- Schedule 11: Other Tribunals (TAT, Cooperative, etc.)
INSERT INTO public.statutory_scale_brackets (schedule_id, scale_type, min_value, max_value, base_fee, excess_rate_percent, description) VALUES
('sched_11', 'tribunals_general', 0, 50000, 17640, 0.0, 'Up to KES 50,000: KES 17,640'),
('sched_11', 'tribunals_general', 50000, 100000, 23520, 0.0, 'KES 50,001 - 100,000: KES 23,520'),
('sched_11', 'tribunals_general', 100000, 200000, 35280, 0.0, 'KES 100,001 - 200,000: KES 35,280'),
('sched_11', 'tribunals_general', 200000, 500000, 58800, 0.0, 'KES 200,001 - 500,000: KES 58,800'),
('sched_11', 'tribunals_general', 500000, 1000000, 100000, 0.0, 'KES 500,001 - 1,000,000: KES 100,000'),
('sched_11', 'tribunals_general', 1000000, 20000000, 100000, 0.01, 'KES 1,000,001 - 20,000,000: KES 100,000 + 1.0% of excess over 1M'),
('sched_11', 'tribunals_general', 20000000, 250000000, 290000, 0.005, 'KES 20,000,001 - 250,000,000: KES 290,000 + 0.5% of excess over 20M'),
('sched_11', 'tribunals_general', 250000000, NULL, 1440000, 0.001, 'Over KES 250,000,000: KES 1,440,000 + 0.1% of excess over 250M');

-- SEED DATA: Statutory Prescribed Rates
INSERT INTO public.statutory_prescribed_rates (id, item_key, item_name, unit, rate_kes, schedule_reference, notes) VALUES
('rate_draw_pleading_base', 'drawing_pleading_base', 'Drawing Pleadings, Affidavits, Plaints (First 4 folios)', 'first 4 folios or part thereof', 1100.0, 'Schedule 6 Item 4(a)', 'KES 1,100 for first 4 folios or less'),
('rate_draw_pleading_folio', 'drawing_pleading_extra_folio', 'Drawing Pleadings (Each additional folio over 4)', 'per folio (>4)', 150.0, 'Schedule 6 Item 4(a)', 'KES 150 for each folio after the first 4'),
('rate_draw_general_doc', 'drawing_general_folio', 'Drawing other legal documents, notices, agreements', 'per folio', 180.0, 'Schedule 6 Item 4(d)', 'KES 180 per folio for all other formal documents'),
('rate_draw_bill_of_costs', 'drawing_bill_of_costs_folio', 'Drawing Bill of Costs & copy for taxing officer', 'per folio', 180.0, 'Schedule 6 Item 4(e)', 'KES 180 per folio of bill of costs'),
('rate_draw_affidavit_service', 'drawing_affidavit_service', 'Affidavit or return of service', 'per document', 240.0, 'Schedule 6 Item 4(f)', 'KES 240 for affidavit or return of service'),
('rate_copying_folio', 'copying_folio', 'Copying documents, exhibits, submissions', 'per folio', 25.0, 'Schedule 6 Item 5', 'KES 25 per folio of 100 words'),
('rate_attend_formal', 'attendance_formal_registry', 'Formal Attendance at court or registrar', 'per attendance', 1000.0, 'Schedule 6 Item 7(a)', 'Formal attendance on registrar or deputy registrar'),
('rate_attend_hearing_hr', 'attendance_court_hr', 'Ordinary Court / Chambers Hearing (One Hour)', 'per hour', 2300.0, 'Schedule 6 Item 7(d)', 'Hearing attendance per hour: Ordinary KES 2,300 (Higher KES 3,000)'),
('rate_attend_hearing_day', 'attendance_court_day', 'Extended Hearing in Court (Full Day)', 'per day', 10000.0, 'Schedule 6 Item 7(d)', 'Full day court trial attendance: Ordinary KES 10,000 (Higher KES 15,000)'),
('rate_service_base', 'service_process_base', 'Service of Process within 3km of Court', 'per service (<=3km)', 1400.0, 'Schedule 6 Item 9(a)', 'Statutory base service fee within 3km'),
('rate_service_per_km', 'service_process_per_km', 'Service of Process excess mileage', 'per additional km', 35.0, 'Schedule 6 Item 9(b)', 'KES 35 per km beyond the first 3km'),
('rate_letter_before_action', 'letter_formal', 'Letter before action or other necessary letters', 'per letter', 1000.0, 'Schedule 6 Item 6(a)', 'Letter before action: KES 1,000 or KES 118 per folio'),
('rate_letter_ordinary', 'letter_ordinary', 'Ordinary Letter / Routine Correspondence', 'per letter', 300.0, 'Schedule 5 Item 5', 'Ordinary correspondence'),
('rate_perusal_folio', 'perusal_folio', 'Perusal of pleadings, record of appeal, affidavits', 'per folio', 50.0, 'Schedule 6 Item 8(a)', 'Perusal per folio of 100 words')
ON CONFLICT (id) DO UPDATE SET 
    item_name = EXCLUDED.item_name,
    unit = EXCLUDED.unit,
    rate_kes = EXCLUDED.rate_kes,
    schedule_reference = EXCLUDED.schedule_reference,
    notes = EXCLUDED.notes;

-- SEED DATA: Statutory Rules
INSERT INTO public.statutory_rules (id, rule_name, rule_number, rate_or_ratio, description) VALUES
('rule_interest_14', 'Statutory Interest on Advocate Bill', 'Rule 7', 0.14, '14% per annum statutory interest chargeable from expiry of one month following delivery of fee note/bill'),
('rule_one_sixth_penalty', 'One-Sixth Taxation Penalty Check', 'Rule 77', 0.166667, 'If more than 1/6th (16.67%) of bill of costs is taxed off, advocate pays taxation costs; otherwise opposing party/client pays'),
('rule_part_b_uplift', 'Advocate & Client Bill Statutory Uplift', 'Part B (Sched 6/7/8/9/10/11)', 0.50, '+50% statutory increase over Party and Party scale on instruction fees for Advocate & Client bills of costs'),
('rule_getting_up_fee', 'Getting-Up Fee for Trial Preparation', 'Schedule 6 Item 2', 0.333333, 'Not less than one-third (1/3 or 33.33%) of the instruction fee allowed on taxation in defended litigation set down for hearing'),
('rule_early_settlement', 'Early Settlement Prior to Hearing Confirmation', 'Schedule 6 Item 1(c)', 0.85, '85% of defended instruction fee where suit is settled before hearing date confirmation'),
('rule_summary_determination', 'Summary Determination Without Full Trial', 'Schedule 6 Item 1(b)', 0.75, '75% of defended instruction fee where judgment entered in a summary manner without full trial'),
('rule_undefended_order_ixa', 'Undefended / No Appearance Scale Ratio', 'Schedule 6 Item 1(a)', 0.65, '65% of Item 1(a) scale applies where no appearance entered under Order IX A')
ON CONFLICT (id) DO UPDATE SET 
    rule_name = EXCLUDED.rule_name,
    rule_number = EXCLUDED.rule_number,
    rate_or_ratio = EXCLUDED.rate_or_ratio,
    description = EXCLUDED.description;