import React, { useState, useRef, useEffect } from 'react';
import { supabase, SystemUser, EXACT_FIRM_INFO, getActiveFirmProfile } from '../../services/supabase';
import { getPasswordRecoveryErrorMessage, signInWithPassword } from '../../services/auth';
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
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // Dynamic firm branding loaded from database
  const [firmLogo, setFirmLogo] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('BILLSZIP_FIRM_SETTINGS');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.logoUrl) return p.logoUrl;
      }
    } catch (_) {}
    return getActiveFirmProfile().logoUrl || '/logo.png';
  });
  const [firmName, setFirmName] = useState<string>(() => getActiveFirmProfile().name || 'Nyagah B. Kithinji & Co.');
  const [firmTitle, setFirmTitle] = useState<string>(() => (EXACT_FIRM_INFO as any).title || 'Advocates of the High Court of Kenya');

  // Fetch latest firm logo & branding from Supabase and backend database
  useEffect(() => {
    let isMounted = true;
    const fetchBrandingFromDatabase = async () => {
      try {
        const { data: dbFirm, error } = await supabase
          .from('firms')
          .select('name, logo_url')
          .limit(1)
          .maybeSingle();

        if (!error && dbFirm && isMounted) {
          if (dbFirm.logo_url) setFirmLogo(dbFirm.logo_url);
          if (dbFirm.name) setFirmName(dbFirm.name);
        }
      } catch (_) {}

      try {
        const apiRes = await fetch('/api/v1/users/firm-settings');
        if (apiRes.ok && isMounted) {
          const apiData = await apiRes.json();
          if (apiData.logoUrl) setFirmLogo(apiData.logoUrl);
          if (apiData.name) setFirmName(apiData.name);
          if (apiData.title) setFirmTitle(apiData.title);
        }
      } catch (_) {}
    };

    fetchBrandingFromDatabase();

    const handleSettingsUpdate = () => {
      const profile = getActiveFirmProfile();
      if (profile.logoUrl) setFirmLogo(profile.logoUrl);
      if (profile.name) setFirmName(profile.name);
    };
    window.addEventListener('firmSettingsUpdated', handleSettingsUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('firmSettingsUpdated', handleSettingsUpdate);
    };
  }, []);

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

    // Security Feature 1: Client-side Brute-force & Rate Limit Lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const waitSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setErrorMessage(`Account temporarily locked due to consecutive failed attempts. Please wait ${waitSeconds}s before retrying.`);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    // Security Feature 2: Email Required & Strict Format Validation
    if (!cleanEmail) {
      setErrorMessage('Email address is required to sign in.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setErrorMessage('Invalid email: Email address must contain "@" (e.g. advocate@kithinjilegal.co.ke).');
      return;
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(cleanEmail)) {
      setErrorMessage('Invalid email format: Please enter a genuine, valid email address.');
      return;
    }

    // Security Feature 3: Password Security Requirements
    if (!cleanPassword) {
      setErrorMessage('Password is required.');
      return;
    }

    if (cleanPassword.length < 6) {
      setErrorMessage('Security requirement: Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const authenticatedUser = await signInWithPassword(cleanEmail, cleanPassword);

      // Security Feature 4: Verify authenticated account has a real database email
      const workEmail = (authenticatedUser.workEmail || '').trim().toLowerCase();
      const personalEmail = (authenticatedUser.personalEmail || '').trim().toLowerCase();
      if (!workEmail.includes('@') && !personalEmail.includes('@')) {
        setIsLoading(false);
        setErrorMessage('Security rejection: User account does not have a verified email registered in the database.');
        return;
      }

      // If logging in via developer/admin section, verify user is Admin or Developer
      if (isDevAdminMode && authenticatedUser.role !== 'Admin' && authenticatedUser.role !== 'Developer') {
        setIsLoading(false);
        setErrorMessage('Access denied: Only System Administrators and Developers can sign in here.');
        return;
      }

      setFailedAttempts(0);
      setLockoutUntil(null);

      localStorage.setItem('BILLSZIP_SESSION', JSON.stringify(authenticatedUser));
      setIsLoading(false);
      onLoginSuccess(authenticatedUser);
      return;
    } catch (error: any) {
      setIsLoading(false);
      if (/could not reach the account sign-in service/i.test(error?.message || '')) {
        setErrorMessage(error.message);
        return;
      }

      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      if (nextFailed >= 5) {
        setLockoutUntil(Date.now() + 30000);
        setErrorMessage('Too many consecutive failed login attempts. Sign in is locked for 30 seconds for security.');
      } else {
        setErrorMessage(error?.message || 'Unable to sign in. Check your credentials and try again.');
      }
      return;
    }
  };

  const handleForgotPassword = async () => {
    const targetInput = email.trim();
    if (!targetInput) {
      setErrorMessage('Please enter your registered Email address above, then click Forgot Password.');
      setSuccessNotice('');
      return;
    }

    if (!targetInput.includes('@')) {
      setErrorMessage('Invalid email: Email must contain an "@" symbol (e.g. advocate@kithinjilegal.co.ke).');
      setSuccessNotice('');
      return;
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(targetInput)) {
      setErrorMessage('Invalid email format: Please enter a genuine, valid email address.');
      setSuccessNotice('');
      return;
    }

    setIsSubmittingReset(true);
    setErrorMessage('');
    setSuccessNotice('');

    try {
      const resolvedEmail = targetInput.toLowerCase();
      const redirectTo = new URL('/reset-password', window.location.origin).toString();
      const { error } = await supabase.auth.resetPasswordForEmail(resolvedEmail, { redirectTo });
      if (error) throw error;

      setSuccessNotice(`If a Supabase account exists for ${resolvedEmail}, a password reset link has been sent. Check your inbox and spam folder.`);
      setErrorMessage('');
    } catch (err: any) {
      setErrorMessage(getPasswordRecoveryErrorMessage(err));
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

  const handleNamedAdminLogin = () => {
    setSuccessNotice('');
    setErrorMessage("Sorry, you don't have permission to log in as this user.");
  };

  return (
    <div className={`relative min-h-screen flex flex-col justify-between p-4 sm:p-6 font-sans overflow-hidden ${
      isDevAdminMode
        ? 'bg-slate-50 text-slate-900'
        : 'bg-[var(--bg-main)] text-[var(--text-main)]'
    }`}>
      
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
                className={`inline-flex items-center gap-1.5 text-xs font-semibold hover:underline mt-2 cursor-pointer transition-colors ${
                  isDevAdminMode ? 'text-slate-600 hover:text-slate-900' : 'text-amber-500 hover:text-amber-400'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Nyagah B. Kithinji &amp; Co.
              </button>
            </div>
          ) : (
            // Firm Mode: Law Firm Logo & Tagline loaded dynamically from Database
            <>
              <img
                src={firmLogo}
                alt={`${firmName} Logo`}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/logo.png';
                }}
                className="h-32 sm:h-36 max-w-[280px] w-auto object-contain shrink-0 drop-shadow-md mb-1"
              />
              <div>
                <h1 className="font-brand font-extrabold text-2xl text-[var(--text-main)] tracking-tight">
                  {firmName}
                </h1>
                <p className="text-xs text-[var(--text-muted)] font-bold italic mt-1">
                  {firmTitle}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Clean Login Box */}
        <div className={`vercel-card p-6 sm:p-8 space-y-5 shadow-2xl border ${
          isDevAdminMode
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/70'
            : 'border-[var(--border-color)]'
        }`}>
          {errorMessage && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 font-medium ${
              isDevAdminMode
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-red-500/10 border border-red-500/30 text-red-500'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 font-medium leading-relaxed ${
              isDevAdminMode
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            }`}>
              <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isDevAdminMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
              <span>{successNotice}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Field 1: ADMIN # (for admin) or Email Address (for firm) */}
            <div className="space-y-1.5">
              <label className={`font-semibold block tracking-wide ${isDevAdminMode ? 'text-slate-700' : ''}`}>
                {isDevAdminMode ? 'ADMIN #:' : 'Email Address:'}
              </label>
              <div className="relative">
                {isDevAdminMode ? (
                  <Shield className="w-4 h-4 absolute left-3.5 top-3 text-amber-500/80" />
                ) : (
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)]" />
                )}
                <input
                  type={isDevAdminMode ? 'text' : 'email'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:outline-none transition-colors font-mono ${
                    isDevAdminMode
                      ? 'bg-white border border-slate-300 text-slate-900 focus:border-slate-500 placeholder:text-slate-400'
                      : 'bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-main)] focus:border-[var(--text-main)]'
                  }`}
                />
              </div>
            </div>

            {/* Field 2: SB Pass (for admin) or Password (for firm) */}
            <div className="space-y-1.5">
              <label className={`font-semibold block tracking-wide ${isDevAdminMode ? 'text-slate-700' : ''}`}>
                {isDevAdminMode ? 'SB Pass:' : 'Password:'}
              </label>
              <div className="relative">
                <Key className={`w-4 h-4 absolute left-3.5 top-3 ${
                  isDevAdminMode ? 'text-slate-500' : 'text-[var(--text-muted)]'
                }`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl pl-10 pr-10 py-2.5 text-xs focus:outline-none transition-colors font-mono ${
                    isDevAdminMode
                      ? 'bg-white border border-slate-300 text-slate-900 focus:border-slate-500'
                      : 'bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-main)] focus:border-[var(--text-main)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className={`absolute right-3.5 top-3 transition-colors cursor-pointer ${
                    isDevAdminMode ? 'text-slate-500 hover:text-slate-900' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
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
                    ? 'bg-slate-900 hover:bg-slate-700 text-white border-slate-900 shadow-slate-900/15'
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
              {isDevAdminMode && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {['Razak', 'Najma', 'Karani'].map(name => (
                    <button
                      key={name}
                      type="button"
                      onClick={handleNamedAdminLogin}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                    >
                      Login as {name}
                    </button>
                  ))}
                </div>
              )}
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
            <p className="font-bold text-slate-700 text-sm tracking-wide">
              P3L Developers, Nairobi
            </p>
            <p className="text-[11px] font-mono text-slate-500 tracking-wider">
              MBT_S running//
            </p>
          </div>
        ) : (
          // Firm Mode Footer: Clean copyright & all rights reserved (Fee Notes Generator removed)
          <div
            onContextMenu={handleFeeNotesContextMenu}
            className="space-y-1 cursor-default"
          >
            <p className="text-xs text-[var(--text-muted)] flex items-center justify-center gap-1 font-medium">
              <span className="font-bold">©</span> {new Date().getFullYear()} {firmName}. All rights reserved.
            </p>
          </div>
        )}
      </footer>
    </div>
  );
};

export default LoginView;
