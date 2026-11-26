import { createClient } from '@supabase/supabase-js';

const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const configuredSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured = Boolean(
  configuredSupabaseUrl &&
  configuredSupabaseAnonKey &&
  !configuredSupabaseUrl.includes('your-project-id') &&
  !configuredSupabaseAnonKey.includes('your-anon-key')
);

export const SUPABASE_URL = configuredSupabaseUrl || 'https://missing-supabase-config.invalid';
export const SUPABASE_ANON_KEY = configuredSupabaseAnonKey || 'missing-supabase-anon-key';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface SystemRole {
  id: string;
  name: string;
  code: 'Admin' | 'Developer' | 'Advocate';
  hasAllPermissions: boolean;
  description: string;
}

export const DB_SYSTEM_ROLES: SystemRole[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    code: 'Admin',
    hasAllPermissions: true,
    description: 'Full system administrative access, billing approvals, user role management & taxation master rights.'
  },
  {
    id: 'role-developer',
    name: 'Developer',
    code: 'Developer',
    hasAllPermissions: true,
    description: 'Full developer access, database migrations, Supabase storage bucket configurations & API integrations.'
  },
  {
    id: 'role-advocate',
    name: 'Advocates / Lawyers / Custom',
    code: 'Advocate',
    hasAllPermissions: false,
    description: 'Legal practice role for preparing bills of costs, client correspondence & matter filings.'
  }
];

export interface SystemUser {
  id: string;
  authUserId?: string;
  firmId?: string;
  fullName: string;
  username?: string;
  lastSignInAt?: string;
  advocateTitle: string;
  lskNo: string;
  role: 'Admin' | 'Developer' | 'Advocate';
  position: string;
  workEmail: string;
  personalEmail: string;
  phonePrimary: string;
  phoneSecondary: string;
  hasAllPermissions: boolean;
  passwordHash: string;
  avatarUrl?: string;
  barAdmissionNumber?: string;
  department?: string;
}

export const saveUserProfile = (user: SystemUser) => {
  try {
    const storedSession = localStorage.getItem('BILLSZIP_SESSION');
    if (storedSession) {
      const current = JSON.parse(storedSession);
      if (current && (current.id === user.id || current.workEmail === user.workEmail)) {
        localStorage.setItem('BILLSZIP_SESSION', JSON.stringify(user));
      }
    }
    const stored = localStorage.getItem('EXACT_USERS');
    let list: SystemUser[] = stored ? JSON.parse(stored) : [...SEEDED_USERS];
    const idx = list.findIndex(u => u.id === user.id || u.workEmail?.toLowerCase() === user.workEmail?.toLowerCase());
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...user };
    } else {
      list.push(user);
    }
    localStorage.setItem('EXACT_USERS', JSON.stringify(list));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: user }));
};

// SEEDED USERS IN DATABASE (Authoritative Firm Roster)
export const SEEDED_USERS: SystemUser[] = [];

export const EXACT_FIRM_INFO = {
  name: "Nyagah B. Kithinji & Co. Advocates",
  firmRegNo: "P.105/1992",
  managingPartner: "Nyagah B. Kithinji",
  managingPartnerLsk: "P.105/1992",
  managingPartnerEmail: "info@nbkco-advocates.com",
  managingPartnerPhone: "+254 722 000 111",
  address: "Suite 4B, Mbaruk Road, Off Muchai Drive, Golf Course Estate",
  fullLocation: "Mbaruk Road, Off Muchai Drive, Golf Course Estate, Upper Hill, Nairobi, Kenya",
  poBox: "P.O. Box 1992-00100, Nairobi, Kenya",
  email: "info@nbkco-advocates.com",
  companyEmail: "info@nbkco-advocates.com",
  taxationEmail: "taxation@nbkco-advocates.com",
  billingEmail: "billing@nbkco-advocates.com",
  phone: "+254 (0)20 271 8890 / +254 722 000 111",
  companyPhone: "+254 (0)20 271 8890 / +254 722 000 111",
  kraPin: "P051123456Z",
  bankDetails: "KCB Bank Kenya Ltd | Kilimani Branch | A/C No: 1104889922 | Swift: KCBLKENX",
  website: "www.kithinjilegal.co.ke",
  logoUrl: "/logo.png",
  user: {
    name: "Guyo Halake",
    role: "Admin",
    lskNo: "ADMIN/2026/001",
    email: "guyohalakeofficial@gmail.com"
  }
};


export interface FirmProfile {
  id?: string;
  name: string;
  title: string;
  firmRegNo: string;
  lskRegNo?: string;
  managingPartner: string;
  managingPartnerLsk?: string;
  managingPartnerEmail?: string;
  managingPartnerPhone?: string;
  address: string;
  fullLocation?: string;
  poBox: string;
  email: string;
  serviceEmail?: string;
  taxationEmail?: string;
  billingEmail?: string;
  phone: string;
  kraPin: string;
  vatNumber?: string;
  bankDetails: string;
  officeBankName?: string;
  officeBranch?: string;
  officeAccountNo?: string;
  officeSwift?: string;
  clientTrustBankName?: string;
  clientTrustBranch?: string;
  clientTrustAccountNo?: string;
  clientTrustSwift?: string;
  mpesaPaybill?: string;
  mpesaAccountRef?: string;
  website?: string;
  logoUrl?: string;
  stampUrl?: string;
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  swiftCode?: string;
}

/**
 * Returns dynamic, active firm profile details.
 * Prioritizes user's custom settings (configured via Settings -> Firm Profile)
 * and falls back gracefully to defaults.
 */
export const getActiveFirmProfile = (): FirmProfile => {
  try {
    const saved = localStorage.getItem('BILLSZIP_FIRM_SETTINGS');
    const stampUrl = localStorage.getItem('karani_firm_stamp_url') || '/stamp.png';
    if (saved) {
      const p = JSON.parse(saved);
      const name = p.topbarTitle || p.name || EXACT_FIRM_INFO.name;
      const bankName = p.officeBankName || p.bankName || 'KCB Bank Kenya Ltd';
      const bankBranch = p.officeBranch || p.bankBranch || 'Kilimani Branch';
      const bankAccount = p.officeAccountNo || p.bankAccount || '1104889922';
      const swiftCode = p.officeSwift || p.swiftCode || 'KCBLKENX';
      const officeBank = `${bankName} | ${bankBranch} | A/C: ${bankAccount} | Swift: ${swiftCode}`;

      return {
        id: p.id || name,
        name,
        title: p.topbarSubtitle || p.title || (EXACT_FIRM_INFO as any).title || 'Advocates of the High Court of Kenya',
        firmRegNo: p.lskRegNo || p.firmRegNo || (EXACT_FIRM_INFO as any).firmRegNo || 'P.105/1992',
        lskRegNo: p.lskRegNo || p.firmRegNo || (EXACT_FIRM_INFO as any).firmRegNo || 'P.105/1992',
        managingPartner: p.managingPartner || (EXACT_FIRM_INFO as any).managingPartner || 'Managing Partner',
        managingPartnerLsk: p.lskRegNo || p.managingPartnerLsk || (EXACT_FIRM_INFO as any).managingPartnerLsk || 'P.105/1992',
        managingPartnerEmail: p.email || EXACT_FIRM_INFO.email,
        managingPartnerPhone: p.phone || EXACT_FIRM_INFO.phone,
        address: p.address || EXACT_FIRM_INFO.address,
        fullLocation: p.fullLocation || p.address || EXACT_FIRM_INFO.fullLocation,
        poBox: p.poBox || EXACT_FIRM_INFO.poBox,
        email: p.email || EXACT_FIRM_INFO.email,
        serviceEmail: p.serviceEmail || p.email || (EXACT_FIRM_INFO as any).serviceEmail || 'service@nbkco-advocates.com',
        taxationEmail: p.taxationEmail || p.email || EXACT_FIRM_INFO.taxationEmail,
        billingEmail: p.billingEmail || p.email || EXACT_FIRM_INFO.billingEmail,
        phone: p.phone || EXACT_FIRM_INFO.phone,
        kraPin: p.kraPin || EXACT_FIRM_INFO.kraPin,
        vatNumber: p.vatNumber || (EXACT_FIRM_INFO as any).vatNumber || 'VAT-0192834-K',
        bankDetails: p.bankDetails || officeBank,
        officeBankName: bankName,
        officeBranch: bankBranch,
        officeAccountNo: bankAccount,
        officeSwift: swiftCode,
        clientTrustBankName: p.clientTrustBankName || 'Standard Chartered Bank',
        clientTrustBranch: p.clientTrustBranch || 'Kenyatta Avenue',
        clientTrustAccountNo: p.clientTrustAccountNo || '010203040506',
        clientTrustSwift: p.clientTrustSwift || 'SCBLKENX',
        mpesaPaybill: p.mpesaPaybill || '522522',
        mpesaAccountRef: p.mpesaAccountRef || 'LEGAL-FEES',
        website: p.website || EXACT_FIRM_INFO.website,
        logoUrl: p.logoUrl || EXACT_FIRM_INFO.logoUrl || '/logo.png',
        stampUrl: p.stampUrl || stampUrl,
        bankName,
        bankAccount,
        bankBranch,
        swiftCode,
      };
    }
  } catch (e) {}

  const defaultStamp = typeof localStorage !== 'undefined' ? localStorage.getItem('karani_firm_stamp_url') || '/stamp.png' : '/stamp.png';
  return {
    ...(EXACT_FIRM_INFO as any),
    title: (EXACT_FIRM_INFO as any).title || 'Advocates of the High Court of Kenya',
    lskRegNo: (EXACT_FIRM_INFO as any).firmRegNo || 'P.105/1992',
    bankName: 'KCB Bank Kenya Ltd',
    bankBranch: 'Kilimani Branch',
    bankAccount: '1104889922',
    swiftCode: 'KCBLKENX',
    officeBankName: 'KCB Bank Kenya Ltd',
    officeBranch: 'Kilimani Branch',
    officeAccountNo: '1104889922',
    officeSwift: 'KCBLKENX',
    clientTrustBankName: 'Standard Chartered Bank',
    clientTrustBranch: 'Kenyatta Avenue',
    clientTrustAccountNo: '010203040506',
    clientTrustSwift: 'SCBLKENX',
    mpesaPaybill: '522522',
    mpesaAccountRef: 'LEGAL-FEES',
    stampUrl: defaultStamp,
  };
};

export const EXACT_LOGGED_IN_USER = SEEDED_USERS[0];

// 1. CLIENTS DATABASE SCHEMA & INTERFACE
export interface ExactClientRecord {
  id: string;
  name: string;
  company: string;
  category: string;
  email: string;
  phone: string;
  phonePrimary: string;
  phoneSecondary: string;
  matters: number;
  mattersList: string[];
  code?: string;
  kraPin?: string;
  contactPerson?: string;
  activeMattersCount?: number;
  totalBilledAmount?: number;
  primaryFeeNoteNo?: string;
  primaryMatterTitle?: string;
  totalBilled?: number;
}

export const EXACT_CLIENTS: ExactClientRecord[] = [];

// 2. MATTERS DATABASE SCHEMA & INTERFACE
export interface ExactMatterRecord {
  id: string;
  title: string;
  applicant: string;
  applicantRole: string;
  respondent: string;
  respondentRole: string;
  forum: string;
  status: string;
  statusClass: 'ready' | 'court' | 'pending' | 'closed';
  caseNo: string;
  filedBy: string;
  amount: number;
  itemsCount: number;
  feeNoteLink: string;
  documentLink: string;
  nextHearingDate?: string;
  matterNumber?: string;
  leadAdvocate?: string;
  // Kenya Judiciary E-Filing & Cause List Tracker fields:
  ctsCaseNumber?: string;
  courtStation?: string;
  hearingDate?: string; // ISO datetime string (e.g. "2026-10-29T09:30")
  courtActionRequired?: string; // e.g. "File Submissions by Friday", "Ruling Delivery"
  leadAdvocateEmail?: string;
}

export const EXACT_MATTERS: ExactMatterRecord[] = [];

// 3. FEE NOTES DATABASE SCHEMA & INTERFACE (Processed & Drafts)
export interface ExactFeeNoteRecord {
  id: string;
  billNumber: string;
  matterId: string;
  matterTitle: string;
  clientName: string;
  courtSchedule: string;
  claimValue: number;
  instructionFee: number;
  gettingUpFee: number;
  grandTotal: number;
  status: 'processed' | 'draft' | 'paid' | 'settled' | 'partially_paid';
  paidAmount?: number;
  paymentReference?: string;
  paymentMethod?: string;
  paymentDate?: string;
  generatedByUser: string;
  generatedByUserId: string;
  createdAt: string;
  pdfUrl: string;
  excelUrl: string;
  excelData?: any[];
  claimantName?: string;
  respondentName?: string;
  judgeName?: string;
  forumName?: string;
  approvalStatus?: 'pending' | 'approved' | 'returned';
  returnNotes?: string;
}

const INITIAL_FEE_NOTES: ExactFeeNoteRecord[] = [];

export let EXACT_FEE_NOTES: ExactFeeNoteRecord[] = [];

export const getFeeNotes = (): ExactFeeNoteRecord[] => {
  try {
    const saved = localStorage.getItem('EXACT_FEE_NOTES');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        EXACT_FEE_NOTES = parsed;
        return parsed;
      }
    }
  } catch (e) {}
  return EXACT_FEE_NOTES;
};

EXACT_FEE_NOTES = getFeeNotes();

export const persistFeeNotes = (notes: ExactFeeNoteRecord[], skipRealtimeEvent?: boolean) => {
  EXACT_FEE_NOTES = [...notes];
  try {
    localStorage.setItem('EXACT_FEE_NOTES', JSON.stringify(notes));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('feeNotesUpdated', { detail: notes }));
  if (!skipRealtimeEvent) {
    window.dispatchEvent(new CustomEvent('databaseRealtimeUpdate', { detail: { table: 'fee_notes' } }));
  }
};

export const saveFeeNotes = () => {
  try {
    localStorage.setItem('EXACT_FEE_NOTES', JSON.stringify(EXACT_FEE_NOTES));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('feeNotesUpdated', { detail: EXACT_FEE_NOTES }));
};

const isUuid = (value?: string | null): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const requireFeeNoteFirmId = (firmId: string): string => {
  if (!isUuid(firmId)) {
    throw new Error('Your firm account could not be verified. Sign out and sign in again.');
  }
  return firmId;
};

export const saveFeeNoteToDatabase = async (
  note: ExactFeeNoteRecord,
  firmId: string
): Promise<{ success: boolean; note: ExactFeeNoteRecord }> => {
  const activeFirmId = requireFeeNoteFirmId(firmId);
  const payload = {
    firm_id: activeFirmId,
    bill_number: note.billNumber,
    bill_type: (note as any).documentType === 'fee_note' ? 'fee_note' : 'bill_of_costs',
    matter_id: note.matterId || null,
    matter_title: note.matterTitle || null,
    client_name: note.clientName || null,
    court_schedule: note.courtSchedule || null,
    claim_value: Number(note.claimValue || 0),
    instruction_fee: Number(note.instructionFee || 0),
    getting_up_fee: Number(note.gettingUpFee || 0),
    grand_total: Number(note.grandTotal || 0),
    status: note.status || 'processed',
    generated_by_user: note.generatedByUser || null,
    generated_by_user_id: note.generatedByUserId || null,
    pdf_url: note.pdfUrl || null,
    excel_url: note.excelUrl || null,
    updated_at: new Date().toISOString(),
  };

  const request = isUuid(note.id)
    ? supabase.from('fee_notes').update(payload).eq('firm_id', activeFirmId).eq('id', note.id)
    : supabase.from('fee_notes').insert(payload);
  const { data, error } = await request.select('*').single();
  if (error) throw error;
  if (!data) throw new Error('The fee note was not returned after saving. Please refresh and check before retrying.');

  return { success: true, note: { ...note, id: data.id } };
};

export const deleteFeeNoteFromDatabase = async (firmId: string, noteId: string): Promise<boolean> => {
  const activeFirmId = requireFeeNoteFirmId(firmId);
  const { data: byId, error: idError } = await supabase
    .from('fee_notes')
    .delete()
    .eq('firm_id', activeFirmId)
    .eq('id', noteId)
    .select('id')
    .maybeSingle();
  if (idError) throw idError;
  if (byId) return true;

  const { data: byNumber, error: numberError } = await supabase
    .from('fee_notes')
    .delete()
    .eq('firm_id', activeFirmId)
    .eq('bill_number', noteId)
    .select('id')
    .maybeSingle();
  if (numberError) throw numberError;
  if (!byNumber) throw new Error('This fee note was not found or you do not have permission to delete it.');
  return true;
};

export const uploadPdfToVault = async (docRef: string, pdfBlob: Blob): Promise<string> => {
  const filePath = `fee-notes/${docRef}.pdf`;
  try {
    const { data, error } = await supabase.storage.from('documents').upload(filePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (!error && data) {
      const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (e) {
    console.warn('Supabase storage upload notice:', e);
  }
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
  return `${origin}/?tab=verify&ref=${encodeURIComponent(docRef)}`;
};

// -------------------------------------------------------------
// CLIENTS & MATTERS PERSISTENCE LEDGERS
// -------------------------------------------------------------
export const getClients = (): ExactClientRecord[] => {
  try {
    const saved = localStorage.getItem('EXACT_CLIENTS');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {}
  return [];
};

export const persistClients = (clients: ExactClientRecord[], skipRealtimeEvent = false) => {
  EXACT_CLIENTS.length = 0;
  EXACT_CLIENTS.push(...clients);
  try {
    localStorage.setItem('EXACT_CLIENTS', JSON.stringify(clients));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('clientsUpdated', { detail: clients }));
  if (!skipRealtimeEvent) {
    window.dispatchEvent(new CustomEvent('databaseRealtimeUpdate', { detail: { table: 'clients' } }));
  }
};

export const getMatters = (): ExactMatterRecord[] => {
  try {
    const saved = localStorage.getItem('EXACT_MATTERS');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {}
  return [];
};

export const persistMatters = (matters: ExactMatterRecord[], skipRealtimeEvent = false) => {
  EXACT_MATTERS.length = 0;
  EXACT_MATTERS.push(...matters);
  try {
    localStorage.setItem('EXACT_MATTERS', JSON.stringify(matters));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('mattersUpdated', { detail: matters }));
  if (!skipRealtimeEvent) {
    window.dispatchEvent(new CustomEvent('databaseRealtimeUpdate', { detail: { table: 'matters' } }));
  }
};

export const fetchFeeNotesFromDatabase = async (firmId: string): Promise<ExactFeeNoteRecord[]> => {
  const activeFirmId = requireFeeNoteFirmId(firmId);
  const { data, error } = await supabase
    .from('fee_notes')
    .select('*')
    .eq('firm_id', activeFirmId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const records: ExactFeeNoteRecord[] = (data || []).map((row: any) => ({
    id: row.id,
    billNumber: row.bill_number,
    matterId: row.matter_id || '',
    matterTitle: row.matter_title || '',
    clientName: row.client_name || '',
    courtSchedule: row.court_schedule || '',
    claimValue: Number(row.claim_value || 0),
    instructionFee: Number(row.instruction_fee || 0),
    gettingUpFee: Number(row.getting_up_fee || 0),
    grandTotal: Number(row.grand_total || 0),
    status: row.status === 'processed' || row.status === 'issued' ? 'processed' : 'draft',
    approvalStatus: row.status === 'issued' ? 'approved' : row.status === 'draft' ? 'pending' : undefined,
    generatedByUser: row.generated_by_user || '',
    generatedByUserId: row.generated_by_user_id || '',
    createdAt: row.created_at || '',
    pdfUrl: row.pdf_url || '',
    excelUrl: row.excel_url || '',
    excelData: row.excel_data || undefined
  }));
  persistFeeNotes(records, true);
  return records;
};

export const updateFeeNoteStatus = async (firmId: string, noteId: string, status: ExactFeeNoteRecord['status']) => {
  const activeFirmId = requireFeeNoteFirmId(firmId);
  const { error } = await supabase.from('fee_notes').update({ status }).eq('firm_id', activeFirmId).eq('id', noteId);
  if (error) throw error;
};

export const deleteFeeNote = async (firmId: string, noteId: string) => {
  const activeFirmId = requireFeeNoteFirmId(firmId);
  const { error } = await supabase.from('fee_notes').delete().eq('firm_id', activeFirmId).eq('id', noteId);
  if (error) throw error;
};

// 4. MESSAGES DATABASE SCHEMA & INTERFACE (WhatsApp, Email & Internal)
export interface ExactMessageRecord {
  id: string;
  senderName: string;
  recipientName: string;
  channel: 'whatsapp' | 'email' | 'internal';
  type: 'client' | 'internal';
  text: string;
  attachmentName?: string;
  attachmentUrl?: string;
  timestamp: string;
}

export const EXACT_MESSAGES: ExactMessageRecord[] = [];

// 5. ACTIVITY LOGS / RECENTS DATABASE SCHEMA & INTERFACE
export interface ExactRecentActivityRecord {
  id: string;
  userId: string;
  userName: string;
  type: 'login' | 'bill_created' | 'message_sent' | 'file_uploaded' | 'reminder';
  title: string;
  details: string;
  timestamp: string;
}

export const EXACT_RECENTS_LOGS: ExactRecentActivityRecord[] = [];

export interface ExactVaultFileRecord {
  id: string;
  filename: string;
  fileName?: string;
  name?: string;
  path: string;
  matter: string;
  matterId?: string;
  matterTitle?: string;
  client: string;
  fileType: string;
  size: string;
  fileSize?: string;
  updatedAt: string;
  uploadedAt?: string;
  uploadedBy?: string;
  category?: string;
  version?: string;
  status?: string;
  isClientVisible?: boolean;
  downloadUrl?: string;
  extractedMetrics: {
    claimValue: number;
    instructionFee: number;
    gettingUpFee: number;
    itemizedFees: number;
    arbitratorCosts: number;
    grandTotal: number;
  };
  verifiedTruth: boolean;
}

export const EXACT_VAULT_FILES: ExactVaultFileRecord[] = [];

export const getVaultFiles = (): ExactVaultFileRecord[] => {
  try {
    const saved = localStorage.getItem('EXACT_VAULT_FILES');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {}
  return [];
};

export const persistVaultFiles = (files: ExactVaultFileRecord[], skipRealtimeEvent = false) => {
  EXACT_VAULT_FILES.length = 0;
  EXACT_VAULT_FILES.push(...files);
  try {
    localStorage.setItem('EXACT_VAULT_FILES', JSON.stringify(files));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('documentsUpdated', { detail: files }));
  if (!skipRealtimeEvent) {
    window.dispatchEvent(new CustomEvent('databaseRealtimeUpdate', { detail: { table: 'documents' } }));
  }
};

// =============================================================================
// 6. IT SUPPORT DESK & TICKET SYSTEM SCHEMA & PERSISTENCE
// =============================================================================
export interface ITTicketMessage {
  id: string;
  senderName: string;
  senderRole: 'advocate' | 'support_engineer' | 'system';
  text: string;
  timestamp: string;
}

export interface ITSupportTicket {
  id: string;
  ticketNumber: string;
  title: string;
  category: 'remuneration' | 'documents' | 'database' | 'permissions' | 'connectivity' | 'general';
  priority: 'p1_court_critical' | 'p2_high' | 'p3_medium' | 'p4_low';
  status: 'open' | 'in_progress' | 'pending_user' | 'resolved';
  creatorName: string;
  creatorEmail: string;
  firmId: string;
  createdAt: string;
  updatedAt: string;
  diagnosticsAttached?: boolean;
  diagnosticSummary?: string;
  messages: ITTicketMessage[];
}

export const INITIAL_SUPPORT_TICKETS: ITSupportTicket[] = [];

export const getSupportTickets = (): ITSupportTicket[] => {
  try {
    const saved = localStorage.getItem('P3L_SUPPORT_TICKETS');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  return INITIAL_SUPPORT_TICKETS;
};

export const persistSupportTickets = (tickets: ITSupportTicket[]) => {
  try {
    localStorage.setItem('P3L_SUPPORT_TICKETS', JSON.stringify(tickets));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('supportTicketsUpdated', { detail: tickets }));
};
