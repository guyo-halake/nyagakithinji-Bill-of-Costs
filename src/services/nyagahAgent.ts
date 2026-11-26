/**
 * Nyagah Agent Client Service Bridge
 * Connects the Karani & Nyaga Law frontend directly to the n8n Nyagah Agent Webhook
 * and the authoritative Kenyan statutory ARO Knowledge Base.
 */
import { fetchFeeNotesFromDatabase } from './supabase';
import { fetchClients, fetchMatters } from './data';

export interface AroAuditResult {
  status: 'success' | 'failed';
  agent: string;
  action: string;
  timestamp: string;
  checks_completed: number;
  statutory_schedule: string;
  claim_value: number;
  findings: string[];
  suggested_corrections: Array<{ action: string; note: string }>;
  advocate_note: string;
}

export interface PaymentPromptResult {
  status: 'success' | 'failed';
  agent: string;
  action: string;
  timestamp: string;
  stk_dispatched: boolean;
  stk_payload: {
    phone_number: string;
    amount: number;
    order_id: string;
    tenant_id: string;
    reference: string;
  };
  notifications: {
    whatsapp: { recipient: string; message?: string; dispatched: boolean };
    email: { recipient: string; subject?: string; dispatched: boolean };
  };
}

export interface DocketAlertResult {
  status: 'success' | 'failed';
  agent: string;
  action: string;
  cause_number: string;
  hearing_date: string;
  advocate_alerts: {
    sms_whatsapp: { recipient: string; dispatched: boolean; content?: string };
    email: { recipient: string; subject?: string; dispatched: boolean };
  };
}

export interface ConflictAuditResult {
  status: 'success' | 'failed';
  agent: string;
  party_audited: string;
  conflict_detected: boolean;
  conflicting_entity: string | null;
  verdict: string;
}

export interface AgentTaskItem {
  id: string;
  task: string;
  status: 'completed' | 'in_progress' | 'awaiting_pin' | 'synced' | 'cleared';
  target: string;
  time: string;
}

export interface AgentChatMessage {
  message: string;
  sessionId: string;
  userId: string;
  userName: string;
  firmId?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ExecutiveBriefResult {
  status: 'success';
  agent: string;
  timestamp: string;
  executive_summary: {
    date: string;
    target_partners: string[];
    metrics: {
      unbilled_wip_kes: number;
      active_litigation_causes: number;
      pending_settlements_count: number;
      courts_in_session: string[];
    };
    agent_tasks: AgentTaskItem[];
  };
}

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL?.trim() || '';

export const isNyagahAgentConfigured = Boolean(N8N_WEBHOOK_URL);

async function callNyagahAgent<T>(payload: Record<string, unknown>): Promise<T> {
  if (!N8N_WEBHOOK_URL) {
    throw new Error('The legal workflow service is not configured.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`The legal workflow service returned HTTP ${response.status}.`);
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The legal workflow service did not respond in time.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 1. ARO Remuneration & Taxation Engine
 */
export async function auditFeeNoteWithNyagahAgent(feeNote: {
  schedule?: string;
  claim_value?: number;
  claimValue?: number;
  items?: Array<{ description: string; amount: number; category?: string }>;
}): Promise<AroAuditResult> {
  const claimValue = Number(feeNote.claim_value ?? feeNote.claimValue ?? 0);
  const items = Array.isArray(feeNote.items) ? feeNote.items : [];
  const findings: string[] = [];

  if (items.length === 0) {
    findings.push('No bill line items were supplied for review.');
  }
  if (items.some(item => !item.description?.trim())) {
    findings.push('One or more line items have no description.');
  }
  if (items.some(item => !Number.isFinite(Number(item.amount)) || Number(item.amount) < 0)) {
    findings.push('One or more line items have an invalid or negative amount.');
  }
  if (!items.some(item => item.description.toLowerCase().includes('instruction'))) {
    findings.push('Check whether this bill needs an instruction-fee item for the selected work and schedule.');
  }

  return {
    status: 'success',
    agent: 'Basic bill checklist',
    action: 'audit_feenote',
    timestamp: new Date().toISOString(),
    checks_completed: 4,
    statutory_schedule: feeNote.schedule || 'Not specified',
    claim_value: claimValue,
    findings,
    suggested_corrections: [],
    advocate_note: 'This automated checklist does not determine statutory compliance. An advocate must check the bill against the current law and case record.',
  };
}

/**
 * 2. Money & Invoicing Workflow: Trigger Daraja M-Pesa STK push & notifications
 */
export async function triggerClientPaymentStk(params: {
  bill_number: string;
  client_phone: string;
  client_email?: string;
  client_name?: string;
  amount: number;
}): Promise<PaymentPromptResult> {
  const response = await fetch('/api/v1/payments/mpesa/stkpush', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: params.client_phone,
      amount: params.amount,
      billNumber: params.bill_number,
      clientName: params.client_name,
      accountRef: params.bill_number.replace(/[^A-Za-z0-9]/g, '').slice(-10),
      destinationAccount: 'office',
    }),
  });
  const data = await response.json();
  if (!response.ok || !data?.success || !data?.checkoutRequestId) {
    throw new Error(data?.detail || 'The payment service could not start the M-Pesa request.');
  }

  const phone = params.client_phone.replace(/\D/g, '');
  return {
    status: 'success',
    agent: 'M-Pesa payment service',
    action: 'trigger_payment_prompt',
    timestamp: new Date().toISOString(),
    stk_dispatched: true,
    stk_payload: {
      phone_number: phone,
      amount: params.amount,
      order_id: params.bill_number,
      tenant_id: '',
      reference: data.checkoutRequestId,
    },
    notifications: {
      whatsapp: { recipient: '', dispatched: false },
      email: { recipient: '', dispatched: false },
    },
  };
}

/**
 * 3. CTS & Docket Sentinel: Cause list mention alerts
 */
export async function dispatchCourtHearingAlert(params: {
  cause_number: string;
  court_station: string;
  advocate_name: string;
  advocate_phone?: string;
  advocate_email?: string;
  hearing_date?: string;
  virtual_link?: string;
}): Promise<DocketAlertResult> {
  return callNyagahAgent<DocketAlertResult>({ action: 'court_mention_alert', ...params });
}

/**
 * 4. Vault Conflict Auditor
 */
export async function runConflictAudit(params: {
  party_name: string;
  existing_clients?: string[];
}): Promise<ConflictAuditResult> {
  if (!params.party_name.trim()) {
    throw new Error('Enter the party name to check.');
  }
  if (!params.existing_clients || params.existing_clients.length === 0) {
    throw new Error('A current firm client list is required. No conflict conclusion was made.');
  }

  const party = params.party_name.toLowerCase().trim();
  const existing = params.existing_clients;
  const matchingClient = existing.find(client => {
    const normalizedClient = client.toLowerCase().trim();
    return normalizedClient && (party.includes(normalizedClient) || normalizedClient.includes(party));
  });
  return {
    status: 'success',
    agent: 'Local client-name comparison (not a complete conflict check)',
    party_audited: params.party_name,
    conflict_detected: Boolean(matchingClient),
    conflicting_entity: matchingClient || null,
    verdict: matchingClient
      ? 'Possible name match found in the supplied client list. Review before onboarding.'
      : 'No name match in the supplied list. This does not rule out a conflict.',
  };
}

/**
 * 5. Managing Partner Copilot & Dashboard Agent Queue
 */
export async function fetchExecutiveBrief(): Promise<ExecutiveBriefResult> {
  return callNyagahAgent<ExecutiveBriefResult>({ action: 'executive_brief' });
}

export async function sendNyagahChatMessage(input: AgentChatMessage): Promise<string> {
  if (!input.firmId) {
    throw new Error('Your firm account could not be verified. Sign out and sign in again.');
  }

  const [matters, clients, feeNotes] = await Promise.all([
    fetchMatters(input.firmId),
    fetchClients(input.firmId),
    fetchFeeNotesFromDatabase(input.firmId),
  ]);
  const history = (input.history || [])
    .filter(turn => turn.content.trim())
    .slice(-20)
    .map(turn => ({ role: turn.role, content: turn.content.slice(0, 4000) }));

  const result = await callNyagahAgent<unknown>({
    action: 'chat',
    message: input.message,
    chatInput: input.message,
    sessionId: input.sessionId,
    history,
    context: {
      date: new Intl.DateTimeFormat('en-KE', {
        dateStyle: 'full',
        timeZone: 'Africa/Nairobi',
      }).format(new Date()),
      matters: matters.map(matter => ({
        title: matter.title,
        caseNumber: matter.caseNo,
        parties: [matter.applicant, matter.respondent].filter(Boolean),
        court: matter.courtStation || matter.forum,
        status: matter.status,
        hearingDate: matter.hearingDate,
        actionRequired: matter.courtActionRequired,
        claimValueKes: matter.amount,
      })),
      clients: clients.map(client => ({
        name: client.name,
        company: client.company,
        category: client.category,
      })),
      feeNotes: feeNotes.map(note => ({
        billNumber: note.billNumber,
        matter: note.matterTitle,
        client: note.clientName,
        status: note.status,
        totalKes: note.grandTotal,
        paidKes: note.paidAmount || 0,
        createdAt: note.createdAt,
      })),
    },
    user: {
      id: input.userId,
      name: input.userName,
      firm_id: input.firmId,
    },
  });

  const payload = Array.isArray(result) ? result[0] : result;
  if (typeof payload === 'string' && payload.trim()) return payload.trim();
  if (payload && typeof payload === 'object') {
    const body = payload as Record<string, unknown>;
    const reply = body.reply ?? body.message ?? body.output ?? body.text ?? body.response;
    if (typeof reply === 'string' && reply.trim()) return reply.trim();
  }

  throw new Error('The AI service returned a reply in a format this chat cannot read.');
}
