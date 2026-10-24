-- =============================================================================
-- Migration 00011: Official Firm System Users Roster
-- Karani Law / Nyagah B. Kithinji & Co. Advocates
-- Seeds only the 4 authorized firm principals & system administrators
-- =============================================================================

-- Ensure Default Law Firm exists
INSERT INTO public.firms (
    id,
    name,
    firm_reg_no,
    email,
    phone,
    address,
    po_box,
    managing_partner_name,
    managing_partner_email,
    managing_partner_phone,
    managing_partner_lsk,
    company_email,
    company_phone
)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Nyagah B. Kithinji & Co. Advocates',
    'P.105/1992',
    'info@nbkco-advocates.com',
    '+254 722 000 111',
    'Suite 4B, Mbaruk Road, Off Muchai Drive, Golf Course Estate, Upper Hill, Nairobi',
    'P.O. Box 1992-00100, Nairobi, Kenya',
    'Nyagah B. Kithinji',
    'advocate@kithinjilegal.co.ke',
    '+254 722 000 111',
    'P.105/1992',
    'info@nbkco-advocates.com',
    '+254 (0)20 271 8890 / +254 722 000 111'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;

-- 1. Guyo Halake (Admin / Senior Managing Partner)
INSERT INTO public.users (
    id,
    firm_id,
    full_name,
    email,
    lsk_no,
    role,
    position,
    phone_primary,
    is_active
)
VALUES (
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'Guyo Halake',
    'guyohalakeofficial@gmail.com',
    'ADMIN/2026/001',
    'admin',
    'Senior Managing Partner & System Administrator',
    '+254768141129',
    true
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    position = EXCLUDED.position,
    phone_primary = EXCLUDED.phone_primary,
    is_active = true;

-- 2. Karani Victor (Developer / Senior Partner)
INSERT INTO public.users (
    id,
    firm_id,
    full_name,
    email,
    lsk_no,
    role,
    position,
    phone_primary,
    is_active
)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Triple vic',
    'alexkaranivic@gmail.com',
    'P.105/9920',
    'admin',
    'Senior Managing Partner & Executive Director',
    '+254712345678',
    true
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    position = EXCLUDED.position,
    phone_primary = EXCLUDED.phone_primary,
    is_active = true;

-- 3. Nyagah Kithinji (Advocate / Managing Partner)
INSERT INTO public.users (
    id,
    firm_id,
    full_name,
    email,
    lsk_no,
    role,
    position,
    phone_primary,
    is_active
)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Nyagah Kithinji',
    'advocate@kithinjilegal.co.ke',
    'P.105/1992',
    'advocate',
    'Managing Partner & Senior Counsel',
    '+254722000111',
    true
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    position = EXCLUDED.position,
    phone_primary = EXCLUDED.phone_primary,
    is_active = true;

-- 4. Razak Wako (Developer / Lead System Administrator)
INSERT INTO public.users (
    id,
    firm_id,
    full_name,
    email,
    lsk_no,
    role,
    position,
    phone_primary,
    phone_secondary,
    is_active
)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Razak Wako',
    'razak.admin@p3ldev.com',
    'P3L/DEV/2026/045',
    'developer',
    'Lead Developer & System Administrator',
    '+254700123456',
    '+254141888585',
    true
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    position = EXCLUDED.position,
    phone_primary = EXCLUDED.phone_primary,
    phone_secondary = EXCLUDED.phone_secondary,
    is_active = true;

-- Link any existing Auth users by email automatically
UPDATE public.users profile
SET auth_user_id = auth_profile.id
FROM auth.users auth_profile
WHERE lower(auth_profile.email) = lower(profile.email);
