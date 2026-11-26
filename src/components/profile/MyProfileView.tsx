import React, { useState, useEffect, useRef } from 'react';
import { supabase, SystemUser } from '../../services/supabase';
import { getCurrentUserProfile } from '../../services/auth';
import {
  User,
  Briefcase,
  Mail,
  Phone,
  CheckCircle2,
  Edit3,
  Camera,
  Save,
  X,
  Upload,
  ShieldCheck
} from 'lucide-react';

interface MyProfileViewProps {
  currentUser?: SystemUser | null;
}

export const MyProfileView: React.FC<MyProfileViewProps> = ({ currentUser }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamically resolve currently logged in session user
  const resolveUser = (): SystemUser => {
    if (currentUser) return currentUser;
    return {
      id: '', fullName: '', advocateTitle: '', lskNo: '', role: 'Advocate', position: '',
      workEmail: '', personalEmail: '', phonePrimary: '', phoneSecondary: '',
      hasAllPermissions: false, passwordHash: ''
    };
  };

  const [user, setUser] = useState<SystemUser>(resolveUser);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Form Fields
  const [fullName, setFullName] = useState(user.fullName || '');
  const [advocateTitle, setAdvocateTitle] = useState(user.advocateTitle || '');
  const [lskNo, setLskNo] = useState(user.lskNo || '');
  const [position, setPosition] = useState(user.position || '');
  const [workEmail, setWorkEmail] = useState(user.workEmail || '');
  const [personalEmail, setPersonalEmail] = useState(user.personalEmail || '');
  const [phonePrimary, setPhonePrimary] = useState(user.phonePrimary || '');
  const [phoneSecondary, setPhoneSecondary] = useState(user.phoneSecondary || '');
  const [avatarPreview, setAvatarPreview] = useState<string>(user.avatarUrl || '');

  useEffect(() => {
    const updated = resolveUser();
    setUser(updated);
    setFullName(updated.fullName || '');
    setAdvocateTitle(updated.advocateTitle || '');
    setLskNo(updated.lskNo || '');
    setPosition(updated.position || '');
    setWorkEmail(updated.workEmail || '');
    setPersonalEmail(updated.personalEmail || '');
    setPhonePrimary(updated.phonePrimary || '');
    setPhoneSecondary(updated.phoneSecondary || '');
    setAvatarPreview(updated.avatarUrl || '');
    let isMounted = true;
    void getCurrentUserProfile().then(profile => {
      if (!isMounted || !profile) return;
      setUser(profile);
      setFullName(profile.fullName);
      setAdvocateTitle(profile.advocateTitle || '');
      setLskNo(profile.lskNo || '');
      setPosition(profile.position || '');
      setWorkEmail(profile.workEmail || '');
      setPersonalEmail(profile.personalEmail || '');
      setPhonePrimary(profile.phonePrimary || '');
      setPhoneSecondary(profile.phoneSecondary || '');
      setAvatarPreview(profile.avatarUrl || '');
    }).catch(error => {
      if (isMounted) {
        setProfileError(error instanceof Error ? error.message : 'Could not load your saved profile.');
      }
    });
    return () => { isMounted = false; };
  }, [currentUser]);

  // Handle Local File Avatar Upload
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (under 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Avatar image file should be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setAvatarPreview(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const updatedUser: SystemUser = {
      ...user,
      fullName: fullName.trim(),
      advocateTitle: advocateTitle.trim().replace(/^Adv\.?\s*/i, ''),
      lskNo: lskNo.trim(),
      position: position.trim(),
      workEmail: workEmail.trim(),
      personalEmail: personalEmail.trim(),
      phonePrimary: phonePrimary.trim(),
      phoneSecondary: phoneSecondary.trim(),
      avatarUrl: avatarPreview || undefined
    };

    if (!updatedUser.id || !updatedUser.firmId) {
      setProfileError('Your signed-in profile could not be matched to a firm account.');
      return;
    }

    setIsSaving(true);
    setProfileError('');
    try {
      const { data, error } = await supabase.from('users').update({
        full_name: updatedUser.fullName,
        advocate_title: updatedUser.advocateTitle || null,
        lsk_no: updatedUser.lskNo || null,
        position: updatedUser.position || null,
        department: updatedUser.department || null,
        email: updatedUser.workEmail,
        personal_email: updatedUser.personalEmail || null,
        phone_primary: updatedUser.phonePrimary || null,
        phone_secondary: updatedUser.phoneSecondary || null,
        avatar_url: updatedUser.avatarUrl?.startsWith('data:') ? null : updatedUser.avatarUrl || null,
      }).eq('id', updatedUser.id).eq('firm_id', updatedUser.firmId).select('*').single();
      if (error) throw error;

      const savedUser: SystemUser = {
        ...updatedUser,
        fullName: data.full_name,
        advocateTitle: data.advocate_title || '',
        lskNo: data.lsk_no || '',
        position: data.position || '',
        department: data.department || '',
        workEmail: data.email,
        personalEmail: data.personal_email || '',
        phonePrimary: data.phone_primary || '',
        phoneSecondary: data.phone_secondary || '',
        avatarUrl: data.avatar_url || undefined,
      };
      setUser(savedUser);
      setIsEditing(false);
      setSaveSuccess(true);
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: savedUser }));
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFullName(user.fullName || '');
    setAdvocateTitle(user.advocateTitle || '');
    setLskNo(user.lskNo || '');
    setPosition(user.position || '');
    setWorkEmail(user.workEmail || '');
    setPersonalEmail(user.personalEmail || '');
    setPhonePrimary(user.phonePrimary || '');
    setPhoneSecondary(user.phoneSecondary || '');
    setAvatarPreview(user.avatarUrl || '');
  };

  const userInitials = user.fullName
    ? user.fullName.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
      />

      {/* Success Notification Banner */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-3 text-xs font-bold animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>Profile information and avatar saved permanently to database!</span>
        </div>
      )}

      {/* Main Profile Executive Card */}
      <div className="modulix-card p-6 sm:p-8 space-y-6">
        
        {/* Top Header & Edit Button */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left justify-between">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            
            {/* Avatar Photo Frame with Upload Trigger */}
            <div className="relative group shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={user.fullName}
                  className="w-28 h-28 rounded-2xl object-cover shadow-xl border-2 border-slate-200 dark:border-zinc-700"
                />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-3xl shadow-xl border-2 border-slate-200 dark:border-zinc-700 font-mono">
                  {userInitials}
                </div>
              )}

              {/* Upload Overlay Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-2xs"
                title="Upload Avatar Image"
              >
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Change Photo</span>
              </button>

              <span className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-black absolute -bottom-1 -right-1" title="Active Advocate" />
            </div>

            {profileError && (
              <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                {profileError}
              </p>
            )}

            {/* Profile Main Titles */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold font-mono tracking-wider uppercase">
                  {user.role}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold font-mono tracking-wider uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" /> Active Practitioner
                </span>
              </div>

              <h1 className="font-brand font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
                {user.advocateTitle || user.fullName}
              </h1>

              {user.lskNo && (
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 font-mono">
                  LSK Admission No: {user.lskNo}
                </p>
              )}

              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                {user.position}
              </p>
            </div>
          </div>

          {/* Edit Profile / Save Toggle Button */}
          <div className="shrink-0 flex items-center gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" /> Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3.5 py-2 border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveProfile()}
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm shadow-emerald-500/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PROFILE EDIT FORM (WHEN isEditing === true) */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-6 pt-6 border-t border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-900/10 border border-blue-200/60 dark:border-blue-800/40">
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Profile Photo & Avatar</h4>
                  <p className="text-[11px] text-slate-500">Pick any image from your computer to update your avatar.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-600 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-bold hover:border-blue-500 cursor-pointer shrink-0"
              >
                Choose Local Image File
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">
                  Advocate Full Name:
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">
                  Advocate Title (Display Header):
                </label>
                <input
                  type="text"
                  value={advocateTitle}
                  onChange={(e) => setAdvocateTitle(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">
                  LSK Admission Number:
                </label>
                <input
                  type="text"
                  value={lskNo}
                  onChange={(e) => setLskNo(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">
                  Position / Firm Role:
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">
                  Official Work Email:
                </label>
                <input
                  type="email"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">
                  Personal Email:
                </label>
                <input
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">
                  Direct Phone Number:
                </label>
                <input
                  type="text"
                  value={phonePrimary}
                  onChange={(e) => setPhonePrimary(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">
                  Mobile Phone Number:
                </label>
                <input
                  type="text"
                  value={phoneSecondary}
                  onChange={(e) => setPhoneSecondary(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-slate-300 dark:border-zinc-700 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Profile to Database
              </button>
            </div>
          </form>
        ) : (
          /* READ-ONLY VIEW GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-[var(--border-color)] text-xs">
            {/* Work & Practice Credentials */}
            <div className="space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 border-b border-[var(--border-color)] pb-2 font-mono">
                <Briefcase className="w-4 h-4 text-blue-600" /> Practice Credentials
              </h3>

              <div className="space-y-3.5">
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Full Legal Name:</span>
                  <p className="font-bold text-base text-slate-900 dark:text-white">{user.fullName}</p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">LSK Admission Number:</span>
                  <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{user.lskNo || '—'}</p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Designated Position:</span>
                  <p className="text-xs sm:text-sm text-slate-900 dark:text-white font-semibold">{user.position}</p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Practising Status:</span>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Active Unconditional Practising Certificate
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Contact Details */}
            <div className="space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 border-b border-[var(--border-color)] pb-2 font-mono">
                <Mail className="w-4 h-4 text-blue-600" /> Contact & Phone Numbers
              </h3>

              <div className="space-y-3.5">
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Official Work Email:</span>
                  <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{user.workEmail}</p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Personal / Direct Email:</span>
                  <p className="font-mono text-xs sm:text-sm text-slate-900 dark:text-white">{user.personalEmail}</p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Telephone Numbers:</span>
                  <div className="font-mono font-semibold text-xs sm:text-sm text-slate-900 dark:text-white space-y-1 mt-1">
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Direct: {user.phonePrimary}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Mobile: {user.phoneSecondary}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="pt-6 border-t border-[var(--border-color)]/60 text-center space-y-1 text-xs text-slate-500">
        <p className="font-semibold text-slate-800 dark:text-zinc-200">
          BoC Builder Software 2026. All rights reserved.
        </p>
        <p className="text-[11px]">
          Developed by <span className="font-bold text-slate-900 dark:text-white">© P3L Developers</span>, Nairobi
        </p>
      </footer>
    </div>
  );
};

export default MyProfileView;
