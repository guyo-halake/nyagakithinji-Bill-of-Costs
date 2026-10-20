import React, { useState } from 'react';
import { EXACT_FIRM_INFO } from '../../services/supabase';
import { 
  Building2, ShieldCheck, CheckCircle2, Save, Mail, Phone, MapPin, 
  CreditCard, Globe, Edit, Lock, FileText, Check, Award, HardDrive, Users
} from 'lucide-react';

export const AdminFirmsView: React.FC = () => {
  // Active logged-in law firm profile state for Nyagah B. Kithinji & Co. Advocates
  const [firmProfile, setFirmProfile] = useState(() => {
    let customSettings = { topbarTitle: 'Kithinji & Co', topbarSubtitle: 'Advocates of the High Court of Kenya', logoUrl: '/logo.png' };
    const savedCustom = localStorage.getItem('BILLSZIP_FIRM_SETTINGS');
    if (savedCustom) {
      try { customSettings = JSON.parse(savedCustom); } catch(e) {}
    }
    return {
      name: EXACT_FIRM_INFO.name,
      firmRegNo: EXACT_FIRM_INFO.firmRegNo,
      managingAdvocate: EXACT_FIRM_INFO.user.name,
      email: EXACT_FIRM_INFO.email,
      taxationEmail: EXACT_FIRM_INFO.taxationEmail || 'taxation@kithinjilegal.co.ke',
      billingEmail: EXACT_FIRM_INFO.billingEmail || 'billing@kithinjilegal.co.ke',
      phonePrimary: EXACT_FIRM_INFO.phone,
      phoneSecondary: '+254 711 000 000',
      addressLine1: EXACT_FIRM_INFO.address,
      city: EXACT_FIRM_INFO.fullLocation,
      poBox: EXACT_FIRM_INFO.poBox,
      website: EXACT_FIRM_INFO.website,
      kraPin: EXACT_FIRM_INFO.kraPin,
      bankName: 'KCB Bank Kenya Ltd',
      bankBranch: 'Kilimani Branch, Nairobi',
      bankAccountNo: '1104889922',
      bankSwiftCode: 'KCBLKENX',
      plan: 'Enterprise Platinum',
      storageQuota: '100 GB',
      userSeats: '50 Seats',
      ...customSettings
    };
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveFirmProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('BILLSZIP_FIRM_SETTINGS', JSON.stringify({
      topbarTitle: firmProfile.topbarTitle,
      topbarSubtitle: firmProfile.topbarSubtitle,
      logoUrl: firmProfile.logoUrl
    }));
    window.dispatchEvent(new Event('firmSettingsChanged'));
    setIsEditing(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
    alert(`✓ Law Firm Profile for "${firmProfile.name}" updated successfully in database!`);
  };

  return (
    <div className="w-full space-y-8 pb-12 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)]/50 pb-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold text-[10px]">
            DEVELOPER CONTROL PANEL
          </span>
          <h1 className="font-brand font-extrabold text-2xl text-[var(--text-main)] tracking-tight mt-1">
            Law Firm Profile & Practice Settings
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Configure primary law firm credentials, official emails, telephones, physical location, KRA Tax PIN, and fee note bank details.
          </p>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="btn-black px-5 py-2.5 text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
        >
          <Edit className="w-4 h-4 text-emerald-400" /> {isEditing ? 'Cancel Editing' : 'Edit Firm Profile'}
        </button>
      </div>

      {/* Main Firm Profile Editor / View Container */}
      <div className="vercel-card p-6 bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-[var(--bg-subtle)] border border-[var(--border-color)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)]/50 pb-5">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="Nyagah B. Kithinji & Co. Advocates Logo"
              className="h-14 w-auto object-contain shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-brand font-extrabold text-xl sm:text-2xl text-[var(--text-main)] tracking-tight">
                  {firmProfile.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono font-bold text-[10.5px]">
                  ✓ Active Legal Practice
                </span>
              </div>
              <p className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                LSK Practice Certificate: {firmProfile.firmRegNo} • Managing Partner: {firmProfile.managingAdvocate}
              </p>
            </div>
          </div>

          {isSaved && (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono font-bold text-xs border border-emerald-500/20 shadow-xs">
              <CheckCircle2 className="w-4 h-4" /> Firm Settings Saved!
            </div>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveFirmProfile} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Official Law Firm Name:</label>
                <input
                  type="text"
                  required
                  value={firmProfile.name}
                  onChange={(e) => setFirmProfile({ ...firmProfile, name: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Top bar Title (Firm Name):</label>
                <input
                  type="text"
                  required
                  value={firmProfile.topbarTitle}
                  onChange={(e) => setFirmProfile({ ...firmProfile, topbarTitle: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Top bar Subtitle:</label>
                <input
                  type="text"
                  required
                  value={firmProfile.topbarSubtitle}
                  onChange={(e) => setFirmProfile({ ...firmProfile, topbarSubtitle: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Logo Image URL:</label>
                <input
                  type="text"
                  required
                  value={firmProfile.logoUrl}
                  onChange={(e) => setFirmProfile({ ...firmProfile, logoUrl: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">LSK Practice Cert No:</label>
                <input
                  type="text"
                  required
                  value={firmProfile.firmRegNo}
                  onChange={(e) => setFirmProfile({ ...firmProfile, firmRegNo: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 font-mono text-xs text-amber-500 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Managing Advocate / Partner:</label>
                <input
                  type="text"
                  required
                  value={firmProfile.managingAdvocate}
                  onChange={(e) => setFirmProfile({ ...firmProfile, managingAdvocate: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">General Enquiries Email:</label>
                <input
                  type="email"
                  required
                  value={firmProfile.email}
                  onChange={(e) => setFirmProfile({ ...firmProfile, email: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Taxation Dept Email:</label>
                <input
                  type="email"
                  required
                  value={firmProfile.taxationEmail}
                  onChange={(e) => setFirmProfile({ ...firmProfile, taxationEmail: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Billing & Accounts Email:</label>
                <input
                  type="email"
                  required
                  value={firmProfile.billingEmail}
                  onChange={(e) => setFirmProfile({ ...firmProfile, billingEmail: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Primary Telephone Line:</label>
                <input
                  type="text"
                  required
                  value={firmProfile.phonePrimary}
                  onChange={(e) => setFirmProfile({ ...firmProfile, phonePrimary: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Secondary Phone Line:</label>
                <input
                  type="text"
                  value={firmProfile.phoneSecondary}
                  onChange={(e) => setFirmProfile({ ...firmProfile, phoneSecondary: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Firm Website Domain:</label>
                <input
                  type="text"
                  value={firmProfile.website}
                  onChange={(e) => setFirmProfile({ ...firmProfile, website: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 font-mono text-xs text-blue-500 font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Physical Office Address:</label>
                <input
                  type="text"
                  required
                  value={firmProfile.addressLine1}
                  onChange={(e) => setFirmProfile({ ...firmProfile, addressLine1: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Full Location & City:</label>
                <input
                  type="text"
                  required
                  value={firmProfile.city}
                  onChange={(e) => setFirmProfile({ ...firmProfile, city: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Postal Box Address:</label>
                <input
                  type="text"
                  value={firmProfile.poBox}
                  onChange={(e) => setFirmProfile({ ...firmProfile, poBox: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">KRA Tax PIN Number:</label>
                <input
                  type="text"
                  value={firmProfile.kraPin}
                  onChange={(e) => setFirmProfile({ ...firmProfile, kraPin: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 font-mono text-xs text-blue-500 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Bank Name & Branch:</label>
                <input
                  type="text"
                  value={firmProfile.bankName}
                  onChange={(e) => setFirmProfile({ ...firmProfile, bankName: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-main)] block mb-1">Fee Note Bank Account No:</label>
                <input
                  type="text"
                  value={firmProfile.bankAccountNo}
                  onChange={(e) => setFirmProfile({ ...firmProfile, bankAccountNo: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 font-mono text-xs text-emerald-500 font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-[var(--border-color)]">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)} 
                className="btn-outline px-4 py-2.5 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-black px-6 py-2.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4 text-emerald-400" /> Save Firm Profile Settings
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs font-mono">
            <div className="space-y-2 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
              <span className="text-[10.5px] text-[var(--text-muted)] uppercase block font-sans font-bold flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-500" /> Official Email & Phone
              </span>
              <p className="text-[var(--text-main)] font-semibold">{firmProfile.email}</p>
              <p className="text-[var(--text-muted)] text-[11px]">{firmProfile.phonePrimary}</p>
              <p className="text-[var(--text-muted)] text-[11px]">{firmProfile.phoneSecondary}</p>
              <p className="text-blue-500 font-semibold text-[11px]">{firmProfile.website}</p>
            </div>

            <div className="space-y-2 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
              <span className="text-[10.5px] text-[var(--text-muted)] uppercase block font-sans font-bold flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-500" /> Physical Office Location
              </span>
              <p className="text-[var(--text-main)] font-sans">{firmProfile.addressLine1}</p>
              <p className="text-[var(--text-muted)] font-sans text-[11px]">{firmProfile.city}</p>
              <p className="text-[var(--text-muted)] text-[11px]">{firmProfile.poBox}</p>
            </div>

            <div className="space-y-2 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
              <span className="text-[10.5px] text-[var(--text-muted)] uppercase block font-sans font-bold flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-500" /> Fee Note Banking & Tax PIN
              </span>
              <p className="text-[var(--text-main)] font-bold">KRA PIN: {firmProfile.kraPin}</p>
              <p className="text-emerald-500 font-bold">{firmProfile.bankName}</p>
              <p className="text-[var(--text-muted)] text-[11px]">Branch: {firmProfile.bankBranch}</p>
              <p className="text-[var(--text-muted)] font-bold text-[11px]">A/C: {firmProfile.bankAccountNo}</p>
            </div>

            <div className="space-y-2 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
              <span className="text-[10.5px] text-[var(--text-muted)] uppercase block font-sans font-bold flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-purple-500" /> BOC system quot and plan....set_3
              </span>
              <p className="text-purple-400 font-bold">{firmProfile.plan}</p>
              <p className="text-[var(--text-muted)] text-[11px]">Storage Allocated: 543 GB</p>
              <p className="text-[var(--text-muted)] text-[11px]">P3L L Number: p3l_6847300288774hg492</p>
              
              <div className="mt-2 p-2.5 bg-slate-900 rounded-lg flex items-start gap-2 border border-slate-700">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1 shrink-0"></div>
                <div className="text-[10px] font-mono text-emerald-400 leading-tight">
                  <span className="text-white font-bold block mb-0.5">Razak Server Connected</span>
                  Location: Marsabit County<br/>
                  IP: 197.232.14.88
                </div>
              </div>
              
              <p className="text-emerald-500 font-bold text-[11px] mt-2">Status: Verified Active</p>
            </div>
          </div>
        )}
      </div>

      {/* Software Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
        <div className="vercel-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-500" />
            <span className="text-[11px] text-[var(--text-muted)] uppercase font-sans font-bold">Documentation and Users Storage</span>
          </div>
          <p className="text-lg font-extrabold text-blue-500">100 GB Hash Encrypt</p>
          <p className="text-[11px] text-[var(--text-muted)] font-sans">Automated encrypted cloud storage backup enabled.</p>
        </div>

        <div className="vercel-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px] text-[var(--text-muted)] uppercase font-sans font-bold">Active Seat Licences</span>
          </div>
          <p className="text-lg font-extrabold text-emerald-500">4 Active Seats</p>
          <p className="text-[11px] text-[var(--text-muted)] font-sans">Administartor, Systems Developer - P3L Developers IC, Advocates and Lawyers, Managing and Exec</p>
        </div>
      </div>
    </div>
  );
};

export default AdminFirmsView;


