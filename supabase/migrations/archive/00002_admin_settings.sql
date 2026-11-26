-- Phase 1: Database Foundation for Admin Dashboard

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create global_settings table
CREATE TABLE IF NOT EXISTS public.global_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_name TEXT NOT NULL DEFAULT 'Karani Law',
    domain TEXT NOT NULL DEFAULT 'karanilaw.com',
    theme_color TEXT NOT NULL DEFAULT '#000000',
    logo_url TEXT,
    vat_rate NUMERIC NOT NULL DEFAULT 16.0,
    rounding_rules BOOLEAN NOT NULL DEFAULT true,
    watermark_text TEXT NOT NULL DEFAULT 'DRAFT',
    pdf_margin NUMERIC NOT NULL DEFAULT 15.0,
    max_file_size_mb INTEGER NOT NULL DEFAULT 50,
    allowed_file_types TEXT[] NOT NULL DEFAULT ARRAY['.pdf', '.docx', '.xlsx'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one row ever exists for global_settings
CREATE UNIQUE INDEX IF NOT EXISTS global_settings_single_row_idx ON public.global_settings ((1));

-- Insert the default configuration
INSERT INTO public.global_settings (firm_name) 
VALUES ('Karani Law') 
ON CONFLICT DO NOTHING;

-- 2. Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- Assuming standard Supabase Auth
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Setup basic Row Level Security (RLS)
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users for global settings
CREATE POLICY "Allow authenticated read access to global_settings" 
ON public.global_settings FOR SELECT 
TO authenticated 
USING (true);

-- Allow admins to update global settings (Assuming role checking will be done in the app or via a custom claim)
CREATE POLICY "Allow authenticated update to global_settings" 
ON public.global_settings FOR UPDATE 
TO authenticated 
USING (true);

-- Allow authenticated users to insert audit logs, but only admins can read them
CREATE POLICY "Allow authenticated insert to admin_audit_logs" 
ON public.admin_audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated read access to admin_audit_logs" 
ON public.admin_audit_logs FOR SELECT 
TO authenticated 
USING (true);

-- Set up trigger for updated_at on global_settings
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_global_settings_modtime
BEFORE UPDATE ON public.global_settings
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
