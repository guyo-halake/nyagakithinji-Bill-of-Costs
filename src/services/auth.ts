import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase, SystemUser } from './supabase';

type UserRow = {
  id: string;
  auth_user_id: string;
  firm_id: string;
  full_name: string;
  email: string;
  lsk_no: string | null;
  advocate_title?: string | null;
  personal_email?: string | null;
  department?: string | null;
  role: string;
  position: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  avatar_url: string | null;
  username?: string | null;
  last_sign_in_at?: string | null;
};

const mapRole = (role: string): SystemUser['role'] => {
  if (role === 'admin') return 'Admin';
  if (role === 'developer') return 'Developer';
  return 'Advocate';
};

const mapProfile = (profile: UserRow): SystemUser => {
  return {
    id: profile.id,
    authUserId: profile.auth_user_id,
    firmId: profile.firm_id,
    fullName: profile.full_name,
    username: profile.username || undefined,
    lastSignInAt: profile.last_sign_in_at || undefined,
    advocateTitle: profile.advocate_title || '',
    lskNo: profile.lsk_no || '',
    role: mapRole(profile.role),
    position: profile.position || profile.role,
    department: profile.department || '',
    workEmail: profile.email,
    personalEmail: profile.personal_email || '',
    phonePrimary: profile.phone_primary || '',
    phoneSecondary: profile.phone_secondary || '',
    hasAllPermissions: profile.role === 'admin' || profile.role === 'developer',
    passwordHash: '',
    avatarUrl: profile.avatar_url || undefined,
  };
};

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function getPasswordRecoveryErrorMessage(error: unknown): string {
  const authError = typeof error === 'object' && error !== null ? error : {};
  const message = 'message' in authError && typeof authError.message === 'string' ? authError.message : '';
  const code = 'code' in authError && typeof authError.code === 'string' ? authError.code : '';

  if (/email rate limit exceeded|over_email_send_rate_limit/i.test(`${code} ${message}`)) {
    return 'Supabase has temporarily limited password reset emails. Wait before requesting another link, and check your inbox and spam folder for one already sent.';
  }

  return message || 'Could not send the Supabase password reset link. Please try again later.';
}

export async function getCurrentUserProfile(): Promise<SystemUser | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) {
    localStorage.removeItem('BILLSZIP_SESSION');
    return null;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return null;

  // Match the authenticated identity to the active firm profile by exact email.
  // This works both before and after the optional auth_user_id migration is applied.
  const { data: emailProfile, error: emailError } = await supabase
    .from('users')
    .select('id, auth_user_id, firm_id, full_name, email, lsk_no, role, position, phone_primary, phone_secondary, avatar_url, is_active')
    .ilike('email', authData.user.email || '')
    .eq('is_active', true)
    .maybeSingle();
  if (emailProfile) return mapProfile(emailProfile as UserRow);

  if (emailError) throw emailError;
  return null;
}

export async function signInWithPassword(identifier: string, password: string): Promise<SystemUser> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPassword = password;

  if (!cleanId || !cleanPassword) {
    throw new Error('Please enter both your Email/Phone and Password.');
  }

  if (!cleanId.includes('@')) {
    throw new Error('Enter your registered email address to sign in.');
  }

  if (!isSupabaseConfigured) {
    throw new Error('The account sign-in service is not configured. Contact your administrator.');
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: cleanId,
    password: cleanPassword,
  });
  if (authError && (
    authError.name === 'AuthRetryableFetchError' ||
    authError.status === 0 ||
    /fetch failed|network|connection|timeout/i.test(authError.message)
  )) {
    throw new Error('Could not reach the account sign-in service. Check your connection and try again.');
  }
  if (authError?.code === 'invalid_credentials') {
    throw new Error('Sign-in details not accepted. Check your registered work email and password, or use Forgot Password to reset it.');
  }
  if (authError?.code === 'email_not_confirmed') {
    throw new Error('Confirm your email address before signing in. Check your inbox for the confirmation link.');
  }
  if (authError?.status === 429) {
    throw new Error('Too many sign-in attempts. Wait a few minutes, then try again.');
  }
  if (authError && authError.status !== undefined && authError.status >= 500) {
    throw new Error('The account sign-in service is temporarily unavailable. Please try again shortly.');
  }
  if (authError || !authData.user) {
    throw new Error('Unable to sign in. Check your account details and try again.');
  }

  const profile = await getCurrentUserProfile();
  if (!profile) {
    await supabase.auth.signOut();
    throw new Error('Your account is not linked to an active firm profile. Contact your administrator.');
  }

  const { error: lastSignInError } = await supabase
    .from('users')
    .update({ last_sign_in_at: new Date().toISOString() })
    .eq('id', profile.id);
  if (lastSignInError) {
    console.error('Could not update last sign-in time:', lastSignInError);
  } else {
    profile.lastSignInAt = new Date().toISOString();
  }

  localStorage.setItem('BILLSZIP_SESSION', JSON.stringify(profile));
  return profile;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function subscribeToAuthState(
  onChange: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => onChange(event, session));
  return () => data.subscription.unsubscribe();
}