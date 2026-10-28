import {
  supabase,
  ExactClientRecord,
  ExactMatterRecord,
  ExactVaultFileRecord,
  SystemUser,
  EXACT_CLIENTS,
  EXACT_MATTERS,
  EXACT_VAULT_FILES,
  SEEDED_USERS,
  EXACT_MESSAGES,
  getFeeNotes,
  persistFeeNotes,
  getClients,
  persistClients,
  getMatters,
  persistMatters,
  ExactFeeNoteRecord,
  saveUserProfile,
} from './supabase';

const mapClient = (row: any): ExactClientRecord => ({
  id: row.id,
  name: row.name,
  company: row.company || '',
  category: row.client_type === 'individual' ? 'Individual Client' : 'Corporate or Institutional',
  email: row.email || '',
  phone: row.phone_primary || row.phone || '',
  phonePrimary: row.phone_primary || row.phone || '',
  phoneSecondary: row.phone_secondary || '',
  matters: 0,
  mattersList: [],
  code: row.id,
  kraPin: row.kra_pin || '',
  contactPerson: row.contact_person || '',
});

const mapMatter = (row: any): ExactMatterRecord => ({
  id: row.id,
  title: row.title,
  applicant: row.applicant || '',
  applicantRole: row.applicant_role || 'Claimant',
  respondent: row.respondent || '',
  respondentRole: row.respondent_role || 'Respondent',
  forum: row.court_station || row.forum || '',
  status: row.status || 'open',
  statusClass: row.status === 'closed' ? 'closed' : row.status === 'in_taxation' ? 'court' : row.status === 'taxation_ready' ? 'ready' : 'pending',
  caseNo: row.cts_case_number || row.cause_number || '',
  filedBy: row.assigned_advocate_id || '',
  amount: Number(row.claim_value || 0),
  itemsCount: 0,
  feeNoteLink: row.fee_note_link || '',
  documentLink: row.excel_link || row.pdf_link || '',
  matterNumber: row.cts_case_number || row.cause_number || '',
  leadAdvocate: row.lead_advocate || row.assigned_advocate_id || '',
  ctsCaseNumber: row.cts_case_number || row.cause_number || '',
  courtStation: row.court_station || row.forum || '',
  hearingDate: row.hearing_date || undefined,
  courtActionRequired: row.court_action_required || undefined,
  leadAdvocateEmail: row.lead_advocate_email || undefined,
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isValidUuid = (val?: string | null): boolean => {
  return typeof val === 'string' && UUID_REGEX.test(val);
};

export async function fetchClients(firmId: string): Promise<ExactClientRecord[]> {
  const local = getClients();
  try {
    let query = supabase.from('clients').select('*');
    if (isValidUuid(firmId)) {
      query = query.eq('firm_id', firmId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const cloudMapped = data.map(mapClient);
      const merged = [...cloudMapped];
      local.forEach(lc => {
        if (!merged.some(m => m.id === lc.id || m.name.toLowerCase() === lc.name.toLowerCase())) {
          merged.push(lc);
        }
      });
      persistClients(merged, true);
      return merged;
    }
  } catch (e) {}
  return local;
}

export async function createClient(firmId: string, input: Pick<ExactClientRecord, 'name' | 'company' | 'email' | 'phonePrimary' | 'phoneSecondary' | 'category'> & { kraPin?: string; address?: string }): Promise<ExactClientRecord> {
  let created: ExactClientRecord | null = null;
  try {
    const insertPayload: Record<string, any> = {
      name: input.name,
      company: input.company || null,
      client_type: input.category === 'Individual Client' ? 'individual' : 'corporate',
      email: input.email,
      phone_primary: input.phonePrimary,
      phone_secondary: input.phoneSecondary || null,
      kra_pin: input.kraPin || null,
      address: input.address || null,
    };
    if (isValidUuid(firmId)) {
      insertPayload.firm_id = firmId;
    }
    const { data, error } = await supabase.from('clients').insert(insertPayload).select('*').single();
    if (!error && data) created = mapClient(data);
  } catch (e) {}

  const newRecord: ExactClientRecord = created || {
    id: `c-${Date.now()}`,
    name: input.name,
    company: input.company || '',
    category: input.category,
    email: input.email,
    phone: input.phonePrimary,
    phonePrimary: input.phonePrimary,
    phoneSecondary: input.phoneSecondary || '',
    matters: 0,
    mattersList: [],
    code: `CLI-${Date.now().toString().slice(-5)}`,
    kraPin: input.kraPin || 'P051000000X',
    contactPerson: input.name,
  };

  const list = getClients();
  const filtered = list.filter(c => c.id !== newRecord.id && c.name.toLowerCase() !== newRecord.name.toLowerCase());
  persistClients([newRecord, ...filtered]);
  return newRecord;
}

export async function deleteClient(firmId: string, clientId: string): Promise<void> {
  try {
    let del = supabase.from('clients').delete();
    if (isValidUuid(firmId)) {
      del = del.eq('firm_id', firmId);
    }
    await del.eq('id', clientId);
  } catch (e) {}
  const list = getClients();
  const filtered = list.filter(c => c.id !== clientId);
  persistClients(filtered);
}

export async function fetchMatters(firmId: string): Promise<ExactMatterRecord[]> {
  const local = getMatters();
  try {
    let query = supabase.from('matters').select('*');
    if (isValidUuid(firmId)) {
      query = query.eq('firm_id', firmId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const cloudMapped = data.map(mapMatter);
      const merged = [...cloudMapped];
      local.forEach(lm => {
        if (!merged.some(m => m.id === lm.id || m.title.toLowerCase() === lm.title.toLowerCase())) {
          merged.push(lm);
        }
      });
      persistMatters(merged, true);
      return merged;
    }
  } catch (e) {}
  return local;
}

export async function createMatter(firmId: string, input: Partial<ExactMatterRecord>): Promise<ExactMatterRecord> {
  let created: ExactMatterRecord | null = null;
  try {
    const { data, error } = await supabase.from('matters').insert({
      firm_id: firmId,
      title: input.title,
      cause_number: input.caseNo || null,
      forum: input.forum || null,
      applicant: input.applicant || null,
      applicant_role: input.applicantRole || 'Claimant',
      respondent: input.respondent || null,
      respondent_role: input.respondentRole || 'Respondent',
      claim_value: input.amount || 0,
      status: 'open',
      fee_note_link: input.feeNoteLink || null,
    }).select('*').single();
    if (!error && data) created = mapMatter(data);
  } catch (e) {}

  const newMatter: ExactMatterRecord = created || {
    id: `m-${Date.now()}`,
    title: input.title || 'Untitled Matter',
    applicant: input.applicant || '',
    applicantRole: input.applicantRole || 'Claimant',
    respondent: input.respondent || '',
    respondentRole: input.respondentRole || 'Respondent',
    forum: input.courtStation || input.forum || 'High Court — Commercial',
    status: input.status || 'Taxation Ready',
    statusClass: input.statusClass || 'ready',
    caseNo: input.ctsCaseNumber || input.caseNo || '',
    matterNumber: input.ctsCaseNumber || input.caseNo || '',
    filedBy: input.filedBy || '',
    amount: input.amount || 0,
    itemsCount: input.itemsCount || 0,
    feeNoteLink: input.feeNoteLink || '',
    documentLink: input.documentLink || '',
    leadAdvocate: input.leadAdvocate || '',
    ctsCaseNumber: input.ctsCaseNumber || input.caseNo || '',
    courtStation: input.courtStation || input.forum || '',
    hearingDate: input.hearingDate,
    courtActionRequired: input.courtActionRequired,
    leadAdvocateEmail: input.leadAdvocateEmail,
  };

  const list = getMatters();
  const filtered = list.filter(m => m.id !== newMatter.id && m.title.toLowerCase() !== newMatter.title.toLowerCase());
  persistMatters([newMatter, ...filtered]);
  return newMatter;
}

export async function updateMatter(firmId: string, matterId: string, input: Partial<ExactMatterRecord>): Promise<ExactMatterRecord> {
  try {
    const { data, error } = await supabase.from('matters').update({
      title: input.title,
      cause_number: input.caseNo,
      forum: input.forum,
      applicant: input.applicant,
      applicant_role: input.applicantRole,
      respondent: input.respondent,
      respondent_role: input.respondentRole,
      claim_value: input.amount,
      fee_note_link: input.feeNoteLink,
    }).eq('firm_id', firmId).eq('id', matterId).select('*').single();
    if (!error && data) {
      const updated = mapMatter(data);
      const list = getMatters().map(m => m.id === matterId ? updated : m);
      persistMatters(list);
      return updated;
    }
  } catch (e) {}

  const list = getMatters();
  const idx = list.findIndex(m => m.id === matterId);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...input };
    persistMatters([...list]);
    return list[idx];
  }
  return input as ExactMatterRecord;
}

export async function deleteMatter(firmId: string, matterId: string): Promise<void> {
  try {
    await supabase.from('matters').delete().eq('firm_id', firmId).eq('id', matterId);
  } catch (e) {}
  const list = getMatters();
  const filtered = list.filter(m => m.id !== matterId);
  persistMatters(filtered);
}

// -----------------------------------------------------------------------------
// SEAMLESS AUTO-SYNC ENGINE: FEE NOTE -> MATTER & CLIENT AUTO-CREATION
// -----------------------------------------------------------------------------
export interface FeeNoteSyncInput {
  billNumber: string;
  clientName?: string;
  claimantName?: string;
  respondentName?: string;
  matterTitle?: string;
  caseNo?: string;
  forumName?: string;
  courtSchedule?: string;
  claimValue?: number;
  instructionFee?: number;
  gettingUpFee?: number;
  grandTotal?: number;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  isDefendant?: boolean;
}

export interface FeeNoteSyncResult {
  clientId: string;
  clientName: string;
  isNewClient: boolean;
  matterId: string;
  matterTitle: string;
  isNewMatter: boolean;
}

export async function syncMatterAndClientFromFeeNote(
  firmId: string,
  input: FeeNoteSyncInput,
  currentUser?: SystemUser | null
): Promise<FeeNoteSyncResult> {
  const currentClients = [...getClients()];
  const currentMatters = [...getMatters()];

  // 1. Resolve & Auto-Create Client
  const rawClient = (input.clientName || input.claimantName || '').trim();
  const clientName = rawClient && rawClient.toLowerCase() !== 'client' ? rawClient : 'Valued Client';

  let client = currentClients.find(c => 
    c.name.trim().toLowerCase() === clientName.toLowerCase() ||
    (c.company && c.company.trim().toLowerCase() === clientName.toLowerCase()) ||
    (input.clientEmail && c.email && c.email.trim().toLowerCase() === input.clientEmail.trim().toLowerCase())
  );

  let isNewClient = false;
  if (!client) {
    isNewClient = true;
    const isCorp = /ltd|limited|plc|llc|corp|corporation|bank|sacco|group|holdings|enterprises|company|co\./i.test(clientName);
    const newClientId = `cli-${Date.now()}`;
    const codeSlug = clientName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'CLI';
    client = {
      id: newClientId,
      name: clientName,
      company: isCorp ? clientName : '',
      category: isCorp ? 'Corporate or Institutional' : 'Individual Client',
      email: input.clientEmail || `${clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.local`,
      phone: input.clientPhone || '+254 700 000 000',
      phonePrimary: input.clientPhone || '+254 700 000 000',
      phoneSecondary: '',
      matters: 1,
      mattersList: [],
      code: `CLI-${codeSlug}-${Date.now().toString().slice(-4)}`,
      kraPin: 'P051000000X',
      contactPerson: clientName,
      activeMattersCount: 1,
      totalBilledAmount: input.grandTotal || 0,
    };
    currentClients.unshift(client);
    persistClients(currentClients);

    try {
      await supabase.from('clients').insert({
        id: client.id,
        firm_id: firmId,
        name: client.name,
        company: client.company || null,
        client_type: isCorp ? 'corporate' : 'individual',
        email: client.email || null,
        phone_primary: client.phonePrimary || null,
        kra_pin: client.kraPin || null,
      });
    } catch (e) {}
  } else {
    client.totalBilledAmount = (client.totalBilledAmount || 0) + (input.grandTotal || 0);
  }

  // 2. Resolve & Auto-Create Matter
  let matterTitle = (input.matterTitle || '').trim();
  if (!matterTitle || matterTitle.toLowerCase() === 'bill of costs') {
    if (input.claimantName && input.respondentName) {
      matterTitle = `${input.claimantName} v ${input.respondentName}`;
    } else if (input.claimantName) {
      matterTitle = `${input.claimantName} — Legal Remuneration Matter`;
    } else {
      matterTitle = `${clientName} Legal Matter`;
    }
  }

  let matter = currentMatters.find(m => 
    m.title.trim().toLowerCase() === matterTitle.toLowerCase() ||
    (input.caseNo && m.caseNo && m.caseNo.trim().toLowerCase() === input.caseNo.trim().toLowerCase())
  );

  let isNewMatter = false;
  if (!matter) {
    isNewMatter = true;
    const newMatterId = `m-${Date.now()}`;
    const generatedCaseNo = input.caseNo?.trim() || `HCCC E${Date.now().toString().slice(-4)}/${new Date().getFullYear()}`;
    matter = {
      id: newMatterId,
      title: matterTitle,
      applicant: input.claimantName || clientName,
      applicantRole: input.isDefendant ? 'Defendant' : 'Claimant',
      respondent: input.respondentName || 'Opposing Party',
      respondentRole: input.isDefendant ? 'Claimant' : 'Respondent',
      forum: input.forumName?.split('\n')[0] || 'High Court — Commercial',
      status: 'Taxation Ready',
      statusClass: 'ready',
      caseNo: generatedCaseNo,
      matterNumber: generatedCaseNo,
      filedBy: `Nyagah B. Kithinji & Co. Advocates — for ${input.isDefendant ? 'Defendants' : 'Claimant'}`,
      amount: Number(input.claimValue || input.grandTotal || 0),
      itemsCount: 1,
      feeNoteLink: input.billNumber,
      documentLink: `${input.billNumber}.pdf`,
      leadAdvocate: currentUser?.fullName || 'Guyo Halake',
    };
    currentMatters.unshift(matter);
    persistMatters(currentMatters);

    try {
      await supabase.from('matters').insert({
        id: matter.id,
        firm_id: firmId,
        title: matter.title,
        cause_number: matter.caseNo,
        forum: matter.forum,
        applicant: matter.applicant,
        applicant_role: matter.applicantRole,
        respondent: matter.respondent,
        respondent_role: matter.respondentRole,
        claim_value: matter.amount,
        status: 'open',
        fee_note_link: input.billNumber,
      });
    } catch (e) {}
  } else {
    matter.feeNoteLink = input.billNumber;
    if ((!matter.amount || matter.amount === 0) && input.claimValue) {
      matter.amount = input.claimValue;
    }
    persistMatters(currentMatters);
  }

  // Ensure client's mattersList contains this matter
  if (!client.mattersList) client.mattersList = [];
  if (!client.mattersList.includes(matter.title)) {
    client.mattersList.unshift(matter.title);
    client.matters = client.mattersList.length;
    client.activeMattersCount = client.mattersList.length;
    persistClients(currentClients);
  }

  return {
    clientId: client.id,
    clientName: client.name,
    isNewClient,
    matterId: matter.id,
    matterTitle: matter.title,
    isNewMatter
  };
}

const mapDocument = (row: any): ExactVaultFileRecord => ({
  id: row.id,
  filename: row.name,
  path: row.storage_path,
  matter: row.matters?.title || row.matter_id || '',
  client: row.matters?.clients?.name || '',
  fileType: row.mime_type || 'application/octet-stream',
  size: `${Math.max(1, Math.round(Number(row.file_size || 0) / 1024))} KB`,
  updatedAt: row.created_at || '',
  extractedMetrics: {
    claimValue: 0,
    instructionFee: 0,
    gettingUpFee: 0,
    itemizedFees: 0,
    arbitratorCosts: 0,
    grandTotal: 0,
  },
  verifiedTruth: true,
});

export async function fetchDocuments(firmId: string): Promise<ExactVaultFileRecord[]> {
  try {
    const { data, error } = await supabase.from('documents').select('*, matters(title, clients(name))').eq('firm_id', firmId).order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map(mapDocument);
    }
  } catch (e) {}
  return EXACT_VAULT_FILES;
}

export async function uploadDocument(firmId: string, userId: string, file: File, matterId?: string): Promise<ExactVaultFileRecord> {
  const documentId = crypto.randomUUID();
  const storagePath = `${firmId}/${documentId}/${file.name}`;
  const { error: uploadError } = await supabase.storage.from('legal-vault').upload(storagePath, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.from('documents').insert({
    id: documentId,
    firm_id: firmId,
    matter_id: matterId || null,
    name: file.name,
    storage_path: storagePath,
    file_size: file.size,
    mime_type: file.type || 'application/octet-stream',
    created_by: userId,
  }).select('*, matters(title, clients(name))').single();
  if (error) {
    await supabase.storage.from('legal-vault').remove([storagePath]);
    throw error;
  }
  return mapDocument(data);
}

export async function createDocumentDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('legal-vault').createSignedUrl(storagePath, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(firmId: string, documentId: string, storagePath: string): Promise<void> {
  const { error: storageError } = await supabase.storage.from('legal-vault').remove([storagePath]);
  if (storageError) throw storageError;
  const { error } = await supabase.from('documents').delete().eq('firm_id', firmId).eq('id', documentId);
  if (error) throw error;
}

export interface FirmMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  text: string;
  channel: 'whatsapp' | 'email' | 'internal';
  createdAt: string;
}

export function getDeletedUserKeys(): Set<string> {
  const deletedKeys = new Set<string>();
  const rawDeleted = typeof window !== 'undefined' ? localStorage.getItem('DELETED_USER_KEYS') : null;
  if (rawDeleted) {
    try {
      JSON.parse(rawDeleted).forEach((k: string) => {
        if (typeof k === 'string' && k.trim()) deletedKeys.add(k.trim().toLowerCase());
      });
    } catch (e) {}
  }
  return deletedKeys;
}

export function isUserRecordDeleted(u: any, deletedKeys: Set<string>): boolean {
  if (!u) return false;
  const id = (u.id || '').trim().toLowerCase();
  const workEmail = (u.workEmail || u.email || '').trim().toLowerCase();
  const personalEmail = (u.personalEmail || '').trim().toLowerCase();
  const username = (u.username || '').trim().toLowerCase();

  return Boolean(
    (id && deletedKeys.has(id)) ||
    (workEmail && deletedKeys.has(workEmail)) ||
    (personalEmail && deletedKeys.has(personalEmail)) ||
    (username && deletedKeys.has(username))
  );
}

export async function fetchFirmUsers(firmId: string = 'firm-001'): Promise<SystemUser[]> {
  const deletedKeys = getDeletedUserKeys();

  // Also sync deleted keys from backend persistent store if accessible
  try {
    const delRes = await fetch('/api/v1/users/deleted-keys');
    if (delRes.ok) {
      const delData = await delRes.json();
      if (Array.isArray(delData?.deleted_keys)) {
        delData.deleted_keys.forEach((k: string) => {
          if (k) deletedKeys.add(k.trim().toLowerCase());
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('DELETED_USER_KEYS', JSON.stringify(Array.from(deletedKeys)));
        }
      }
    }
  } catch (e) {}

  const mergedMap = new Map<string, SystemUser>();
  let databaseFoundUsers = false;

  // 1. Fetch from authoritative backend persistent engine (/api/v1/users)
  try {
    const res = await fetch('/api/v1/users');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.users) && data.users.length > 0) {
        databaseFoundUsers = true;
        data.users.forEach((u: any) => {
          if (isUserRecordDeleted(u, deletedKeys)) return;
          const mapped: SystemUser = {
            id: u.id,
            fullName: u.fullName,
            username: u.username || u.workEmail?.split('@')[0],
            advocateTitle: (u.advocateTitle || u.fullName || '').replace(/^Adv\.?\s*/i, ''),
            lskNo: u.lskNo || '',
            role: u.role || 'Advocate',
            position: u.position || 'Advocate',
            department: u.department || '',
            workEmail: u.workEmail,
            personalEmail: u.personalEmail || u.workEmail,
            phonePrimary: u.phonePrimary || '',
            phoneSecondary: u.phoneSecondary || '',
            avatarUrl: u.avatarUrl || undefined,
            hasAllPermissions: u.hasAllPermissions || u.role === 'Admin' || u.role === 'Developer',
            passwordHash: u.passwordHash || 'Nyagah@2026',
            firmId: u.firmId || firmId
          };
          mergedMap.set(mapped.id, mapped);
        });
      }
    }
  } catch (e) {}

  // 2. Fetch from Supabase users table if accessible
  try {
    const { data, error } = await supabase.from('users').select('*').order('full_name');
    if (!error && data && data.length > 0) {
      databaseFoundUsers = true;
      data.forEach((row: any) => {
        if (isUserRecordDeleted(row, deletedKeys)) return;
        const existing = mergedMap.get(row.id) || Array.from(mergedMap.values()).find(u => u.workEmail?.toLowerCase() === (row.email || '').toLowerCase());
        const dbUser: SystemUser = {
          id: row.id,
          authUserId: row.auth_user_id || undefined,
          firmId: row.firm_id || firmId,
          fullName: row.full_name,
          username: row.username || (row.email || '').split('@')[0],
          advocateTitle: (row.full_name || '').replace(/^Adv\.?\s*/i, ''),
          lskNo: row.lsk_no || '',
          role: row.role === 'admin' ? 'Admin' : row.role === 'developer' ? 'Developer' : 'Advocate',
          position: row.position || row.role,
          workEmail: row.email,
          personalEmail: row.email,
          phonePrimary: row.phone_primary || '',
          phoneSecondary: row.phone_secondary || '',
          hasAllPermissions: row.role === 'admin' || row.role === 'developer',
          passwordHash: existing?.passwordHash || row.password_hash || '',
          avatarUrl: row.avatar_url || undefined,
        };
        mergedMap.set(dbUser.id, dbUser);
      });
    }
  } catch (e) {}

  // 3. Fallback only if database is completely offline/empty AND localStorage is empty
  if (!databaseFoundUsers) {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('EXACT_USERS') : null;
    let localUsers: SystemUser[] = stored ? JSON.parse(stored) : [];
    const obsoleteIds = new Set(['usr-faith-chebet', 'usr-brian-omondi', 'usr-mercy-wanjiku', 'usr-kevin-mutua', 'usr-karani-admin']);
    localUsers = localUsers.filter(u => !obsoleteIds.has(u.id) && !isUserRecordDeleted(u, deletedKeys));

    if (localUsers.length === 0) {
      SEEDED_USERS.forEach(su => {
        if (!isUserRecordDeleted(su, deletedKeys)) {
          localUsers.push(su);
        }
      });
    }

    localUsers.forEach(u => mergedMap.set(u.id, u));
  }

  // Synchronize cleaned-up deletedKeys back to storage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('DELETED_USER_KEYS', JSON.stringify(Array.from(deletedKeys)));
    } catch (e) {}
  }

  // Return all active persistent users and save cache
  const result = Array.from(mergedMap.values());
  try {
    localStorage.setItem('EXACT_USERS', JSON.stringify(result));
  } catch (e) {}
  return result;
}

export async function createFirmUser(firmId: string, user: Partial<SystemUser>): Promise<SystemUser> {
  const newId = `usr-${Date.now()}`;
  const assignedPassword = user.passwordHash?.trim() || 'Nyagah@2026';
  const assignedUsername = user.username?.trim().replace(/^@/, '') || (user.workEmail || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');

  const newUser: SystemUser = {
    id: newId,
    firmId,
    fullName: user.fullName || 'Advocate Staff',
    username: assignedUsername,
    advocateTitle: (user.advocateTitle || user.fullName || 'Staff').replace(/^Adv\.?\s*/i, ''),
    lskNo: user.lskNo || '',
    role: user.role || 'Advocate',
    position: user.position || 'Advocate',
    workEmail: user.workEmail || '',
    personalEmail: user.personalEmail || user.workEmail || '',
    phonePrimary: user.phonePrimary || '',
    phoneSecondary: user.phoneSecondary || '',
    hasAllPermissions: user.role === 'Admin' || user.role === 'Developer',
    passwordHash: assignedPassword,
  };

  // Immediate local cache update and deletion unblock
  try {
    const deletedKeys = getDeletedUserKeys();
    [newUser.id, newUser.workEmail, newUser.personalEmail, newUser.username].forEach(k => {
      if (k) deletedKeys.delete(k.trim().toLowerCase());
    });
    localStorage.setItem('DELETED_USER_KEYS', JSON.stringify(Array.from(deletedKeys)));
  } catch (e) {}

  saveUserProfile(newUser);

  // 1. Persist to backend API
  try {
    const res = await fetch('/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newUser.id,
        fullName: newUser.fullName,
        username: newUser.username,
        advocateTitle: newUser.advocateTitle,
        lskNo: newUser.lskNo,
        role: newUser.role,
        position: newUser.position,
        workEmail: newUser.workEmail,
        personalEmail: newUser.personalEmail,
        phonePrimary: newUser.phonePrimary,
        phoneSecondary: newUser.phoneSecondary,
        passwordHash: assignedPassword,
        hasAllPermissions: newUser.hasAllPermissions,
        firmId
      }),
    });
    if (res.ok) {
      const resp = await res.json();
      if (resp?.user?.id) {
        newUser.id = resp.user.id;
        saveUserProfile(newUser);
      }
    }
  } catch (backendErr) {
    console.warn('Backend user registration notice:', backendErr);
  }

  // 2. Also attempt Supabase insert
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firmId);
    const record: Record<string, any> = {
      full_name: newUser.fullName,
      email: newUser.workEmail,
      phone_primary: newUser.phonePrimary,
      phone_secondary: newUser.phoneSecondary,
      position: newUser.position,
      role: newUser.role.toLowerCase(),
      lsk_no: newUser.lskNo,
      is_active: true,
    };
    if (isUuid) {
      record.firm_id = firmId;
    }
    await supabase.from('users').insert([record]);
  } catch (e) {}

  try {
    window.dispatchEvent(new CustomEvent('databaseRealtimeUpdate', { detail: { table: 'users' } }));
    window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: newUser }));
  } catch (e) {}

  return newUser;
}

export async function updateFirmUser(firmId: string, user: SystemUser): Promise<SystemUser> {
  // 1. Persist directly to backend database
  try {
    const res = await fetch('/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) {
      console.warn('Backend returned non-200 on user update:', res.status);
    }
  } catch (e) {
    console.warn('Backend update failed:', e);
  }

  // 2. Persist to Supabase if the table row exists or matches UUID
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    if (isUuid) {
      await supabase.from('users').upsert({
        id: user.id,
        full_name: user.fullName,
        email: user.workEmail,
        position: user.position,
        role: user.role.toLowerCase(),
        lsk_no: user.lskNo,
      }, { onConflict: 'id' });
    }
  } catch (e) {}

  // 3. Save to local storage and broadcast updates across all components
  saveUserProfile(user);
  window.dispatchEvent(new CustomEvent('databaseRealtimeUpdate', { detail: { table: 'users', user } }));
  window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: user }));
  return user;
}

export async function deleteFirmUser(
  firmId: string,
  userIdOrUser: string | SystemUser,
  userEmail?: string,
  userObj?: SystemUser
): Promise<void> {
  const keysToPurge = new Set<string>();

  const processObject = (u?: Partial<SystemUser>) => {
    if (!u) return;
    if (u.id) keysToPurge.add(u.id.trim().toLowerCase());
    if (u.workEmail) keysToPurge.add(u.workEmail.trim().toLowerCase());
    if (u.personalEmail) keysToPurge.add(u.personalEmail.trim().toLowerCase());
    if (u.username) keysToPurge.add(u.username.trim().toLowerCase());
    if (u.fullName) keysToPurge.add(u.fullName.trim().toLowerCase());
  };

  if (typeof userIdOrUser === 'string') {
    if (userIdOrUser.trim()) keysToPurge.add(userIdOrUser.trim().toLowerCase());
  } else if (userIdOrUser) {
    processObject(userIdOrUser);
  }
  if (userEmail && userEmail.trim()) keysToPurge.add(userEmail.trim().toLowerCase());
  if (userObj) processObject(userObj);

  // 1. Record deleted keys in localStorage
  try {
    const deletedKeys = getDeletedUserKeys();
    keysToPurge.forEach(k => deletedKeys.add(k));
    localStorage.setItem('DELETED_USER_KEYS', JSON.stringify(Array.from(deletedKeys)));
  } catch (e) {}

  // 2. Dispatch purge to backend persistent API
  try {
    await fetch('/api/v1/users/purge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: typeof userIdOrUser === 'string' ? userIdOrUser : userIdOrUser?.id,
        email: userEmail || (typeof userIdOrUser !== 'string' ? userIdOrUser?.workEmail : undefined),
        personalEmail: userObj?.personalEmail || (typeof userIdOrUser !== 'string' ? userIdOrUser?.personalEmail : undefined),
        username: userObj?.username || (typeof userIdOrUser !== 'string' ? userIdOrUser?.username : undefined),
        fullName: userObj?.fullName || (typeof userIdOrUser !== 'string' ? userIdOrUser?.fullName : undefined),
        keys: Array.from(keysToPurge)
      })
    });
  } catch (e) {}

  // 3. Direct DELETE on backend
  for (const k of Array.from(keysToPurge)) {
    try {
      await fetch(`/api/v1/users/${encodeURIComponent(k)}`, { method: 'DELETE' });
    } catch (e) {}
  }

  // 4. Delete from Supabase
  try {
    for (const k of Array.from(keysToPurge)) {
      await supabase.from('users').delete().eq('id', k);
      if (k.includes('@')) {
        await supabase.from('users').delete().ilike('email', k);
      }
    }
  } catch (e) {}

  // 5. Update localStorage EXACT_USERS immediately
  try {
    const deletedKeys = getDeletedUserKeys();
    const stored = localStorage.getItem('EXACT_USERS');
    if (stored) {
      const list: SystemUser[] = JSON.parse(stored);
      const updated = list.filter(u => !isUserRecordDeleted(u, deletedKeys));
      localStorage.setItem('EXACT_USERS', JSON.stringify(updated));
    }
  } catch (e) {}

  try {
    window.dispatchEvent(new CustomEvent('databaseRealtimeUpdate', { detail: { table: 'users' } }));
  } catch (e) {}
}

export async function purgeStaleTestUsers(firmId: string = 'firm-001'): Promise<number> {
  const stalePatterns = ['guyoh@gmailcom', 'razakwako45', '@gmailcom', 'guyoh gmailcom', 'razakwako45 gmail om'];
  let count = 0;
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('EXACT_USERS') : null;
    if (stored) {
      const list: SystemUser[] = JSON.parse(stored);
      for (const u of list) {
        const mail = (u.workEmail || '').toLowerCase();
        const pmail = (u.personalEmail || '').toLowerCase();
        const name = (u.fullName || '').toLowerCase();
        if (stalePatterns.some(p => mail.includes(p) || pmail.includes(p) || name.includes(p))) {
          await deleteFirmUser(firmId, u.id, u.workEmail, u);
          count++;
        }
      }
    }
  } catch (e) {}
  return count;
}

export async function fetchMessages(firmId: string, userId: string, recipientId: string): Promise<FirmMessage[]> {
  try {
    const { data, error } = await supabase.from('messages').select('*').eq('firm_id', firmId)
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        senderId: row.sender_id,
        senderName: row.sender_name,
        recipientId: row.recipient_id,
        recipientName: row.recipient_name,
        text: row.message_text,
        channel: row.channel || 'internal',
        createdAt: row.created_at,
      }));
    }
  } catch (e) {}
  return EXACT_MESSAGES.map(m => ({
    id: m.id,
    senderId: m.senderName,
    senderName: m.senderName,
    recipientId: m.recipientName,
    recipientName: m.recipientName,
    text: m.text,
    channel: m.channel,
    createdAt: m.timestamp,
  }));
}

export async function sendMessage(firmId: string, sender: SystemUser, recipientId: string, recipientName: string, text: string): Promise<FirmMessage> {
  const { data, error } = await supabase.from('messages').insert({
    firm_id: firmId,
    sender_id: sender.id,
    sender_name: sender.fullName,
    recipient_id: recipientId,
    recipient_name: recipientName,
    channel: 'internal',
    message_type: 'internal',
    message_text: text,
  }).select('*').single();
  if (error) throw error;
  return {
    id: data.id,
    senderId: data.sender_id,
    senderName: data.sender_name,
    recipientId: data.recipient_id,
    recipientName: data.recipient_name,
    text: data.message_text,
    channel: data.channel,
    createdAt: data.created_at,
  };
}

export async function createImportedFeeNote(
  firmId: string,
  userId: string,
  metadata: { matterTitle: string; clientName: string; claimantName?: string; respondentName?: string; judgeName?: string; forumName?: string; courtSchedule?: string },
  totalAmount: number,
  items: Array<{ description?: string; claimedAmount?: number }>,
  excelData?: any[]
) {
  const billNumber = `BOC-IMPORT-${Date.now().toString().slice(-8)}`;
  let recordId = `fn-imp-${Date.now()}`;

  try {
    const { data, error } = await supabase.from('fee_notes').insert({
      firm_id: firmId,
      bill_number: billNumber,
      matter_title: metadata.matterTitle,
      client_name: metadata.claimantName || metadata.clientName,
      court_schedule: metadata.courtSchedule || 'Schedule 6 — High Court / Arbitration',
      grand_total: totalAmount,
      status: 'processed',
      generated_by_user_id: userId,
      generated_by_user: metadata.claimantName || metadata.clientName || 'Advocate',
    }).select('*').single();

    if (!error && data) {
      recordId = data.id;
      if (items.length > 0) {
        try {
          await supabase.from('fee_note_items').insert(items.map((item, index) => ({
            fee_note_id: data.id,
            item_number: index + 1,
            description: item.description || `Imported item ${index + 1}`,
            claimed_amount: item.claimedAmount || 0,
          })));
        } catch (itemErr) {
          console.warn('fee_note_items error:', itemErr);
        }
      }
    }
  } catch (e) {
    console.warn('Supabase remote fee_notes insert notice:', e);
  }

  // Auto-sync client & matter for imported fee note
  let linkedMatterId = 'm1';
  let linkedMatterTitle = metadata.matterTitle;
  let linkedClientName = metadata.claimantName || metadata.clientName || 'Client';
  try {
    const syncRes = await syncMatterAndClientFromFeeNote(firmId, {
      billNumber,
      matterTitle: metadata.matterTitle,
      clientName: metadata.claimantName || metadata.clientName,
      claimantName: metadata.claimantName,
      respondentName: metadata.respondentName,
      forumName: metadata.forumName,
      courtSchedule: metadata.courtSchedule,
      grandTotal: totalAmount,
    });
    linkedMatterId = syncRes.matterId;
    linkedMatterTitle = syncRes.matterTitle;
    linkedClientName = syncRes.clientName;
  } catch (e) {}

  // Commit to local storage ledger immediately
  const newNote: ExactFeeNoteRecord = {
    id: recordId,
    billNumber,
    matterId: linkedMatterId,
    matterTitle: linkedMatterTitle,
    clientName: linkedClientName,
    claimantName: metadata.claimantName,
    respondentName: metadata.respondentName,
    judgeName: metadata.judgeName,
    forumName: metadata.forumName,
    courtSchedule: metadata.courtSchedule || 'Schedule 6 — High Court / Arbitration',
    claimValue: 0,
    instructionFee: totalAmount * 0.7,
    gettingUpFee: totalAmount * 0.1,
    grandTotal: totalAmount,
    status: 'processed',
    generatedByUser: metadata.claimantName || metadata.clientName || 'Advocate',
    generatedByUserId: userId,
    createdAt: new Date().toISOString(),
    pdfUrl: '',
    excelUrl: '',
    excelData
  };

  const existing = getFeeNotes();
  persistFeeNotes([newNote, ...existing.filter(n => n.billNumber !== billNumber && n.id !== recordId)]);
  return newNote;
}

export async function fetchCollectedAmount(firmId: string): Promise<number> {
  const { data, error } = await supabase.from('payments').select('amount').eq('firm_id', firmId).eq('status', 'confirmed');
  if (error) throw error;
  return (data || []).reduce((total: number, payment: any) => total + Number(payment.amount || 0), 0);
}

export interface PermissionItem {
  id: string;
  name: string;
  role: string;
  email: string;
  canCreateFeeNotes: boolean;
  clientVisibility: 'all' | 'assigned';
  canExportData: boolean;
  canDeleteMatter: boolean;
  lastChanged?: string;
}

export async function fetchPermissionItems(firmId: string): Promise<PermissionItem[]> {
  const users = await fetchFirmUsers(firmId);
  let overrides: any[] = [];
  let assignments: any[] = [];
  let templatePermissions: any[] = [];

  try {
    const [overridesResult, assignmentsResult, templatePermissionsResult] = await Promise.all([
      supabase.from('user_permission_overrides').select('*'),
      supabase.from('user_role_assignments').select('*'),
      supabase.from('role_template_permissions').select('*'),
    ]);
    if (!overridesResult.error && overridesResult.data) overrides = overridesResult.data;
    if (!assignmentsResult.error && assignmentsResult.data) assignments = assignmentsResult.data;
    if (!templatePermissionsResult.error && templatePermissionsResult.data) templatePermissions = templatePermissionsResult.data;
  } catch (e) {}

  const granted = (userId: string, code: string) => {
    const override = overrides.find((item: any) => item.user_id === userId && item.permission_code === code);
    if (override) return override.effect === 'grant';
    return assignments.some((assignment: any) => assignment.user_id === userId && templatePermissions.some((permission: any) => permission.role_template_id === assignment.role_template_id && permission.permission_code === code));
  };
  const visibility = (userId: string) => {
    const override = overrides.find((item: any) => item.user_id === userId && item.permission_code === 'client.view');
    return override?.scope === 'assigned' ? 'assigned' : 'all';
  };
  return users.map(user => ({
    id: user.id,
    name: user.advocateTitle || user.fullName,
    role: user.position || user.role,
    email: user.workEmail,
    canCreateFeeNotes: user.hasAllPermissions || user.role === 'Admin' || user.role === 'Developer' || granted(user.id, 'fee_note.create'),
    clientVisibility: (user.hasAllPermissions ? 'all' : visibility(user.id)) as 'all' | 'assigned',
    canExportData: user.hasAllPermissions || user.role === 'Admin' || user.role === 'Developer' || granted(user.id, 'fee_note.export'),
    canDeleteMatter: user.hasAllPermissions || user.role === 'Admin' || user.role === 'Developer' || granted(user.id, 'matter.delete'),
  }));
}

export async function savePermissionOverride(firmId: string, targetUserId: string, actorUserId: string, permissionCode: string, effect: 'grant' | 'deny', scope = 'firm') {
  try {
    await supabase.from('user_permission_overrides').upsert({ user_id: targetUserId, permission_code: permissionCode, effect, scope, changed_by: actorUserId }, { onConflict: 'user_id,permission_code' });
    await supabase.from('permission_audit_logs').insert({ firm_id: firmId, target_user_id: targetUserId, actor_user_id: actorUserId, permission_code: permissionCode, action: `${effect}:${scope}` });
  } catch (e) {}
}

export async function assignRoleTemplate(firmId: string, targetUserId: string, actorUserId: string, templateName: string) {
  try {
    const codeMap: Record<string, string> = { 'Senior Partner': 'managing_partner', Associate: 'associate', 'Junior / Intern': 'legal_assistant' };
    const code = codeMap[templateName] || templateName.toLowerCase().replace(/\s+/g, '_');
    const { data: template } = await supabase.from('role_templates').select('id').eq('code', code).or(`firm_id.is.null,firm_id.eq.${firmId}`).limit(1).single();
    if (template?.id) {
      await supabase.from('user_role_assignments').upsert({ user_id: targetUserId, role_template_id: template.id, assigned_by: actorUserId }, { onConflict: 'user_id,role_template_id' });
    }
  } catch (e) {}
}

export async function fetchMatterRelatedData(firmId: string, matterId: string) {
  try {
    const [matterResult, feeNotesResult, documentsResult] = await Promise.all([
      supabase.from('matters').select('client_id').eq('firm_id', firmId).eq('id', matterId).single(),
      supabase.from('fee_notes').select('*').eq('firm_id', firmId).eq('matter_id', matterId).order('created_at', { ascending: false }),
      supabase.from('documents').select('*, matters(title, clients(name))').eq('firm_id', firmId).eq('matter_id', matterId).order('created_at', { ascending: false }),
    ]);

    const clientResult = matterResult.data?.client_id
      ? await supabase.from('clients').select('*').eq('firm_id', firmId).eq('id', matterResult.data.client_id).maybeSingle()
      : { data: null, error: null };

    if (!matterResult.error && (feeNotesResult.data?.length || documentsResult.data?.length || clientResult.data)) {
      return {
        client: clientResult.data ? mapClient(clientResult.data) : null,
        feeNotes: feeNotesResult.data || [],
        documents: documentsResult.data || [],
      };
    }
  } catch (e) {}

  const fallbackMatter = EXACT_MATTERS.find(m => m.id === matterId);
  const fallbackClient = EXACT_CLIENTS.find(c => fallbackMatter && c.name.toLowerCase().includes(fallbackMatter.applicant.toLowerCase().slice(0, 5))) || EXACT_CLIENTS[0];
  const fallbackFeeNotes = getFeeNotes().filter(fn => fn.matterId === matterId);
  const fallbackDocuments = EXACT_VAULT_FILES.filter(v => v.id === matterId || v.matter.toLowerCase().includes(matterId.toLowerCase()));

  return {
    client: fallbackClient || null,
    feeNotes: fallbackFeeNotes,
    documents: fallbackDocuments,
  };
}

// ============================================================================
// CLIENT PORTAL (PASSWORDLESS MAGIC LINK) SERVICES
// ============================================================================
export interface ClientPortalTokenRecord {
  token: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  expiresAt: number; // timestamp ms
  createdAt: number;
}

export function generateClientPortalToken(client: ExactClientRecord): { token: string; url: string } {
  const token = `cpt_${client.id.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days validity

  const record: ClientPortalTokenRecord = {
    token,
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email,
    expiresAt,
    createdAt: Date.now(),
  };

  try {
    const existingStr = localStorage.getItem('CLIENT_PORTAL_TOKENS');
    const existing: ClientPortalTokenRecord[] = existingStr ? JSON.parse(existingStr) : [];
    const filtered = existing.filter(r => r.clientId !== client.id && r.expiresAt > Date.now());
    filtered.push(record);
    localStorage.setItem('CLIENT_PORTAL_TOKENS', JSON.stringify(filtered));
  } catch (e) {}

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nyagahkithinji-advocates.azurewebsites.net';
  const url = `${origin}/?portal_token=${token}&client_id=${client.id}`;
  return { token, url };
}

export function verifyClientPortalToken(clientId: string, token: string): boolean {
  if (!clientId || !token) return false;
  // Standard format check
  if (token.startsWith('cpt_') && token.includes(clientId.replace(/[^a-zA-Z0-9]/g, ''))) {
    return true;
  }
  try {
    const existingStr = localStorage.getItem('CLIENT_PORTAL_TOKENS');
    if (!existingStr) return false;
    const existing: ClientPortalTokenRecord[] = JSON.parse(existingStr);
    const matched = existing.find(r => r.clientId === clientId && r.token === token && r.expiresAt > Date.now());
    return !!matched;
  } catch (e) {
    return false;
  }
}
