import { getClients, getMatters, ExactClientRecord, ExactMatterRecord } from './supabase';

export type ConflictSeverity = 'CLEAR' | 'WARNING' | 'CRITICAL';

export type ConflictType =
  | 'EXISTING_CLIENT'
  | 'ADVERSE_PARTY'
  | 'PRIOR_REPRESENTATION'
  | 'DIRECTOR_OVERLAP';

export interface ConflictCheckResult {
  hasConflict: boolean;
  severity: ConflictSeverity;
  queryName: string;
  matchedEntity: string;
  conflictType?: ConflictType;
  matterId?: string;
  matterTitle?: string;
  caseNo?: string;
  clientName?: string;
  clientId?: string;
  alertMessage: string;
  details: string[];
}

/**
 * Normalizes corporate or party names for high-precision entity resolution.
 * Strips jurisdiction tags, legal entity suffixes, and punctuation.
 */
export function normalizeEntityName(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '') // remove parentheticals like (K), (Kenya)
    .replace(/&/g, 'and')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\b(limited|ltd|co|company|group|corporation|corp|incorporated|inc|llc|plc|trust|holdings|enterprises|kenya|africa)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fast entity similarity and token overlap checker.
 */
function isEntityMatch(target: string, candidate: string): boolean {
  const normTarget = normalizeEntityName(target);
  const normCandidate = normalizeEntityName(candidate);

  if (!normTarget || !normCandidate) return false;
  if (normTarget === normCandidate) return true;

  // Substring containment for distinctive names >= 4 characters
  if (normTarget.length >= 4 && normCandidate.length >= 4) {
    if (normCandidate.includes(normTarget) || normTarget.includes(normCandidate)) {
      return true;
    }
  }

  // Token-level overlap for multi-word company names (e.g., "Greenhills Investment")
  const targetTokens = normTarget.split(' ').filter(t => t.length > 2);
  const candTokens = normCandidate.split(' ').filter(t => t.length > 2);

  if (targetTokens.length >= 2 && candTokens.length >= 2) {
    const intersection = targetTokens.filter(t => candTokens.includes(t));
    if (intersection.length >= 2) return true;
  }

  return false;
}

/**
 * Executes an authoritative, multi-vector conflict of interest verification
 * against all active and historical clients, named respondents, plaintiffs, and directors.
 */
export function checkConflictOfInterest(
  queryName: string,
  options?: {
    currentMatterId?: string;
    currentClientId?: string;
    roleBeingAssigned?: 'Client' | 'Respondent' | 'Applicant';
  }
): ConflictCheckResult {
  const cleanInput = (queryName || '').trim();
  if (!cleanInput || cleanInput.length < 3) {
    return {
      hasConflict: false,
      severity: 'CLEAR',
      queryName: cleanInput,
      matchedEntity: '',
      alertMessage: 'No party name provided for verification.',
      details: [],
    };
  }

  const allClients: ExactClientRecord[] = getClients();
  const allMatters: ExactMatterRecord[] = getMatters();

  // 1. Vector A: Check against all past and current registered clients
  for (const client of allClients) {
    if (options?.currentClientId && client.id === options.currentClientId) continue;

    if (isEntityMatch(cleanInput, client.name) || (client.company && isEntityMatch(cleanInput, client.company))) {
      const isAdverseRole = options?.roleBeingAssigned === 'Respondent';
      const severity: ConflictSeverity = isAdverseRole ? 'CRITICAL' : 'WARNING';
      const alertMsg = isAdverseRole
        ? `CRITICAL CONFLICT OF INTEREST: "${client.name}" is an active retained client of Nyagah B. Kithinji & Co. (Client ID #${client.code || client.id}). Under Advocates Practice Rules, the firm is legally barred from representing an adverse party against an active client without prior informed written consent.`
        : `CLIENT RECORD MATCH: "${client.name}" is already registered in the firm's client roster (Client ID #${client.code || client.id}) with ${client.matters || 0} existing matter(s).`;

      return {
        hasConflict: true,
        severity,
        queryName: cleanInput,
        matchedEntity: client.name,
        conflictType: 'EXISTING_CLIENT',
        clientId: client.id,
        clientName: client.name,
        alertMessage: alertMsg,
        details: [
          `Client Registered: ${client.name}`,
          `Company Group: ${client.company || 'N/A'}`,
          `Category: ${client.category || 'Corporate'}`,
          `Contact: ${client.email || client.phone || 'N/A'}`,
        ],
      };
    }

    // Check named contact person / director
    if (client.contactPerson && isEntityMatch(cleanInput, client.contactPerson)) {
      return {
        hasConflict: true,
        severity: 'WARNING',
        queryName: cleanInput,
        matchedEntity: client.contactPerson,
        conflictType: 'DIRECTOR_OVERLAP',
        clientId: client.id,
        clientName: client.name,
        alertMessage: `DIRECTOR OVERLAP: "${cleanInput}" matches the registered Principal Officer / Contact Person for client "${client.name}". Verify fiduciary relationship before proceeding.`,
        details: [`Entity: ${client.name}`, `Officer: ${client.contactPerson}`],
      };
    }
  }

  // 2. Vector B: Check against all named Respondents / Defendants across all matters
  for (const matter of allMatters) {
    if (options?.currentMatterId && matter.id === options.currentMatterId) continue;

    if (matter.respondent && isEntityMatch(cleanInput, matter.respondent)) {
      return {
        hasConflict: true,
        severity: 'CRITICAL',
        queryName: cleanInput,
        matchedEntity: matter.respondent,
        conflictType: 'ADVERSE_PARTY',
        matterId: matter.id,
        matterTitle: matter.title,
        caseNo: matter.ctsCaseNumber || matter.caseNo,
        alertMessage: `WARNING: "${matter.respondent}" was named as the adverse Respondent in Matter "${matter.title}" (Case #${matter.ctsCaseNumber || matter.caseNo || matter.id}). Verify opposing representation history before accepting instructions.`,
        details: [
          `Adverse Matter: ${matter.title}`,
          `CTS Case No: ${matter.ctsCaseNumber || matter.caseNo || 'Pending'}`,
          `Court Station: ${matter.courtStation || matter.forum || 'N/A'}`,
          `Lead Advocate: ${matter.leadAdvocate || 'Unassigned'}`,
        ],
      };
    }
  }

  // 3. Vector C: Check against all Claimants / Plaintiffs previously represented
  for (const matter of allMatters) {
    if (options?.currentMatterId && matter.id === options.currentMatterId) continue;

    if (matter.applicant && isEntityMatch(cleanInput, matter.applicant)) {
      return {
        hasConflict: true,
        severity: 'WARNING',
        queryName: cleanInput,
        matchedEntity: matter.applicant,
        conflictType: 'PRIOR_REPRESENTATION',
        matterId: matter.id,
        matterTitle: matter.title,
        caseNo: matter.ctsCaseNumber || matter.caseNo,
        alertMessage: `PRIOR REPRESENTATION: "${matter.applicant}" was represented by this firm as Claimant/Plaintiff in Matter "${matter.title}" (Case #${matter.ctsCaseNumber || matter.caseNo || matter.id}).`,
        details: [
          `Matter Title: ${matter.title}`,
          `CTS Case No: ${matter.ctsCaseNumber || matter.caseNo || 'N/A'}`,
          `Court Station: ${matter.courtStation || matter.forum || 'N/A'}`,
        ],
      };
    }
  }

  return {
    hasConflict: false,
    severity: 'CLEAR',
    queryName: cleanInput,
    matchedEntity: '',
    alertMessage: `CLEAR: No conflict of interest detected for "${cleanInput}". The entity does not appear as an adverse party, past client, or conflicting litigant in firm records.`,
    details: ['Verified against 100% of firm clients and litigation matter dockets.'],
  };
}
