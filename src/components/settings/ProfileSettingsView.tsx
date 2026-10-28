import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  User,
  Building2,
  Calculator,
  Palette,
  Bell,
  ShieldCheck,
  Save,
  CheckCircle2,
  Moon,
  Sun,
  Camera,
  Upload,
  Download,
  KeyRound,
  FileText,
  Mail,
  Phone,
  MapPin,
  Landmark,
  Briefcase,
  Layers,
  Sliders,
  Lock,
  Clock,
  Eye,
  EyeOff,
  Check,
  Share2,
  AlertCircle,
  Pencil,
  X,
  Key,
  Send,
  Loader2,
  Scale,
  HelpCircle,
  Shield,
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import { supabase, SystemUser, EXACT_FIRM_INFO, getFeeNotes, saveUserProfile } from '../../services/supabase';
import { logSystemActivity } from '../../services/activityLogger';
import { hasPermission } from '../../services/rbac';

interface SettingsProps {
  currentUser?: SystemUser | null;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  initialTab?: 'profile' | 'firm' | 'calculator' | 'appearance' | 'notifications';
}

export const ProfileSettingsView: React.FC<SettingsProps> = ({
  currentUser,
  isDarkMode = false,
  toggleTheme,
  initialTab = 'profile'
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'firm' | 'calculator' | 'appearance' | 'notifications'>(initialTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  const can = (code: string) => hasPermission(currentUser, code);

  // Resolve active logged in user from props or session storage
  const getActiveUser = (): Partial<SystemUser> => {
    if (currentUser && currentUser.fullName) return currentUser;
    try {
      const saved = localStorage.getItem('BILLSZIP_SESSION');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.fullName || parsed.workEmail)) return parsed;
      }
    } catch (e) {}
    return currentUser || {};
  };

  const initialUser = getActiveUser();

  // Helper to remove any forced "Adv." prefix from title
  const cleanTitle = (rawTitle?: string, name?: string) => {
    if (!rawTitle) return '';
    const trimmed = rawTitle.trim();
    if (name && trimmed.toLowerCase() === `adv. ${name.toLowerCase()}`) return '';
    if (trimmed.startsWith('Adv. ')) return trimmed.replace(/^Adv\.\s*/i, '');
    return trimmed;
  };

  // --------------------------------------------------------------------------
  // MODULE 1: PROFILE STATE (REAL-TIME AUTHENTICATED USER DATA)
  // --------------------------------------------------------------------------
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [userFullName, setUserFullName] = useState(initialUser.fullName || '');
  const [userTitle, setUserTitle] = useState(cleanTitle(initialUser.advocateTitle, initialUser.fullName));
  const [userLskNo, setUserLskNo] = useState(initialUser.lskNo || '');
  const [userPosition, setUserPosition] = useState(initialUser.position || '');
  const [userDepartment, setUserDepartment] = useState(initialUser.department || '');
  const [userWorkEmail, setUserWorkEmail] = useState(initialUser.workEmail || initialUser.personalEmail || '');
  const [userPersonalEmail, setUserPersonalEmail] = useState(initialUser.personalEmail || '');
  const [userPhonePrimary, setUserPhonePrimary] = useState(initialUser.phonePrimary || '');
  const [userPhoneSecondary, setUserPhoneSecondary] = useState(initialUser.phoneSecondary || '');
  const [userAvatarUrl, setUserAvatarUrl] = useState(initialUser.avatarUrl || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const active = getActiveUser();
    if (active.fullName || active.workEmail) {
      setUserFullName(active.fullName || '');
      setUserTitle(cleanTitle(active.advocateTitle, active.fullName));
      setUserLskNo(active.lskNo || '');
      setUserPosition(active.position || '');
      setUserDepartment(active.department || '');
      setUserWorkEmail(active.workEmail || active.personalEmail || '');
      setUserPersonalEmail(active.personalEmail || '');
      setUserPhonePrimary(active.phonePrimary || '');
      setUserPhoneSecondary(active.phoneSecondary || '');
      setUserAvatarUrl(active.avatarUrl || '');
    }

    // Live sync directly from Supabase if user ID is available
    const syncRemoteUser = async () => {
      if (active.id) {
        try {
          const { data, error } = await supabase.from('users').select('*').eq('id', active.id).single();
          if (!error && data) {
            setUserFullName(data.full_name || active.fullName || '');
            setUserTitle(cleanTitle(data.advocate_title, data.full_name || active.fullName));
            setUserLskNo(data.lsk_no || active.lskNo || '');
            setUserPosition(data.position || active.position || '');
            setUserDepartment(data.department || active.department || '');
            setUserWorkEmail(data.work_email || active.workEmail || '');
            setUserPersonalEmail(data.personal_email || active.personalEmail || '');
            setUserPhonePrimary(data.phone_primary || active.phonePrimary || '');
            setUserPhoneSecondary(data.phone_secondary || active.phoneSecondary || '');
            setUserAvatarUrl(data.avatar_url || active.avatarUrl || '');
          }
        } catch (e) {}
      }
    };
    syncRemoteUser();
  }, [currentUser]);

  // --------------------------------------------------------------------------
  // MODULE 2: FIRM BRANDING & INSTITUTIONAL CHARTER STATE
  // --------------------------------------------------------------------------
  const [isEditingFirm, setIsEditingFirm] = useState(false);
  const [firmSettings, setFirmSettings] = useState(() => {
    const saved = localStorage.getItem('BILLSZIP_FIRM_SETTINGS');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return {
          topbarTitle: parsed.topbarTitle || EXACT_FIRM_INFO.name || 'Nyagah B. Kithinji & Co. Advocates',
          topbarSubtitle: parsed.topbarSubtitle || (EXACT_FIRM_INFO as any).title || 'Advocates of the High Court of Kenya',
          lskRegNo: parsed.lskRegNo || (EXACT_FIRM_INFO as any).firmRegNo || 'P.105/1992',
          managingPartner: parsed.managingPartner || (EXACT_FIRM_INFO as any).managingPartner || 'Nyagah B. Kithinji',
          logoUrl: parsed.logoUrl || EXACT_FIRM_INFO.logoUrl || '/logo.png',
          poBox: parsed.poBox || EXACT_FIRM_INFO.poBox || 'P.O. Box 1992-00100, Nairobi, Kenya',
          address: parsed.address || EXACT_FIRM_INFO.address || 'Suite 4B, Mbaruk Road, Off Muchai Drive, Golf Course Estate, Upper Hill, Nairobi',
          serviceEmail: parsed.serviceEmail || (EXACT_FIRM_INFO as any).serviceEmail || 'service@nbkco-advocates.com',
          phone: parsed.phone || EXACT_FIRM_INFO.phone || '+254 (0)20 271 8890 / +254 722 000 111',
          email: parsed.email || EXACT_FIRM_INFO.email || 'info@nbkco-advocates.com',
          kraPin: parsed.kraPin || EXACT_FIRM_INFO.kraPin || 'P051123456Z',
          vatNumber: parsed.vatNumber || (EXACT_FIRM_INFO as any).vatNumber || 'VAT-0192834-K',
          officeBankName: parsed.officeBankName || 'KCB Bank Kenya Ltd',
          officeAccountName: parsed.officeAccountName || 'Nyagah B. Kithinji & Co Office A/C',
          officeBranch: parsed.officeBranch || 'Kilimani Branch',
          officeAccountNo: parsed.officeAccountNo || '1104889922',
          officeSwift: parsed.officeSwift || 'KCBLKENX',
          clientTrustBankName: parsed.clientTrustBankName || 'Standard Chartered Bank',
          clientTrustAccountName: parsed.clientTrustAccountName || 'Nyagah B. Kithinji & Co Clients / Trust A/C',
          clientTrustBranch: parsed.clientTrustBranch || 'Kenyatta Avenue',
          clientTrustAccountNo: parsed.clientTrustAccountNo || '010203040506',
          clientTrustSwift: parsed.clientTrustSwift || 'SCBLKENX',
          mpesaPaybill: parsed.mpesaPaybill || '522522',
          mpesaAccountRef: parsed.mpesaAccountRef || 'MATTER NO / CLIENT NAME',
          bankDetails: parsed.bankDetails || EXACT_FIRM_INFO.bankDetails || 'KCB Bank Kenya Ltd | Kilimani Branch | A/C No: 1104889922 | Swift: KCBLKENX',
          stampUrl: parsed.stampUrl || localStorage.getItem('karani_firm_stamp_url') || '/stamp.png'
        };
      } catch (e) {}
    }
    return {
      topbarTitle: EXACT_FIRM_INFO.name || 'Nyagah B. Kithinji & Co. Advocates',
      topbarSubtitle: (EXACT_FIRM_INFO as any).title || 'Advocates of the High Court of Kenya',
      lskRegNo: (EXACT_FIRM_INFO as any).firmRegNo || 'P.105/1992',
      managingPartner: (EXACT_FIRM_INFO as any).managingPartner || 'Nyagah B. Kithinji',
      logoUrl: EXACT_FIRM_INFO.logoUrl || '/logo.png',
      poBox: EXACT_FIRM_INFO.poBox || 'P.O. Box 1992-00100, Nairobi, Kenya',
      address: EXACT_FIRM_INFO.address || 'Suite 4B, Mbaruk Road, Off Muchai Drive, Golf Course Estate, Upper Hill, Nairobi',
      serviceEmail: (EXACT_FIRM_INFO as any).serviceEmail || 'service@nbkco-advocates.com',
      phone: EXACT_FIRM_INFO.phone || '+254 (0)20 271 8890 / +254 722 000 111',
      email: EXACT_FIRM_INFO.email || 'info@nbkco-advocates.com',
      kraPin: EXACT_FIRM_INFO.kraPin || 'P051123456Z',
      vatNumber: (EXACT_FIRM_INFO as any).vatNumber || 'VAT-0192834-K',
      officeBankName: 'KCB Bank Kenya Ltd',
      officeAccountName: 'Nyagah B. Kithinji & Co Office A/C',
      officeBranch: 'Kilimani Branch',
      officeAccountNo: '1104889922',
      officeSwift: 'KCBLKENX',
      clientTrustBankName: 'Standard Chartered Bank',
      clientTrustAccountName: 'Nyagah B. Kithinji & Co Clients / Trust A/C',
      clientTrustBranch: 'Kenyatta Avenue',
      clientTrustAccountNo: '010203040506',
      clientTrustSwift: 'SCBLKENX',
      mpesaPaybill: '522522',
      mpesaAccountRef: 'MATTER NO / CLIENT NAME',
      bankDetails: EXACT_FIRM_INFO.bankDetails || 'KCB Bank Kenya Ltd | Kilimani Branch | A/C No: 1104889922 | Swift: KCBLKENX',
      stampUrl: localStorage.getItem('karani_firm_stamp_url') || '/stamp.png'
    };
  });

  // Hydrate Firm Settings from backend persistent store on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/users/firm-settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (isMounted && data && Object.keys(data).length > 0) {
          setFirmSettings(prev => ({ ...prev, ...data }));
          localStorage.setItem('BILLSZIP_FIRM_SETTINGS', JSON.stringify({ ...firmSettings, ...data }));
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);


  // --------------------------------------------------------------------------
  // MODULE 3: BOC CALCULATOR & STATUTORY REMUNERATION ENGINE STATE
  // --------------------------------------------------------------------------
  const [calcSettings, setCalcSettings] = useState(() => {
    const saved = localStorage.getItem('BILLSZIP_CALC_SETTINGS');
    if (saved) {
      try { 
        const p = JSON.parse(saved);
        return {
          defaultSchedule: p.defaultSchedule || 'schedule_6_high_court',
          defaultParty: p.defaultParty || 'plaintiff',
          autoGettingUp: p.autoGettingUp !== false,
          autoVat: p.autoVat !== false,
          autoInterest: p.autoInterest !== false,
          rule77Warning: p.rule77Warning !== false,
          folioRate: p.folioRate || 150,
          billNumberPrefix: p.billNumberPrefix || 'NBK/BOC',
          defaultCourtForum: p.defaultCourtForum || 'REPUBLIC OF KENYA\nIN THE HIGH COURT OF KENYA',
          managingPartnerRate: p.managingPartnerRate || 25000,
          seniorAssociateRate: p.seniorAssociateRate || 15000,
          associateRate: p.associateRate || 8500,
          pupilRate: p.pupilRate || 3500
        };
      } catch (e) {}
    }
    return {
      defaultSchedule: 'schedule_6_high_court',
      defaultParty: 'plaintiff',
      autoGettingUp: true,
      autoVat: true,
      autoInterest: true,
      rule77Warning: true,
      folioRate: 150,
      billNumberPrefix: 'NBK/BOC',
      defaultCourtForum: 'REPUBLIC OF KENYA\nIN THE HIGH COURT OF KENYA',
      managingPartnerRate: 25000,
      seniorAssociateRate: 15000,
      associateRate: 8500,
      pupilRate: 3500
    };
  });

  // STATUTORY MATH SANDBOX INTERACTIVE TEST BENCH STATE
  const [testClaimValue, setTestClaimValue] = useState<number>(49000000);
  const [testSchedule, setTestSchedule] = useState<string>('schedule_6_high_court');
  const [testParty, setTestParty] = useState<'plaintiff' | 'defendant'>('plaintiff');
  const [testIncludeGettingUp, setTestIncludeGettingUp] = useState<boolean>(true);

  // Dynamic statutory math derivation based on Kenyan Remuneration Order (L.N. 35/2014)
  const testMathResult = useMemo(() => {
    const val = Number(testClaimValue) || 0;
    let t1 = 0, t2 = 0, t3 = 0, t4 = 0;
    
    if (val <= 5000000) {
      t1 = Math.max(75000, val * 0.02);
    } else if (val <= 10000000) {
      t1 = 5000000 * 0.02; // 100,000
      t2 = (val - 5000000) * 0.015;
    } else if (val <= 20000000) {
      t1 = 5000000 * 0.02; // 100,000
      t2 = 5000000 * 0.015; // 75,000
      t3 = (val - 10000000) * 0.01;
    } else {
      t1 = 5000000 * 0.02; // 100,000
      t2 = 5000000 * 0.015; // 75,000
      t3 = 10000000 * 0.01; // 100,000
      t4 = (val - 20000000) * 0.0075;
    }

    let instructionFee = t1 + t2 + t3 + t4;
    if (testParty === 'defendant') {
      instructionFee = instructionFee * 0.65;
    }

    const gettingUpFee = testIncludeGettingUp ? (instructionFee / 3) : 0;
    const subtotal = instructionFee + gettingUpFee;
    const vat = calcSettings.autoVat ? (subtotal * 0.16) : 0;
    const total = subtotal + vat;
    const statutoryAnnualInterest = subtotal * 0.14; // Sec. 7 Statutory 14% p.a.

    return {
      t1, t2, t3, t4,
      instructionFee,
      gettingUpFee,
      subtotal,
      vat,
      total,
      statutoryAnnualInterest,
      isFloorCompliant: instructionFee >= 75000
    };
  }, [testClaimValue, testSchedule, testParty, testIncludeGettingUp, calcSettings.autoVat]);

  // --------------------------------------------------------------------------
  // MODULE 4: APPEARANCE & LEGAL TYPOGRAPHY STATE
  // --------------------------------------------------------------------------
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('BILLSZIP_ACCENT') || 'emerald');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('BILLSZIP_FONT_SIZE') || 'standard');
  const [tableDensity, setTableDensity] = useState(() => localStorage.getItem('BILLSZIP_TABLE_DENSITY') || 'compact');
  const [documentFont, setDocumentFont] = useState(() => localStorage.getItem('BILLSZIP_DOC_FONT') || 'serif');
  const [sealAlignment, setSealAlignment] = useState(() => localStorage.getItem('BILLSZIP_SEAL_ALIGN') || 'left');
  const [showGraphWidget, setShowGraphWidget] = useState<boolean>(() => localStorage.getItem('BILLSZIP_SHOW_GRAPH') === 'true');
  const [sidebarHoverEnabled, setSidebarHoverEnabled] = useState<boolean>(() => localStorage.getItem('BILLSZIP_SIDEBAR_HOVER') !== 'false');

  // --------------------------------------------------------------------------
  // MODULE 5: NOTIFICATIONS & RECEIVING EMAIL STATE
  // --------------------------------------------------------------------------
  const [receivingEmail, setReceivingEmail] = useState(() => {
    return localStorage.getItem('BILLSZIP_RECEIVING_EMAIL') || initialUser.workEmail || initialUser.personalEmail || '';
  });

  const [notifSettings, setNotifSettings] = useState(() => {
    const saved = localStorage.getItem('BILLSZIP_NOTIF_SETTINGS');
    if (saved) {
      try { 
        const p = JSON.parse(saved);
        return {
          loginSecurityAlert: p.loginSecurityAlert !== false,
          feeNoteAlert: p.feeNoteAlert !== false,
          matterUpdateAlert: p.matterUpdateAlert !== false,
          clientMessageAlert: p.clientMessageAlert !== false,
          weeklySummaryAlert: p.weeklySummaryAlert !== false,
          clientDeliveryChannel: p.clientDeliveryChannel || 'both',
          toastDuration: p.toastDuration || '4'
        };
      } catch (e) {}
    }
    return {
      loginSecurityAlert: true,
      feeNoteAlert: true,
      matterUpdateAlert: true,
      clientMessageAlert: true,
      weeklySummaryAlert: true,
      clientDeliveryChannel: 'both',
      toastDuration: '4'
    };
  });

  // --------------------------------------------------------------------------
  // HANDLERS: SAVE & DISPATCH
  // --------------------------------------------------------------------------
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Avatar Upload Handler
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      showToast('Avatar file size must be under 4MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setUserAvatarUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Firm Logo Upload Handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Logo file size must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFirmSettings((prev: any) => ({ ...prev, logoUrl: dataUrl }));
        showToast('Firm logo updated.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetLogo = () => {
    setFirmSettings((prev: any) => ({ ...prev, logoUrl: '/logo.png' }));
    showToast('Firm logo reset to default crest.');
  };

  // Firm Stamp / Seal Upload Handler
  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Stamp file size must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFirmSettings((prev: any) => ({ ...prev, stampUrl: dataUrl }));
        localStorage.setItem('karani_firm_stamp_url', dataUrl);
        showToast('Official firm stamp uploaded and cached.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetStamp = () => {
    setFirmSettings((prev: any) => ({ ...prev, stampUrl: '/stamp.png' }));
    localStorage.removeItem('karani_firm_stamp_url');
    showToast('Firm stamp reset to default seal.');
  };

  // Cancel editing profile and restore original values
  const handleCancelEditProfile = () => {
    const active = getActiveUser();
    setUserFullName(active.fullName || '');
    setUserTitle(cleanTitle(active.advocateTitle, active.fullName));
    setUserLskNo(active.lskNo || '');
    setUserPosition(active.position || '');
    setUserDepartment(active.department || '');
    setUserWorkEmail(active.workEmail || active.personalEmail || '');
    setUserPersonalEmail(active.personalEmail || '');
    setUserPhonePrimary(active.phonePrimary || '');
    setUserPhoneSecondary(active.phoneSecondary || '');
    setUserAvatarUrl(active.avatarUrl || '');
    setIsEditingProfile(false);
  };

  // Request password reset link to be sent via email
  const handleRequestPasswordReset = async () => {
    const targetEmail = (userWorkEmail || currentUser?.workEmail || '').trim().toLowerCase();
    if (!targetEmail) {
      showToast('No email associated with this account.');
      return;
    }
    setIsSendingResetEmail(true);
    try {
      try {
        await fetch('/api/v1/email/password-reset-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail, portal_url: window.location.origin }),
        });
      } catch (e) {}

      try {
        await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: `${window.location.origin}/?view=reset-password`,
        });
      } catch (e) {}

      showToast(`Password reset link dispatched to ${targetEmail}`);
    } catch (err: any) {
      showToast('Could not dispatch password reset link.');
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // Direct password update
  const handleSaveNewPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Password confirmation does not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (currentUser?.id) {
        await supabase.from('users').update({ password_hash: newPassword }).eq('id', currentUser.id);
      }
      try {
        await supabase.auth.updateUser({ password: newPassword });
      } catch (e) {}

      const stored = localStorage.getItem('EXACT_USERS');
      if (stored) {
        const list = JSON.parse(stored);
        const idx = list.findIndex((u: any) => u.id === currentUser?.id || (u.workEmail && u.workEmail.toLowerCase() === (userWorkEmail || '').toLowerCase()));
        if (idx !== -1) {
          list[idx].passwordHash = newPassword;
          localStorage.setItem('EXACT_USERS', JSON.stringify(list));
        }
      }

      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordModal(false);
      showToast('Password updated successfully.');
    } catch (err: any) {
      showToast('Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Save Profile Details (Permanent Multi-Tier Persistence)
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const active = getActiveUser();
    const baseId = currentUser?.id || active.id || 'b0000000-0000-0000-0000-000000000004';
    const baseEmail = (userWorkEmail.trim() || currentUser?.workEmail || active.workEmail || 'guyohalakeofficial@gmail.com').toLowerCase();

    try {
      const mergedUser: SystemUser = {
        ...(currentUser || active || {} as any),
        id: baseId,
        fullName: userFullName.trim() || currentUser?.fullName || active.fullName || 'Senior Advocate',
        advocateTitle: userTitle.trim() || userFullName.trim() || currentUser?.fullName || active.fullName || 'Senior Advocate',
        lskNo: userLskNo.trim(),
        position: userPosition.trim() || currentUser?.position || active.position || 'Senior Managing Partner',
        department: userDepartment.trim() || currentUser?.department || active.department || 'Litigation & Commercial',
        workEmail: baseEmail,
        personalEmail: (userPersonalEmail.trim() || currentUser?.personalEmail || active.personalEmail || baseEmail).toLowerCase(),
        phonePrimary: userPhonePrimary.trim(),
        phoneSecondary: userPhoneSecondary.trim(),
        avatarUrl: userAvatarUrl || currentUser?.avatarUrl || active.avatarUrl,
        role: currentUser?.role || active.role || 'Admin',
        hasAllPermissions: true,
        firmId: currentUser?.firmId || active.firmId || 'a0000000-0000-0000-0000-000000000001'
      };

      // 1. Immediately persist to localStorage BILLSZIP_SESSION and EXACT_USERS roster
      saveUserProfile(mergedUser);
      localStorage.setItem('BILLSZIP_SESSION', JSON.stringify(mergedUser));
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: mergedUser }));

      // 2. Persist to Backend Python Engine so future logins return the updated record
      try {
        await fetch('/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: mergedUser.id,
            fullName: mergedUser.fullName,
            advocateTitle: mergedUser.advocateTitle,
            lskNo: mergedUser.lskNo,
            role: mergedUser.role,
            position: mergedUser.position,
            department: mergedUser.department,
            workEmail: mergedUser.workEmail,
            personalEmail: mergedUser.personalEmail,
            phonePrimary: mergedUser.phonePrimary,
            phoneSecondary: mergedUser.phoneSecondary,
            avatarUrl: mergedUser.avatarUrl,
            firmId: mergedUser.firmId || 'firm-001'
          })
        });
      } catch (backendErr) {
        console.warn('Backend user profile sync notice:', backendErr);
      }

      // 3. Persist to Supabase public.users using exact supported table columns + permissions JSONB
      let dbUpdated = false;
      let dbErrorMessage = '';
      try {
        const supabaseData: any = {
          full_name: mergedUser.fullName,
          lsk_no: mergedUser.lskNo,
          role: (mergedUser.role || 'admin').toLowerCase(),
          is_active: true,
          permissions: {
            can_manage_matters: true,
            can_access_taxation: true,
            can_approve_fee_notes: true,
            position: mergedUser.position,
            department: mergedUser.department,
            phone_primary: mergedUser.phonePrimary,
            phone_secondary: mergedUser.phoneSecondary
          }
        };
        if (mergedUser.avatarUrl) {
          supabaseData.avatar_url = mergedUser.avatarUrl;
        }
        if (mergedUser.workEmail) {
          supabaseData.email = mergedUser.workEmail;
        }

        // Try updating by ID first, then by email
        let updateRes = await supabase
          .from('users')
          .update(supabaseData)
          .eq('id', mergedUser.id);

        if (updateRes.error || updateRes.count === 0) {
          updateRes = await supabase
            .from('users')
            .update(supabaseData)
            .ilike('email', mergedUser.workEmail);
        }

        if (updateRes.error) {
          dbErrorMessage = updateRes.error.message;
        } else {
          dbUpdated = true;
        }
      } catch (sbErr: any) {
        dbErrorMessage = sbErr?.message || 'Database connection issue';
      }

      logSystemActivity(
        mergedUser.fullName,
        'updated profile coordinates and preferences',
        'profile',
        'bg-blue-500'
      );

      setIsEditingProfile(false);
      if (dbUpdated) {
        showToast('Profile updated and saved to database successfully!');
      } else if (dbErrorMessage) {
        showToast(`Profile saved locally. Database update failed: ${dbErrorMessage}`);
      } else {
        showToast('Profile updated and saved successfully.');
      }
    } catch (err: any) {
      showToast(err.message || 'Profile save failed.');
      setIsEditingProfile(false);
    }
  };

  // Cancel Firm Settings edit and restore saved state
  const handleCancelEditFirm = () => {
    const saved = localStorage.getItem('BILLSZIP_FIRM_SETTINGS');
    if (saved) {
      try {
        setFirmSettings(JSON.parse(saved));
      } catch (e) {}
    }
    setIsEditingFirm(false);
  };

  // Save Firm Branding Settings
  const handleSaveFirmSettings = async () => {
    const combinedBank = `${firmSettings.officeBankName || 'KCB Bank'} • A/C: ${firmSettings.officeAccountNo || ''} • Branch: ${firmSettings.officeBranch || ''} • Swift: ${firmSettings.officeSwift || ''} | Clients A/C: ${firmSettings.clientTrustBankName || ''} • A/C: ${firmSettings.clientTrustAccountNo || ''}`;
    
    const updatedSettings = {
      ...firmSettings,
      bankName: firmSettings.officeBankName,
      bankBranch: firmSettings.officeBranch,
      bankAccount: firmSettings.officeAccountNo,
      swiftCode: firmSettings.officeSwift,
      firmRegNo: firmSettings.lskRegNo,
      stampUrl: firmSettings.stampUrl || localStorage.getItem('karani_firm_stamp_url') || '/stamp.png',
      bankDetails: firmSettings.bankDetails || combinedBank
    };

    localStorage.setItem('BILLSZIP_FIRM_SETTINGS', JSON.stringify(updatedSettings));
    if (updatedSettings.stampUrl) {
      localStorage.setItem('karani_firm_stamp_url', updatedSettings.stampUrl);
    }
    window.dispatchEvent(new CustomEvent('firmSettingsChanged', { detail: updatedSettings }));
    
    // Sync to backend persistent store
    try {
      await fetch('/api/v1/users/firm-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
    } catch (e) {
      console.warn('Backend firm settings sync notice:', e);
    }

    // Direct sync to Supabase firms table if accessible
    const firmId = currentUser?.firmId || 'a0000000-0000-0000-0000-000000000001';
    try {
      await supabase.from('firms').upsert({
        id: firmId,
        name: updatedSettings.topbarTitle,
        firm_reg_no: updatedSettings.lskRegNo || 'P.105/1992',
        address: updatedSettings.address,
        po_box: updatedSettings.poBox,
        phone: updatedSettings.phone,
        email: updatedSettings.email,
        kra_pin: updatedSettings.kraPin,
        bank_details: updatedSettings.bankDetails,
        logo_url: updatedSettings.logoUrl
      });
    } catch (e) {}

    logSystemActivity(
      currentUser?.fullName || 'Managing Partner',
      `updated firm legal charter, logo, stamp, and banking coordinates: ${updatedSettings.topbarTitle}`,
      'settings',
      'bg-purple-500'
    );
    setIsEditingFirm(false);
    showToast('Firm settings, logo, stamp & banking saved and synchronized across all views.');
  };

  // Save Calculator & Fee Engine
  const handleSaveCalcSettings = () => {
    localStorage.setItem('BILLSZIP_CALC_SETTINGS', JSON.stringify(calcSettings));
    showToast('Bill of Costs Calculation rules saved.');
  };

  // Save Appearance & UI
  const handleSaveAppearance = () => {
    localStorage.setItem('BILLSZIP_ACCENT', accentColor);
    localStorage.setItem('theme_accent', accentColor);
    localStorage.setItem('BILLSZIP_FONT_SIZE', fontSize);
    localStorage.setItem('BILLSZIP_TABLE_DENSITY', tableDensity);
    localStorage.setItem('BILLSZIP_SHOW_GRAPH', showGraphWidget ? 'true' : 'false');
    localStorage.setItem('BILLSZIP_SIDEBAR_HOVER', sidebarHoverEnabled ? 'true' : 'false');

    document.documentElement.setAttribute('data-accent', accentColor);
    document.documentElement.setAttribute('data-font-size', fontSize);
    document.documentElement.setAttribute('data-density', tableDensity);

    if (fontSize === 'compact') {
      document.documentElement.style.fontSize = '13px';
    } else if (fontSize === 'large') {
      document.documentElement.style.fontSize = '15.5px';
    } else {
      document.documentElement.style.fontSize = '14px';
    }

    window.dispatchEvent(new CustomEvent('appearanceSettingsChanged', {
      detail: { accentColor, fontSize, tableDensity, showGraphWidget, sidebarHoverEnabled }
    }));
    window.dispatchEvent(new CustomEvent('sidebarHoverChanged', { detail: sidebarHoverEnabled }));
    window.dispatchEvent(new CustomEvent('showGraphWidgetChanged', { detail: showGraphWidget }));

    showToast('Display & UI preferences saved and applied in real time.');
  };

  // Save Notifications & Receiving Email
  const handleSaveNotifications = () => {
    localStorage.setItem('BILLSZIP_RECEIVING_EMAIL', receivingEmail);
    localStorage.setItem('BILLSZIP_NOTIF_SETTINGS', JSON.stringify(notifSettings));
    showToast('Alert preferences and receiving email saved successfully.');
  };

  // Master Save All
  const handleSaveAll = () => {
    handleSaveProfile();
    handleSaveFirmSettings();
    handleSaveCalcSettings();
    handleSaveAppearance();
    handleSaveNotifications();
  };

  // Export Complete Firm Data (JSON Backup)
  const handleExportBackup = () => {
    const feeNotes = getFeeNotes();
    const backupData = {
      exportedAt: new Date().toISOString(),
      firm: firmSettings,
      calculationRules: calcSettings,
      feeNotesCount: feeNotes.length,
      feeNotes: feeNotes
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `firm_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('Firm database backup downloaded.');
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      
      {/* Hidden File Upload Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarUpload}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={logoInputRef}
        onChange={handleLogoUpload}
        accept="image/png, image/jpeg, image/svg+xml, image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={stampInputRef}
        onChange={handleStampUpload}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-fadeIn border border-white/10">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Command Suite Header - Compact */}
      <div className="pt-1 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)]/60 pb-3">
        <div>
          <h1 className="font-brand font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight">
            Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-sans">
            Advocate coordinates, letterhead branding, calculation scales, and security
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportBackup}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 border border-[var(--border-color)] hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download full firm database JSON backup"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup Data</span>
          </button>
          
          <button
            onClick={handleSaveAll}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save All Changes</span>
          </button>
        </div>
      </div>

      {/* iOS / iPhone Segmented Control Pill Bar */}
      <div className="flex items-center p-1 rounded-2xl bg-slate-200/70 dark:bg-zinc-800/80 border border-[var(--border-color)]/50 overflow-x-auto">
        {[
          { id: 'profile' as const, label: 'Profile Details', icon: User },
          { id: 'firm' as const, label: 'Firm Branding', icon: Building2 },
          { id: 'calculator' as const, label: 'Calculation Engine', icon: Calculator },
          { id: 'appearance' as const, label: 'Appearance & UI', icon: Palette },
          { id: 'notifications' as const, label: 'Alerts & Dispatch', icon: Bell },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                isActive 
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: USER PROFILE & IDENTITY */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-fadeIn">
          {/* PASSWORD CHANGE MODAL */}
          {showPasswordModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-brand font-bold text-sm text-slate-900 dark:text-white">
                        Change Password
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Enter a secure password for your account
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                      New Password (min 6 characters):
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full p-2.5 pr-10 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Confirm New Password:
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--border-color)] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingPassword}
                    onClick={handleSaveNewPassword}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    {isUpdatingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                    <span>Update Password</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MAIN PROFILE CARD */}
          <div className="modulix-card p-6 sm:p-8 space-y-6 border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs">
            
            {/* Top Header Card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-[var(--border-color)]/60">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                {/* Monogram / Avatar */}
                <div className="relative group shrink-0">
                  {userAvatarUrl ? (
                    <img
                      src={userAvatarUrl}
                      alt={userFullName}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-[var(--border-color)] shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-zinc-800 border-2 border-[var(--border-color)] text-slate-800 dark:text-zinc-200 flex items-center justify-center font-brand font-bold text-2xl shadow-sm tracking-wider">
                      {userFullName ? userFullName.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'US'}
                    </div>
                  )}
                  {isEditingProfile && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 text-white rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                    >
                      <Camera className="w-5 h-5 mb-0.5" />
                      Change
                    </button>
                  )}
                </div>

                {/* Identity Info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                    <h2 className="font-brand font-bold text-xl text-slate-900 dark:text-white">
                      {userFullName || 'User Profile'}
                    </h2>
                    <span className="text-[10.5px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold border border-[var(--border-color)]/60">
                      {currentUser?.role || 'Staff'}
                    </span>
                  </div>

                  {(userPosition || userDepartment) && (
                    <p className="text-xs text-slate-500 font-sans">
                      {[userPosition, userDepartment].filter(Boolean).join(' · ')}
                    </p>
                  )}

                  <p className="text-[11px] font-mono text-slate-400">
                    {userLskNo ? `LSK Roll: ${userLskNo} · ` : ''}{userWorkEmail || 'No email on record'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                {!isEditingProfile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-medium border border-[var(--border-color)] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Change Password</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSendingResetEmail}
                      onClick={handleRequestPasswordReset}
                      title="Send a password recovery email to your work address"
                      className="px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border-color)] text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSendingResetEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Send Reset Link</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border-color)] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Upload Photo
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditProfile}
                      className="px-3.5 py-2 rounded-xl text-xs font-medium border border-[var(--border-color)] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Profile</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* READ-ONLY VIEW */}
            {!isEditingProfile ? (
              <div className="space-y-6">
                {/* Section 1: Professional & Practice Details */}
                <div className="space-y-3">
                  <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Professional & Practice Details</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-3 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Full Legal Name
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {userFullName || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Honorific Title / Salutation
                      </span>
                      <span className="text-xs text-slate-800 dark:text-zinc-200">
                        {userTitle || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        LSK Admission Roll No
                      </span>
                      <span className="text-xs font-mono font-medium text-slate-800 dark:text-zinc-200">
                        {userLskNo || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Firm Practice Designation
                      </span>
                      <span className="text-xs text-slate-800 dark:text-zinc-200">
                        {userPosition || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-transparent border border-[var(--border-color)]/70 sm:col-span-2">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Practice Department
                      </span>
                      <span className="text-xs text-slate-800 dark:text-zinc-200">
                        {userDepartment || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Contact Coordinates */}
                <div className="space-y-3 pt-3 border-t border-[var(--border-color)]/60">
                  <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Contact Coordinates</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Work Company Email
                      </span>
                      <span className="text-xs font-mono text-slate-800 dark:text-zinc-200">
                        {userWorkEmail || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Personal Alternate Email
                      </span>
                      <span className="text-xs font-mono text-slate-800 dark:text-zinc-200">
                        {userPersonalEmail || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Primary Mobile / Telephone
                      </span>
                      <span className="text-xs font-mono text-slate-800 dark:text-zinc-200">
                        {userPhonePrimary || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Secondary Mobile / WhatsApp
                      </span>
                      <span className="text-xs font-mono text-slate-800 dark:text-zinc-200">
                        {userPhoneSecondary || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Security & Session Status */}
                <div className="space-y-3 pt-3 border-t border-[var(--border-color)]/60">
                  <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Security & Authentication</span>
                  </h3>

                  <div className="p-4 rounded-xl bg-transparent border border-[var(--border-color)]/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Account Password: ••••••••••••</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Password is encrypted and protected. You can change it anytime or request a reset link.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-color)] bg-transparent text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* EDIT MODE VIEW */
              <div className="space-y-6">
                {/* Form Fields: Professional Coordinates */}
                <div className="space-y-4">
                  <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500">
                    Professional & Practice Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Full Legal Name:
                      </label>
                      <input
                        type="text"
                        value={userFullName}
                        onChange={e => setUserFullName(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Honorific Title / Salutation (Optional):
                      </label>
                      <input
                        type="text"
                        value={userTitle}
                        onChange={e => setUserTitle(e.target.value)}
                        placeholder="e.g. Dr., Prof., SC"
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        LSK Admission Roll No:
                      </label>
                      <input
                        type="text"
                        value={userLskNo}
                        onChange={e => setUserLskNo(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Firm Practice Designation:
                      </label>
                      <input
                        type="text"
                        value={userPosition}
                        onChange={e => setUserPosition(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Practice Department:
                      </label>
                      <input
                        type="text"
                        value={userDepartment}
                        onChange={e => setUserDepartment(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Coordinates */}
                <div className="space-y-4 pt-2 border-t border-[var(--border-color)]/60">
                  <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500">
                    Contact Coordinates
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Work Company Email:
                      </label>
                      <input
                        type="email"
                        value={userWorkEmail}
                        onChange={e => setUserWorkEmail(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Personal Alternate Email:
                      </label>
                      <input
                        type="email"
                        value={userPersonalEmail}
                        onChange={e => setUserPersonalEmail(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Primary Mobile / Telephone:
                      </label>
                      <input
                        type="text"
                        value={userPhonePrimary}
                        onChange={e => setUserPhonePrimary(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Secondary Mobile / WhatsApp:
                      </label>
                      <input
                        type="text"
                        value={userPhoneSecondary}
                        onChange={e => setUserPhoneSecondary(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Action Controls */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={handleCancelEditProfile}
                    className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--border-color)] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold hover:bg-black dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FIRM BRANDING & INSTITUTIONAL CHARTER */}
      {activeTab === 'firm' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="modulix-card p-6 sm:p-8 space-y-6 border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs">
            
            {/* Firm Banner & Identity Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-[var(--border-color)]/60">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                <div className="relative group shrink-0">
                  <img
                    src={firmSettings.logoUrl || '/logo.png'}
                    alt="Firm Logo"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/logo.png';
                    }}
                    className="h-20 max-w-[200px] w-auto object-contain p-2 rounded-2xl bg-slate-50 dark:bg-zinc-800 border border-[var(--border-color)] shadow-xs"
                  />
                  {isEditingFirm && (
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 text-white rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                    >
                      <Camera className="w-5 h-5 mb-0.5" />
                      Change Logo
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                    <h2 className="font-brand font-bold text-xl text-slate-900 dark:text-white">
                      {firmSettings.topbarTitle}
                    </h2>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold tracking-wider font-sans">
                    {firmSettings.topbarSubtitle}
                  </p>

                  <p className="text-[11px] font-mono text-slate-400">
                    LSK Reg: {firmSettings.lskRegNo || 'P.105/1992'} &middot; Managing Partner: {firmSettings.managingPartner || 'Nyagah B. Kithinji'}
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                {!isEditingFirm ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingFirm(true)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Firm Settings</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border-color)] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Upload Logo
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditFirm}
                      className="px-3.5 py-2 rounded-xl text-xs font-medium border border-[var(--border-color)] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveFirmSettings}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Firm Settings</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* READ-ONLY FIRM DOSSIER */}
            {!isEditingFirm ? (
              <div className="space-y-6">
                
                {/* Pillar 1: Institutional & Court Service Chambers */}
                <div className="space-y-3">
                  <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Registered Practice Chambers & Service of Process (Civil Procedure Rules)</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-3.5 rounded-xl bg-transparent border border-[var(--border-color)]/70 sm:col-span-2">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Physical Office Chambers (Service Address)
                      </span>
                      <span className="text-xs text-slate-900 dark:text-white font-medium">
                        {firmSettings.address || '—'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Registered Postal Box
                      </span>
                      <span className="text-xs font-mono text-slate-800 dark:text-zinc-200">
                        {firmSettings.poBox || '—'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Court Electronic Service Email
                      </span>
                      <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                        {firmSettings.serviceEmail || firmSettings.email || '—'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        General Inquiries Email
                      </span>
                      <span className="text-xs font-mono text-slate-800 dark:text-zinc-200">
                        {firmSettings.email || '—'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Official Switchboard Telephone
                      </span>
                      <span className="text-xs font-mono text-slate-800 dark:text-zinc-200">
                        {firmSettings.phone || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pillar 2: Statutory Tax Compliance & Firm Verification */}
                <div className="space-y-3 pt-3 border-t border-[var(--border-color)]/60">
                  <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Statutory Tax Compliance & Verification</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-3.5 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          Firm KRA PIN
                        </span>
                        <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold">
                          e-TIMS Active
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        {firmSettings.kraPin || '—'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          VAT Registration No
                        </span>
                        <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-bold">
                          16% Statutory
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        {firmSettings.vatNumber || '—'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-transparent border border-[var(--border-color)]/70">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          LSK Firm Practice No
                        </span>
                        <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold border border-slate-200 dark:border-zinc-700">
                          Licensed
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        {firmSettings.lskRegNo || 'P.105/1992'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pillar 3: Two-Tier Legal Banking & Settlement */}
                <div className="space-y-3 pt-3 border-t border-[var(--border-color)]/60">
                  <div className="flex items-center justify-between">
                    <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" />
                      <span>Two-Tier Legal Banking Architecture (Advocates Act Cap 16)</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Bank 1 */}
                    <div className="p-4 rounded-2xl bg-transparent border border-[var(--border-color)]/70 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-[var(--border-color)]/60 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                            <Landmark className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="font-brand font-bold text-xs text-slate-900 dark:text-white">
                              Bank 1
                            </h4>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-[9.5px] text-slate-400 block uppercase">Bank Name</span>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">{firmSettings.officeBankName || 'KCB Bank Kenya Ltd'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-400 block uppercase">Branch</span>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">{firmSettings.officeBranch || 'Kilimani Branch'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-400 block uppercase">Account Number</span>
                          <span className="font-bold text-slate-900 dark:text-white">{firmSettings.officeAccountNo || '1104889922'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-400 block uppercase">Swift Code</span>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">{firmSettings.officeSwift || 'KCBLKENX'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bank 2 */}
                    <div className="p-4 rounded-2xl bg-transparent border border-[var(--border-color)]/70 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-[var(--border-color)]/60 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                            <Landmark className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="font-brand font-bold text-xs text-slate-900 dark:text-white">
                              Bank 2
                            </h4>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-[9.5px] text-slate-400 block uppercase">Bank Name</span>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">{firmSettings.clientTrustBankName || 'Standard Chartered Bank'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-400 block uppercase">Branch</span>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">{firmSettings.clientTrustBranch || 'Kenyatta Avenue'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-400 block uppercase">Account Number</span>
                          <span className="font-bold text-slate-900 dark:text-white">{firmSettings.clientTrustAccountNo || '010203040506'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-400 block uppercase">Swift Code</span>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">{firmSettings.clientTrustSwift || 'SCBLKENX'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MPESA */}
                  <div className="p-3.5 rounded-xl bg-transparent border border-[var(--border-color)]/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold text-xs tracking-tight">
                        M
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          MPESA
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-xs font-mono">
                      <div>
                        <span className="text-[9.5px] text-slate-400 uppercase block">Paybill No:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{firmSettings.mpesaPaybill || '522522'}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-slate-400 uppercase block">Account Ref:</span>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">{firmSettings.mpesaAccountRef || 'MATTER NO / CLIENT NAME'}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              /* EDIT FIRM SETTINGS FORM */
              <div className="space-y-6">
                
                {/* Section 1: Firm Identification */}
                <div className="space-y-4">
                  <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500">
                    Corporate Identity & Practice Licensing
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Firm Legal Name:
                      </label>
                      <input
                        type="text"
                        value={firmSettings.topbarTitle}
                        onChange={e => setFirmSettings({ ...firmSettings, topbarTitle: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 font-bold text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Practice Subtitle / Court Jurisdiction Banner:
                      </label>
                      <input
                        type="text"
                        value={firmSettings.topbarSubtitle}
                        onChange={e => setFirmSettings({ ...firmSettings, topbarSubtitle: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        LSK Firm Practice Registration No:
                      </label>
                      <input
                        type="text"
                        value={firmSettings.lskRegNo}
                        onChange={e => setFirmSettings({ ...firmSettings, lskRegNo: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Managing Partner / Head of Practice:
                      </label>
                      <input
                        type="text"
                        value={firmSettings.managingPartner}
                        onChange={e => setFirmSettings({ ...firmSettings, managingPartner: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Registered Chambers & Court Service Address */}
                <div className="space-y-4 pt-2 border-t border-[var(--border-color)]/60">
                  <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500">
                    Chambers & Service of Process Coordinates
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Physical Office Chambers:
                      </label>
                      <input
                        type="text"
                        value={firmSettings.address}
                        onChange={e => setFirmSettings({ ...firmSettings, address: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Registered Postal Box & Town:
                      </label>
                      <input
                        type="text"
                        value={firmSettings.poBox}
                        onChange={e => setFirmSettings({ ...firmSettings, poBox: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Statutory Electronic Court Service Email:
                      </label>
                      <input
                        type="email"
                        value={firmSettings.serviceEmail}
                        onChange={e => setFirmSettings({ ...firmSettings, serviceEmail: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        General Inquiries Email:
                      </label>
                      <input
                        type="email"
                        value={firmSettings.email}
                        onChange={e => setFirmSettings({ ...firmSettings, email: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Official Switchboard / Telephone:
                      </label>
                      <input
                        type="text"
                        value={firmSettings.phone}
                        onChange={e => setFirmSettings({ ...firmSettings, phone: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Statutory Tax Compliance */}
                <div className="space-y-4 pt-2 border-t border-[var(--border-color)]/60">
                  <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500">
                    Statutory Tax & KRA e-TIMS Compliance
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Firm KRA PIN:
                      </label>
                      <input
                        type="text"
                        value={firmSettings.kraPin}
                        onChange={e => setFirmSettings({ ...firmSettings, kraPin: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        VAT Registration No:
                      </label>
                      <input
                        type="text"
                        value={firmSettings.vatNumber}
                        onChange={e => setFirmSettings({ ...firmSettings, vatNumber: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Two-Tier Banking Details */}
                <div className="space-y-4 pt-2 border-t border-[var(--border-color)]/60">
                  <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500">
                    Two-Tier Legal Banking & Settlement Accounts
                  </h3>

                  {/* Office Operating Account */}
                  {/* Bank 1 */}
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-transparent space-y-3">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      1. Bank 1
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={firmSettings.officeBankName}
                          onChange={e => setFirmSettings({ ...firmSettings, officeBankName: e.target.value })}
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-transparent text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 mb-1">Branch</label>
                        <input
                          type="text"
                          value={firmSettings.officeBranch}
                          onChange={e => setFirmSettings({ ...firmSettings, officeBranch: e.target.value })}
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-transparent text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 mb-1">Account Number</label>
                        <input
                          type="text"
                          value={firmSettings.officeAccountNo}
                          onChange={e => setFirmSettings({ ...firmSettings, officeAccountNo: e.target.value })}
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-transparent font-mono text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 mb-1">SWIFT Code</label>
                        <input
                          type="text"
                          value={firmSettings.officeSwift}
                          onChange={e => setFirmSettings({ ...firmSettings, officeSwift: e.target.value })}
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-transparent font-mono text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bank 2 */}
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-transparent space-y-3">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      2. Bank 2
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={firmSettings.clientTrustBankName}
                          onChange={e => setFirmSettings({ ...firmSettings, clientTrustBankName: e.target.value })}
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-transparent text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 mb-1">Branch</label>
                        <input
                          type="text"
                          value={firmSettings.clientTrustBranch}
                          onChange={e => setFirmSettings({ ...firmSettings, clientTrustBranch: e.target.value })}
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-transparent text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 mb-1">Account Number</label>
                        <input
                          type="text"
                          value={firmSettings.clientTrustAccountNo}
                          onChange={e => setFirmSettings({ ...firmSettings, clientTrustAccountNo: e.target.value })}
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-transparent font-mono text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 mb-1">SWIFT Code</label>
                        <input
                          type="text"
                          value={firmSettings.clientTrustSwift}
                          onChange={e => setFirmSettings({ ...firmSettings, clientTrustSwift: e.target.value })}
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-transparent font-mono text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* MPESA */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        MPESA Paybill No:
                      </label>
                      <input
                        type="text"
                        value={firmSettings.mpesaPaybill}
                        onChange={e => setFirmSettings({ ...firmSettings, mpesaPaybill: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-transparent font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                        MPESA Account Reference:
                      </label>
                      <input
                        type="text"
                        value={firmSettings.mpesaAccountRef}
                        onChange={e => setFirmSettings({ ...firmSettings, mpesaAccountRef: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-transparent font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Save & Cancel Controls */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={handleCancelEditFirm}
                    className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--border-color)] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveFirmSettings}
                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold hover:bg-black dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Firm Settings</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CALCULATION ENGINE & STATUTORY REMUNERATION MATH */}
      {activeTab === 'calculator' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Main Card */}
          <div className="modulix-card p-6 sm:p-8 space-y-6 border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <h2 className="font-brand font-bold text-base text-slate-900 dark:text-white">
                    Statutory Remuneration & Mathematical Calculation Engine
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Governed by The Advocates (Remuneration) Order (L.N. 35/2014 & L.N. 221/2023). Immutable statutory baselines with firm policy controls.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold border border-slate-200 dark:border-zinc-700">
                  Sec 36 Floor Protected
                </span>
                <button
                  type="button"
                  onClick={handleSaveCalcSettings}
                  className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold hover:bg-black dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Calculation Rules</span>
                </button>
              </div>
            </div>

            {/* INTERACTIVE STATUTORY MATH SANDBOX / VERIFICATION BENCH */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 text-slate-900 dark:text-white space-y-4 border border-slate-200 dark:border-zinc-700/60 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                      Statutory Math Verification Test Bench (Interactive)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Simulate any claim value to verify exact ad valorem tiers, getting-up fees, and statutory taxes.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold border border-slate-200 dark:border-zinc-700">
                  Kenya Law LN 35/2014 Scale 6
                </span>
              </div>

              {/* Sandbox Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Subject Matter Claim Value (KES):
                  </label>
                  <input
                    type="number"
                    value={testClaimValue}
                    onChange={e => setTestClaimValue(Number(e.target.value) || 0)}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Court Jurisdiction Scale:
                  </label>
                  <select
                    value={testSchedule}
                    onChange={e => setTestSchedule(e.target.value)}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  >
                    <option value="schedule_6_high_court">Schedule 6: High Court / Court of Appeal</option>
                    <option value="schedule_7_magistrate">Schedule 7: Subordinate Court</option>
                    <option value="schedule_1_conveyancing">Schedule 1: Conveyancing & Land Sale</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Party Capacity:
                  </label>
                  <select
                    value={testParty}
                    onChange={e => setTestParty(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  >
                    <option value="plaintiff">Plaintiff / Claimant (100% Scale)</option>
                    <option value="defendant">Defendant / Respondent (65% Scale)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Defended Hearing Getting-Up (1/3):
                  </label>
                  <button
                    type="button"
                    onClick={() => setTestIncludeGettingUp(!testIncludeGettingUp)}
                    className={`w-full p-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      testIncludeGettingUp
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    <span>{testIncludeGettingUp ? 'Included (+33.3%)' : 'Excluded (0%)'}</span>
                    <span className="text-[10px] font-mono">Toggle</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Math Output Grid */}
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 space-y-2.5 font-mono text-xs shadow-xs">
                <div className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800 pb-1.5 flex items-center justify-between">
                  <span>Mathematical Derivation & Bracket Breakdown:</span>
                  <span className="text-[10px] text-slate-600 dark:text-zinc-400 font-bold">Total Claim: KES {testClaimValue.toLocaleString('en-KE')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                    <span>Tier 1 (First 5,000,000 @ 2.0%):</span>
                    <span className="text-slate-900 dark:text-white font-semibold">KES {testMathResult.t1.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                    <span>Tier 2 (Next 5,000,000 @ 1.5%):</span>
                    <span className="text-slate-900 dark:text-white font-semibold">KES {testMathResult.t2.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                    <span>Tier 3 (Next 10,000,000 @ 1.0%):</span>
                    <span className="text-slate-900 dark:text-white font-semibold">KES {testMathResult.t3.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                    <span>Tier 4 (Excess over 20M @ 0.75%):</span>
                    <span className="text-slate-900 dark:text-white font-semibold">KES {testMathResult.t4.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                    <span className="text-[9.5px] text-slate-500 uppercase block font-medium">Base Instruction</span>
                    <span className="font-bold text-slate-900 dark:text-white">KES {testMathResult.instructionFee.toLocaleString('en-KE', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                    <span className="text-[9.5px] text-slate-500 uppercase block font-medium">+ Getting-Up (33.3%)</span>
                    <span className="font-bold text-slate-900 dark:text-white">KES {testMathResult.gettingUpFee.toLocaleString('en-KE', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                    <span className="text-[9.5px] text-slate-500 uppercase block font-medium">+ VAT (16%)</span>
                    <span className="font-bold text-slate-900 dark:text-white">KES {testMathResult.vat.toLocaleString('en-KE', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-900 dark:border-white shadow-xs">
                    <span className="text-[9.5px] uppercase block font-bold tracking-wider opacity-80">Total Bill Floor</span>
                    <span className="font-extrabold text-sm">KES {testMathResult.total.toLocaleString('en-KE', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STATUTORY RULES & SENIORITY MATRIX CONTROLS */}
            <div className="space-y-4">
              <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Firm Seniority Hourly Rate Matrix (Court & Chamber Attendances)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Managing Partner / SC:
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">KES</span>
                    <input
                      type="number"
                      value={calcSettings.managingPartnerRate}
                      onChange={e => setCalcSettings({ ...calcSettings, managingPartnerRate: Number(e.target.value) || 25000 })}
                      className="w-full pl-11 pr-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Senior Associate (&gt;7 Yrs):
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">KES</span>
                    <input
                      type="number"
                      value={calcSettings.seniorAssociateRate}
                      onChange={e => setCalcSettings({ ...calcSettings, seniorAssociateRate: Number(e.target.value) || 15000 })}
                      className="w-full pl-11 pr-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Associate Advocate (3-7 Yrs):
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">KES</span>
                    <input
                      type="number"
                      value={calcSettings.associateRate}
                      onChange={e => setCalcSettings({ ...calcSettings, associateRate: Number(e.target.value) || 8500 })}
                      className="w-full pl-11 pr-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Pupil / Trainee:
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">KES</span>
                    <input
                      type="number"
                      value={calcSettings.pupilRate}
                      onChange={e => setCalcSettings({ ...calcSettings, pupilRate: Number(e.target.value) || 3500 })}
                      className="w-full pl-11 pr-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STATUTORY FOLIO & TAX POLICY TOGGLES */}
            <div className="space-y-3 pt-2 border-t border-[var(--border-color)]/60">
              <h3 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-500">
                Statutory Folio & Taxation Compliance Rules
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Statutory Drawing Folio Charge Rate (KES):
                  </label>
                  <input
                    type="number"
                    value={calcSettings.folioRate}
                    onChange={e => setCalcSettings({ ...calcSettings, folioRate: Math.max(150, Number(e.target.value) || 150) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    Statutory floor: KES 150/folio (Schedule 6 Item 4(b))
                  </span>
                </div>

                <div>
                  <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Bill of Costs Number Sequence Prefix:
                  </label>
                  <input
                    type="text"
                    value={calcSettings.billNumberPrefix}
                    onChange={e => setCalcSettings({ ...calcSettings, billNumberPrefix: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 shadow-xs">
                  <div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                      Automatic Statutory VAT (16%)
                    </span>
                    <span className="text-[10.5px] text-slate-500">
                      Calculates 16% VAT on taxable professional fees
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={calcSettings.autoVat}
                    onChange={e => setCalcSettings({ ...calcSettings, autoVat: e.target.checked })}
                    className="rounded w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 shadow-xs">
                  <div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                      Rule 7 Statutory 14% Annual Interest
                    </span>
                    <span className="text-[10.5px] text-slate-500">
                      Auto-computes 14% p.a. interest after 30 days
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={calcSettings.autoInterest}
                    onChange={e => setCalcSettings({ ...calcSettings, autoInterest: e.target.checked })}
                    className="rounded w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 shadow-xs sm:col-span-2">
                  <div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                      Rule 77 One-Sixth (1/6th) Taxation Penalty Warning
                    </span>
                    <span className="text-[10.5px] text-slate-500">
                      Flags discretionary folios that risk incurring taxing master cost penalties before filing
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={calcSettings.rule77Warning}
                    onChange={e => setCalcSettings({ ...calcSettings, rule77Warning: e.target.checked })}
                    className="rounded w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save */}
            <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={handleSaveCalcSettings}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold hover:bg-black dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Calculation Rules</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: APPEARANCE & UI */}
      {activeTab === 'appearance' && (
        <div className="modulix-card p-6 sm:p-8 space-y-6 border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs animate-fadeIn">
          <div>
            <h2 className="font-brand font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-600" />
              <span>Appearance & UI Theme</span>
            </h2>
            <p className="text-xs text-slate-500">
              Choose your interface color theme, table density, and font style
            </p>
          </div>

          {/* Theme Switcher Cards: Light Modern Theme & Dark Modern Theme */}
          <div className="space-y-2">
            <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500">
              Interface Color Theme:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Light Modern Theme Card */}
              <button
                type="button"
                onClick={() => {
                  if (isDarkMode && toggleTheme) toggleTheme();
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  !isDarkMode
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                    : 'border-[var(--border-color)]/70 hover:border-slate-400 bg-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${!isDarkMode ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      Light Modern Theme
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Clean and crisp bright interface
                    </p>
                  </div>
                </div>
                {!isDarkMode && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Active
                  </span>
                )}
              </button>

              {/* Dark Modern Theme Card */}
              <button
                type="button"
                onClick={() => {
                  if (!isDarkMode && toggleTheme) toggleTheme();
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isDarkMode
                    ? 'border-emerald-500 bg-emerald-950/20 shadow-xs'
                    : 'border-[var(--border-color)]/70 hover:border-slate-400 bg-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-indigo-900/60 text-indigo-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}>
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      Dark Modern Theme
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Sleek low-glare dark layout
                    </p>
                  </div>
                </div>
                {isDarkMode && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300">
                    Active
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                Table Density:
              </label>
              <select
                value={tableDensity}
                onChange={e => setTableDensity(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="compact">Compact (Dense folios)</option>
                <option value="standard">Standard</option>
                <option value="comfortable">Comfortable</option>
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                Document Typography:
              </label>
              <select
                value={documentFont}
                onChange={e => setDocumentFont(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="sans">Modern Sans (Inter / Plus Jakarta Sans)</option>
                <option value="serif">Formal Serif (Times New Roman / Garamond)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                Firm Letterhead Crest Alignment:
              </label>
              <select
                value={sealAlignment}
                onChange={e => setSealAlignment(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="left">Left Aligned</option>
                <option value="center">Centered</option>
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                Primary Brand Accent Palette:
              </label>
              <select
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="emerald">High Court Emerald Green</option>
                <option value="obsidian">Obsidian Minimalist Black</option>
                <option value="navy">Royal Nairobi Navy</option>
                <option value="gold">Advocate Gold</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={handleSaveAppearance}
              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold hover:bg-black dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Display Preferences</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: ALERTS & DISPATCH */}
      {activeTab === 'notifications' && (
        <div className="modulix-card p-6 sm:p-8 space-y-6 border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs animate-fadeIn">
          <div>
            <h2 className="font-brand font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              <span>Alerts & Dispatch</span>
            </h2>
            <p className="text-xs text-slate-500">
              Manage your alert notifications and receiving email address
            </p>
          </div>

          {/* Receiving Email Address Input */}
          <div className="p-4 rounded-2xl border border-[var(--border-color)]/70 bg-transparent space-y-2">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Receiving Email Address:
            </label>
            <p className="text-[11px] text-slate-500">
              All system notifications, sign-in alerts, and matter updates will be sent to this email address.
            </p>
            <div className="relative mt-1">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={receivingEmail}
                onChange={e => setReceivingEmail(e.target.value)}
                placeholder="e.g. advocate@firm.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border-color)] bg-transparent font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {/* Alert Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-color)]/70 bg-transparent">
              <div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                  Sign-in & Security Alerts
                </span>
                <span className="text-[11px] text-slate-500">
                  Notify me when someone logs into my account from a new browser or device
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.loginSecurityAlert}
                onChange={e => setNotifSettings({ ...notifSettings, loginSecurityAlert: e.target.checked })}
                className="rounded w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-color)]/70 bg-transparent">
              <div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                  Fee Note & Billing Alerts
                </span>
                <span className="text-[11px] text-slate-500">
                  Notify me when a fee note or bill of costs is generated, shared, or marked paid
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.feeNoteAlert}
                onChange={e => setNotifSettings({ ...notifSettings, feeNoteAlert: e.target.checked })}
                className="rounded w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-color)]/70 bg-transparent">
              <div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                  Court Matter & Case Updates
                </span>
                <span className="text-[11px] text-slate-500">
                  Notify me when court causes or pleadings are registered, modified, or linked
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.matterUpdateAlert}
                onChange={e => setNotifSettings({ ...notifSettings, matterUpdateAlert: e.target.checked })}
                className="rounded w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-color)]/70 bg-transparent">
              <div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                  Client Messages & Inquiries
                </span>
                <span className="text-[11px] text-slate-500">
                  Notify me when clients submit inquiries, service requests, or portal messages
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.clientMessageAlert}
                onChange={e => setNotifSettings({ ...notifSettings, clientMessageAlert: e.target.checked })}
                className="rounded w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-color)]/70 bg-transparent">
              <div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                  Weekly Summary & System Backup
                </span>
                <span className="text-[11px] text-slate-500">
                  Receive a weekly summary report of firm activity and database backup status
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifSettings.weeklySummaryAlert}
                onChange={e => setNotifSettings({ ...notifSettings, weeklySummaryAlert: e.target.checked })}
                className="rounded w-4 h-4 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                Client Delivery Channels:
              </label>
              <select
                value={notifSettings.clientDeliveryChannel}
                onChange={e => setNotifSettings({ ...notifSettings, clientDeliveryChannel: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="both">Email PDF Attachment & WhatsApp Notification</option>
                <option value="email">Email PDF Attachment Only</option>
                <option value="whatsapp">WhatsApp Direct Link Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                In-App Toast Alert Duration:
              </label>
              <select
                value={notifSettings.toastDuration}
                onChange={e => setNotifSettings({ ...notifSettings, toastDuration: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="3">3 Seconds</option>
                <option value="4">4 Seconds (Standard)</option>
                <option value="6">6 Seconds (Extended)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={handleSaveNotifications}
              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold hover:bg-black dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Alert Preferences</span>
            </button>
          </div>
        </div>
      )}

      {/* Pinned Minimalist Footer in Sora Font */}
      <footer className="pt-6 border-t border-[var(--border-color)]/60 text-center font-['Sora'] space-y-0.5 select-none">
        <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
          FNB V1.3 Beta Version &middot; Bill of Costs Builder
        </div>
        <div className="text-[10px] text-slate-400">
          Developed by P3L Developers, Kenya
        </div>
      </footer>

    </div>
  );
};

export default ProfileSettingsView;
