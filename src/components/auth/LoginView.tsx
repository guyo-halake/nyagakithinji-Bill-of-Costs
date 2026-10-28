import React, { useState, useRef, useEffect } from 'react';
import { supabase, SystemUser, EXACT_FIRM_INFO } from '../../services/supabase';
import { signInWithPassword } from '../../services/auth';
import { Mail, Key, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: SystemUser) => void;
  onForgotPassword?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Detect developer/admin mode from URL or double right-click trigger
  const [isDevAdminMode, setIsDevAdminMode] = useState<boolean>(() => {
    return window.location.pathname === '/developer-page' || window.location.pathname === '/admin';
  });

  const lastRightClickRef = useRef<number>(0);

  useEffect(() => {
    const handlePopState = () => {
      setIsDevAdminMode(window.location.pathname === '/developer-page' || window.location.pathname === '/admin');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');
    setIsLoading(true);

    try {
      const authenticatedUser = await signInWithPassword(email, password);

      // If logging in via developer/admin section, verify user is Admin or Developer
      if (isDevAdminMode && authenticatedUser.role !== 'Admin' && authenticatedUser.role !== 'Developer') {
        setIsLoading(false);
        setErrorMessage('Access denied: Only System Administrators and Developers can sign in here.');
        return;
      }

      localStorage.setItem('BILLSZIP_SESSION', JSON.stringify(authenticatedUser));
      setIsLoading(false);
      onLoginSuccess(authenticatedUser);
      return;
    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage(error?.message || 'Unable to sign in. Check your credentials and try again.');
      return;
    }
  };

  const handleForgotPassword = async () => {
    const targetInput = email.trim();
    if (!targetInput) {
      setErrorMessage('Please enter your registered Email, Username, or Phone in the field above, then click Forgot Password.');
      setSuccessNotice('');
      return;
    }

    setIsSubmittingReset(true);
    setErrorMessage('');
    setSuccessNotice('');

    try {
      const cleanTarget = targetInput.toLowerCase();
      const cleanHandle = cleanTarget.replace(/^@/, '');
      const numericTarget = cleanTarget.replace(/[^0-9]/g, '');

      let matchedUser: SystemUser | null = null;

      // 1. Authoritative lookup in Supabase public.users table
      try {
        const { data: dbRows, error: dbErr } = await supabase
          .from('users')
          .select('*')
          .eq('is_active', true);

        if (!dbErr && dbRows && dbRows.length > 0) {
          for (const row of dbRows) {
            const rowEmail = (row.email || '').trim().toLowerCase();
            const rowUsername = (row.username || rowEmail.split('@')[0] || '').trim().toLowerCase();
            const rowName = (row.full_name || '').trim().toLowerCase();
            const phone1 = (row.phone_primary || '').replace(/[^0-9]/g, '');
            const phone2 = (row.phone_secondary || '').replace(/[^0-9]/g, '');

            if (
              rowEmail === cleanTarget ||
              rowUsername === cleanHandle ||
              rowUsername === cleanTarget ||
              rowName === cleanTarget ||
              (numericTarget.length >= 7 && (phone1.includes(numericTarget.slice(-9)) || phone2.includes(numericTarget.slice(-9))))
            ) {
              matchedUser = {
                id: row.id,
                authUserId: row.auth_user_id || undefined,
                firmId: row.firm_id,
                fullName: row.full_name,
                advocateTitle: row.full_name,
                lskNo: row.lsk_no || '',
                role: row.role === 'admin' ? 'Admin' : row.role === 'developer' ? 'Developer' : 'Advocate',
                position: row.position || row.role,
                workEmail: row.email,
                personalEmail: row.email,
                phonePrimary: row.phone_primary || '',
                phoneSecondary: row.phone_secondary || '',
                hasAllPermissions: row.role === 'admin' || row.role === 'developer',
                passwordHash: '',
              };
              break;
            }
          }
        }
      } catch (e) {
        console.warn('Supabase users query notice:', e);
      }

      // 2. Lookup in backend /api/v1/users if not matched yet
      if (!matchedUser) {
        try {
          const apiRes = await fetch('/api/v1/users');
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            const users = apiData?.users || [];
            for (const u of users) {
              const wEmail = (u.workEmail || '').trim().toLowerCase();
              const pEmail = (u.personalEmail || '').trim().toLowerCase();
              const uName = (u.username || '').trim().toLowerCase();
              const fName = (u.fullName || '').trim().toLowerCase();
              const handle = wEmail.split('@')[0] || '';
              const phone1 = (u.phonePrimary || '').replace(/[^0-9]/g, '');
              const phone2 = (u.phoneSecondary || '').replace(/[^0-9]/g, '');

              if (
                wEmail === cleanTarget ||
                pEmail === cleanTarget ||
                uName === cleanHandle ||
                handle === cleanHandle ||
                fName === cleanTarget ||
                (numericTarget.length >= 7 && (phone1.includes(numericTarget.slice(-9)) || phone2.includes(numericTarget.slice(-9))))
              ) {
                matchedUser = {
                  id: u.id,
                  fullName: u.fullName,
                  username: u.username || wEmail.split('@')[0],
                  advocateTitle: u.advocateTitle || u.fullName,
                  lskNo: u.lskNo || '',
                  role: u.role || 'Advocate',
                  position: u.position || 'Advocate',
                  workEmail: u.workEmail,
                  personalEmail: u.personalEmail || u.workEmail,
                  phonePrimary: u.phonePrimary || '',
                  phoneSecondary: u.phoneSecondary || '',
                  hasAllPermissions: u.hasAllPermissions,
                  passwordHash: '',
                  firmId: u.firmId || 'firm-001',
                };
                break;
              }
            }
          }
        } catch (e) {
          console.warn('Backend users API query notice:', e);
        }
      }

      // 3. Fallback to cached firm roster only if still not matched
      if (!matchedUser) {
        const stored = localStorage.getItem('EXACT_USERS');
        const cachedUsers: SystemUser[] = stored ? JSON.parse(stored) : [];
        const { SEEDED_USERS } = await import('../../services/supabase');
        const allUsers = [...cachedUsers, ...SEEDED_USERS];

        for (const u of allUsers) {
          const wEmail = (u.workEmail || '').trim().toLowerCase();
          const pEmail = (u.personalEmail || '').trim().toLowerCase();
          const uName = (u.username || '').trim().toLowerCase();
          const fName = (u.fullName || '').trim().toLowerCase();
          const handle = wEmail.split('@')[0] || '';
          const phone1 = (u.phonePrimary || '').replace(/[^0-9]/g, '');
          const phone2 = (u.phoneSecondary || '').replace(/[^0-9]/g, '');

          if (
            wEmail === cleanTarget ||
            pEmail === cleanTarget ||
            uName === cleanHandle ||
            handle === cleanHandle ||
            fName === cleanTarget ||
            (numericTarget.length >= 7 && (phone1.includes(numericTarget.slice(-9)) || phone2.includes(numericTarget.slice(-9))))
          ) {
            matchedUser = u;
            break;
          }
        }
      }

      // 4. CRITICAL VERIFICATION: User MUST exist in the database roster
      if (!matchedUser) {
        setErrorMessage(`Account "${targetInput}" was not found in the firm database. Only registered firm users can reset credentials.`);
        setSuccessNotice('');
        setIsSubmittingReset(false);
        return;
      }

      const resolvedEmail = (matchedUser.workEmail || matchedUser.personalEmail || (matchedUser as any).email || '').trim().toLowerCase();
      if (!resolvedEmail || !resolvedEmail.includes('@')) {
        setErrorMessage(`User account "${matchedUser.fullName}" does not have a valid registered email in the database.`);
        setSuccessNotice('');
        setIsSubmittingReset(false);
        return;
      }

      // 5. Send Supabase password reset link ONLY to the verified user's registered email
      // Enforce the production URL (https://nyagahkithinji-advocates.azurewebsites.net) so reset links never route to localhost
      const productionAppUrl = 'https://nyagahkithinji-advocates.azurewebsites.net';
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(resolvedEmail, {
        redirectTo: `${productionAppUrl}/reset-password`,
      });

      if (sbError) {
        throw sbError;
      }

      // 6. Background email dispatch for this specific user (using production URL)
      try {
        fetch('/api/v1/email/password-reset-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: resolvedEmail,
            full_name: matchedUser.fullName,
            username: matchedUser.username || resolvedEmail.split('@')[0],
            firm_name: EXACT_FIRM_INFO.name,
            portal_url: productionAppUrl,
          }),
        }).catch(() => {});
      } catch (_) {}

      setSuccessNotice(`A secure Supabase password reset link has been dispatched to ${resolvedEmail}. Please check your inbox to set your new password.`);
      setErrorMessage('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to dispatch reset link. Please check your email address or connection.');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Easter egg: Double right-click on "Fee Notes Generator v1-4" opens developer login page
  const handleFeeNotesContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastRightClickRef.current < 600) {
      setIsDevAdminMode(true);
      setErrorMessage('');
      setSuccessNotice('');
      try {
        window.history.pushState(null, '', '/developer-page');
      } catch (_) {}
      lastRightClickRef.current = 0;
    } else {
      lastRightClickRef.current = now;
    }
  };

  const handleReturnToFirm = () => {
    setIsDevAdminMode(false);
    setErrorMessage('');
    setSuccessNotice('');
    try {
      window.history.pushState(null, '', '/');
    } catch (_) {}
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col justify-between p-4 sm:p-6 font-sans overflow-hidden">
      
      {/* Blurred background image for Admin login mode */}
      {isDevAdminMode && (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none scale-125 filter blur-3xl opacity-35"
            style={{ backgroundImage: `url('/p2l_logo.jpeg')` }}
          />
          <div className="absolute inset-0 z-0 bg-black/80 pointer-events-none" />
        </>
      )}

      <div className="relative z-10 w-full max-w-md mx-auto my-auto space-y-6 pt-4">
        
        {/* Brand Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          {isDevAdminMode ? (
            // Admin mode: Clean, bold, prominent P3L logo only
            <div className="flex flex-col items-center">
              <img
                src="/p2l_logo.jpeg"
                alt="P3L Developers Admin Logo"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/p3l_logo.jpeg';
                }}
                className="h-36 sm:h-44 max-w-[320px] w-auto object-contain shrink-0 drop-shadow-2xl mb-1 rounded-2xl"
              />
              <button
                type="button"
                onClick={handleReturnToFirm}
                className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-semibold hover:underline mt-2 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Nyagah B. Kithinji &amp; Co.
              </button>
            </div>
          ) : (
            // Firm Mode: Law Firm Logo & Tagline
            <>
              <img
                src="/logo.png"
                alt="Nyagah B. Kithinji & Co. Advocates Logo"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/kenya_coat_of_arms.png';
                }}
                className="h-32 sm:h-36 max-w-[280px] w-auto object-contain shrink-0 drop-shadow-md mb-1"
              />
              <div>
                <h1 className="font-brand font-extrabold text-2xl text-[var(--text-main)] tracking-tight">
                  Nyagah B. Kithinji &amp; Co.
                </h1>
                <p className="text-xs text-[var(--text-muted)] font-bold italic mt-1">
                  Advocates of the High Court of Kenya
                </p>
              </div>
            </>
          )}
        </div>

        {/* Clean Login Box */}
        <div className={`vercel-card p-6 sm:p-8 space-y-5 shadow-2xl border ${
          isDevAdminMode
            ? 'bg-slate-900/80 backdrop-blur-xl border-slate-700/60 text-white shadow-black/60'
            : 'border-[var(--border-color)]'
        }`}>
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2.5 font-medium leading-relaxed">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Field 1: ADMIN # (for admin) or Email or Phone (for firm) */}
            <div className="space-y-1.5">
              <label className="font-semibold block tracking-wide">
                {isDevAdminMode ? 'ADMIN #:' : 'Email or Phone:'}
              </label>
              <div className="relative">
                {isDevAdminMode ? (
                  <Shield className="w-4 h-4 absolute left-3.5 top-3 text-amber-500/80" />
                ) : (
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)]" />
                )}
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:outline-none transition-colors font-mono ${
                    isDevAdminMode
                      ? 'bg-black/50 border border-slate-700 text-white placeholder-slate-500 focus:border-amber-500'
                      : 'bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-main)] focus:border-[var(--text-main)]'
                  }`}
                  placeholder={
                    isDevAdminMode
                      ? 'Enter Admin ID or Email'
                      : 'e.g. advocate@kithinjilegal.co.ke or +254...'
                  }
                />
              </div>
            </div>

            {/* Field 2: SB Pass (for admin) or Password (for firm) */}
            <div className="space-y-1.5">
              <label className="font-semibold block tracking-wide">
                {isDevAdminMode ? 'SB Pass:' : 'Password:'}
              </label>
              <div className="relative">
                <Key className={`w-4 h-4 absolute left-3.5 top-3 ${
                  isDevAdminMode ? 'text-amber-500/80' : 'text-[var(--text-muted)]'
                }`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl pl-10 pr-10 py-2.5 text-xs focus:outline-none transition-colors font-mono ${
                    isDevAdminMode
                      ? 'bg-black/50 border border-slate-700 text-white placeholder-slate-500 focus:border-amber-500'
                      : 'bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-main)] focus:border-[var(--text-main)]'
                  }`}
                  placeholder={isDevAdminMode ? 'Enter SB Pass' : 'Enter your password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3.5 top-3 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Modern Glassmorphism Rounded Pill Sign In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98] border backdrop-blur-md ${
                  isDevAdminMode
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold border-amber-400/50 shadow-amber-500/20'
                    : 'bg-slate-900/90 hover:bg-slate-900 text-white border-slate-700/50 shadow-slate-900/25 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white dark:border-white/20 dark:shadow-black/40'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Clean Forgot Password (Firm mode only — completely removed from Admin mode) */}
          {!isDevAdminMode && (
            <div className="pt-2 flex items-center justify-center text-xs">
              <button
                type="button"
                disabled={isSubmittingReset}
                onClick={handleForgotPassword}
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                {isSubmittingReset ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>Sending reset link...</span>
                  </>
                ) : (
                  'Forgot Password?'
                )}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* FOOTER */}
      <footer className="relative z-10 py-6 text-center text-xs space-y-1 font-sans select-none">
        {isDevAdminMode ? (
          // Admin Mode Footer
          <div className="space-y-0.5">
            <p className="font-bold text-slate-200 text-sm tracking-wide">
              P3L Developers, Nairobi
            </p>
            <p className="text-[11px] font-mono text-amber-400/90 tracking-wider">
              MBT_S running//
            </p>
          </div>
        ) : (
          // Firm Mode Footer
          <>
            <p
              onContextMenu={handleFeeNotesContextMenu}
              title="Fee Notes Generator (Right-click twice to open Developer Portal)"
              className="font-bold text-[var(--text-main)] text-sm cursor-default hover:text-amber-500 transition-colors"
            >
              Fee Notes Generator v1-4
            </p>
            <p className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1">
              <span className="font-bold">©</span> Nyagah B. Kithinji &amp; Co. Advocates
            </p>
            <p className="text-[11px] font-mono text-[var(--text-muted)]">
              All rights reserved. 2026
            </p>
          </>
        )}
      </footer>
    </div>
  );
};

export default LoginView;
