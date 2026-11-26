import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const respond = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('User creation function is missing Supabase server configuration.');
    return respond({ error: 'Account creation is not configured.' }, 500);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return respond({ error: 'Sign in as an administrator first.' }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return respond({ error: 'Your administrator session is invalid.' }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: caller, error: callerError } = await adminClient
    .from('users')
    .select('firm_id, role, is_active')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();
  if (callerError) {
    console.error('Could not verify the account administrator:', callerError.message);
    return respond({ error: 'Could not verify administrator permissions.' }, 500);
  }
  if (!caller?.is_active || caller.role !== 'admin' || !caller.firm_id) {
    return respond({ error: 'Only an active firm administrator can add users.' }, 403);
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return respond({ error: 'Request must contain valid JSON.' }, 400);
  }

  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const role = input.role;
  if (!fullName || fullName.length > 255) return respond({ error: 'Enter a valid full name.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond({ error: 'Enter a valid email address.' }, 400);
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) return respond({ error: 'Username must be 3–40 letters, numbers, dots, underscores or hyphens.' }, 400);
  if (password.length < 8) return respond({ error: 'Password must be at least 8 characters.' }, 400);
  if (role !== 'Admin' && role !== 'Advocate') return respond({ error: 'Choose a valid user role.' }, 400);

  const { data: existingUser, error: existingError } = await adminClient
    .from('users')
    .select('id')
    .eq('firm_id', caller.firm_id)
    .ilike('username', username)
    .maybeSingle();
  if (existingError) {
    console.error('Could not check for duplicate usernames:', existingError.message);
    return respond({ error: 'Could not verify whether the username is available.' }, 500);
  }
  if (existingUser) return respond({ error: 'That username is already in use.' }, 409);

  const { data: createdAuth, error: createAuthError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, username, firm_id: caller.firm_id, role: role.toLowerCase() },
  });
  if (createAuthError || !createdAuth.user) {
    return respond({ error: createAuthError?.message || 'Could not create the sign-in account.' }, 400);
  }

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .insert({
      auth_user_id: createdAuth.user.id,
      firm_id: caller.firm_id,
      full_name: fullName,
      email,
      username,
      role: role.toLowerCase(),
      position: role,
      is_active: true,
    })
    .select('id, auth_user_id, firm_id, full_name, email, username, role, position, last_sign_in_at, is_active')
    .single();

  if (profileError || !profile) {
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(createdAuth.user.id);
    if (rollbackError) console.error('Could not remove incomplete auth account:', rollbackError.message);
    console.error('Could not create the firm user profile:', profileError?.message);
    return respond({ error: 'Could not save the user profile to the firm database.' }, 500);
  }

  return respond({ user: profile }, 201);
});
