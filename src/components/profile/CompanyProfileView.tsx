import React, { useEffect, useState } from 'react';
import { supabase, SystemUser, getActiveFirmProfile } from '../../services/supabase';
import {
  Building2,
  MapPin,
  Mail,
  Scale,
  Phone,
  Globe,
  Briefcase,
  Save,
  CheckCircle2
} from 'lucide-react';

interface CompanyProfileViewProps { currentUser?: SystemUser | null; }

export const CompanyProfileView: React.FC<CompanyProfileViewProps> = ({ currentUser }) => {
  const initialFirm = getActiveFirmProfile();
  const [firmProfile, setFirmProfile] = useState({
    name: initialFirm.name || '',
    fullLocation: initialFirm.fullLocation || initialFirm.address || '',
    firmRegNo: initialFirm.lskRegNo || initialFirm.firmRegNo || '',
    kraPin: initialFirm.kraPin || '',
    address: initialFirm.address || '',
    poBox: initialFirm.poBox || '',
    website: initialFirm.website || '',
    email: initialFirm.email || '',
    taxationEmail: initialFirm.taxationEmail || initialFirm.email || '',
    billingEmail: initialFirm.billingEmail || initialFirm.email || '',
    phone: initialFirm.phone || '',
    logoUrl: initialFirm.logoUrl || '/logo.png'
  });

  useEffect(() => {
    const handleFirmChange = () => {
      const updated = getActiveFirmProfile();
      setFirmProfile({
        name: updated.name || '',
        fullLocation: updated.fullLocation || updated.address || '',
        firmRegNo: updated.lskRegNo || updated.firmRegNo || '',
        kraPin: updated.kraPin || '',
        address: updated.address || '',
        poBox: updated.poBox || '',
        website: updated.website || '',
        email: updated.email || '',
        taxationEmail: updated.taxationEmail || updated.email || '',
        billingEmail: updated.billingEmail || updated.email || '',
        phone: updated.phone || '',
        logoUrl: updated.logoUrl || '/logo.png'
      });
    };
    window.addEventListener('firmSettingsChanged', handleFirmChange);
    return () => window.removeEventListener('firmSettingsChanged', handleFirmChange);
  }, []);
  // Legal Calculations & Work Settings (Moved to Company Profile per specifications)
  const [defaultSchedule, setDefaultSchedule] = useState('schedule_6_high_court');
  const [defaultCurrency, setDefaultCurrency] = useState('KSHS');
  const [autoGettingUp, setAutoGettingUp] = useState(true);
  const [autoVat, setAutoVat] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!currentUser?.firmId) return;
    void supabase.from('firms').select('*').eq('id', currentUser.firmId).single().then(({ data }) => {
      if (!data) return;
      setFirmProfile({
        name: data.name || '',
        fullLocation: data.address || '',
        firmRegNo: data.firm_reg_no || '',
        kraPin: data.kra_pin || '',
        address: data.address || '',
        poBox: data.po_box || '',
        website: data.website || '',
        email: data.email || '',
        taxationEmail: data.taxation_email || data.email || '',
        billingEmail: data.billing_email || data.email || '',
        phone: data.phone || '',
        logoUrl: data.logo_url || '',
      });
    });
  }, [currentUser?.firmId]);

  const handleSaveLegalSettings = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="w-full space-y-8 pb-12">
      {/* TOP CENTER LOGO & HEADER */}
      <div className="text-center space-y-3 pt-4 pb-2 border-b border-[var(--border-color)]/50">
        <img
          src={firmProfile.logoUrl || "/logo.png"}
          alt="Nyagah B. Kithinji & Co. Advocates Logo"
          className="h-20 w-auto object-contain mx-auto"
        />

        <div>
          <h1 className="font-brand font-extrabold text-3xl text-[var(--text-main)] tracking-tight uppercase">
            {firmProfile.name}
          </h1>
          <p className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest mt-1">
            ADVOCATES OF THE HIGH COURT OF KENYA
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-sans">
            Construction Arbitration, Commercial Causes & High Court Litigation Advocates
          </p>
        </div>
      </div>

      {/* FIRM LEGAL CALCULATIONS & WORK SETTINGS CARD */}
      <div className="vercel-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[var(--text-main)]" />
            <div>
              <h2 className="font-bold text-sm text-[var(--text-main)] uppercase tracking-wider">
                Firm Legal Calculations & Work Defaults
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Default Advocates Remuneration Order parameters, fee scales, currency, and statutory tax settings
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveLegalSettings}
            className="btn-black px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Settings Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Legal Defaults
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Setting 1 */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[var(--text-main)] block">
              Default Advocates Remuneration Schedule:
            </label>
            <select
              value={defaultSchedule}
              onChange={(e) => setDefaultSchedule(e.target.value)}
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] focus:outline-none"
            >
              <option value="schedule_1_conveyancing">Schedule 1: Conveyancing & Sales</option>
              <option value="schedule_2_security">Schedule 2: Debentures & Mortgages</option>
              <option value="schedule_3_commercial">Schedule 3: Commercial Agreements</option>
              <option value="schedule_4_ip">Schedule 4: Intellectual Property</option>
              <option value="schedule_5_subordinate">Schedule 5: Subordinate/Magistrate Litigation</option>
              <option value="schedule_6_high_court">Schedule 6: High Court & Court of Appeal Litigation</option>
              <option value="schedule_7_arbitration">Schedule 7: Commercial Arbitration</option>
              <option value="schedule_8_general">Schedule 8: Non-Contentious Business</option>
            </select>
          </div>

          {/* Setting 2 */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[var(--text-main)] block">
              Default Currency System:
            </label>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] focus:outline-none font-mono"
            >
              <option value="KSHS">Kshs (Kenyan Shillings)</option>
              <option value="USD">USD ($ United States Dollar)</option>
              <option value="EUR">EUR (€ Euro)</option>
              <option value="GBP">GBP (£ British Pound)</option>
            </select>
          </div>

          {/* Setting 3 */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            <div>
              <span className="font-semibold text-[var(--text-main)] block">Auto-Calculate 1/3 Getting-Up Fee:</span>
              <span className="text-[11px] text-[var(--text-muted)]">Applies 33.33% instruction fee floor surcharge</span>
            </div>
            <input
              type="checkbox"
              checked={autoGettingUp}
              onChange={(e) => setAutoGettingUp(e.target.checked)}
              className="rounded accent-black dark:accent-white w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Setting 4 */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
            <div>
              <span className="font-semibold text-[var(--text-main)] block">Auto-Apply Statutory VAT (16%):</span>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">Includes 16% Value Added Tax on subtotal</span>
            </div>
            <input
              type="checkbox"
              checked={autoVat}
              onChange={(e) => setAutoVat(e.target.checked)}
              className="rounded accent-black dark:accent-white w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* TWO COLUMN INFORMATION CARDS FULL WIDTH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs">
        
        {/* LEFT COLUMN: Firm Location & Registration */}
        <div className="vercel-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
            <Building2 className="w-4.5 h-4.5 text-[var(--text-main)]" />
            <h2 className="font-bold text-sm text-[var(--text-main)] uppercase tracking-wider">
              Firm Legal & Registration Details
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[var(--text-muted)] block text-[11px] uppercase font-semibold">Full Location:</span>
              <p className="font-semibold text-sm text-[var(--text-main)] mt-0.5 leading-relaxed">
                {firmProfile.fullLocation}
              </p>
            </div>

            <div>
              <span className="text-[var(--text-muted)] block text-[11px] uppercase font-semibold">Firm LSK Registration Number:</span>
              <p className="font-mono font-bold text-base text-[var(--text-main)] mt-0.5">
                {firmProfile.firmRegNo}
              </p>
            </div>

            <div>
              <span className="text-[var(--text-muted)] block text-[11px] uppercase font-semibold">KRA Tax PIN:</span>
              <p className="font-mono font-bold text-base text-[var(--text-main)] mt-0.5">
                {firmProfile.kraPin}
              </p>
            </div>

            <div>
              <span className="text-[var(--text-muted)] block text-[11px] uppercase font-semibold">Physical & Postal Address:</span>
              <p className="text-xs sm:text-sm text-[var(--text-main)] mt-0.5 leading-relaxed font-sans">
                {firmProfile.address}<br />
                {firmProfile.poBox}
              </p>
            </div>

            <div>
              <span className="text-[var(--text-muted)] block text-[11px] uppercase font-semibold">Official Website:</span>
              <a
                  href={firmProfile.website ? `https://${firmProfile.website}` : '#'}
                target="_blank"
                rel="noreferrer"
                className="font-mono font-semibold text-sm text-blue-500 hover:underline mt-0.5 flex items-center gap-1.5"
              >
                <Globe className="w-4 h-4" /> {firmProfile.website}
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Communications & Embedded Location Map */}
        <div className="vercel-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
            <Mail className="w-4.5 h-4.5 text-[var(--text-main)]" />
            <h2 className="font-bold text-sm text-[var(--text-main)] uppercase tracking-wider">
              Official Communications & Map Location
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[var(--text-muted)] block text-[11px] uppercase font-semibold">Official Email Addresses:</span>
              <div className="font-mono space-y-1.5 mt-1 text-xs">
                <p><span className="text-[var(--text-muted)]">General Enquiries:</span> <strong className="text-[var(--text-main)]">{firmProfile.email}</strong></p>
                <p><span className="text-[var(--text-muted)]">Taxation Dept:</span> <strong className="text-[var(--text-main)]">{firmProfile.taxationEmail}</strong></p>
                <p><span className="text-[var(--text-muted)]">Billing & Accounts:</span> <strong className="text-[var(--text-main)]">{firmProfile.billingEmail}</strong></p>
              </div>
            </div>

            <div>
              <span className="text-[var(--text-muted)] block text-[11px] uppercase font-semibold">Telephone & Hotlines:</span>
              <div className="font-mono space-y-0.5 mt-1">
                <p className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-[var(--text-muted)]" /> {firmProfile.phone}
                </p>
              </div>
            </div>

            {/* Embedded Google Maps View */}
            <div>
              <span className="text-[var(--text-muted)] block text-[11px] uppercase font-semibold mb-2 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-500" /> Upper Hill Office Location Map:
              </span>
              <div className="rounded-xl overflow-hidden border border-[var(--border-color)] h-52 shadow-inner">
                <iframe
                  title="Firm Location Map"
                  src="https://maps.google.com/maps?q=-1.2985,36.8155&z=15&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* MODERN FOOTER Strictly matching user specification */}
      <footer className="pt-8 border-t border-[var(--border-color)] text-center space-y-1 text-xs text-[var(--text-muted)]">
        <p className="font-semibold text-[var(--text-main)]">
          BoC Builder Software 2026. All rights reserved.
        </p>
        <p className="text-[11px]">
          Developed by <span className="font-bold text-[var(--text-main)]">© P3L Developers</span>, Nairobi
        </p>
      </footer>
    </div>
  );
};

export default CompanyProfileView;
