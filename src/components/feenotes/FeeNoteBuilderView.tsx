import React, { useState, useEffect } from 'react';
import { 
  Scale, Plus, Trash2, Printer, FileText, X, Check, 
  MessageCircle, Mail, Save, Download, Share2, Send, 
  ChevronRight, ChevronLeft, ChevronDown, CheckCircle2, AlertCircle, 
  ArrowRight, ArrowLeft, Sparkles, Edit3, Eye, Calendar,
  Building, User, FileCheck, DollarSign, Receipt, Briefcase, Landmark,
  Stamp, PenTool, FileSpreadsheet, Upload, RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchMatters, fetchClients, syncMatterAndClientFromFeeNote } from '../../services/data';
import { sendEmail } from '../../services/email';
import { ExactMatterRecord, ExactClientRecord, getClients, getMatters } from '../../services/supabase';
import { calculateLegalBill, BillCalculationResult } from '../../services/api';
import { 
  EXACT_FIRM_INFO, 
  getActiveFirmProfile, 
  EXACT_FEE_NOTES, 
  supabase, 
  ExactFeeNoteRecord, 
  SystemUser, 
  persistFeeNotes, 
  getFeeNotes,
  saveFeeNoteToDatabase,
  uploadPdfToVault
} from '../../services/supabase';
import { hasPermission } from '../../services/rbac';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateDocumentSecurityPayload, DocumentSecurityRecord } from '../../services/documentSecurity';

const STATUTORY_SCHEDULES = [
  { id: 'schedule_1_conveyancing', label: 'Schedule 1 — Conveyancing: Sales, Purchases, Mortgages & Charges', category: 'Conveyancing' },
  { id: 'schedule_2_leases', label: 'Schedule 2 — Leases & Tenancies at a Rack Rent', category: 'Leases' },
  { id: 'schedule_3_companies', label: 'Schedule 3 — Formation & Incorporation of Companies', category: 'Commercial' },
  { id: 'schedule_4_ip', label: 'Schedule 4 — Trade Marks (L.N. 35/2014)', category: 'Intellectual Property' },
  { id: 'schedule_5_chattels', label: 'Schedule 5 — General Advisory & Chattels Transfer', category: 'General & Securities' },
  { id: 'schedule_6_high_court', label: 'Schedule 6 — High Court & Commercial Litigation (L.N. 35/2014)', category: 'Litigation' },
  { id: 'schedule_7_magistrate', label: 'Schedule 7 — Subordinate & Magistrates Courts (L.N. 45/2014)', category: 'Litigation' },
  { id: 'schedule_8_bprt', label: 'Schedule 8 — Business Premises Rent Tribunal (Cap. 301 - BPRT)', category: 'Tribunals' },
  { id: 'schedule_9_rrt', label: 'Schedule 9 — Rent Restriction Tribunal (Cap. 296 - RRT)', category: 'Tribunals' },
  { id: 'schedule_10_probate', label: 'Schedule 10 — Probate & Estate Administration', category: 'Succession' },
  { id: 'schedule_11_tribunals', label: 'Schedule 11 — Special Tribunals (TAT, Co-operative, Energy)', category: 'Tribunals' },
  { id: 'schedule_12_patents', label: 'Schedule 12 — Patents, Utility Models & Designs (KIPI)', category: 'Intellectual Property' },
  { id: 'schedule_8_court_of_appeal', label: 'Appellate — Court of Appeal Civil & Criminal Appeals', category: 'Appeals' },
  { id: 'schedule_9_supreme_court', label: 'Appellate — Supreme Court Petitions & References', category: 'Appeals' },
];

const normalizeScheduleKey = (val?: string): string => {
  if (!val) return '';
  const v = val.toLowerCase();
  if (v.includes('supreme')) return 'schedule_9_supreme_court';
  if (v.includes('appeal')) return 'schedule_8_court_of_appeal';
  if (v.includes('12') || v.includes('patent')) return 'schedule_12_patents';
  if (v.includes('11') || v.includes('tribunals_other')) return 'schedule_11_tribunals';
  if (v.includes('10') || v.includes('probate') || v.includes('succession')) return 'schedule_10_probate';
  if (v.includes('9') || v.includes('rrt') || v.includes('rent_restrict')) return 'schedule_9_rrt';
  if (v.includes('8') || v.includes('bprt') || v.includes('landlord')) return 'schedule_8_bprt';
  if (v.includes('7') || v.includes('subordinate') || v.includes('magistrate')) return 'schedule_7_magistrate';
  if (v.includes('5') || v.includes('chattel')) return 'schedule_5_chattels';
  if (v.includes('4') || v.includes('trademark')) return 'schedule_4_ip';
  if (v.includes('3') || v.includes('compan') || v.includes('incorporation')) return 'schedule_3_companies';
  if (v.includes('2') || v.includes('lease')) return 'schedule_2_leases';
  if (v.includes('1') || v.includes('sale') || v.includes('conveyanc') || v.includes('mortgage') || v.includes('charge')) return 'schedule_1_conveyancing';
  return '';
};

interface FeeNoteBuilderViewProps {
  initialNote?: ExactFeeNoteRecord | null;
  isPreview?: boolean;
  onNavigateToTab?: (tab: string) => void;
  currentUser?: SystemUser | null;
}

export const FeeNoteBuilderView: React.FC<FeeNoteBuilderViewProps> = ({
  initialNote,
  isPreview,
  onNavigateToTab,
  currentUser,
}) => {
  const [activeFirm, setActiveFirm] = useState<FirmProfile>(() => getActiveFirmProfile());

  useEffect(() => {
    const handleFirmChange = () => {
      const updated = getActiveFirmProfile();
      setActiveFirm(updated);
      setBankDetailsText(updated.bankDetails || `${updated.bankName || 'KCB Bank Kenya Ltd'} | ${updated.bankBranch || 'Kilimani Branch'} | A/C No: ${updated.bankAccount || '1104889922'} | Swift: ${updated.swiftCode || 'KCBLKENX'}`);
      if (updated.stampUrl) {
        setStampImageUrl(updated.stampUrl);
      }
    };
    window.addEventListener('firmSettingsChanged', handleFirmChange);
    return () => window.removeEventListener('firmSettingsChanged', handleFirmChange);
  }, []);
  // Stepper Stage State (1: Parties/Client, 2: Tariff & Scale, 3: Folios & Disbursements, 4: Endorsement/Remittance)
  const [activeStep, setActiveStep] = useState<number>(() => isPreview ? 4 : 1);

  // Document Classification
  const [docType, setDocType] = useState<string>(() => {
    return (initialNote as any)?.documentType || 'fee_note';
  });

  // Matter & Court Info
  const [forumName, setForumName] = useState(() => {
    const raw = initialNote?.forumName || 'REPUBLIC OF KENYA\nIN THE HIGH COURT OF KENYA';
    return raw.replace(/\\n/g, '\n');
  });
  const [matterTitle, setMatterTitle] = useState(initialNote?.matterTitle || '');
  const [claimantName, setClaimantName] = useState(initialNote?.claimantName || initialNote?.clientName || '');
  const [respondentName, setRespondentName] = useState(initialNote?.respondentName || '');
  const [judgeName, setJudgeName] = useState(initialNote?.judgeName || '');
  const [clientName, setClientName] = useState(initialNote?.clientName || '');

  // Fee Note Specific Details (Client Billing)
  const [clientAddress, setClientAddress] = useState(
    'Riverside Green Suites, 4th Floor\nP.O. Box 72892-00200\nNairobi, Kenya'
  );
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isEmailing, setIsEmailing] = useState(false);
  const [isWhatsAppSending, setIsWhatsAppSending] = useState(false);
  const [bankDetailsText, setBankDetailsText] = useState(
    activeFirm.bankDetails || 'KCB Bank Kenya Ltd | Kilimani Branch | A/C No: 1104889922 | Swift: KCBLKENX'
  );
  const [paymentTermsText, setPaymentTermsText] = useState(
    'Payment is due upon presentation within 30 days.\nDirect EFT / RTGS or Cheque payable to ${activeFirm.name}.'
  );
  const [signatoryName, setSignatoryName] = useState(
    currentUser?.fullName || EXACT_FIRM_INFO.user.name || 'Guyo Halake'
  );
  const [isLinkedCourtMatter, setIsLinkedCourtMatter] = useState(false);

  // Live Database Records (Matters & Clients)
  const [availableMatters, setAvailableMatters] = useState<ExactMatterRecord[]>([]);
  const [availableClients, setAvailableClients] = useState<ExactClientRecord[]>([]);
  const [selectedMatterId, setSelectedMatterId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // References & Dates
  const [documentRef, setDocumentRef] = useState(() => {
    if (initialNote?.billNumber) return initialNote.billNumber;
    const yr = new Date().getFullYear().toString().slice(-2);
    const mo = String(new Date().getMonth() + 1).padStart(2, '0');
    const docNum = String(EXACT_FEE_NOTES.length + 1).padStart(3, '0');
    return `BOC${yr}${mo}${docNum}`;
  });
  const [dateBilled, setDateBilled] = useState(new Date().toISOString().split('T')[0]);

  // Scale Parameters
  const [courtSchedule, setCourtSchedule] = useState<string>(() => {
    if (initialNote?.courtSchedule) return normalizeScheduleKey(initialNote.courtSchedule);
    return '';
  });
  const [claimValue, setClaimValue] = useState<number | ''>(initialNote?.claimValue || '');
  const [applyVat, setApplyVat] = useState<boolean>(true);
  const [isDefendant, setIsDefendant] = useState(false);
  const [includeGettingUp, setIncludeGettingUp] = useState<boolean>(() => !!(initialNote?.gettingUpFee && initialNote.gettingUpFee > 0));

  // Manual / Agreed Fee Override (Section 45 Advocates Act)
  const [isCustomInstruction, setIsCustomInstruction] = useState<boolean>(() => !!(initialNote?.instructionFee));
  const [customInstructionFee, setCustomInstructionFee] = useState<number | ''>(() => initialNote?.instructionFee || '');
  const [caseDisposition, setCaseDisposition] = useState<'full_trial' | 'summary_determination' | 'early_settlement' | 'undefended'>('full_trial');

  // Line Items & Disbursements
  const [items, setItems] = useState<Array<{ description: string; unitRate: number; citation?: string }>>(() => {
    if (initialNote?.excelData && Array.isArray(initialNote.excelData) && initialNote.excelData.length > 0) {
      return initialNote.excelData.map((d: any) => ({
        description: d.description || d.Particulars || 'Drawing and Filing Notice of Motion Application',
        unitRate: Number(d.unitRate || d.Amount || d.Fee || 4500),
        citation: d.citation || 'Sched. 6 Item 4'
      }));
    }
    if (initialNote) {
      return [
        { description: 'Drawing and Filing Plaint / Statement of Claim', unitRate: 5000, citation: 'Sched. 6 Item 4' },
        { description: 'Attendance at Court for Mention / Directions', unitRate: 2500, citation: 'Sched. 6 Item 7' },
        { description: 'Drawing and Filing Notice of Motion Application', unitRate: 4500, citation: 'Sched. 6 Item 4' },
        { description: 'Perusing Written Statement of Defence & Annexures', unitRate: 2500, citation: 'Sched. 6 Item 8' }
      ];
    }
    return [];
  });
  const [extraExpenses, setExtraExpenses] = useState<Array<{ description: string; unitRate: number }>>(() => {
    if (initialNote) {
      return [
        { description: 'Judiciary Court Filing Fee Receipt', unitRate: 5000 },
        { description: 'Licensed Process Server Returns & Service', unitRate: 3500 },
        { description: 'Courier, Postage & Delivery Charges', unitRate: 1500 }
      ];
    }
    return [];
  });

  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemVal, setNewItemVal] = useState<number | ''>('');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpVal, setNewExpVal] = useState<number | ''>('');

  // Service & Filing Addresses (For Court Bills)
  const [drawnByAddress, setDrawnByAddress] = useState(
    `${activeFirm.name}\n${activeFirm.address}\n${activeFirm.poBox}\nNAIROBI`
  );
  const [servedUponAddress, setServedUponAddress] = useState('');

  // Execution Controls (2 Minimalist Checks & Stamp Customization)
  const [stampOfficial, setStampOfficial] = useState(true);
  const [stampImageUrl, setStampImageUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('karani_firm_stamp_url') || '/stamp.png';
    } catch {
      return '/stamp.png';
    }
  });
  const [stampModalOpen, setStampModalOpen] = useState(false);
  const stampFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [signMeOff, setSignMeOff] = useState(true);
  const [securityRecord, setSecurityRecord] = useState<DocumentSecurityRecord | null>(null);


  // Sharing & Feedback Toasts
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(true);
  const [shareMode, setShareMode] = useState<'none' | 'email' | 'whatsapp'>('none');
  const [shareInput, setShareInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);

  const can = (code: string) => hasPermission(currentUser, code);

  const triggerToast = (type: 'success' | 'error' | 'loading', message: string, autoDismiss = 4000) => {
    setActionToast({ type, message });
    if (autoDismiss > 0) {
      setTimeout(() => {
        setActionToast(prev => (prev?.message === message ? null : prev));
      }, autoDismiss);
    }
  };

  const handleStampFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      triggerToast('error', 'Please select a valid image file (PNG, JPG, SVG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setStampImageUrl(dataUrl);
        try {
          localStorage.setItem('karani_firm_stamp_url', dataUrl);
        } catch (err) {
          console.warn('Unable to save custom stamp to localStorage', err);
        }
        triggerToast('success', 'Official stamp updated successfully!');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetStamp = () => {
    setStampImageUrl('/stamp.png');
    try {
      localStorage.removeItem('karani_firm_stamp_url');
    } catch {}
    triggerToast('success', 'Restored default firm stamp.');
  };

  // Legal Date Formatter (e.g. "13th day of October, 2026")
  const formatLegalDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const getOrdinal = (n: number) => {
      if (n > 3 && n < 21) return `${n}th`;
      switch (n % 10) {
        case 1:  return `${n}st`;
        case 2:  return `${n}nd`;
        case 3:  return `${n}rd`;
        default: return `${n}th`;
      }
    };
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      if (!isNaN(y) && m >= 0 && m < 12 && !isNaN(d)) {
        return `${getOrdinal(d)} day of ${months[m]}, ${y}`;
      }
    }
    const dt = new Date(dateStr);
    if (!isNaN(dt.getTime())) {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${getOrdinal(dt.getDate())} day of ${months[dt.getMonth()]}, ${dt.getFullYear()}`;
    }
    return dateStr;
  };

  const getDocumentTitle = () => {
    if (docType === 'advocate_client') return 'ADVOCATE AND CLIENT BILL OF COSTS';
    if (docType === 'fee_note') return 'PROFESSIONAL FEE NOTE';
    if (docType === 'taxation_estimate') return 'PRELIMINARY TAXATION ESTIMATE';
    return isDefendant ? "DEFENDANT'S PARTY AND PARTY BILL OF COSTS" : "CLAIMANT'S PARTY AND PARTY BILL OF COSTS";
  };

  const getDocumentSubtitle = () => {
    const schedName = STATUTORY_SCHEDULES.find(s => s.id === courtSchedule)?.label || courtSchedule.replace(/_/g, ' ');
    if (docType === 'advocate_client') {
      return `Drawn under Section 45 & 48 Advocates Act & Schedule 6/7/11 Part B (+50% Statutory Uplift) — ${schedName}`;
    }
    if (docType === 'fee_note') {
      return `Billing Proforma for Professional Legal Services Rendered — ${schedName}`;
    }
    if (docType === 'taxation_estimate') {
      return `Litigation Cost Exposure & Recovery Projection pursuant to Advocates Remuneration Order — ${schedName}`;
    }
    return `Pursuant to the Advocates (Remuneration) Order (Legal Notice No. 35 & 45 of 2014) — ${schedName}`;
  };

  const isLitigationSchedule = courtSchedule.includes('schedule_6') || courtSchedule.includes('schedule_7') || courtSchedule.includes('tribunal');

  // Math Engine Calculation
  const [result, setResult] = useState<BillCalculationResult | null>(null);

    // Live re-synchronization when initialNote changes
  useEffect(() => {
    if (!initialNote) return;
    if (isPreview) setActiveStep(4);
    if (initialNote.matterTitle) setMatterTitle(initialNote.matterTitle);
    if (initialNote.clientName) setClientName(initialNote.clientName);
    if (initialNote.courtSchedule) setCourtSchedule(normalizeScheduleKey(initialNote.courtSchedule));
    if (initialNote.claimValue) setClaimValue(initialNote.claimValue);
    if (initialNote.instructionFee) {
      setIsCustomInstruction(true);
      setCustomInstructionFee(initialNote.instructionFee);
    }
    if (initialNote.gettingUpFee) {
      setIncludeGettingUp(true);
    }
    if (initialNote.billNumber) setDocumentRef(initialNote.billNumber);
    if (initialNote.claimantName) setClaimantName(initialNote.claimantName);
    if (initialNote.respondentName) setRespondentName(initialNote.respondentName);
    if (initialNote.forumName) setForumName(initialNote.forumName.replace(/\\n/g, '\n'));
  }, [initialNote, isPreview]);

  // Load live clients and matters for auto-fill and auto-linking
  useEffect(() => {
    const firmId = currentUser?.firmId || 'firm-001';
    const loadData = () => {
      fetchClients(firmId).then(setAvailableClients).catch(() => setAvailableClients(getClients()));
      fetchMatters(firmId).then(setAvailableMatters).catch(() => setAvailableMatters(getMatters()));
    };
    loadData();

    const handleSync = () => loadData();
    window.addEventListener('clientsUpdated', handleSync);
    window.addEventListener('mattersUpdated', handleSync);
    return () => {
      window.removeEventListener('clientsUpdated', handleSync);
      window.removeEventListener('mattersUpdated', handleSync);
    };
  }, [currentUser?.firmId]);

  useEffect(() => {
    if (!courtSchedule) {
      setResult(null);
      return;
    }

    calculateLegalBill({
      claim_value: typeof claimValue === 'number' ? claimValue : 0,
      court_schedule: courtSchedule,
      is_defendant: isDefendant,
      include_getting_up: isLitigationSchedule && includeGettingUp,
      items: items.map(i => ({ description: i.description, type: 'custom', qty: 1, unitRate: i.unitRate })),
      disbursements: extraExpenses.reduce((acc, curr) => acc + curr.unitRate, 0),
      apply_vat: applyVat,
      document_type: docType,
      custom_instruction_fee: isCustomInstruction && typeof customInstructionFee === 'number' && customInstructionFee > 0 ? customInstructionFee : undefined,
      case_disposition: caseDisposition
    } as any).then(res => setResult(res));
  }, [claimValue, courtSchedule, isDefendant, includeGettingUp, items, extraExpenses, isLitigationSchedule, applyVat, docType, isCustomInstruction, customInstructionFee, caseDisposition]);

  // Sync state if initialNote is provided
  useEffect(() => {
    if (initialNote) {
      setClaimValue(initialNote.claimValue || '');
      setCourtSchedule(normalizeScheduleKey(initialNote.courtSchedule));
      setIsDefendant(!!(initialNote as any).isDefendant);
      setIncludeGettingUp(!!(initialNote as any).includeGettingUp);
      setDocType((initialNote as any).documentType || 'party_party');
      setApplyVat((initialNote as any).applyVat !== false);
      setClientName(initialNote.clientName || '');
      setForumName((initialNote.forumName || 'REPUBLIC OF KENYA\nIN THE HIGH COURT OF KENYA').replace(/\\n/g, '\n'));
      setMatterTitle(initialNote.matterTitle || '');
      setClaimantName(initialNote.claimantName || initialNote.clientName || '');
      setRespondentName(initialNote.respondentName || '');
      setJudgeName(initialNote.judgeName || '');
      setDocumentRef(initialNote.billNumber || `BOC2610001`);
    }
  }, [initialNote]);

  // Load live Matters and Clients from Supabase database
  useEffect(() => {
    let isMounted = true;
    const loadLiveRecords = async () => {
      try {
        const [mList, cList] = await Promise.all([
          fetchMatters('a0000000-0000-0000-0000-000000000001'),
          fetchClients('a0000000-0000-0000-0000-000000000001')
        ]);
        if (isMounted) {
          if (mList && mList.length > 0) setAvailableMatters(mList);
          if (cList && cList.length > 0) setAvailableClients(cList);
        }
      } catch (err) {
        console.warn('Live records load error, fallback in place:', err);
      }
    };
    loadLiveRecords();
    return () => { isMounted = false; };
  }, []);

  // Real-time Offline & Online Cryptographic Seal Generation
  useEffect(() => {
    let isMounted = true;
    const generateSec = async () => {
      try {
        const sec = await generateDocumentSecurityPayload({
          documentRef,
          clientName: clientName || claimantName || 'Client',
          matterTitle,
          totalAmount: result?.grand_total || 0,
          dateBilled,
          signatoryName: activeFirm.name,
          lskNumber: activeFirm.lskRegNo || activeFirm.firmRegNo || 'ADMIN/2026/001'
        });
        if (isMounted) setSecurityRecord(sec);
      } catch (err) {
        console.warn('Security payload generation error:', err);
      }
    };
    generateSec();
    return () => { isMounted = false; };
  }, [documentRef, result?.grand_total, dateBilled, clientName, claimantName, matterTitle]);

  // Quick-select handler for live matter record
  const handleSelectMatter = (matterId: string) => {
    setSelectedMatterId(matterId);
    if (!matterId) return;
    const m = availableMatters.find(x => x.id === matterId);
    if (!m) return;

    const cleanCaseNo = m.caseNo || m.matterNumber || '';
    const fullTitle = cleanCaseNo ? `${cleanCaseNo} - ${m.title}` : m.title;
    setMatterTitle(fullTitle);

    if (m.applicant) setClaimantName(m.applicant);
    if (m.respondent) setRespondentName(m.respondent);
    if (m.applicant) setClientName(m.applicant);

    const isDef = (m.applicantRole?.toLowerCase() === 'respondent' || m.respondentRole?.toLowerCase() === 'respondent' || (m.respondent || '').toLowerCase().includes('kithinji'));
    setIsDefendant(isDef);

    if (m.forum) {
      setForumName(m.forum);
      setIsLinkedCourtMatter(true);
    }

    if (m.amount && m.amount > 0) {
      setClaimValue(m.amount);
    }

    const fLower = (m.forum || '').toLowerCase();
    if (fLower.includes('magistrate') || fLower.includes('subordinate')) {
      setCourtSchedule('schedule_7_magistrate');
    } else if (fLower.includes('bprt') || fLower.includes('premises')) {
      setCourtSchedule('schedule_8_bprt');
    } else if (fLower.includes('rent restriction') || fLower.includes('rrt')) {
      setCourtSchedule('schedule_9_rrt');
    } else if (fLower.includes('probate') || fLower.includes('succession')) {
      setCourtSchedule('schedule_10_probate');
    } else if (fLower.includes('appeal')) {
      setCourtSchedule('schedule_8_court_of_appeal');
    } else if (fLower.includes('supreme')) {
      setCourtSchedule('schedule_9_supreme_court');
    } else if (fLower.includes('tribunal') || fLower.includes('tat') || fLower.includes('co-op')) {
      setCourtSchedule('schedule_11_tribunals');
    } else if (fLower.includes('high court') || fLower.includes('elc') || fLower.includes('elrc') || fLower.includes('commercial')) {
      setCourtSchedule('schedule_6_high_court');
    }

    const roleLabel = isDef ? 'RESPONDENT' : 'CLAIMANT';
    const oppRole = isDef ? 'CLAIMANT' : 'RESPONDENT';

    setDrawnByAddress(
      `${activeFirm.name.toUpperCase()}
ADVOCATES FOR THE ${roleLabel}
${activeFirm.address.toUpperCase()}
${activeFirm.poBox.toUpperCase()}
TEL: ${activeFirm.phone}
EMAIL: ${activeFirm.email}`
    );

    setServedUponAddress(
      `MESSRS. OPPONENT ADVOCATES
ADVOCATES FOR THE ${oppRole}
NAIROBI, KENYA
[Opponent Advocate details to be endorsed upon filing and service]`
    );

    triggerToast('success', `Linked matter: ${m.title}`);
  };

  // Quick-select handler for live client record
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    if (!clientId) return;
    const c = availableClients.find(x => x.id === clientId);
    if (!c) return;

    setClientName(c.name);
    if (c.email) setClientEmail(c.email);
    if (c.phonePrimary || c.phone) setClientPhone(c.phonePrimary || c.phone || '');
    if (c.company) {
      setClientAddress(`${c.company}\n${c.email ? `Email: ${c.email}\n` : ''}${c.phonePrimary ? `Tel: ${c.phonePrimary}` : ''}`);
    } else if (c.email || c.phonePrimary) {
      setClientAddress(`${c.name}\n${c.email ? `Email: ${c.email}\n` : ''}${c.phonePrimary ? `Tel: ${c.phonePrimary}` : ''}`);
    }
    triggerToast('success', `Selected client: ${c.name}`);
  };

  // Rule 69 5-Column Court Taxation & Fee Note Excel Exporter
  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    triggerToast('loading', docType === 'fee_note' ? 'Exporting Client Fee Note Excel...' : 'Exporting Rule 69 Court Taxation 5-Column Excel...', 0);
    try {
      await persistNoteToDatabase('processed');

      const wb = XLSX.utils.book_new();
      const wsData: any[][] = [];

      if (docType === 'fee_note') {
        wsData.push([activeFirm.name]);
        wsData.push(['ADVOCATES OF THE HIGH COURT OF KENYA']);
        wsData.push([(activeFirm.fullLocation || activeFirm.address)]);
        wsData.push([`P.O. Box: ${activeFirm.poBox} | Tel: ${activeFirm.phone}`]);
        wsData.push([`Email: ${activeFirm.email} | KRA PIN: ${activeFirm.kraPin}`]);
        wsData.push([]);
        wsData.push(['ADVOCATE-CLIENT PROFORMA FEE NOTE']);
        wsData.push([`Invoice Ref: ${documentRef}`, '', '', `Date: ${formatLegalDate(dateBilled)}`]);
        const dueDateStr = new Date(new Date(dateBilled).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        wsData.push([`Client: ${clientName || claimantName || 'Client'}`, '', '', `Due Date: ${formatLegalDate(dueDateStr)}`]);
        wsData.push([`Subject Matter / Re: ${matterTitle || 'Professional Legal Services'}`]);
        wsData.push([]);
        wsData.push(['ITEM NO.', 'DESCRIPTION / PARTICULARS OF SERVICE', 'LEGAL SCALE BASIS', 'RATE (KES)', 'AMOUNT (KES)']);

        let itemNum = 1;
        const instrText = isCustomInstruction && customInstructionFee
          ? 'Instruction Fees: Agreed / Assessed under Section 45 Advocates Act'
          : `Instruction Fees: Scale fee under ${courtSchedule.replace(/_/g, ' ')}`;
        wsData.push([itemNum++, instrText, courtSchedule, result?.instruction_fee || 0, result?.instruction_fee || 0]);

        if ((result?.getting_up_fee || 0) > 0) {
          wsData.push([itemNum++, 'Getting-up Fee for Defended Proceedings (1/3 of instruction fee)', 'Schedule 6 Item 2', result?.getting_up_fee || 0, result?.getting_up_fee || 0]);
        }

        items.forEach((it) => {
          wsData.push([itemNum++, it.description, it.citation || 'Professional Fee', it.unitRate || 0, it.unitRate || 0]);
        });

        wsData.push([]);
        wsData.push(['', '', '', 'Subtotal Professional Fees:', result?.taxable_subtotal || 0]);
        wsData.push(['', '', '', applyVat ? 'VAT (16% - VAT Act 2013):' : 'VAT (Exempt):', applyVat ? (result?.vat_amount || 0) : 0]);

        if (extraExpenses.length > 0) {
          wsData.push([]);
          wsData.push(['DISBURSEMENTS & COURT FILING EXPENSES (PASS-THROUGH)']);
          extraExpenses.forEach((exp, i) => {
            wsData.push([`D${i + 1}`, exp.description, 'Disbursement', exp.unitRate || 0, exp.unitRate || 0]);
          });
          wsData.push(['', '', '', 'Total Disbursements:', result?.disbursements || 0]);
        }

        wsData.push([]);
        wsData.push(['', '', '', 'GRAND TOTAL AMOUNT DUE (KES):', result?.grand_total || 0]);
        wsData.push([]);
        wsData.push(['BANK DETAILS FOR SETTLEMENT:']);
        wsData.push([activeFirm.bankDetails]);
      } else {
        // RULE 69 5-COLUMN COURT TAXATION BILL OF COSTS FORMAT
        wsData.push(['REPUBLIC OF KENYA']);
        const forumLines = (forumName || 'IN THE HIGH COURT OF KENYA').split('\n');
        forumLines.forEach(l => wsData.push([l]));
        if (matterTitle) wsData.push([matterTitle]);
        wsData.push([]);
        wsData.push([`${claimantName || clientName || 'Claimant'} .................................................. ${isDefendant ? 'RESPONDENT' : 'CLAIMANT'}`]);
        wsData.push(['- VERSUS -']);
        wsData.push([`${respondentName || 'Respondent'} .................................................. ${isDefendant ? 'CLAIMANT' : 'RESPONDENT'}`]);
        if (judgeName) wsData.push([judgeName]);
        wsData.push([]);
        wsData.push([getDocumentTitle()]);
        wsData.push([getDocumentSubtitle()]);
        wsData.push([]);

        // EXACT 5 COLUMNS UNDER RULE 69(1) OF ADVOCATES (REMUNERATION) ORDER
        wsData.push([
          'DATE (YYYY-MM-DD)',
          'ITEM NO.',
          'PARTICULARS OF SERVICES CHARGED FOR',
          'PROFESSIONAL CHARGES CLAIMED (KES)',
          "TAXING OFFICER'S DEDUCTIONS (KES)"
        ]);

        wsData.push(['', '', 'SECTION A: PROFIT COSTS & PROFESSIONAL LEGAL SERVICES', '', '']);

        let serialNo = 1;
        const instrText = isCustomInstruction && customInstructionFee
          ? `Instruction Fees: Agreed / Assessed under Section 45 Advocates Act (Agreed retainer fee in this matter).`
          : claimValue
          ? `Instruction Fees: To receiving instructions to act on behalf of the ${isDefendant ? 'Respondent' : 'Claimant'}. Ad valorem scale based on subject value of KES ${Number(claimValue).toLocaleString('en-KE', { minimumFractionDigits: 2 })} under ${courtSchedule.replace(/_/g, ' ')}${docType === 'advocate_client' ? ' (+50% Statutory Uplift under Part B)' : ''}.`
          : `Instruction Fees: Statutory Minimum Floor under Schedule 6 Item 1(a) (L.N. 35/2014) for non-monetary / unquantified subject matter${docType === 'advocate_client' ? ' (+50% Statutory Uplift under Part B)' : ''}.`;

        wsData.push([formatLegalDate(dateBilled), serialNo++, instrText, result?.instruction_fee || 0, '']);

        if ((result?.getting_up_fee || 0) > 0) {
          wsData.push([
            formatLegalDate(dateBilled),
            serialNo++,
            'Getting-up Fee: Preparation for trial in defended proceedings (statutory one-third (1/3) of Instruction Fee per Sched. 6 Item 2).',
            result?.getting_up_fee || 0,
            ''
          ]);
        }

        items.forEach((it) => {
          wsData.push([
            formatLegalDate(dateBilled),
            serialNo++,
            it.description,
            it.unitRate || 0,
            ''
          ]);
        });

        // Rule 69(3) Mandatory Attendance on Taxation item (left blank for Taxing Officer)
        wsData.push([
          formatLegalDate(dateBilled),
          serialNo++,
          'Attending taxation of this Bill of Costs before the Taxing Officer (Rule 69(3) Advocates Remuneration Order - to be completed by Taxing Officer)',
          '[ To be completed by Taxing Officer ]',
          ''
        ]);

        wsData.push(['', '', 'Subtotal Professional Legal Fees (Profit Costs):', result?.taxable_subtotal || 0, '']);
        wsData.push(['', '', applyVat ? 'Value Added Tax (16% - VAT Act 2013):' : 'Value Added Tax (Exempt):', applyVat ? (result?.vat_amount || 0) : 0, '']);

        // Section B: Disbursements (Rule 69(2) - Disbursements shall be shown separately at the foot of the bill)
        if (extraExpenses.length > 0) {
          wsData.push(['', '', '', '', '']);
          wsData.push(['', '', 'SECTION B: OUT-OF-POCKET DISBURSEMENTS (AT THE FOOT OF THE BILL - RULE 69(2))', '', '']);
          extraExpenses.forEach((exp, idx) => {
            wsData.push([
              formatLegalDate(dateBilled),
              `D${idx + 1}`,
              `${exp.description} (Receipts & Vouchers attached per Rule 74)`,
              exp.unitRate || 0,
              ''
            ]);
          });
          wsData.push(['', '', 'Total Out-of-Pocket Disbursements:', result?.disbursements || 0, '']);
        }

        wsData.push(['', '', '', '', '']);
        wsData.push(['', '', 'GRAND TOTAL AMOUNT DUE (KES):', result?.grand_total || 0, '']);
        wsData.push([]);
        wsData.push([`DATED at NAIROBI this ${formatLegalDate(dateBilled)}`]);
        wsData.push([]);
        wsData.push(['DRAWN & FILED BY:']);
        drawnByAddress.split('\n').forEach(line => wsData.push([line]));
        wsData.push([]);
        wsData.push(['TO BE SERVED UPON:']);
        (servedUponAddress || '[Opponent Advocate details to be endorsed upon filing and service]').split('\n').forEach(line => wsData.push([line]));
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [
        { wch: 18 },
        { wch: 10 },
        { wch: 72 },
        { wch: 25 },
        { wch: 22 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, docType === 'fee_note' ? 'Client Fee Note' : 'Taxation Bill (Rule 69)');
      XLSX.writeFile(wb, `${documentRef}_${docType === 'fee_note' ? 'FeeNote' : 'Rule69_Bill'}.xlsx`);
      triggerToast('success', `${docType === 'fee_note' ? 'Fee Note' : 'Rule 69 Bill of Costs'} Excel Spreadsheet exported successfully!`);
    } catch (err: any) {
      triggerToast('error', 'Download Excel failed: ' + (err?.message || 'Error occurred'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Handlers for Items
  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc.trim() || !newItemVal) return;
    setItems([...items, { description: newItemDesc.trim(), unitRate: Number(newItemVal) }]);
    setNewItemDesc('');
    setNewItemVal('');
  };

  const handleCreateNewExp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpDesc.trim() || !newExpVal) return;
    setExtraExpenses([...extraExpenses, { description: newExpDesc.trim(), unitRate: Number(newExpVal) }]);
    setNewExpDesc('');
    setNewExpVal('');
  };

  const handleQuickAddStatutory = (desc: string, val: number) => {
    setItems([...items, { description: desc, unitRate: val }]);
  };

  const handleQuickAddDisbursement = (desc: string, val: number) => {
    setExtraExpenses([...extraExpenses, { description: desc, unitRate: val }]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const removeExpRow = (index: number) => {
    setExtraExpenses(extraExpenses.filter((_, i) => i !== index));
  };

  // Persistence Engine
  const persistNoteToDatabase = async (status: 'processed' | 'draft' = 'processed') => {
    const firmId = currentUser?.firmId || 'firm-001';
    const userId = currentUser?.id || 'usr-karani-001';
    const userName = currentUser?.fullName || 'Karani Victor';
    const total = result?.grand_total || initialNote?.grandTotal || 0;
    let savedDatabaseId = initialNote?.id;

    // Seamless Auto-Sync: Client & Matter Auto-Creation / Linking
    let syncRes: any = null;
    try {
      syncRes = await syncMatterAndClientFromFeeNote(firmId, {
        billNumber: documentRef,
        clientName: clientName || claimantName,
        claimantName: claimantName || clientName,
        respondentName: respondentName,
        matterTitle: matterTitle,
        forumName: forumName,
        courtSchedule: courtSchedule,
        claimValue: typeof claimValue === 'number' ? claimValue : 0,
        instructionFee: result?.instruction_fee || 0,
        gettingUpFee: result?.getting_up_fee || 0,
        grandTotal: total,
        clientAddress: clientAddress,
        isDefendant: isDefendant,
      }, currentUser);
    } catch (syncErr) {
      console.warn('Auto-sync client and matter notice:', syncErr);
    }

    const linkedMatterId = syncRes?.matterId || initialNote?.matterId || "custom";
    const linkedMatterTitle = syncRes?.matterTitle || matterTitle || "Bill of Costs";
    const linkedClientName = syncRes?.clientName || claimantName || clientName || "Client";

    const payload: Record<string, any> = {
      firm_id: firmId,
      bill_number: documentRef,
      matter_id: linkedMatterId,
      matter_title: linkedMatterTitle,
      client_name: linkedClientName,
      court_schedule: courtSchedule,
      claim_value: typeof claimValue === 'number' ? claimValue : 0,
      instruction_fee: result?.instruction_fee || 0,
      getting_up_fee: result?.getting_up_fee || 0,
      grand_total: total,
      status,
      generated_by_user: userName,
      generated_by_user_id: userId,
    };

    let cloudDbError: string | null = null;
    try {
      const { data, error } = await supabase
        .from('fee_notes')
        .upsert(payload, { onConflict: 'bill_number' })
        .select('*')
        .single();

      if (!error && data) {
        savedDatabaseId = data.id;
        if (items.length > 0) {
          try {
            await supabase.from('fee_note_items').delete().eq('fee_note_id', data.id);
            await supabase.from('fee_note_items').insert(items.map((item, index) => ({
              fee_note_id: data.id,
              item_number: index + 1,
              description: item.description,
              unit_rate: item.unitRate,
              claimed_amount: item.unitRate,
            })));
          } catch (e) {
            console.warn(e);
          }
        }
      } else if (error) {
        cloudDbError = error.message;
      }
    } catch (e: any) {
      cloudDbError = e?.message;
    }

    const savedNote: ExactFeeNoteRecord = {
      id: savedDatabaseId || `fn-${Date.now()}`,
      billNumber: documentRef,
      matterId: linkedMatterId,
      matterTitle: linkedMatterTitle,
      clientName: linkedClientName,
      claimantName: claimantName || "",
      respondentName: respondentName || "",
      judgeName: judgeName || "",
      forumName: forumName || "",
      courtSchedule: courtSchedule,
      claimValue: typeof claimValue === 'number' ? claimValue : 0,
      instructionFee: result?.instruction_fee || 0,
      gettingUpFee: result?.getting_up_fee || 0,
      grandTotal: total,
      status,
      approvalStatus: status === 'processed' ? 'approved' : 'pending',
      generatedByUser: userName,
      generatedByUserId: userId,
      createdAt: new Date().toLocaleString(),
      pdfUrl: "",
      excelUrl: initialNote?.excelUrl || "",
      excelData: initialNote?.excelData
    };

    // Save directly to Authoritative Database so all users & sessions access it
    await saveFeeNoteToDatabase(savedNote);
    return { note: savedNote, cloudDbError: null, syncRes };
  };

  const handleSaveDraft = async () => {
    if (!can('boc.save_database')) {
      triggerToast('error', 'Permission Denied: Your assigned role cannot save bills.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await persistNoteToDatabase('draft');
      const sync = res.syncRes;
      let syncText = '';
      if (sync) {
        const parts = [];
        if (sync.isNewClient) parts.push(`Client "${sync.clientName}"`);
        if (sync.isNewMatter) parts.push(`Matter "${sync.matterTitle}"`);
        if (parts.length > 0) syncText = ` Auto-created ${parts.join(' & ')}!`;
      }
      if (res.cloudDbError) {
        triggerToast('error', `Saved locally.${syncText} Cloud sync warning: ${res.cloudDbError}`);
      } else {
        triggerToast('success', `Draft Bill of Costs successfully saved!${syncText}`);
      }
    } catch (err: any) {
      triggerToast('error', 'Failed to save: ' + (err?.message || 'Error occurred'));
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to load image as Base64 for jsPDF
  const getBase64ImageFromUrl = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // High-Fidelity Vector PDF Generator (Returns jsPDF instance)
  // High-Fidelity Vector PDF Generator (Pure Minimalist 1-Page Layout)
  const generatePdfDocument = async (): Promise<jsPDF> => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Fetch real logo if available (Transparent, zero background box)
    const logoUrl = activeFirm.logoUrl || '/logo.png';
    const logoBase64 = await getBase64ImageFromUrl(logoUrl).catch(() => null);

    // Letterhead block
    let headerTextX = 14;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, 10, 13, 13);
        headerTextX = 30;
      } catch (e) {
        headerTextX = 14;
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0);
    doc.text(activeFirm.name, headerTextX, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('ADVOCATES & COMMISSIONERS FOR OATHS', headerTextX, 17.5);

    doc.setFontSize(6.5);
    doc.text(`LSK Reg: ${activeFirm.lskRegNo || activeFirm.firmRegNo || 'ADMIN/2026/001'} | KRA PIN: ${activeFirm.kraPin || 'P051123456Z'}`, headerTextX, 21);

    // Right-aligned Firm Contact & Ref
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(activeFirm.address, pageWidth - 14, 11.5, { align: 'right' });
    doc.text(activeFirm.poBox, pageWidth - 14, 15, { align: 'right' });
    doc.text(`${activeFirm.phone} | ${activeFirm.email}`, pageWidth - 14, 18.5, { align: 'right' });
    doc.text(`Ref: ${documentRef}`, pageWidth - 14, 22, { align: 'right' });

    // Single crisp header divider
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(14, 25, pageWidth - 14, 25);

    // ==========================================
    // BRANCH: FEE NOTE PROFORMA PDF LAYOUT
    // ==========================================
    if (docType === 'fee_note') {
      let curY = 30;

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('PROFESSIONAL FEE NOTE', 14, curY);
      curY += 5;

      // Metadata Grid (Clean typography, NO background cards or fills)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0);
      doc.text('BILLED TO / INSTRUCTING CLIENT:', 14, curY);

      doc.setFontSize(8);
      doc.text(clientName || claimantName || 'Client Name', 14, curY + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const addrLines = (clientAddress || '').split('\n').filter(Boolean);
      let clientY = curY + 7.2;
      addrLines.slice(0, 3).forEach(al => {
        doc.text(al, 14, clientY);
        clientY += 3.2;
      });

      doc.setFont('helvetica', 'bold');
      doc.text(`FEE NOTE NO: ${documentRef}`, pageWidth - 65, curY);
      doc.setFont('helvetica', 'normal');
      doc.text(`DATE: ${formatLegalDate(dateBilled)}`, pageWidth - 65, curY + 3.8);
      doc.text(`KRA PIN: ${activeFirm.kraPin || 'P051123456Z'}`, pageWidth - 65, curY + 7.4);
      doc.text(`VAT REG: ${activeFirm.vatNumber || 'VAT-0192834-K'}`, pageWidth - 65, curY + 11);

      curY = Math.max(clientY + 1, curY + 15);

      // Subject RE: (NO background fill, crisp divider rules)
      doc.setDrawColor(0);
      doc.setLineWidth(0.2);
      doc.line(14, curY, pageWidth - 14, curY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      const subjectText = `RE: ${(matterTitle || 'Professional Legal Services Rendered').toUpperCase()}`;
      doc.text(subjectText.slice(0, 115), 14, curY + 4.2);
      doc.line(14, curY + 6, pageWidth - 14, curY + 6);
      curY += 8.5;

      // Table Construction (NO background colors on rows/headers)
      const tableHead = [['#', 'PARTICULARS OF LEGAL SERVICES RENDERED', 'STATUTORY BASIS / REFERENCE', 'AMOUNT (KES)']];
      const tableBody: any[] = [];

      tableBody.push([
        { content: '', styles: { fontStyle: 'bold' } },
        { content: 'SECTION A: PROFESSIONAL LEGAL FEES (PROFIT COSTS)', colSpan: 2, styles: { fontStyle: 'bold', textColor: 0 } },
        { content: '' }
      ]);

      const instrText = isCustomInstruction && customInstructionFee
        ? `Instruction Fees: Agreed Retainer under Section 45 Advocates Act.`
        : claimValue
        ? `Instruction Fees: Ad valorem scale fee based on transaction/claim value of KES ${Number(claimValue).toLocaleString('en-KE', { minimumFractionDigits: 2 })}.`
        : `Instruction Fees: Statutory Minimum Scale Fee under Advocates (Remuneration) Order.`;

      tableBody.push([
        { content: '1', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: instrText },
        { content: STATUTORY_SCHEDULES.find(s => s.id === courtSchedule)?.label?.slice(0, 36) || 'Statutory Tariff' },
        { content: (result?.instruction_fee || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } }
      ]);

      items.forEach((it, idx) => {
        tableBody.push([
          { content: String(idx + 2), styles: { halign: 'center' } },
          { content: it.description },
          { content: 'Itemized Attendances' },
          { content: (it.unitRate || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { halign: 'right' } }
        ]);
      });

      tableBody.push([
        { content: '', styles: { fontStyle: 'bold' } },
        { content: 'Subtotal Professional Legal Fees', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: (result?.taxable_subtotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } }
      ]);

      tableBody.push([
        { content: '', styles: { fontStyle: 'bold' } },
        { content: applyVat ? 'Value Added Tax (16% on Professional Fees — VAT Act 2013)' : 'Value Added Tax (16% — Exempt)', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: (applyVat ? (result?.vat_amount || 0) : 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } }
      ]);

      if (extraExpenses.length > 0) {
        tableBody.push([
          { content: '', styles: { fontStyle: 'bold' } },
          { content: 'SECTION B: OUT-OF-POCKET DISBURSEMENTS (ZERO-RATED / PASS-THROUGH)', colSpan: 2, styles: { fontStyle: 'bold', textColor: 0 } },
          { content: '' }
        ]);

        extraExpenses.forEach((exp, idx) => {
          tableBody.push([
            { content: `D${idx + 1}`, styles: { halign: 'center' } },
            { content: `${exp.description} (Receipts attached)` },
            { content: 'Direct Reimbursement' },
            { content: (exp.unitRate || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { halign: 'right' } }
          ]);
        });

        tableBody.push([
          { content: '', styles: { fontStyle: 'bold' } },
          { content: 'Total Out-of-Pocket Disbursements', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
          { content: (result?.disbursements || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } }
        ]);
      }

      tableBody.push([
        { content: '', styles: { fontStyle: 'bold' } },
        { content: 'TOTAL AMOUNT DUE FOR REMITTANCE (KES)', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', textColor: 0 } },
        { content: (result?.grand_total || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right', textColor: 0 } }
      ]);

      autoTable(doc, {
        startY: curY,
        head: tableHead,
        body: tableBody,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.8, lineWidth: 0.15, lineColor: 0, textColor: 0 },
        headStyles: { fontStyle: 'bold', fillColor: false, textColor: 0, halign: 'center', lineWidth: 0.2, lineColor: 0 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 46 },
          3: { cellWidth: 32, halign: 'right' }
        },
        margin: { left: 14, right: 14, top: 14, bottom: 14 },
      });

      // Payment Information (Clean lines, bank & mpesa details, NO boilerplate, NO QR code here)
      const finalTableY = (doc as any).lastAutoTable.finalY;
      let payY = finalTableY + 4;
      if (payY > 218) payY = 218;

      doc.setDrawColor(0);
      doc.setLineWidth(0.2);
      doc.line(14, payY, pageWidth - 14, payY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0);
      doc.text('Payment Information', 14, payY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(`Bank: ${activeFirm.bankName || 'KCB Bank Kenya'} | Branch: ${activeFirm.bankBranch || 'Riverside'} | Account No: ${activeFirm.bankAccount || '1104889922'} | Swift: ${activeFirm.swiftCode || 'KCBLKENX'}`, 14, payY + 7.8);
      doc.text(`M-Pesa Paybill: ${activeFirm.mpesaPaybill || '522522'} | Account Ref: ${documentRef}`, 14, payY + 11.2);

      doc.line(14, payY + 13.5, pageWidth - 14, payY + 13.5);

      // Endorsement & Signature Block on the SAME LINE
      let endY = payY + 18;
      if (endY > 245) endY = 245;

      // Left: Dated & Ref
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      doc.text(`Dated: ${formatLegalDate(dateBilled)}`, 14, endY + 4);
      doc.setFontSize(7);
      doc.text(`Ref: ${documentRef}`, 14, endY + 8);

      // Center/Right: Signature blank line & Endorsement
      const sigX = pageWidth / 2 + 10;
      const sigLineWidth = 70;
      const sigCenter = sigX + sigLineWidth / 2;
      const lineY = endY + 4;

      // Official Stamp on line if checked
      if (stampOfficial) {
        const stampSize = 22;
        const stampX = sigCenter - stampSize / 2;
        const stampY = lineY - stampSize + 4;
        try {
          doc.addImage(stampImageUrl, 'PNG', stampX, stampY, stampSize, stampSize);
        } catch {
          const resp = await fetch(stampImageUrl).catch(() => null);
          if (resp && resp.ok) {
            const blob = await resp.blob();
            const b64 = await new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(blob); });
            doc.addImage(b64, 'PNG', stampX, stampY, stampSize, stampSize);
          }
        }
      }

      // Signature line
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(sigX, lineY, sigX + sigLineWidth, lineY);

      // Words right under signature line
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(activeFirm.name, sigCenter, lineY + 3.8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('ADVOCATES & COMMISSIONERS FOR OATHS', sigCenter, lineY + 7.2, { align: 'center' });
      doc.setFontSize(6);
      doc.text(`LSK Practicing Roll: ${activeFirm.lskRegNo || activeFirm.firmRegNo || 'ADMIN/2026/001'}`, sigCenter, lineY + 10.4, { align: 'center' });

      // Confirmation QR code right under the words!
      if (securityRecord?.qrCodeDataUrl) {
        const qrSize = 16;
        const qrX = sigCenter - qrSize / 2;
        const qrY = lineY + 12.5;
        try {
          doc.addImage(securityRecord.qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
          doc.setFontSize(5);
          doc.text('Scan to verify authenticity', sigCenter, qrY + qrSize + 2.2, { align: 'center' });
        } catch (e) {
          console.warn('QR code embed notice:', e);
        }
      }

    } else {
      // ==========================================
      // BRANCH: COURT BILL OF COSTS PDF LAYOUT
      // ==========================================
      let curY = 30;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0);
      const forumLines = (forumName || 'REPUBLIC OF KENYA\nIN THE HIGH COURT OF KENYA').split('\n');
      forumLines.forEach(fl => {
        doc.text(fl, pageWidth / 2, curY, { align: 'center' });
        curY += 4;
      });

      if (matterTitle) {
        doc.setFontSize(8);
        doc.text(matterTitle, pageWidth / 2, curY, { align: 'center' });
        curY += 4.5;
      }

      // Parties Caption Box
      doc.setDrawColor(0);
      doc.setLineWidth(0.2);
      doc.rect(14, curY, pageWidth - 28, 16, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(claimantName || clientName || 'Claimant', 16, curY + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(isDefendant ? 'RESPONDENT' : 'CLAIMANT', pageWidth - 16, curY + 4.5, { align: 'right' });

      doc.text('— VERSUS —', pageWidth / 2, curY + 8, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(respondentName || 'Respondent', 16, curY + 12.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(isDefendant ? 'CLAIMANT' : 'RESPONDENT', pageWidth - 16, curY + 12.5, { align: 'right' });
      curY += 19;

      if (judgeName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(judgeName, pageWidth / 2, curY, { align: 'center' });
        curY += 4.5;
      }

      // Title & Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(getDocumentTitle(), pageWidth / 2, curY, { align: 'center' });
      curY += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(getDocumentSubtitle(), pageWidth / 2, curY, { align: 'center' });
      curY += 4;

      // Table Data (NO background colors)
      const tableHead = [['DATE', 'ITEM NO.', 'PARTICULARS OF SERVICES RENDERED', 'AMOUNT CLAIMED', 'AMOUNT TAXED OFF']];
      const tableBody: any[] = [];

      tableBody.push([
        { content: '' },
        { content: '' },
        { content: 'SECTION A: PROFIT COSTS & PROFESSIONAL SERVICES', colSpan: 3, styles: { fontStyle: 'bold', textColor: 0 } }
      ]);

      const instrText = isCustomInstruction && customInstructionFee
        ? `Instruction Fees: Agreed / Assessed under Section 45 Advocates Act (Agreed retainer fee in this matter).`
        : claimValue
        ? `Instruction Fees: To receiving instructions to act on behalf of the ${isDefendant ? 'Respondent' : 'Claimant'}. Ad valorem scale based on subject value of KES ${Number(claimValue).toLocaleString('en-KE', { minimumFractionDigits: 2 })} under ${courtSchedule.replace(/_/g, ' ')}${docType === 'advocate_client' ? ' (+50% Statutory Uplift under Part B)' : ''}.`
        : `Instruction Fees: Statutory Minimum Floor under Schedule 6 Item 1(a) (L.N. 35/2014) for non-monetary / unquantified subject matter${docType === 'advocate_client' ? ' (+50% Statutory Uplift under Part B)' : ''}.`;

      tableBody.push([
        { content: formatLegalDate(dateBilled) },
        { content: '1', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: instrText },
        { content: (result?.instruction_fee || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: '' }
      ]);

      if ((result?.getting_up_fee || 0) > 0) {
        tableBody.push([
          { content: formatLegalDate(dateBilled) },
          { content: '2', styles: { halign: 'center', fontStyle: 'bold' } },
          { content: 'Getting-up Fee: Preparation for trial in defended proceedings (statutory one-third (1/3) of Instruction Fee per Sched. 6 Item 2).' },
          { content: (result?.getting_up_fee || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
          { content: '' }
        ]);
      }

      items.forEach((it, idx) => {
        tableBody.push([
          { content: formatLegalDate(dateBilled) },
          { content: String(idx + ((result?.getting_up_fee || 0) > 0 ? 3 : 2)), styles: { halign: 'center' } },
          { content: it.description },
          { content: (it.unitRate || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { halign: 'right' } },
          { content: '' }
        ]);
      });

      tableBody.push([
        { content: '' },
        { content: '' },
        { content: 'Subtotal Professional Legal Fees (Profit Costs)', styles: { fontStyle: 'bold', halign: 'right' } },
        { content: (result?.taxable_subtotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: '' }
      ]);

      tableBody.push([
        { content: '' },
        { content: '' },
        { content: applyVat ? 'Value Added Tax (16% on Professional Fees — VAT Act 2013)' : 'Value Added Tax (16% — Exempt / Non-Taxable)', styles: { fontStyle: 'bold', halign: 'right' } },
        { content: (applyVat ? (result?.vat_amount || 0) : 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: '' }
      ]);

      if (extraExpenses.length > 0) {
        tableBody.push([
          { content: '' },
          { content: '' },
          { content: 'SECTION B: OUT-OF-POCKET DISBURSEMENTS (ZERO-RATED / PASS-THROUGH)', colSpan: 3, styles: { fontStyle: 'bold', textColor: 0 } }
        ]);

        extraExpenses.forEach((exp, idx) => {
          tableBody.push([
            { content: formatLegalDate(dateBilled) },
            { content: `D${idx + 1}`, styles: { halign: 'center' } },
            { content: `${exp.description} (Receipts/Vouchers attached)` },
            { content: (exp.unitRate || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { halign: 'right' } },
            { content: '' }
          ]);
        });

        tableBody.push([
          { content: '' },
          { content: '' },
          { content: 'Total Out-of-Pocket Disbursements', styles: { fontStyle: 'bold', halign: 'right' } },
          { content: (result?.disbursements || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
          { content: '' }
        ]);
      }

      tableBody.push([
        { content: '' },
        { content: '' },
        { content: 'GRAND TOTAL AMOUNT DUE (KES)', styles: { fontStyle: 'bold', halign: 'right', textColor: 0 } },
        { content: (result?.grand_total || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right', textColor: 0 } },
        { content: '' }
      ]);

      autoTable(doc, {
        startY: curY,
        head: tableHead,
        body: tableBody,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.5, lineWidth: 0.15, lineColor: 0, textColor: 0 },
        headStyles: { fontStyle: 'bold', fillColor: false, textColor: 0, halign: 'center', lineWidth: 0.2, lineColor: 0 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 12, halign: 'center' },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 28, halign: 'right' },
          4: { cellWidth: 24, halign: 'right' }
        },
        margin: { left: 14, right: 14, top: 14, bottom: 16 },
        didDrawPage: (data) => {
          const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : (doc.internal.pages.length - 1);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
          doc.text(`Doc Ref: ${documentRef}`, 14, doc.internal.pageSize.getHeight() - 8);
        }
      });

      // Endorsement & Execution Block
      const finalY = (doc as any).lastAutoTable.finalY + 6;
      let endY = finalY;

      if (endY > 212) {
        doc.addPage();
        endY = 180;
      } else {
        endY = Math.max(endY + 12, 212);
      }

      // Left: Dated & Ref
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      doc.text(`Dated: ${formatLegalDate(dateBilled)}`, 14, endY + 4);
      doc.setFontSize(7);
      doc.text(`Ref: ${documentRef}`, 14, endY + 8);

      // Center: Signature line & Endorsement
      const sigX = pageWidth / 2 + 10;
      const sigLineWidth = 70;
      const sigCenter = sigX + sigLineWidth / 2;
      const lineY = endY + 4;

      if (stampOfficial) {
        const stampSize = 22;
        const stampX = sigCenter - stampSize / 2;
        const stampY = lineY - stampSize + 4;
        try {
          doc.addImage(stampImageUrl, 'PNG', stampX, stampY, stampSize, stampSize);
        } catch {
          const resp = await fetch(stampImageUrl).catch(() => null);
          if (resp && resp.ok) {
            const blob = await resp.blob();
            const b64 = await new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(blob); });
            doc.addImage(b64, 'PNG', stampX, stampY, stampSize, stampSize);
          }
        }
      }

      // Centered signature line
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(sigX, lineY, sigX + sigLineWidth, lineY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.text(activeFirm.name, sigCenter, lineY + 3.8, { align: 'center' });
      doc.setFontSize(6.5);
      const partyRole = docType === 'advocate_client'
        ? 'ADVOCATES FOR THE APPLICANT'
        : isDefendant
        ? 'ADVOCATES FOR THE RESPONDENT'
        : 'ADVOCATES FOR THE CLAIMANT';
      doc.text(partyRole, sigCenter, lineY + 7.2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text(`LSK Practicing Roll: ${activeFirm.lskRegNo || activeFirm.firmRegNo || 'ADMIN/2026/001'}`, sigCenter, lineY + 10.4, { align: 'center' });

      // Confirmation QR code right under the words!
      if (securityRecord?.qrCodeDataUrl) {
        const qrSize = 16;
        const qrX = sigCenter - qrSize / 2;
        const qrY = lineY + 12.5;
        try {
          doc.addImage(securityRecord.qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
          doc.setFontSize(5);
          doc.text('Scan to verify authenticity', sigCenter, qrY + qrSize + 2.2, { align: 'center' });
        } catch (e) {}
      }

      // Service addresses
      const serviceY = lineY + 32;
      doc.setDrawColor(0);
      doc.setLineWidth(0.15);
      doc.line(14, serviceY, pageWidth - 14, serviceY);

      const addrHeaderY = serviceY + 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0);
      doc.text('DRAWN & FILED BY:', 14, addrHeaderY);
      doc.text('TO BE SERVED UPON:', pageWidth / 2 + 5, addrHeaderY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      const drawnLines = drawnByAddress.split('\n');
      drawnLines.forEach((dl, i) => {
        doc.text(dl, 14, addrHeaderY + 3.5 + (i * 3));
      });

      if (servedUponAddress.trim()) {
        const servedLines = servedUponAddress.split('\n');
        servedLines.forEach((sl, i) => {
          doc.text(sl, pageWidth / 2 + 5, addrHeaderY + 3.5 + (i * 3));
        });
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        doc.text('[Opponent Advocate details to be endorsed upon service]', pageWidth / 2 + 5, addrHeaderY + 3.5);
      }
    }

    return doc;
  };

  // 1-Click Vector PDF Download
  const handleDownloadPDF = async () => {
    setIsExportingPdf(true);
    triggerToast('loading', docType === 'fee_note' ? 'Generating 1-Page Fee Note PDF...' : 'Generating High Court Bill of Costs PDF...', 0);
    try {
      await persistNoteToDatabase('processed');
      const doc = await generatePdfDocument();
      doc.save(`${documentRef}.pdf`);
      triggerToast('success', `${docType === 'fee_note' ? 'Fee Note' : 'Bill of Costs'} PDF downloaded!`);
    } catch (err: any) {
      triggerToast('error', 'Download PDF failed: ' + (err?.message || 'Error occurred'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 1-Click Email Dispatch (With Real Base64 Attached PDF)
  const handleEmailClient = async () => {
    let targetEmail = clientEmail.trim();
    if (!targetEmail) {
      const match = availableClients.find(c => c.name.toLowerCase() === clientName.toLowerCase() || c.id === selectedClientId);
      if (match?.email) targetEmail = match.email;
    }
    if (!targetEmail) {
      setShareMode('email');
      setShareMenuOpen(true);
      triggerToast('loading', 'Please confirm client email address below.');
      return;
    }

    setIsEmailing(true);
    triggerToast('loading', `Compiling PDF invoice & dispatching to ${targetEmail}...`, 0);

    try {
      await persistNoteToDatabase('processed');
      const doc = await generatePdfDocument();
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const total = result?.grand_total || initialNote?.grandTotal || 0;
      const docLabel = docType === 'fee_note' ? 'Fee Note' : 'Bill of Costs';

      await sendEmail({
        to: [targetEmail],
        subject: `${docLabel} ${documentRef} — ${activeFirm.name}`,
        category: 'firm_to_client',
        senderName: activeFirm.name,
        body: `Dear ${clientName || claimantName || 'Client'},\n\nPlease find attached the official ${docLabel} Ref: ${documentRef} for ${matterTitle || 'Professional Legal Services'}.\n\nINVOICE SUMMARY:\nDocument Reference: ${documentRef}\nDate of Issue: ${formatLegalDate(dateBilled)}\nTotal Due for Remittance: KES ${total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}\n\nSETTLEMENT & REMITTANCE DETAILS:\nBank: ${activeFirm.bankName || 'KCB Bank Kenya'}\nAccount Number: ${activeFirm.bankAccount || '1104889922'}\nBranch: ${activeFirm.bankBranch || 'Riverside'}\nSwift/BIC: ${activeFirm.swiftCode || 'KCBLKENX'}\nM-Pesa Paybill: ${activeFirm.mpesaPaybill || '522522'} (Account Ref: ${documentRef})\n\nYou can also verify and view your official certified document online at:\n${window.location.origin}/?tab=verify&ref=${documentRef}&amt=${total.toFixed(2)}&dt=${dateBilled}&cli=${encodeURIComponent(clientName || claimantName || 'Client')}\n\nThank you for choosing ${activeFirm.name}.\n\nYours faithfully,\n${activeFirm.name}\nAdvocates & Commissioners for Oaths`,
        attachments: [
          {
            filename: `${documentRef}.pdf`,
            content: pdfBase64,
            contentType: 'application/pdf',
          },
        ],
      });

      triggerToast('success', `${docLabel} PDF with official attachment sent to ${targetEmail}!`);
    } catch (err: any) {
      triggerToast('error', `Email dispatch failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setIsEmailing(false);
    }
  };

  // Real WhatsApp Dispatch (Opens WhatsApp with pre-filled message, portal link & instant PDF download)
  const handleWhatsAppClient = async () => {
    let targetPhone = clientPhone.trim();
    if (!targetPhone) {
      const match = availableClients.find(c => c.name.toLowerCase() === clientName.toLowerCase() || c.id === selectedClientId);
      if (match?.phonePrimary || match?.phone) targetPhone = match.phonePrimary || match.phone || '';
    }
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');

    setIsWhatsAppSending(true);
    triggerToast('loading', 'Preparing invoice & downloading PDF for WhatsApp...', 0);

    try {
      await persistNoteToDatabase('processed');
      const doc = await generatePdfDocument();
      const pdfBlob = doc.output('blob');

      // 1. Download file so lawyer can drag-and-drop or attach to WhatsApp chat
      doc.save(`${documentRef}.pdf`);

      // 2. Upload to vault or compute portal verification link
      const portalVerifyLink = `${window.location.origin}/?tab=verify&ref=${documentRef}&amt=${(result?.grand_total || 0).toFixed(2)}&dt=${dateBilled}&cli=${encodeURIComponent(clientName || claimantName || 'Client')}`;
      let downloadLink = portalVerifyLink;

      try {
        const vaultUrl = await uploadPdfToVault(documentRef, pdfBlob);
        if (vaultUrl) downloadLink = vaultUrl;
      } catch (e) {
        console.warn('Vault upload notice:', e);
      }

      const total = result?.grand_total || initialNote?.grandTotal || 0;
      const docLabel = docType === 'fee_note' ? 'Fee Note' : 'Bill of Costs';

      const executiveMessage = `Dear ${clientName || claimantName || 'Client'}, please find your ${docLabel} ref ${documentRef} for KES ${total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}. You can download and inspect your official certified PDF invoice here: ${downloadLink} . Bank Remittance: ${activeFirm.bankName || 'KCB Bank'} A/C ${activeFirm.bankAccount || '1104889922'} / Paybill ${activeFirm.mpesaPaybill || '522522'}. Thank You, ${activeFirm.name}.`;

      if (cleanPhone) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(executiveMessage)}`, '_blank');
        triggerToast('success', `WhatsApp opened with pre-filled invoice message! PDF downloaded to attach.`);
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(executiveMessage)}`, '_blank');
        triggerToast('success', `WhatsApp Web opened with invoice text! PDF downloaded to attach.`);
      }
    } catch (err: any) {
      triggerToast('error', `WhatsApp error: ${err?.message || 'Error occurred'}`);
    } finally {
      setIsWhatsAppSending(false);
    }
  };

  // High-Fidelity Print Engine using isolated iframe
  const handlePrintPDF = async () => {
    triggerToast('loading', 'Opening print preview...', 0);
    try {
      await persistNoteToDatabase('processed');
      const element = document.getElementById('live-a4-document');
      if (!element) throw new Error('Document element not found');

      const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const printFrame = document.createElement('iframe');
      printFrame.setAttribute('style', 'position: fixed; left: -9999px; top: -9999px; width: 0; height: 0; border: 0;');
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document;
      if (!frameDoc) throw new Error('Could not access print frame document');

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${documentRef} - ${docType === 'fee_note' ? 'Fee Note' : 'Bill of Costs'}</title>
            <meta charset="utf-8">
            ${styleTags}
            <style>
              @page { size: A4 portrait; margin: 10mm 8mm; }
              html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; color: #000000 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important; }
              #live-a4-document { width: 100% !important; max-width: none !important; box-shadow: none !important; padding: 10px !important; margin: 0 !important; background: #ffffff !important; }
              table { width: 100% !important; border-collapse: collapse !important; }
              tr { page-break-inside: avoid !important; break-inside: avoid !important; }
            </style>
          </head>
          <body class="bg-white text-black">
            ${element.outerHTML}
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          triggerToast('success', 'Printed successfully!');
        } catch (e: any) {
          triggerToast('error', 'Print canceled or failed');
        } finally {
          setTimeout(() => {
            if (document.body.contains(printFrame)) document.body.removeChild(printFrame);
          }, 3000);
        }
      }, 500);
    } catch (err: any) {
      triggerToast('error', 'Print failed: ' + (err?.message || 'Error'));
    }
  };

  const executeShare = () => {
    if (!shareInput.trim()) return;
    if (shareMode === 'whatsapp') {
      setClientPhone(shareInput.trim());
      handleWhatsAppClient();
    } else if (shareMode === 'email') {
      setClientEmail(shareInput.trim());
      handleEmailClient();
    }
    setShareMenuOpen(false);
    setShareMode('none');
    setShareInput('');
  };


  return (
    <div className="space-y-4 relative pb-12">
      {/* Toast Notification */}
      {actionToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-200 backdrop-blur-md transition-all bg-slate-900 text-white border-slate-700">
          {actionToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {actionToast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{actionToast.message}</span>
        </div>
      )}

      {/* Top Header - Minimalist */}
      <div className="pt-0 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)]/50 pb-2.5">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[var(--text-main)] tracking-tight">
            {docType === 'fee_note' ? 'Fee Note Studio' : 'Court Bill of Costs'}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {docType === 'fee_note' ? 'Issue legal fee note' : 'Formal court taxation bill'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center gap-1 border border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => { setDocType('fee_note'); setActiveStep(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                docType === 'fee_note'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              Quick Fee Note
            </button>
            <button
              type="button"
              onClick={() => { setDocType('party_party'); setActiveStep(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                docType !== 'fee_note'
                  ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              Court Bill of Costs
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab ? onNavigateToTab('feenotes') : null}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ledger</span>
          </button>
        </div>
      </div>

      {/* 2-COLUMN STUDIO WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: 4-STAGE STEPPER STUDIO (5 OF 12 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Stepper Process: Minimalist Trail (No Background Cards) */}
          <div className="flex items-center justify-between px-1 py-1 text-xs select-none border-b border-[var(--border-color)]/40 pb-2">
            {[
              { num: 1, label: docType === 'fee_note' ? 'Client' : 'Parties' },
              { num: 2, label: 'Tariff' },
              { num: 3, label: 'Folios' },
              { num: 4, label: docType === 'fee_note' ? 'Payment' : 'Endorse' }
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(step.num)}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeStep === step.num
                      ? 'text-slate-900 dark:text-white font-bold'
                      : activeStep > step.num
                      ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                      : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-mono ${
                    activeStep === step.num
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                      : activeStep > step.num
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                  }`}>
                    {activeStep > step.num ? '✓' : step.num}
                  </span>
                  <span className="text-xs">{step.label}</span>
                </button>
                {idx < 3 && <span className="text-slate-300 dark:text-zinc-700 text-xs">──</span>}
              </div>
            ))}
          </div>

          {/* ================================================================ */}
          {/* STEP 1: CASE & PARTIES DETAILS (ADAPTS TO DOC TYPE) */}
          {/* ================================================================ */}
          {activeStep === 1 && (
            <div className="space-y-4 pt-1">
              <div className="border-b border-[var(--border-color)] pb-3">
                <h3 className="font-bold text-sm text-[var(--text-main)]">
                  {docType === 'fee_note' ? 'Client Details' : 'Court & Parties'}
                </h3>
              </div>

              {/* Classification 1-Line Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-muted)]">
                  Classification
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-main)] focus:outline-none focus:border-slate-500 cursor-pointer"
                >
                  <option value="fee_note">Fee Note Proforma (Direct Client Invoice)</option>
                  <option value="party_party">Party & Party (Opponent Court Taxation)</option>
                  <option value="advocate_client">Advocate & Client (+50% Statutory Uplift)</option>
                  <option value="taxation_estimate">Taxation Estimate (Cost Risk Exposure)</option>
                </select>
              </div>



              {/* ZERO-SETUP AUTO-SYNC (COMMENTED OUT AS PER FIRM WORKFLOW REQUIREMENT) */}
              {false && (
                <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50/90 dark:from-slate-900/90 dark:via-indigo-950/40 dark:to-slate-900/90 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5 shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-blue-950 dark:text-blue-200">
                          Zero-Setup Auto-Sync
                        </span>
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800">
                          Matter & Client Auto-Created
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-800 dark:text-blue-300/80 mt-1 leading-relaxed">
                        Just enter the fee note details. The corresponding <strong>Client profile</strong> and <strong>Litigation Matter</strong> will automatically create and link themselves across your firm's pipeline upon saving!
                      </p>
                    </div>
                  </div>

                  {/* Optional Quick Pre-fills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-blue-200/60 dark:border-blue-900/40">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1 flex items-center gap-1">
                        <User className="w-3 h-3 text-blue-600" />
                        Auto-Fill Existing Client (Optional)
                      </label>
                      <select
                        value={selectedClientId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedClientId(id);
                          if (!id) return;
                          const c = availableClients.find(item => item.id === id);
                          if (c) {
                            setClientName(c.name);
                            if (docType === 'fee_note' || docType === 'advocate_client') {
                              setClaimantName(c.name);
                            } else if (!isDefendant) {
                              setClaimantName(c.name);
                            } else {
                              setRespondentName(c.name);
                            }
                            if (c.company) setClientAddress(`${c.name}\n${c.company}\nNairobi, Kenya`);
                            if (c.mattersList && c.mattersList.length > 0 && !matterTitle) {
                              setMatterTitle(c.mattersList[0]);
                            }
                          }
                        }}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] focus:outline-none"
                      >
                        <option value="">-- Or choose existing client --</option>
                        {availableClients.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1 flex items-center gap-1">
                        <Scale className="w-3 h-3 text-indigo-600" />
                        Auto-Fill Existing Matter (Optional)
                      </label>
                      <select
                        value={selectedMatterId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedMatterId(id);
                          if (!id) return;
                          const m = availableMatters.find(item => item.id === id);
                          if (m) {
                            setMatterTitle(m.title);
                            if (m.applicant) setClaimantName(m.applicant);
                            if (m.respondent) setRespondentName(m.respondent);
                            if (m.forum) setForumName(m.forum);
                            if (m.amount) setClaimValue(m.amount);
                          }
                        }}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] focus:outline-none"
                      >
                        <option value="">-- Or choose existing matter --</option>
                        {availableMatters.map(m => (
                          <option key={m.id} value={m.id}>{m.title} [{m.caseNo || 'Matter'}]</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* DYNAMIC FORM FIELDS BASED ON DOCTYPE */}
              {docType === 'fee_note' ? (
                /* ======================================================== */
                /* FEE NOTE PROFORMA FIELDS (NON-ADVERSARIAL CLIENT INVOICE) */
                /* ======================================================== */
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Instructing Client / Addressee Name
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder=""
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-main)] focus:outline-none focus:border-slate-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Client Billing & Postal Address
                    </label>
                    <textarea
                      rows={3}
                      value={clientAddress}
                      onChange={e => setClientAddress(e.target.value)}
                      placeholder=""
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-slate-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Matter / Transaction Description (Subject RE:)
                    </label>
                    <input
                      type="text"
                      value={matterTitle}
                      onChange={e => setMatterTitle(e.target.value)}
                      placeholder=""
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-slate-500 font-sans"
                    />
                  </div>

                  {/* Optional Court Reference accordion */}
                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]">
                      <input
                        type="checkbox"
                        checked={isLinkedCourtMatter}
                        onChange={e => setIsLinkedCourtMatter(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-0 cursor-pointer"
                      />
                      <span>Link to Court Litigation Matter Reference (Optional)</span>
                    </label>
                    {isLinkedCourtMatter && (
                      <div className="pt-2 pl-5 space-y-2">
                        <input
                          type="text"
                          value={forumName}
                          onChange={e => setForumName(e.target.value)}
                          placeholder=""
                          className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ======================================================== */
                /* COURT LITIGATION BILL OF COSTS FIELDS (PARTY & PARTY / ADVOCATE & CLIENT) */
                /* ======================================================== */
                <div className="space-y-4 pt-1">
                  {/* Forum / Court Jurisdiction */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Court / Forum Jurisdiction</label>
                    <textarea
                      rows={2}
                      value={forumName}
                      onChange={e => setForumName(e.target.value)}
                      placeholder=""
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-slate-500 font-sans"
                    />
                  </div>

                  {/* Cause / Matter Title */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      {docType === 'advocate_client' ? 'Miscellaneous Cause Title & Number' : 'Matter Title / Suit Reference'}
                    </label>
                    <input
                      type="text"
                      value={matterTitle}
                      onChange={e => setMatterTitle(e.target.value)}
                      placeholder=""
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-slate-500 font-sans"
                    />
                  </div>

                  {/* Parties */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                        {docType === 'advocate_client' ? 'Advocate / Applicant' : 'Claimant / Plaintiff'}
                      </label>
                      <input
                        type="text"
                        value={claimantName}
                        onChange={e => setClaimantName(e.target.value)}
                        placeholder=""
                        className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                        {docType === 'advocate_client' ? 'Client / Respondent' : 'Respondent / Defendant'}
                      </label>
                      <input
                        type="text"
                        value={respondentName}
                        onChange={e => setRespondentName(e.target.value)}
                        placeholder=""
                        className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none font-sans"
                      />
                    </div>
                  </div>

                  {/* Coram / Judge */}
                  {docType !== 'taxation_estimate' && (
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Judge / Coram (Optional)</label>
                      <input
                        type="text"
                        value={judgeName}
                        onChange={e => setJudgeName(e.target.value)}
                        placeholder=""
                        className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none font-sans"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Ref & Date */}
              <div className="grid grid-cols-2 gap-3 border-t border-[var(--border-color)] pt-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Document Reference</label>
                  <input
                    type="text"
                    value={documentRef}
                    onChange={e => setDocumentRef(e.target.value)}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[var(--text-main)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Date of Issue</label>
                  <input
                    type="date"
                    value={dateBilled}
                    onChange={e => setDateBilled(e.target.value)}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-main)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-black dark:hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span>Continue to Tariff & Scale</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 2: STATUTORY TARIFF & INSTRUCTION FEE MATH */}
          {/* ================================================================ */}
          {activeStep === 2 && (
            <div className="space-y-4 pt-1">
              <div className="border-b border-[var(--border-color)] pb-3">
                <h3 className="font-bold text-sm text-[var(--text-main)]">Fees & Remuneration Scale</h3>
                
              </div>

              {/* Schedule Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                  Statutory Tariff Schedule
                </label>
                <select
                  value={courtSchedule}
                  onChange={e => setCourtSchedule(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-main)] font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="">Please pick a schedule in the dropdown...</option>
                  {STATUTORY_SCHEDULES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>

              </div>

              {/* Claim Value & Quick Chips */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">Subject Matter / Claim Value (KES)</label>
                  <span className="text-[10px] font-mono text-slate-400">0 for unquantified</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-slate-400">KES</span>
                  <input
                    type="number"
                    value={claimValue === '' ? '' : claimValue}
                    onChange={e => setClaimValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder=""
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl pl-12 pr-3 py-2 text-sm font-mono font-bold text-[var(--text-main)] focus:outline-none"
                  />
                </div>

                {/* Compact Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {[
                    { label: '100k', val: 100000 },
                    { label: '500k', val: 500000 },
                    { label: '1M', val: 1000000 },
                    { label: '5M', val: 5000000 },
                    { label: '10M', val: 10000000 },
                    { label: '20M', val: 20000000 },
                    { label: '50M', val: 50000000 },
                  ].map(chip => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setClaimValue(chip.val)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                        claimValue === chip.val
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-slate-400'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Fee Override Switch (Section 45 Advocates Act & Rule 22) */}
              <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-[var(--text-main)]">
                    <input
                      type="checkbox"
                      checked={isCustomInstruction}
                      onChange={e => setIsCustomInstruction(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Manual / Custom Instruction Fee Override (Section 45 / Rule 22)</span>
                  </label>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-blue-500/10 text-blue-600 uppercase">Override</span>
                </div>
                {isCustomInstruction && (
                  <div className="pt-2 space-y-1">
                    <input
                      type="number"
                      placeholder=""
                      value={customInstructionFee === '' ? '' : customInstructionFee}
                      onChange={e => setCustomInstructionFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full bg-white dark:bg-zinc-800 border border-blue-400 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-[var(--text-main)] focus:outline-none"
                    />
                    <div className="text-[10px] text-blue-600 dark:text-blue-400">
                      Override active: Replaces statutory ad valorem calculation with agreed advocate-client fee.
                    </div>
                  </div>
                )}
              </div>

              {/* Litigation Case Disposition Toggles */}
              {isLitigationSchedule && (
                <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[var(--text-main)]">
                      Litigation Case Disposition (Schedule 6 Item 1)
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">Statutory Factor</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {[
                      { id: 'full_trial', label: 'Full Trial', pct: '100% Item 1(b)', desc: 'Defended suit proceeded to full hearing' },
                      { id: 'summary_determination', label: 'Summary Det.', pct: '75% Item 1(b)', desc: 'Judgment on admissions / summary application' },
                      { id: 'early_settlement', label: 'Early Settlement', pct: '85% Item 1(b)', desc: 'Settled prior to hearing confirmation' },
                      { id: 'undefended', label: 'Undefended / Ex-Parte', pct: 'Item 1(a)', desc: 'No appearance / undefended scale' }
                    ].map(disp => (
                      <button
                        key={disp.id}
                        type="button"
                        onClick={() => setCaseDisposition(disp.id as any)}
                        title={disp.desc}
                        className={`px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer border ${
                          caseDisposition === disp.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white dark:bg-zinc-800 text-[var(--text-muted)] border-[var(--border-color)] hover:border-slate-400'
                        }`}
                      >
                        <div className="text-[11px] font-bold leading-tight">{disp.label}</div>
                        <div className={`text-[9px] font-mono mt-0.5 ${caseDisposition === disp.id ? 'text-blue-100' : 'text-slate-400'}`}>
                          {disp.pct}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Compact Checkbox Toggles (No Paragraph Lectures) */}
              <div className="space-y-2.5 pt-1">
                {/* 16% VAT Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-[var(--text-main)]">
                    <input
                      type="checkbox"
                      checked={applyVat}
                      onChange={e => setApplyVat(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Apply 16% Value Added Tax (VAT Act 2013)</span>
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {applyVat ? '16% on Profit Costs' : 'Exempt'}
                  </span>
                </div>

                {/* Getting-Up Fee Toggle (Schedule 6 Item 2 - For Litigation Only) */}
                {isLitigationSchedule && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-[var(--text-main)]">
                      <input
                        type="checkbox"
                        checked={includeGettingUp}
                        onChange={e => setIncludeGettingUp(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Defended Suit (Apply 1/3 Getting-Up Fee)</span>
                    </label>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {includeGettingUp ? '1/3 Scale Fee' : 'KES 0.00'}
                    </span>
                  </div>
                )}

                {/* Defendant Representation (Court Bills Only) */}
                {docType !== 'fee_note' && (
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]">
                    <input
                      type="checkbox"
                      checked={isDefendant}
                      onChange={e => setIsDefendant(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-0 cursor-pointer"
                    />
                    <span>Acting for Defendant / Respondent</span>
                  </label>
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(docType === 'fee_note' ? 4 : 3)}
                  className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-black dark:hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span>{docType === 'fee_note' ? 'Continue to Remittance & Review' : 'Continue to Folios & Disbursements'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 3: ITEM DIRECTORY & DISBURSEMENTS */}
          {/* ================================================================ */}
          {activeStep === 3 && (
            <div className="space-y-6">
              {/* SECTION A: ITEM WORK */}
              <div className="vercel-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-main)]">Itemized Professional Legal Work</h3>
                    <p className="text-xs text-[var(--text-muted)]">Pleadings, perusals, and professional attendances</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Compact Preset Quick Selector */}
                <div className="flex items-center gap-2">
                  <select
                    onChange={e => {
                      if (!e.target.value) return;
                      const [desc, val] = e.target.value.split('||');
                      handleQuickAddStatutory(desc, Number(val));
                      e.target.value = '';
                    }}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="">+ Insert Standard Statutory Preset...</option>
                    <option value="Drawing Plaint / Statement of Claim||5000">Drawing Plaint (Sched. 6 Item 4) — KES 5,000</option>
                    <option value="Perusing Written Statement of Defence||2500">Perusing Defence (Sched. 6 Item 8) — KES 2,500</option>
                    <option value="Attendance at Court for Mention / Directions||2500">Court Mention (Sched. 6 Item 7) — KES 2,500</option>
                    <option value="Attendance at Court for Substantive Hearing||10000">Court Hearing Whole Day (Sched. 6 Item 7) — KES 10,000</option>
                    <option value="Drawing and Filing Notice of Motion Application||4500">Notice of Motion (Sched. 6 Item 4) — KES 4,500</option>
                    <option value="Drawing Bill of Costs for Taxation||3500">Drawing Bill of Costs (Sched. 6 Item 4(e)) — KES 3,500</option>
                    <option value="Letter of Demand / Statutory Notice||1000">Demand Letter (Sched. 6 Item 6) — KES 1,000</option>
                    <option value="Service of Court Process Summons||1400">Process Service within 3km (Sched. 6 Item 9) — KES 1,400</option>
                  </select>
                </div>

                {/* Items Table */}
                {items.length > 0 && (
                  <div className="border border-[var(--border-color)] rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[var(--bg-subtle)] text-[10px] font-mono uppercase text-slate-400 border-b border-[var(--border-color)]">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3">Particulars</th>
                          <th className="py-2 px-3 text-right w-24">Fee (KES)</th>
                          <th className="py-2 px-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-[var(--bg-subtle)]/50">
                            <td className="py-2 px-3 font-mono font-bold text-slate-400 text-center">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={it.description}
                                onChange={e => {
                                  const copy = [...items];
                                  copy[idx].description = e.target.value;
                                  setItems(copy);
                                }}
                                className="w-full bg-transparent border-none text-[var(--text-main)] focus:outline-none text-xs"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                value={it.unitRate}
                                onChange={e => {
                                  const copy = [...items];
                                  copy[idx].unitRate = parseFloat(e.target.value) || 0;
                                  setItems(copy);
                                }}
                                className="w-full bg-transparent border-none font-mono font-bold text-right text-[var(--text-main)] focus:outline-none text-xs"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeItemRow(idx)}
                                className="text-slate-400 hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add Custom Item */}
                <form onSubmit={handleCreateNewItem} className="flex gap-2">
                  <input
                    type="text"
                    placeholder=""
                    value={newItemDesc}
                    onChange={e => setNewItemDesc(e.target.value)}
                    className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder=""
                    value={newItemVal}
                    onChange={e => setNewItemVal(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-24 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-right text-[var(--text-main)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* SECTION B: DISBURSEMENTS */}
              <div className="vercel-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-main)]">Out-of-Pocket Disbursements</h3>
                    <p className="text-xs text-[var(--text-muted)]">Pass-through expenses (Filing receipts, process server, court fees)</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600">
                    {extraExpenses.length} {extraExpenses.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Compact Preset Quick Selector */}
                <div className="flex items-center gap-2">
                  <select
                    onChange={e => {
                      if (!e.target.value) return;
                      const [desc, val] = e.target.value.split('||');
                      handleQuickAddDisbursement(desc, Number(val));
                      e.target.value = '';
                    }}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="">+ Insert Standard Disbursement Receipt...</option>
                    <option value="Judiciary Court Filing Fee Receipt||5000">Court Filing Fees Receipt — KES 5,000</option>
                    <option value="Licensed Process Server Returns & Service||3500">Process Server Service — KES 3,500</option>
                    <option value="Certified Copies of Judgment & Decree||2000">Certified Copies of Court Order — KES 2,000</option>
                    <option value="Courier, Postage & Delivery Charges||1500">Special Courier Delivery — KES 1,500</option>
                    <option value="Tribunal Hearing Session Fees||50000">Tribunal Sitting Expenses — KES 50,000</option>
                  </select>
                </div>

                {/* Disbursements Table */}
                {extraExpenses.length > 0 && (
                  <div className="border border-[var(--border-color)] rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[var(--bg-subtle)] text-[10px] font-mono uppercase text-slate-400 border-b border-[var(--border-color)]">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3">Expense Particulars</th>
                          <th className="py-2 px-3 text-right w-24">Amount (KES)</th>
                          <th className="py-2 px-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {extraExpenses.map((exp, idx) => (
                          <tr key={idx} className="hover:bg-[var(--bg-subtle)]/50">
                            <td className="py-2 px-3 font-mono font-bold text-slate-400 text-center">D{idx + 1}</td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={exp.description}
                                onChange={e => {
                                  const copy = [...extraExpenses];
                                  copy[idx].description = e.target.value;
                                  setExtraExpenses(copy);
                                }}
                                className="w-full bg-transparent border-none text-[var(--text-main)] focus:outline-none text-xs"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                value={exp.unitRate}
                                onChange={e => {
                                  const copy = [...extraExpenses];
                                  copy[idx].unitRate = parseFloat(e.target.value) || 0;
                                  setExtraExpenses(copy);
                                }}
                                className="w-full bg-transparent border-none font-mono font-bold text-right text-emerald-600 dark:text-emerald-400 focus:outline-none text-xs"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeExpRow(idx)}
                                className="text-slate-400 hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add Custom Disbursement */}
                <form onSubmit={handleCreateNewExp} className="flex gap-2">
                  <input
                    type="text"
                    placeholder=""
                    value={newExpDesc}
                    onChange={e => setNewExpDesc(e.target.value)}
                    className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder=""
                    value={newExpVal}
                    onChange={e => setNewExpVal(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-24 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-right text-[var(--text-main)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </form>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-black dark:hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span>{docType === 'fee_note' ? 'Payment Terms & Review' : 'Review & Endorsement'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 4: ENDORSEMENT OR PAYMENT TERMS (ADAPTS TO DOCTYPE) */}
          {/* ================================================================ */}
          {activeStep === 4 && (
            <div className="space-y-4 pt-1">
              <div className="border-b border-[var(--border-color)] pb-3">
                <h3 className="font-bold text-sm text-[var(--text-main)]">
                  {docType === 'fee_note' ? 'Step 4: Bank Remittance Details & Terms' : 'Step 4: Statutory Endorsements & Service Blocks'}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {docType === 'fee_note' 
                    ? 'Configure bank remittance instructions and payment terms for client'
                    : 'Configure formal filing and service addresses on the record'}
                </p>
              </div>

              {docType === 'fee_note' ? (
                /* ======================================================== */
                /* FEE NOTE PAYMENT & REMITTANCE CONFIG */
                /* ======================================================== */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Bank Name & Account Remittance Details
                    </label>
                    <textarea
                      rows={2}
                      value={bankDetailsText}
                      onChange={e => setBankDetailsText(e.target.value)}
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-main)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Payment Terms & Presentation Notes
                    </label>
                    <textarea
                      rows={3}
                      value={paymentTermsText}
                      onChange={e => setPaymentTermsText(e.target.value)}
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none"
                    />
                  </div>

                </div>
              ) : (
                /* ======================================================== */
                /* COURT BILL ENDORSEMENT CONFIG */
                /* ======================================================== */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Billed To (Instructing Party / Client)</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder=""
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">DRAWN & FILED BY:</label>
                    <textarea
                      rows={4}
                      value={drawnByAddress}
                      onChange={e => setDrawnByAddress(e.target.value)}
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-main)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">TO BE SERVED UPON (Opponent Advocates):</label>
                    <textarea
                      rows={4}
                      value={servedUponAddress}
                      onChange={e => setServedUponAddress(e.target.value)}
                      placeholder=""
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-main)] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Document Execution Toggle */}
              <div className="space-y-2 pt-1 border-t border-[var(--border-color)]">
                {/* Stamp Official (Checked by default) */}
                <label className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] cursor-pointer select-none">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={stampOfficial}
                      onChange={e => setStampOfficial(e.target.checked)}
                      className="w-4 h-4 rounded text-slate-900 focus:ring-0 cursor-pointer"
                    />
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-main)]">
                      <Stamp className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      <span>Stamp Official (Firm Seal with Verification Core)</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">Official Seal</span>
                </label>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(docType === 'fee_note' ? 2 : 3)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  disabled={isExportingExcel}
                  className="px-4 py-2 border border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{docType === 'fee_note' ? 'Export Fee Note Excel' : 'Export Rule 69 Excel'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{docType === 'fee_note' ? 'Download Final Fee Note PDF' : 'Download Final Bill PDF'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* RIGHT COLUMN: STICKY REAL-TIME LIVE A4 COURT DOCUMENT (7 OF 12 COLS) */}
        {/* ================================================================ */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-4">
          
          {/* Top Real-Time Minimalist Action Bar */}
          <div className="bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-2xl p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
            {/* Minimalist Modern Checkbox: PDF Preview */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-[var(--text-main)] px-1">
              <input
                type="checkbox"
                checked={showPdfPreview}
                onChange={(e) => setShowPdfPreview(e.target.checked)}
                className="w-4 h-4 rounded text-slate-900 focus:ring-0 cursor-pointer"
              />
              <span>PDF Preview</span>
            </label>

            {/* Flat Working Action Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Stamp Button */}
              <button
                type="button"
                onClick={() => setStampModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer flex items-center gap-1.5"
                title="View & customize official stamp"
              >
                <Stamp className="w-3.5 h-3.5" />
                <span>Stamp</span>
              </button>

              {/* Save Draft Button */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Save draft to database"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
              </button>

              {/* Share Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShareMenuOpen(!shareMenuOpen);
                    setExportMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                  <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
                </button>
                {shareMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-xl shadow-xl z-50 p-1.5 text-xs animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShareMenuOpen(false);
                        handleEmailClient();
                      }}
                      disabled={isEmailing}
                      className="w-full flex items-center gap-2 p-2 hover:bg-[var(--bg-subtle)] rounded-lg text-left font-medium text-[var(--text-main)] transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                      <span>{isEmailing ? 'Sending...' : 'Email'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShareMenuOpen(false);
                        handleWhatsAppClient();
                      }}
                      disabled={isWhatsAppSending}
                      className="w-full flex items-center gap-2 p-2 hover:bg-[var(--bg-subtle)] rounded-lg text-left font-medium text-[var(--text-main)] transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isWhatsAppSending ? 'Preparing...' : 'WhatsApp'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Export Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(!exportMenuOpen);
                    setShareMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                  <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
                </button>
                {exportMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-xl shadow-xl z-50 p-1.5 text-xs animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setExportMenuOpen(false);
                        handleDownloadPDF();
                      }}
                      disabled={isExportingPdf}
                      className="w-full flex items-center gap-2 p-2 hover:bg-[var(--bg-subtle)] rounded-lg text-left font-medium text-[var(--text-main)] transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-500" />
                      <span>As PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExportMenuOpen(false);
                        handleDownloadExcel();
                      }}
                      disabled={isExportingExcel}
                      className="w-full flex items-center gap-2 p-2 hover:bg-[var(--bg-subtle)] rounded-lg text-left font-medium text-[var(--text-main)] transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                      <span>As Excel</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Download Icon */}
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isExportingPdf}
                className="p-1.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer disabled:opacity-50"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Quick Print Icon */}
              <button
                type="button"
                onClick={handlePrintPDF}
                className="p-1.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                title="Print Document"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* DYNAMIC PREVIEW: INLINE STRUCTURED SUMMARY OR FULL LIVE A4 DOCUMENT */}
          {!showPdfPreview ? (
            /* ======================================================== */
            /* INLINE STRUCTURED SUMMARY VIEW (NO A4 LETTERHEAD)        */
            /* ======================================================== */
            <div className="bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block">Inline Summary</span>
                  <h3 className="font-bold text-sm text-[var(--text-main)]">{docType === 'fee_note' ? 'Professional Fee Note' : getDocumentTitle()}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{matterTitle || 'Professional Legal Services'}</p>
                </div>
                <div className="text-right font-mono text-xs">
                  <p className="font-bold text-[var(--text-main)]">Ref: {documentRef}</p>
                  <p className="text-[var(--text-muted)]">{formatLegalDate(dateBilled)}</p>
                </div>
              </div>

              <div className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-[var(--border-color)] pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Client / Instructing Party:</span>
                  <p className="font-semibold text-[var(--text-main)]">{clientName.trim() || claimantName.trim() || 'Client'}</p>
                  <p className="text-[var(--text-muted)] whitespace-pre-line text-[11px] mt-0.5">{clientAddress}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Law Firm:</span>
                  <p className="font-semibold text-[var(--text-main)]">{activeFirm.name}</p>
                  <p className="text-[var(--text-muted)] text-[11px]">{activeFirm.address} &bull; LSK Roll: {activeFirm.lskRegNo || activeFirm.firmRegNo || 'ADMIN/2026/001'}</p>
                </div>
              </div>

              {/* Summary Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--border-color)] text-[10px] font-mono uppercase text-[var(--text-muted)]">
                    <tr>
                      <th className="py-2 pr-2">#</th>
                      <th className="py-2 pr-4">Particulars</th>
                      <th className="py-2 pr-4">Statutory Basis</th>
                      <th className="py-2 text-right">Amount (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    <tr>
                      <td className="py-2 pr-2 font-mono text-[var(--text-muted)]">1</td>
                      <td className="py-2 pr-4">
                        <span className="font-semibold text-[var(--text-main)]">
                          {isCustomInstruction ? 'Instruction Fee (Agreed Retainer - Sec 45)' : 'Professional Instruction Fees'}
                        </span>
                        {Number(claimValue) > 0 && (
                          <span className="block text-[11px] text-[var(--text-muted)] font-mono">
                            Ad valorem value: KES {Number(claimValue).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-[11px] font-mono text-[var(--text-muted)]">
                        {STATUTORY_SCHEDULES.find(s => s.id === courtSchedule)?.category || 'Statutory Scale'}
                      </td>
                      <td className="py-2 text-right font-mono font-semibold text-[var(--text-main)]">
                        {(result?.instruction_fee || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {(result?.getting_up_fee || 0) > 0 && (
                      <tr>
                        <td className="py-2 pr-2 font-mono text-[var(--text-muted)]">2</td>
                        <td className="py-2 pr-4 font-semibold text-[var(--text-main)]">Getting-Up Fee for Trial (Sched. 6 Item 2)</td>
                        <td className="py-2 pr-4 text-[11px] font-mono text-[var(--text-muted)]">1/3 Instruction Fee</td>
                        <td className="py-2 text-right font-mono font-semibold text-[var(--text-main)]">
                          {(result?.getting_up_fee || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}

                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 pr-2 font-mono text-[var(--text-muted)]">{idx + ((result?.getting_up_fee || 0) > 0 ? 3 : 2)}</td>
                        <td className="py-2 pr-4 text-[var(--text-main)]">{it.description}</td>
                        <td className="py-2 pr-4 text-[11px] font-mono text-[var(--text-muted)]">Professional Attendance</td>
                        <td className="py-2 text-right font-mono text-[var(--text-main)]">
                          {(it.unitRate || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}

                    <tr className="font-bold border-t border-[var(--border-color)]">
                      <td colSpan={3} className="py-2 pr-4 text-right uppercase text-[11px] text-[var(--text-muted)]">Subtotal Professional Fees:</td>
                      <td className="py-2 text-right font-mono text-[var(--text-main)]">
                        {(result?.taxable_subtotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={3} className="py-1.5 pr-4 text-right uppercase text-[11px] text-[var(--text-muted)]">
                        {applyVat ? '16% VAT (Profit Costs):' : 'VAT (Exempt):'}
                      </td>
                      <td className="py-1.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {(applyVat ? (result?.vat_amount || 0) : 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {extraExpenses.length > 0 && (
                      <>
                        {extraExpenses.map((exp, idx) => (
                          <tr key={`exp-${idx}`}>
                            <td className="py-1.5 pr-2 font-mono text-[var(--text-muted)]">D{idx + 1}</td>
                            <td className="py-1.5 pr-4 text-[var(--text-main)]">{exp.description}</td>
                            <td className="py-1.5 pr-4 text-[11px] font-mono text-[var(--text-muted)]">Pass-Through Disbursement</td>
                            <td className="py-1.5 text-right font-mono text-[var(--text-main)]">
                              {exp.unitRate.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold border-t border-[var(--border-color)]">
                          <td colSpan={3} className="py-1.5 pr-4 text-right uppercase text-[11px] text-[var(--text-muted)]">Total Disbursements:</td>
                          <td className="py-1.5 text-right font-mono text-[var(--text-main)]">
                            {(result?.disbursements || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </>
                    )}

                    <tr className="font-bold border-t-2 border-[var(--border-color)] text-sm">
                      <td colSpan={3} className="py-2.5 pr-4 text-right uppercase tracking-wider text-[var(--text-main)]">Total Amount Due:</td>
                      <td className="py-2.5 text-right font-mono font-extrabold text-[var(--text-main)]">
                        KES {(result?.grand_total || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payment Information */}
              <div className="border border-[var(--border-color)] rounded-xl p-3 bg-[var(--bg-subtle)] text-xs space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)] block">Payment Information</span>
                <p className="text-[var(--text-main)]">
                  <strong>Bank:</strong> {activeFirm.bankName || 'KCB Bank Kenya'} &bull; <strong>Branch:</strong> {activeFirm.bankBranch || 'Riverside'} &bull; <strong>A/C No:</strong> {activeFirm.bankAccount || '1104889922'} &bull; <strong>Swift:</strong> {activeFirm.swiftCode || 'KCBLKENX'}
                </p>
                <p className="text-[var(--text-main)]">
                  <strong>M-Pesa Paybill:</strong> {activeFirm.mpesaPaybill || '522522'} &bull; <strong>Account Ref:</strong> {documentRef}
                </p>
              </div>

              <div className="text-[11px] text-[var(--text-muted)] italic text-center pt-1">
                Inline summary mode active. Toggle &ldquo;PDF Preview&rdquo; above to inspect the printable A4 letterhead.
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* THE LIVE A4 COURT DOCUMENT (WYSIWYG - NO BACKGROUND COLORS) */
            /* ======================================================== */
            <div className="border border-slate-300 dark:border-zinc-800 rounded-xl bg-slate-100 dark:bg-zinc-950 p-2 sm:p-4 max-h-[820px] overflow-y-auto shadow-inner">
              <div
                id="live-a4-document"
                className="bg-white text-black p-8 sm:p-10 shadow-lg rounded-sm text-[11px] font-sans leading-normal mx-auto max-w-[210mm] min-h-[297mm] space-y-5"
              >
                {/* Executive Firm Letterhead with Real Transparent Crest */}
                <div className="flex justify-between items-start border-b-2 border-black pb-3">
                  <div className="flex items-center gap-3">
                    {activeFirm.logoUrl && (
                      <img
                        src={activeFirm.logoUrl}
                        alt="Firm Crest"
                        className="w-12 h-12 object-contain shrink-0"
                      />
                    )}
                    <div className="space-y-0.5">
                      <h1 className="font-bold text-base uppercase tracking-tight text-black font-brand">
                        {activeFirm.name}
                      </h1>
                      <span className="text-[8.5px] font-bold text-gray-700 block uppercase tracking-widest font-brand">
                        ADVOCATES OF THE HIGH COURT OF KENYA
                      </span>
                      <span className="text-[8px] text-gray-500 font-mono block">
                        LSK Reg: ${activeFirm.lskRegNo || activeFirm.firmRegNo || 'ADMIN/2026/001'} &bull; KRA PIN: {activeFirm.kraPin || 'P051123456Z'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-[9px] leading-tight text-gray-800 font-sans space-y-0.5">
                    <p>{activeFirm.address}</p>
                    <p>{activeFirm.poBox}</p>
                    <p>{activeFirm.phone} | {activeFirm.email}</p>
                    <p className="font-mono font-bold text-black pt-1">Ref: {documentRef}</p>
                  </div>
                </div>

                {/* DYNAMIC DOCUMENT BODY BASED ON DOCTYPE */}
                {docType === 'fee_note' ? (
                  /* ======================================================== */
                  /* FEE NOTE PROFORMA LIVE A4 PRESENTATION (CLIENT INVOICE) */
                  /* ======================================================== */
                  <div className="space-y-4">
                    {/* Fee Note Title & Metadata Block */}
                    <div className="flex justify-between items-start border-b border-black pb-3">
                      <div className="space-y-1 max-w-[60%]">
                        <span className="font-bold text-[8.5px] uppercase tracking-wider text-gray-600 block">BILLED TO / INSTRUCTING CLIENT:</span>
                        <h2 className="font-bold text-sm uppercase text-black">{clientName.trim() || claimantName.trim() || '[CLIENT NAME]'}</h2>
                        <p className="whitespace-pre-line text-[9.5px] text-gray-700 leading-snug">{clientAddress}</p>
                      </div>
                      <div className="text-right font-mono text-[9.5px] space-y-0.5">
                        <p><strong className="font-sans font-bold">FEE NOTE NO:</strong> {documentRef}</p>
                        <p><strong className="font-sans font-bold">DATE:</strong> {formatLegalDate(dateBilled)}</p>
                        <p><strong className="font-sans font-bold">KRA PIN:</strong> {activeFirm.kraPin || 'P051123456Z'}</p>
                        <p><strong className="font-sans font-bold">VAT REG:</strong> {activeFirm.vatNumber || 'VAT-0192834-K'}</p>
                      </div>
                    </div>

                    {/* Document Title Banner */}
                    <div className="py-2 text-center border-y-2 border-black">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-black">PROFESSIONAL FEE NOTE</h3>
                      <p className="text-[9px] text-gray-700 italic mt-0.5">{getDocumentSubtitle()}</p>
                    </div>

                    {/* Subject Matter Line (No Background Card) */}
                    <div className="py-2 border-b border-black text-[10px]">
                      <span className="font-bold uppercase tracking-wider text-[8.5px] text-gray-700 block">SUBJECT MATTER / TRANSACTION:</span>
                      <p className="font-bold uppercase text-black mt-0.5">{matterTitle || 'Professional Legal Services Rendered'}</p>
                      {isLinkedCourtMatter && forumName && (
                        <p className="text-[9px] text-gray-600 mt-0.5 font-mono">Forum: {forumName}</p>
                      )}
                    </div>

                    {/* 4-Column Professional Fee Note Table (Pure B&W, No Backgrounds) */}
                    <table className="w-full text-left border-collapse border border-black text-[10px]">
                      <thead>
                        <tr className="border-b border-black font-bold uppercase text-[9px]">
                          <th className="p-2 border-r border-black w-10 text-center">#</th>
                          <th className="p-2 border-r border-black">PARTICULARS OF LEGAL SERVICES</th>
                          <th className="p-2 border-r border-black w-36">STATUTORY BASIS</th>
                          <th className="p-2 text-right w-28">AMOUNT (KES)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        <tr className="font-bold border-b border-black">
                          <td colSpan={4} className="p-1 text-center uppercase tracking-wider text-[9px]">
                            SECTION A: PROFESSIONAL LEGAL FEES (PROFIT COSTS)
                          </td>
                        </tr>
                        {/* Item 1: Instruction Fee */}
                        <tr>
                          <td className="p-2 border-r border-black text-center font-bold">1</td>
                          <td className="p-2 border-r border-black leading-snug">
                            <strong className="block font-bold">
                              {isCustomInstruction ? 'Instruction Fees (Agreed Retainer per Section 45)' : 'Professional Instruction Fees'}
                            </strong>
                            <span className="text-gray-700 text-[9.5px]">
                              {Number(claimValue) > 0
                                ? `Assessed ad valorem based on subject transaction value of KES ${Number(claimValue).toLocaleString('en-KE', { minimumFractionDigits: 2 })}.`
                                : 'Professional legal advisory and representation fee.'}
                            </span>
                          </td>
                          <td className="p-2 border-r border-black text-[9px] font-mono text-gray-700">
                            {STATUTORY_SCHEDULES.find(s => s.id === courtSchedule)?.category || 'Statutory Order'}
                          </td>
                          <td className="p-2 text-right font-mono font-bold">
                            {(result?.instruction_fee || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* Line Items */}
                        {items.map((it, i) => (
                          <tr key={i}>
                            <td className="p-2 border-r border-black text-center font-bold">{i + 2}</td>
                            <td className="p-2 border-r border-black">{it.description}</td>
                            <td className="p-2 border-r border-black text-[9px] text-gray-600 font-mono">Professional Attendances</td>
                            <td className="p-2 text-right font-mono">
                              {(it.unitRate || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}

                        {/* Subtotal Profit Costs */}
                        <tr className="font-bold border-t-2 border-black">
                          <td colSpan={3} className="p-2 text-right uppercase text-[9px]">Subtotal Professional Legal Fees:</td>
                          <td className="p-2 text-right font-mono font-bold">
                            {(result?.taxable_subtotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* VAT */}
                        <tr className="font-semibold border-t border-black">
                          <td colSpan={3} className="p-2 text-right uppercase text-[9px]">
                            {applyVat ? 'VAT (16% on Professional Fees — VAT Act 2013):' : 'VAT (16% — Exempt):'}
                          </td>
                          <td className="p-2 text-right font-mono font-bold">
                            {(applyVat ? (result?.vat_amount || 0) : 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* Section B: Disbursements */}
                        {extraExpenses.length > 0 && (
                          <>
                            <tr className="font-bold border-t-2 border-b border-black">
                              <td colSpan={4} className="p-1 text-center uppercase tracking-wider text-[9px]">
                                SECTION B: OUT-OF-POCKET DISBURSEMENTS (ZERO-RATED / PASS-THROUGH)
                              </td>
                            </tr>
                            {extraExpenses.map((exp, i) => (
                              <tr key={`exp-${i}`}>
                                <td className="p-2 border-r border-black text-center font-bold font-mono">D{i + 1}</td>
                                <td className="p-2 border-r border-black">{exp.description}</td>
                                <td className="p-2 border-r border-black text-[9px] text-gray-600 font-mono">Receipt Attached</td>
                                <td className="p-2 text-right font-mono font-bold">
                                  {exp.unitRate.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                            <tr className="font-bold border-t border-black">
                              <td colSpan={3} className="p-2 text-right uppercase text-[9px]">Total Out-of-Pocket Disbursements:</td>
                              <td className="p-2 text-right font-mono font-bold">
                                {(result?.disbursements || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </>
                        )}

                        {/* Grand Total */}
                        <tr className="font-bold border-t-2 border-b-2 border-black text-black">
                          <td colSpan={3} className="p-2.5 text-right uppercase tracking-wider text-[10px] font-bold">
                            TOTAL AMOUNT DUE FOR REMITTANCE (KES):
                          </td>
                          <td className="p-2.5 text-right font-mono font-extrabold text-xs text-black">
                            {(result?.grand_total || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Payment Information Box (Minimalist, Bank & MPesa Details Only) */}
                    <div className="border border-black p-3 text-[9.5px] space-y-1.5">
                      <p className="font-bold uppercase tracking-wider text-[9px] text-black">PAYMENT INFORMATION</p>
                      <p className="text-gray-900 leading-relaxed">
                        <strong className="font-bold">Bank:</strong> {activeFirm.bankName || 'KCB Bank Kenya'} &bull; <strong className="font-bold">Branch:</strong> {activeFirm.bankBranch || 'Riverside'} &bull; <strong className="font-bold">Account:</strong> {activeFirm.bankAccount || '1104889922'} &bull; <strong className="font-bold">Swift:</strong> {activeFirm.swiftCode || 'KCBLKENX'}
                      </p>
                      <p className="text-gray-900">
                        <strong className="font-bold">M-Pesa Paybill:</strong> {activeFirm.mpesaPaybill || '522522'} &bull; <strong className="font-bold">Account Ref:</strong> {documentRef}
                      </p>
                    </div>

                    {/* Sign-off: Date on Left, Endorsement & Scannable QR Code on Right */}
                    <div className="pt-6 pb-2 text-[10px] font-sans">
                      <div className="flex justify-between items-start">
                        {/* Left Side: Date & Reference */}
                        <div className="space-y-1">
                          <p><strong>Dated:</strong> {formatLegalDate(dateBilled)}</p>
                          <p className="text-[9px] text-gray-700 font-mono"><strong>Ref:</strong> {documentRef}</p>
                        </div>

                        {/* Center / Right Side: Signature Blank, Stamp, Name, Roll & Scannable QR */}
                        <div className="flex flex-col items-center text-center min-w-[240px]">
                          {stampOfficial && (
                            <div className="mb-[-24px] w-28 h-28 select-none pointer-events-none">
                              <img
                                src={stampImageUrl}
                                alt="Official Firm Stamp"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}

                          <div className="border-b border-black w-60 mb-1.5"></div>
                          <p className="font-bold uppercase font-brand text-[11px] tracking-tight">{activeFirm.name}</p>
                          <p className="font-bold uppercase text-[9px] text-gray-700">
                            ADVOCATES &amp; COMMISSIONERS FOR OATHS
                          </p>
                          <p className="text-[8px] text-gray-600 font-mono">LSK Practicing Roll: ${activeFirm.lskRegNo || activeFirm.firmRegNo || 'ADMIN/2026/001'}</p>

                          {/* Scannable Confirmation QR Code right under the words */}
                          {securityRecord?.qrCodeDataUrl && (
                            <div className="mt-3 flex flex-col items-center">
                              <img
                                src={securityRecord.qrCodeDataUrl}
                                alt="Confirmation QR"
                                className="w-16 h-16 object-contain"
                              />
                              <span className="text-[7.5px] font-mono text-gray-600 mt-1">Scan to verify authenticity</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ======================================================== */
                  /* HIGH COURT BILL OF COSTS LIVE A4 PRESENTATION            */
                  /* ======================================================== */
                  <div className="space-y-4">
                    {/* Official Court & Cause Heading */}
                    <div className="text-center space-y-1 py-1">
                      {forumName.split('\n').map((line, i) => (
                        <h2 key={i} className={`uppercase text-[11px] font-bold ${i === 0 ? 'underline' : ''}`}>{line}</h2>
                      ))}
                      {matterTitle && (
                        <p className="font-bold text-[10.5px] uppercase tracking-wide mt-1">{matterTitle}</p>
                      )}
                    </div>

                    {/* Parties Caption Box */}
                    <div className="border border-black p-2.5 text-[10.5px] space-y-1.5">
                      <div className="flex justify-between items-baseline font-bold uppercase">
                        <span>{claimantName.trim() || clientName.trim() || '[CLAIMANT / PLAINTIFF]'}</span>
                        <span className="text-[9px] text-gray-700 font-mono">
                          {docType === 'advocate_client' ? 'APPLICANT / ADVOCATE' : isDefendant ? 'RESPONDENT' : 'CLAIMANT'}
                        </span>
                      </div>
                      <div className="text-center font-bold text-[9px] tracking-widest text-gray-500">— VERSUS —</div>
                      <div className="flex justify-between items-baseline font-bold uppercase">
                        <span>{respondentName.trim() || '[RESPONDENT / DEFENDANT]'}</span>
                        <span className="text-[9px] text-gray-700 font-mono">
                          {docType === 'advocate_client' ? 'RESPONDENT / CLIENT' : isDefendant ? 'CLAIMANT' : 'RESPONDENT'}
                        </span>
                      </div>
                    </div>

                    {/* Client & Metadata Bar */}
                    <div className="grid grid-cols-2 gap-4 border-b border-black pb-2 text-[10px]">
                      <div>
                        <span className="font-bold block text-[8.5px] uppercase tracking-wider text-gray-600">BILLED TO:</span>
                        <p className="font-bold text-xs uppercase">{clientName.trim() || claimantName.trim() || 'Client'}</p>
                      </div>
                      <div className="text-right font-mono space-y-0.5">
                        <p><strong className="font-sans font-bold">REF:</strong> {documentRef}</p>
                        <p><strong className="font-sans font-bold">DATE:</strong> {formatLegalDate(dateBilled)}</p>
                        <p><strong className="font-sans font-bold">CLAIM VALUE:</strong> {claimValue ? `KES ${Number(claimValue).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` : 'Non-Monetary'}</p>
                      </div>
                    </div>

                    {/* Document Title Banner */}
                    <div className="py-2 text-center border-y-2 border-black">
                      <h3 className="font-bold text-xs uppercase tracking-wide text-black">{getDocumentTitle()}</h3>
                      <p className="text-[9px] text-gray-700 italic mt-0.5">{getDocumentSubtitle()}</p>
                    </div>

                    {/* Authentic 5-Column Taxation Table (Pure B&W) */}
                    <table className="w-full text-left border-collapse border border-black text-[10px]">
                      <thead>
                        <tr className="border-b border-black font-bold uppercase text-[9px]">
                          <th className="p-2 border-r border-black w-20">DATE</th>
                          <th className="p-2 border-r border-black w-12 text-center">ITEM</th>
                          <th className="p-2 border-r border-black">PARTICULARS OF SERVICES RENDERED</th>
                          <th className="p-2 border-r border-black text-right w-24">CLAIMED (KES)</th>
                          <th className="p-2 text-right w-20">TAXED OFF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {/* Section A: Profit Costs Header */}
                        <tr className="font-bold border-b border-black">
                          <td colSpan={5} className="p-1 text-center uppercase tracking-wider text-[9px]">
                            SECTION A: PROFIT COSTS &amp; PROFESSIONAL SERVICES
                          </td>
                        </tr>

                        {/* Item 1: Instruction Fee */}
                        <tr>
                          <td className="p-2 border-r border-black font-mono text-[9px]">{formatLegalDate(dateBilled)}</td>
                          <td className="p-2 border-r border-black text-center font-bold">1</td>
                          <td className="p-2 border-r border-black leading-snug">
                            <strong className="block font-bold">
                              {isCustomInstruction ? 'Instruction Fees (Agreed / Retainer per Section 45)' : 'Instruction Fees (Statutory Tariff)'}
                            </strong>
                            <span className="text-gray-700 text-[9.5px]">
                              To receiving instructions to act on behalf of the {docType === 'advocate_client' ? 'Client' : isDefendant ? 'Respondent' : 'Claimant'} in this matter.{' '}
                              {Number(claimValue) > 0
                                ? `Assessed ad valorem on subject value of KES ${Number(claimValue).toLocaleString('en-KE', { minimumFractionDigits: 2 })}.`
                                : 'Subject matter is non-monetary / unquantified; assessed at statutory floor.'}
                              {docType === 'advocate_client' && ' Includes statutory 50% Advocate & Client uplift under Part B.'}
                            </span>
                          </td>
                          <td className="p-2 border-r border-black text-right font-mono font-bold">
                            {(result?.instruction_fee || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right"></td>
                        </tr>

                        {/* Item 2: Getting-Up Fee (if litigation and defended) */}
                        {(result?.getting_up_fee || 0) > 0 && (
                          <tr>
                            <td className="p-2 border-r border-black font-mono text-[9px]">{formatLegalDate(dateBilled)}</td>
                            <td className="p-2 border-r border-black text-center font-bold">2</td>
                            <td className="p-2 border-r border-black leading-snug">
                              <strong className="block font-bold">Getting-Up Fees for Trial (Sched. 6 Item 2)</strong>
                              <span className="text-gray-700 text-[9.5px]">Preparation for trial in defended proceedings (1/3 of Instruction Fee).</span>
                            </td>
                            <td className="p-2 border-r border-black text-right font-mono font-bold">
                              {(result?.getting_up_fee || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 text-right"></td>
                          </tr>
                        )}

                        {/* Line Items */}
                        {items.map((it, i) => (
                          <tr key={i}>
                            <td className="p-2 border-r border-black font-mono text-[9px]">{formatLegalDate(dateBilled)}</td>
                            <td className="p-2 border-r border-black text-center font-bold">
                              {i + ((result?.getting_up_fee || 0) > 0 ? 3 : 2)}
                            </td>
                            <td className="p-2 border-r border-black">{it.description}</td>
                            <td className="p-2 border-r border-black text-right font-mono">
                              {(it.unitRate || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 text-right"></td>
                          </tr>
                        ))}

                        {/* Item for Taxation Attendance - Rule 69(3) Advocates Remuneration Order */}
                        <tr>
                          <td className="p-2 border-r border-black font-mono text-[9px]">{formatLegalDate(dateBilled)}</td>
                          <td className="p-2 border-r border-black text-center font-bold">
                            {items.length + ((result?.getting_up_fee || 0) > 0 ? 3 : 2)}
                          </td>
                          <td className="p-2 border-r border-black leading-snug">
                            <strong className="block font-bold">Attending taxation of this Bill of Costs before the Taxing Officer</strong>
                            <span className="text-gray-600 italic text-[9px]">(Rule 69(3) Advocates Remuneration Order - Amount left blank for Taxing Officer to assess)</span>
                          </td>
                          <td className="p-2 border-r border-black text-right font-mono text-[9px] text-gray-500 italic">
                            [ To be assessed ]
                          </td>
                          <td className="p-2 text-right"></td>
                        </tr>

                        {/* Subtotal Profit Costs */}
                        <tr className="font-bold border-t-2 border-black">
                          <td colSpan={3} className="p-2 text-right uppercase text-[9px]">Subtotal Professional Fees:</td>
                          <td className="p-2 border-r border-black text-right font-mono font-bold">
                            {(result?.taxable_subtotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right"></td>
                        </tr>

                        {/* VAT */}
                        <tr className="font-semibold border-t border-black">
                          <td colSpan={3} className="p-2 text-right uppercase text-[9px]">
                            {applyVat ? 'VAT (16% on Professional Fees — VAT Act 2013):' : 'VAT (16% — Exempt):'}
                          </td>
                          <td className="p-2 border-r border-black text-right font-mono font-bold">
                            {(applyVat ? (result?.vat_amount || 0) : 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right"></td>
                        </tr>

                        {/* Section B: Disbursements */}
                        {extraExpenses.length > 0 && (
                          <>
                            <tr className="font-bold border-t-2 border-b border-black">
                              <td colSpan={5} className="p-1 text-center uppercase tracking-wider text-[9px]">
                                SECTION B: OUT-OF-POCKET DISBURSEMENTS (ZERO-RATED / PASS-THROUGH)
                              </td>
                            </tr>
                            {extraExpenses.map((exp, i) => (
                              <tr key={`exp-${i}`}>
                                <td className="p-2 border-r border-black font-mono text-[9px]">{formatLegalDate(dateBilled)}</td>
                                <td className="p-2 border-r border-black text-center font-bold font-mono">D{i + 1}</td>
                                <td className="p-2 border-r border-black">{exp.description}</td>
                                <td className="p-2 border-r border-black text-right font-mono font-bold">
                                  {exp.unitRate.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-2 text-right"></td>
                              </tr>
                            ))}
                            <tr className="font-bold border-t border-black">
                              <td colSpan={3} className="p-2 text-right uppercase text-[9px]">Total Out-of-Pocket Disbursements:</td>
                              <td className="p-2 border-r border-black text-right font-mono font-bold">
                                {(result?.disbursements || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-2 text-right"></td>
                            </tr>
                          </>
                        )}

                        {/* Grand Total */}
                        <tr className="font-bold border-t-2 border-b-2 border-black text-black">
                          <td colSpan={3} className="p-2.5 text-right uppercase tracking-wider text-[10px] font-bold">GRAND TOTAL AMOUNT DUE (KES):</td>
                          <td className="p-2.5 border-r border-black text-right font-mono font-extrabold text-xs text-black">
                            {(result?.grand_total || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-right"></td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Endorsement & Sign-Off Block */}
                    <div className="pt-6 pb-2 text-[10px] font-sans">
                      <div className="flex justify-between items-start">
                        {/* Left Side: Date & Reference */}
                        <div className="space-y-1">
                          <p><strong>Dated:</strong> {formatLegalDate(dateBilled)}</p>
                          <p className="text-[9px] text-gray-700 font-mono"><strong>Ref:</strong> {documentRef}</p>
                        </div>

                        {/* Center / Right Side: Signature Blank, Stamp, Role & Scannable QR */}
                        <div className="flex flex-col items-center text-center min-w-[240px]">
                          {stampOfficial && (
                            <div className="mb-[-24px] w-28 h-28 select-none pointer-events-none">
                              <img
                                src={stampImageUrl}
                                alt="Official Firm Stamp"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}

                          <div className="border-b border-black w-60 mb-1.5"></div>
                          <p className="font-bold uppercase font-brand text-[11px] tracking-tight">{activeFirm.name}</p>
                          <p className="font-bold uppercase text-[9px] text-gray-700">
                            {docType === 'advocate_client' ? 'ADVOCATES FOR THE APPLICANT' : `ADVOCATES FOR THE ${isDefendant ? 'RESPONDENT' : 'CLAIMANT'}`}
                          </p>
                          <p className="text-[8px] text-gray-600 font-mono">LSK Practicing Roll: ${activeFirm.lskRegNo || activeFirm.firmRegNo || 'ADMIN/2026/001'}</p>

                          {/* Scannable Confirmation QR Code right under the words */}
                          {securityRecord?.qrCodeDataUrl && (
                            <div className="mt-3 flex flex-col items-center">
                              <img
                                src={securityRecord.qrCodeDataUrl}
                                alt="Confirmation QR"
                                className="w-16 h-16 object-contain"
                              />
                              <span className="text-[7.5px] font-mono text-gray-600 mt-1">Scan to verify authenticity</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8 pt-6 border-t border-black text-[9.5px]">
                        <div>
                          <p className="font-bold underline uppercase mb-1">DRAWN &amp; FILED BY:</p>
                          <p className="whitespace-pre-line text-gray-800">{drawnByAddress}</p>
                        </div>
                        <div>
                          <p className="font-bold underline uppercase mb-1">TO BE SERVED UPON:</p>
                          {servedUponAddress.trim() ? (
                            <p className="whitespace-pre-line text-gray-800">{servedUponAddress}</p>
                          ) : (
                            <p className="text-gray-400 italic text-[9px]">
                              [Opponent Advocate details to be endorsed upon filing and service]
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

      </div>

      {/* Stamp Preview & Customization Modal */}
      {stampModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[var(--text-main)]">
                  <Stamp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">Official Firm Stamp</h4>
                  <p className="text-[10px] text-[var(--text-muted)]">Applied on document preview and exported PDFs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStampModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stamp Image Preview */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700">
              <div className="relative w-32 h-32 flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg p-2 shadow-xs">
                <img
                  src={stampImageUrl}
                  alt="Official Firm Stamp"
                  className="max-w-full max-h-full object-contain select-none"
                />
              </div>
              <span className="text-[10px] text-[var(--text-muted)] mt-2 font-mono">
                {stampImageUrl.startsWith('data:') ? 'Custom stamp loaded' : 'Default firm stamp (/stamp.png)'}
              </span>
            </div>

            {/* Stamp Toggle */}
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={stampOfficial}
                  onChange={e => setStampOfficial(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-semibold text-[var(--text-main)]">Stamp Official on Document</span>
              </div>
              <span className={`text-[10px] font-bold ${stampOfficial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                {stampOfficial ? 'Enabled' : 'Disabled'}
              </span>
            </label>

            {/* Hidden File Input and Buttons */}
            <input
              type="file"
              ref={stampFileInputRef}
              onChange={handleStampFileChange}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
            />

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => stampFileInputRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Change Stamp</span>
              </button>
              {stampImageUrl !== '/stamp.png' && (
                <button
                  type="button"
                  onClick={handleResetStamp}
                  className="py-2 px-3 rounded-xl border border-[var(--border-color)] hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer flex items-center gap-1"
                  title="Reset to default firm stamp"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setStampModalOpen(false)}
              className="w-full py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
