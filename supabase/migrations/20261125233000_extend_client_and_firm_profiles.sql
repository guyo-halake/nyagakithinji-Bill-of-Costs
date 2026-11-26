ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company character varying(255),
  ADD COLUMN IF NOT EXISTS phone_secondary character varying(100),
  ADD COLUMN IF NOT EXISTS category character varying(100);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS advocate_title text,
  ADD COLUMN IF NOT EXISTS personal_email text,
  ADD COLUMN IF NOT EXISTS department text;

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS managing_partner text,
  ADD COLUMN IF NOT EXISTS topbar_subtitle text,
  ADD COLUMN IF NOT EXISTS service_email character varying(255),
  ADD COLUMN IF NOT EXISTS taxation_email character varying(255),
  ADD COLUMN IF NOT EXISTS billing_email character varying(255),
  ADD COLUMN IF NOT EXISTS vat_number character varying(100),
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS office_bank_name text,
  ADD COLUMN IF NOT EXISTS office_account_name text,
  ADD COLUMN IF NOT EXISTS office_branch text,
  ADD COLUMN IF NOT EXISTS office_account_no text,
  ADD COLUMN IF NOT EXISTS office_swift text,
  ADD COLUMN IF NOT EXISTS client_trust_bank_name text,
  ADD COLUMN IF NOT EXISTS client_trust_account_name text,
  ADD COLUMN IF NOT EXISTS client_trust_branch text,
  ADD COLUMN IF NOT EXISTS client_trust_account_no text,
  ADD COLUMN IF NOT EXISTS client_trust_swift text,
  ADD COLUMN IF NOT EXISTS mpesa_paybill text,
  ADD COLUMN IF NOT EXISTS mpesa_account_ref text;
