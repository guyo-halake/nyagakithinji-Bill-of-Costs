import React, { useEffect, useState } from 'react';
import { Building2, Landmark, Mail, MapPin, Phone } from 'lucide-react';
import { supabase, SystemUser } from '../../services/supabase';

interface CompanyProfileViewProps {
  currentUser?: SystemUser | null;
}

type FirmRow = {
  name: string;
  topbar_subtitle: string | null;
  firm_reg_no: string | null;
  managing_partner: string | null;
  address: string | null;
  po_box: string | null;
  email: string | null;
  service_email: string | null;
  taxation_email: string | null;
  billing_email: string | null;
  phone: string | null;
  kra_pin: string | null;
  vat_number: string | null;
  website: string | null;
  logo_url: string | null;
  office_bank_name: string | null;
  office_branch: string | null;
  office_account_no: string | null;
  office_swift: string | null;
  client_trust_bank_name: string | null;
  client_trust_branch: string | null;
  client_trust_account_no: string | null;
  client_trust_swift: string | null;
  mpesa_paybill: string | null;
  mpesa_account_ref: string | null;
};

const EMPTY_FIRM: FirmRow = {
  name: '',
  topbar_subtitle: null,
  firm_reg_no: null,
  managing_partner: null,
  address: null,
  po_box: null,
  email: null,
  service_email: null,
  taxation_email: null,
  billing_email: null,
  phone: null,
  kra_pin: null,
  vat_number: null,
  website: null,
  logo_url: null,
  office_bank_name: null,
  office_branch: null,
  office_account_no: null,
  office_swift: null,
  client_trust_bank_name: null,
  client_trust_branch: null,
  client_trust_account_no: null,
  client_trust_swift: null,
  mpesa_paybill: null,
  mpesa_account_ref: null,
};

const Value = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="min-w-0">
    <dt className="text-xs text-slate-500 dark:text-zinc-400">{label}</dt>
    <dd className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-white">
      {value?.trim() || '—'}
    </dd>
  </div>
);

const Section = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border border-[var(--border-color)] bg-white p-5 dark:bg-zinc-900">
    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
      {icon}
      {title}
    </h2>
    {children}
  </section>
);

export const CompanyProfileView: React.FC<CompanyProfileViewProps> = ({ currentUser }) => {
  const [firm, setFirm] = useState<FirmRow>(EMPTY_FIRM);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (!currentUser?.firmId) {
      setIsLoading(false);
      setErrorMessage('Sign in to view your firm details.');
      return () => { isMounted = false; };
    }

    setIsLoading(true);
    setErrorMessage('');
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('firms')
          .select('*')
          .eq('id', currentUser.firmId)
          .single();
        if (!isMounted) return;
        if (error) {
          setErrorMessage(`Could not load firm details: ${error.message}`);
          return;
        }
        setFirm({ ...EMPTY_FIRM, ...(data as FirmRow) });
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? `Could not load firm details: ${error.message}` : 'Could not load firm details.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [currentUser?.firmId]);

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-slate-500">Loading firm details...</p>;
  }

  if (errorMessage) {
    return (
      <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
        {errorMessage}
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-10">
      <header className="flex items-center gap-4 rounded-xl border border-[var(--border-color)] bg-white p-5 dark:bg-zinc-900">
        {firm.logo_url && (
          <img src={firm.logo_url} alt="" className="h-14 w-14 rounded-lg object-contain" />
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {firm.name || 'Firm details'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            {firm.topbar_subtitle || 'Practice and contact information'}
          </p>
          {firm.firm_reg_no && (
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Registration: {firm.firm_reg_no}
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Office and registration" icon={<Building2 className="h-4 w-4" />}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Value label="Managing partner" value={firm.managing_partner} />
            <Value label="Firm registration" value={firm.firm_reg_no} />
            <Value label="Office address" value={firm.address} />
            <Value label="Postal address" value={firm.po_box} />
            <Value label="KRA PIN" value={firm.kra_pin} />
            <Value label="VAT number" value={firm.vat_number} />
            <Value label="Website" value={firm.website} />
          </dl>
        </Section>

        <Section title="Contact details" icon={<Mail className="h-4 w-4" />}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Value label="Court service email" value={firm.service_email} />
            <Value label="General email" value={firm.email} />
            <Value label="Billing email" value={firm.billing_email} />
            <Value label="Tax email" value={firm.taxation_email} />
            <Value label="Telephone" value={firm.phone} />
          </dl>
        </Section>

        <Section title="Office account" icon={<Landmark className="h-4 w-4" />}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Value label="Bank" value={firm.office_bank_name} />
            <Value label="Branch" value={firm.office_branch} />
            <Value label="Account number" value={firm.office_account_no} />
            <Value label="SWIFT" value={firm.office_swift} />
          </dl>
        </Section>

        <Section title="Client account" icon={<Landmark className="h-4 w-4" />}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Value label="Bank" value={firm.client_trust_bank_name} />
            <Value label="Branch" value={firm.client_trust_branch} />
            <Value label="Account number" value={firm.client_trust_account_no} />
            <Value label="SWIFT" value={firm.client_trust_swift} />
          </dl>
        </Section>

        <Section title="M-Pesa" icon={<Phone className="h-4 w-4" />}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Value label="Paybill" value={firm.mpesa_paybill} />
            <Value label="Account reference" value={firm.mpesa_account_ref} />
          </dl>
        </Section>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
        <MapPin className="h-3.5 w-3.5" />
        Details shown here are loaded from your firm record.
      </p>
    </div>
  );
};

export default CompanyProfileView;
