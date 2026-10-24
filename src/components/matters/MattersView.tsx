import React, { useState } from 'react';
import {
  ExactMatterRecord,
  ExactFeeNoteRecord,
  ExactVaultFileRecord,
  ExactClientRecord,
  SystemUser,
  getFeeNotes,
  persistFeeNotes,
  saveFeeNoteToDatabase,
  fetchFeeNotesFromDatabase,
  getClients
} from '../../services/supabase';
import {
  fetchMatterRelatedData,
  fetchMatters,
  createMatter,
  updateMatter,
  deleteMatter,
  fetchClients
} from '../../services/data';
import { sendEmail } from '../../services/email';
import { hasPermission } from '../../services/rbac';
import {
  Plus,
  Users,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  X,
  FileText,
  Building2,
  ExternalLink,
  FolderOpen,
  ArrowRight,
  Scale,
  CheckSquare,
  Square,
  Gavel,
  Calendar,
  DollarSign,
  AlertCircle,
  Mail,
  Send,
  Share2,
  Receipt
} from 'lucide-react';

interface MattersViewProps {
  onNavigateTab?: (tab: string, targetUserId?: string) => void;
  onNavigateToBuilder?: (note?: any, isPreview?: boolean) => void;
  currentUser?: SystemUser | null;
}

export const MattersView: React.FC<MattersViewProps> = ({ onNavigateTab, onNavigateToBuilder, currentUser }) => {
  const [mattersList, setMattersList] = useState<ExactMatterRecord[]>([]);
  const [feeNotes, setFeeNotes] = useState<ExactFeeNoteRecord[]>(() => getFeeNotes());
  const [clients, setClients] = useState<ExactClientRecord[]>(() => getClients());
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [forumFilter, setForumFilter] = useState('All');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedMatterIds, setSelectedMatterIds] = useState<string[]>([]);
  const [, setPermissionTick] = useState(0);

  const can = (code: string) => hasPermission(currentUser, code);

  // Matter Detail Modal / Drawer State
  const [selectedMatter, setSelectedMatter] = useState<ExactMatterRecord | null>(null);
  const [selectedClient, setSelectedClient] = useState<ExactClientRecord | null>(null);
  const [selectedFeeNotes, setSelectedFeeNotes] = useState<ExactFeeNoteRecord[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<ExactVaultFileRecord[]>([]);

  // Edit Matter Modal State
  const [editingMatter, setEditingMatter] = useState<ExactMatterRecord | null>(null);

  // New Matter Form Modal State
  const [showNewMatterModal, setShowNewMatterModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCaseNo, setNewCaseNo] = useState('');
  const [newForum, setNewForum] = useState('High Court — Commercial');
  const [newApplicant, setNewApplicant] = useState('');
  const [newRespondent, setNewRespondent] = useState('');
  const [newClaimAmount, setNewClaimAmount] = useState<number>(0);

  // Email Share Modal State
  const [emailShareMatter, setEmailShareMatter] = useState<ExactMatterRecord | null>(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingMatterEmail, setIsSendingMatterEmail] = useState(false);
  const [shareToast, setShareToast] = useState('');

  React.useEffect(() => {
    const handlePermissions = () => {
      setPermissionTick(t => t + 1);
    };
    window.addEventListener('permissionsUpdated', handlePermissions);
    window.addEventListener('storage', handlePermissions);
    return () => {
      window.removeEventListener('permissionsUpdated', handlePermissions);
      window.removeEventListener('storage', handlePermissions);
    };
  }, []);

  React.useEffect(() => {
    const firmId = currentUser?.firmId || 'firm-001';
    const loadMatters = () => fetchMatters(firmId).then(setMattersList).catch(error => setErrorMessage(error.message || 'Unable to load matters.'));
    void loadMatters();

    // Load fee notes and clients for automatic linkage
    fetchFeeNotesFromDatabase(firmId).then(setFeeNotes).catch(() => setFeeNotes(getFeeNotes()));
    fetchClients(firmId).then(setClients).catch(() => setClients(getClients()));

    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ table?: string }>).detail;
      if (detail?.table === 'matters') void loadMatters();
      if (detail?.table === 'fee_notes') {
        fetchFeeNotesFromDatabase(firmId).then(setFeeNotes).catch(() => setFeeNotes(getFeeNotes()));
      }
      if (detail?.table === 'clients') {
        fetchClients(firmId).then(setClients).catch(() => setClients(getClients()));
      }
    };
    const handleMattersUpdated = (event: any) => {
      if (event?.detail && Array.isArray(event.detail)) {
        setMattersList(event.detail);
      } else {
        void loadMatters();
      }
    };
    window.addEventListener('databaseRealtimeUpdate', handleRealtime);
    window.addEventListener('mattersUpdated', handleMattersUpdated);
    window.addEventListener('storage', loadMatters);
    return () => {
      window.removeEventListener('databaseRealtimeUpdate', handleRealtime);
      window.removeEventListener('mattersUpdated', handleMattersUpdated);
      window.removeEventListener('storage', loadMatters);
    };
  }, [currentUser?.firmId]);

  // Auto-open targeted matter from Dashboard deep-link
  React.useEffect(() => {
    if (mattersList.length === 0) return;
    const targetId = sessionStorage.getItem('OPEN_MATTER_ID');
    const targetAction = sessionStorage.getItem('OPEN_MATTER_ACTION');
    if (targetId) {
      const found = mattersList.find(m => m.id === targetId || m.caseNo === targetId);
      if (found) {
        if (targetAction === 'edit') {
          setEditingMatter(found);
          setSelectedMatter(null);
        } else {
          setSelectedMatter(found);
          setEditingMatter(null);
        }
      }
      sessionStorage.removeItem('OPEN_MATTER_ID');
      sessionStorage.removeItem('OPEN_MATTER_ACTION');
    }
  }, [mattersList]);

  // Load related dossier data when matter selected
  React.useEffect(() => {
    const firmId = currentUser?.firmId || 'firm-001';
    if (!selectedMatter) return;
    const loadRelated = () => fetchMatterRelatedData(firmId, selectedMatter.id).then(related => {
      setSelectedClient(related.client);
      setSelectedFeeNotes(related.feeNotes as ExactFeeNoteRecord[]);
      setSelectedDocuments(related.documents as ExactVaultFileRecord[]);
    }).catch(() => {
      setSelectedClient(null);
      setSelectedFeeNotes([]);
      setSelectedDocuments([]);
    });
    void loadRelated();
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ table?: string }>).detail;
      if (['fee_notes', 'documents', 'matters'].includes(detail?.table || '')) void loadRelated();
    };
    window.addEventListener('databaseRealtimeUpdate', handleRealtime);
    return () => window.removeEventListener('databaseRealtimeUpdate', handleRealtime);
  }, [currentUser?.firmId, selectedMatter?.id]);

  // Helpers to resolve connected Fee Note and Client
  const getLinkedFeeNote = (m: ExactMatterRecord) => {
    return feeNotes.find(fn => 
      (fn.matterId && fn.matterId === m.id) ||
      (fn.matterTitle && m.title && fn.matterTitle.toLowerCase().trim() === m.title.toLowerCase().trim()) ||
      (m.feeNoteLink && fn.billNumber === m.feeNoteLink)
    );
  };

  const getLinkedClient = (m: ExactMatterRecord, linkedFn?: ExactFeeNoteRecord) => {
    return clients.find(c =>
      (m.applicant && (c.name.toLowerCase().trim() === m.applicant.toLowerCase().trim() || c.company?.toLowerCase().trim() === m.applicant.toLowerCase().trim())) ||
      (linkedFn && linkedFn.clientName && c.name.toLowerCase().trim() === linkedFn.clientName.toLowerCase().trim()) ||
      (m.applicant && (c.name.toLowerCase().includes(m.applicant.toLowerCase()) || m.applicant.toLowerCase().includes(c.name.toLowerCase())))
    );
  };

  // 1-Tap Bill of Costs generation deep link: opens connected fee note directly in Fee Note Builder!
  const handleDraftBOC = (matter: ExactMatterRecord) => {
    if (!onNavigateToBuilder) return;
    const existing = getLinkedFeeNote(matter);
    if (existing) {
      onNavigateToBuilder(existing, false);
      return;
    }

    let schedule = 'schedule_6_high_court';
    const f = (matter.forum || '').toLowerCase();
    if (f.includes('magistrate') || f.includes('subordinate')) {
      schedule = 'schedule_7_magistrate';
    } else if (f.includes('arbitrat')) {
      schedule = 'schedule_11_tribunals';
    } else if (f.includes('conveyanc')) {
      schedule = 'schedule_1_conveyancing';
    } else if (f.includes('court of appeal') || f.includes('appellate')) {
      schedule = 'schedule_8_court_of_appeal';
    }

    onNavigateToBuilder({
      matterId: matter.id,
      matterTitle: matter.title,
      caseNo: matter.caseNo,
      clientName: matter.applicant,
      claimValue: matter.amount,
      courtSchedule: schedule,
      forumName: matter.forum,
      claimantName: matter.applicant,
      respondentName: matter.respondent,
    }, false);
  };

  // Filter matters by search & forum chip
  const filtered = mattersList.filter(m => {
    const q = search.toLowerCase();
    const matchesSearch =
      m.title.toLowerCase().includes(q) ||
      m.caseNo.toLowerCase().includes(q) ||
      m.applicant.toLowerCase().includes(q) ||
      m.respondent.toLowerCase().includes(q) ||
      m.forum.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (forumFilter === 'All') return true;
    const forum = m.forum.toLowerCase();
    if (forumFilter === 'Commercial' && (forum.includes('commercial') || m.caseNo.toUpperCase().includes('HCCC'))) return true;
    if (forumFilter === 'ELC / ELRC' && (forum.includes('elc') || forum.includes('elrc') || forum.includes('land') || forum.includes('labour'))) return true;
    if (forumFilter === 'Magistrate' && (forum.includes('magistrate') || forum.includes('subordinate') || forum.includes('cmcc'))) return true;
    if (forumFilter === 'Arbitration' && (forum.includes('arbitrat') || forum.includes('ncia'))) return true;
    if (forumFilter === 'Conveyancing' && forum.includes('conveyanc')) return true;
    return false;
  });

  // Batch toggle
  const toggleSelectAll = () => {
    if (selectedMatterIds.length === filtered.length) {
      setSelectedMatterIds([]);
    } else {
      setSelectedMatterIds(filtered.map(m => m.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedMatterIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Bulk status update
  const handleBulkStatus = async (newStatus: 'Active' | 'Concluded' | 'Stayed' | 'Pending Taxation') => {
    if (selectedMatterIds.length === 0 || !currentUser?.firmId) return;
    try {
      for (const id of selectedMatterIds) {
        const item = mattersList.find(m => m.id === id);
        if (item) {
          await updateMatter(currentUser.firmId, id, { ...item, status: newStatus });
        }
      }
      setMattersList(prev => prev.map(m => selectedMatterIds.includes(m.id) ? { ...m, status: newStatus } : m));
      setSelectedMatterIds([]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Batch status update failed.');
    }
  };

  const handleUpdateMatter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatter || !currentUser?.firmId) return;
    try {
      const savedMatter = await updateMatter(currentUser.firmId, editingMatter.id, editingMatter);
      setMattersList(prev => prev.map(m => m.id === savedMatter.id ? savedMatter : m));
      setEditingMatter(null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to update matter.');
    }
  };

  const handleCreateMatter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !currentUser?.firmId) return;

    const caseNumber = newCaseNo.trim() || 'HCCC Cause No. E' + Math.floor(100 + Math.random() * 900) + ' of 2026';
    const yr = new Date().getFullYear().toString().slice(-2);
    const mo = String(new Date().getMonth() + 1).padStart(2, '0');
    const docNum = String(feeNotes.length + 1).padStart(3, '0');
    const feeNoteBillNo = `BOC${yr}${mo}${docNum}`;

    const newRecord: Partial<ExactMatterRecord> = {
      title: newTitle.trim(),
      caseNo: caseNumber,
      forum: newForum,
      applicant: newApplicant.trim() || 'Claimant',
      applicantRole: 'Claimant',
      respondent: newRespondent.trim() || 'Respondent',
      respondentRole: 'Respondent',
      amount: newClaimAmount,
      status: 'Active',
      filedBy: currentUser?.fullName || 'Guyo Halake',
      feeNoteLink: feeNoteBillNo
    };

    try {
      const savedMatter = await createMatter(currentUser.firmId, newRecord);

      // Automatically connect a draft Fee Note so all matters are connected to a fee note
      const baseInstruction = Math.max(75000, Math.round(savedMatter.amount * 0.05));
      const gettingUp = Math.round(baseInstruction / 3);
      const newFeeNote: ExactFeeNoteRecord = {
        id: `fn-${Date.now()}`,
        billNumber: feeNoteBillNo,
        matterId: savedMatter.id,
        matterTitle: savedMatter.title,
        clientName: savedMatter.applicant,
        courtSchedule: newForum.toLowerCase().includes('magistrate') ? 'Schedule 7 — Subordinate Courts' : 'Schedule 6 — High Court Commercial',
        claimValue: savedMatter.amount,
        instructionFee: baseInstruction,
        gettingUpFee: gettingUp,
        grandTotal: Math.round(baseInstruction + gettingUp + 17000),
        status: 'draft',
        createdAt: new Date().toISOString(),
        generatedByUser: currentUser?.fullName || 'Guyo Halake',
        generatedByUserId: currentUser?.id || 'usr-001',
        pdfUrl: '',
        excelUrl: ''
      };

      try {
        await saveFeeNoteToDatabase(newFeeNote);
      } catch (err) {
        console.warn('Auto fee note save note:', err);
      }
      const updatedNotes = [newFeeNote, ...feeNotes];
      setFeeNotes(updatedNotes);
      persistFeeNotes(updatedNotes);

      setMattersList(prev => [savedMatter, ...prev]);
      setShowNewMatterModal(false);
      setNewTitle('');
      setNewCaseNo('');
      setNewApplicant('');
      setNewRespondent('');
      setNewClaimAmount(0);
      setShareToast(`Matter "${savedMatter.title}" created & linked to Fee Note ${feeNoteBillNo}!`);
      setTimeout(() => setShareToast(''), 4000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to create matter.');
    }
  };

  const handleDeleteMatter = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to permanently delete matter "${title}"?`)) {
      if (!currentUser?.firmId) return;
      try {
        await deleteMatter(currentUser.firmId, id);
        setMattersList(prev => prev.filter(m => m.id !== id));
        if (selectedMatter?.id === id) setSelectedMatter(null);
        if (editingMatter?.id === id) setEditingMatter(null);
        setShareToast(`Matter "${title}" deleted successfully.`);
        setTimeout(() => setShareToast(''), 3500);
      } catch (error: any) {
        setErrorMessage(error.message || 'Unable to delete matter.');
      }
      setActiveMenuId(null);
    }
  };

  const handleOpenEmailShare = (m: ExactMatterRecord) => {
    const linkedFn = getLinkedFeeNote(m);
    const linkedC = getLinkedClient(m, linkedFn);
    setEmailShareMatter(m);
    setEmailRecipient(linkedC?.email || '');
    setEmailSubject(`Matter File: ${m.caseNo} — ${m.title}`);
    setEmailBody(
`Dear ${m.applicant || 'Client'},

Matter Title: ${m.title}
Case Number: ${m.caseNo}
Court Forum: ${m.forum}

File Summary:
• Claimant / Client: ${m.applicant}
• Defendant: ${m.respondent}
• Claim Amount: KES ${m.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
• Status: ${m.status}
• Connected Fee Note: ${linkedFn ? linkedFn.billNumber : 'No fee note linked'}

Please let us know if you require any additional documents or filings.

Best regards,
${currentUser?.fullName || 'Karani Law Advocates'}`
    );
  };

  const handleSendMatterEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecipient.trim() || !emailShareMatter) return;
    setIsSendingMatterEmail(true);
    try {
      await sendEmail({
        to: [emailRecipient.trim()],
        subject: emailSubject,
        body: emailBody,
        category: 'firm_to_client'
      });
      setShareToast(`Matter file emailed to ${emailRecipient.trim()} successfully!`);
      setTimeout(() => setShareToast(''), 3500);
      setEmailShareMatter(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to send email.');
    } finally {
      setIsSendingMatterEmail(false);
    }
  };

  // High Court & Kenyan Forum badge formatter
  const getKenyanCaseBadge = (caseNo: string, forum: string) => {
    const f = (forum || '').toLowerCase();
    const c = (caseNo || '').toUpperCase();
    if (c.includes('HCCC') || f.includes('commercial')) {
      return { tag: 'HCCC Commercial', style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
    }
    if (c.includes('ELRC') || f.includes('employment') || f.includes('labour')) {
      return { tag: 'ELRC Court', style: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
    }
    if (c.includes('ELC') || f.includes('land')) {
      return { tag: 'ELC Court', style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
    }
    if (c.includes('ARB') || f.includes('arbitrat') || c.includes('NCIA')) {
      return { tag: 'NCIA Arbitration', style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
    }
    if (f.includes('magistrate') || f.includes('subordinate') || c.includes('CMCC')) {
      return { tag: 'Magistrate Court', style: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' };
    }
    if (f.includes('conveyanc')) {
      return { tag: 'Conveyancing', style: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
    }
    return { tag: 'High Court', style: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' };
  };

  const forumChips = [
    { id: 'All', label: 'All Matters' },
    { id: 'Commercial', label: 'Commercial High Court' },
    { id: 'ELC / ELRC', label: 'ELC / ELRC' },
    { id: 'Magistrate', label: 'Magistrate Court' },
    { id: 'Arbitration', label: 'Arbitration' },
    { id: 'Conveyancing', label: 'Conveyancing' }
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner - Standardized compact geometry matching Dashboard */}
      <div className="pt-1 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]/60">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-brand font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight">
              Matters
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs font-semibold">
              {mattersList.length} Active Causes
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-sans">
            High Court causes, subordinate courts, taxations &amp; arbitrations
          </p>
        </div>

        {/* Consolidated Action Bar */}
        <div className="flex items-center gap-2.5 shrink-0">
          {can('matters.create') && (
            <button
              onClick={() => setShowNewMatterModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-zinc-100 font-sans font-semibold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" /> New Matter
            </button>
          )}
          {can('clients.view') && (
            <button
              onClick={() => onNavigateTab ? onNavigateTab('clients') : null}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-main)] hover:bg-[var(--bg-subtle)] font-sans font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-slate-500" /> Clients Directory
            </button>
          )}
        </div>
      </div>

      {/* Controls Bar: Search & Forum Filter Chips */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, cause number, forum, party..."
              className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl pl-10 pr-3.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500/50 transition-colors shadow-2xs"
            />
          </div>

          {/* Bulk Selection Actions Bar */}
          {selectedMatterIds.length > 0 && (
            <div className="flex items-center gap-2 bg-[var(--bg-subtle)] border border-amber-500/30 px-3 py-1.5 rounded-xl shadow-xs text-xs animate-in fade-in">
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                {selectedMatterIds.length} selected
              </span>
              <span className="text-[var(--text-muted)]">|</span>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">Set:</span>
              <button
                onClick={() => handleBulkStatus('Active')}
                className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold hover:bg-emerald-500/20 cursor-pointer"
              >
                Active
              </button>
              <button
                onClick={() => handleBulkStatus('Pending Taxation')}
                className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold hover:bg-amber-500/20 cursor-pointer"
              >
                Taxation
              </button>
              <button
                onClick={() => handleBulkStatus('Concluded')}
                className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-bold hover:bg-blue-500/20 cursor-pointer"
              >
                Concluded
              </button>
              <button
                onClick={() => handleBulkStatus('Stayed')}
                className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-600 border border-slate-500/20 text-[10px] font-bold hover:bg-slate-500/20 cursor-pointer"
              >
                Stayed
              </button>
              <button
                onClick={() => setSelectedMatterIds([])}
                className="text-xs text-[var(--text-muted)] hover:text-red-500 ml-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 1-Tap Court Forum Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {forumChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => setForumFilter(chip.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                forumFilter === chip.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-semibold'
                  : 'bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)] hover:text-[var(--text-main)] hover:border-slate-400'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {shareToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shareToast}</span>
          </div>
          <button onClick={() => setShareToast('')} className="text-xs font-bold hover:underline">
            &times;
          </button>
        </div>
      )}

      {/* MINIMALIST MATTERS TABLE */}
      <div className="w-full bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--text-main)] border-collapse">
            <thead className="h-[40px] bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase text-[10px] font-mono tracking-wider border-b border-[var(--border-color)] font-semibold select-none">
              <tr>
                <th className="py-3 px-3.5 w-10 text-center">
                  <button onClick={toggleSelectAll} className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]">
                    {selectedMatterIds.length === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-slate-900 dark:text-white" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3.5">Case Number</th>
                <th className="py-3 px-3.5 min-w-[200px]">Matter Title & Parties</th>
                <th className="py-3 px-3.5">Connected Client</th>
                <th className="py-3 px-3.5">Connected Fee Note</th>
                <th className="py-3 px-3.5">Court Forum</th>
                <th className="py-3 px-3.5 text-right font-mono">Claim Amount</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right min-w-[170px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[var(--text-muted)] text-xs">
                    No matters found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isSelected = selectedMatterIds.includes(m.id);
                  const linkedFeeNote = getLinkedFeeNote(m);
                  const linkedClient = getLinkedClient(m, linkedFeeNote);

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-100/60 dark:bg-zinc-800/40' : ''
                      }`}
                      onClick={() => setSelectedMatter(m)}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelectRow(m.id)}
                          className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-slate-900 dark:text-white" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Case Number */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-[var(--text-main)] block">
                          {m.caseNo}
                        </span>
                      </td>

                      {/* Title & Parties */}
                      <td className="py-3 px-3.5">
                        <strong className="font-bold text-xs text-[var(--text-main)] block line-clamp-1 hover:underline">
                          {m.title}
                        </strong>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                          <span>{m.applicant}</span>
                          <span className="mx-1 text-slate-400">vs</span>
                          <span>{m.respondent}</span>
                        </div>
                      </td>

                      {/* Connected Client */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-xs">
                        {linkedClient ? (
                          <div className="flex items-center gap-1.5 text-[var(--text-main)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-medium truncate max-w-[150px]">{linkedClient.name}</span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] italic text-[11px]">No client linked</span>
                        )}
                      </td>

                      {/* Connected Fee Note */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-xs" onClick={(e) => e.stopPropagation()}>
                        {linkedFeeNote ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToBuilder) onNavigateToBuilder(linkedFeeNote, false);
                            }}
                            className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 hover:underline cursor-pointer"
                            title="Open in Fee Note Builder"
                          >
                            <Receipt className="w-3 h-3 text-slate-500" />
                            <span>{linkedFeeNote.billNumber}</span>
                          </button>
                        ) : (
                          <span className="text-[var(--text-muted)] italic text-[11px]">No fee note linked</span>
                        )}
                      </td>

                      {/* Forum */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-xs text-[var(--text-muted)]">
                        <span className="truncate max-w-[140px] block">{m.forum}</span>
                      </td>

                      {/* Claim Value */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono font-bold text-xs text-[var(--text-main)]">
                        KES {m.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border border-[var(--border-color)] text-[var(--text-muted)] bg-[var(--bg-subtle)]">
                          {m.status}
                        </span>
                      </td>

                      {/* Direct Quick Action Buttons */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Draft Bill of Costs */}
                          <button
                            type="button"
                            onClick={() => handleDraftBOC(m)}
                            className="px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-slate-100 dark:hover:bg-zinc-800 text-[var(--text-main)] transition-colors text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            title={linkedFeeNote ? `Open Fee Note (${linkedFeeNote.billNumber}) in Builder` : "Draft Bill of Costs in Builder"}
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                            <span className="hidden xl:inline">Draft Bill</span>
                          </button>

                          {/* Edit Matter */}
                          {can('matters.edit') && (
                            <button
                              type="button"
                              onClick={() => setEditingMatter(m)}
                              className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                              title="Edit Matter Information"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Email Share */}
                          <button
                            type="button"
                            onClick={() => handleOpenEmailShare(m)}
                            className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-blue-600 transition-colors cursor-pointer"
                            title="Share Matter via Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Matter */}
                          {can('matters.delete') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMatter(m.id, m.title)}
                              className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-600 transition-colors cursor-pointer"
                              title="Delete Matter"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MATTER CAUSE DOSSIER (2-COLUMN HIGH-CONTRAST SLIDE-OVER MODAL) */}
      {selectedMatter && (
        <div className="fixed inset-0 bg-[#0b1b36]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Dossier Header */}
            <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-[var(--bg-main)] border border-[var(--border-color)] font-mono text-xs font-bold text-[var(--text-main)]">
                    {selectedMatter.caseNo}
                  </span>
                  <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border ${getKenyanCaseBadge(selectedMatter.caseNo, selectedMatter.forum).style}`}>
                    {getKenyanCaseBadge(selectedMatter.caseNo, selectedMatter.forum).tag}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                    {selectedMatter.status}
                  </span>
                </div>
                <h2 className="font-brand font-extrabold text-xl sm:text-2xl text-[var(--text-main)] leading-tight">
                  {selectedMatter.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-mono">
                  <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {selectedMatter.forum}</span>
                  <span>&bull;</span>
                  <span>Advocate on Record: {selectedMatter.filedBy || 'Guyo Halake'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* 1-Tap Bill of Costs Action */}
                <button
                  onClick={() => {
                    handleDraftBOC(selectedMatter);
                    setSelectedMatter(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-sans font-bold text-xs flex items-center gap-1.5 hover:bg-amber-400 transition-all shadow-xs cursor-pointer"
                >
                  <FileText className="w-4 h-4" /> Draft Bill of Costs →
                </button>
                <button
                  onClick={() => setSelectedMatter(null)}
                  className="p-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* High-Contrast 2-Column Breakdown */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              {/* Left Column: Court Forum, Coram, Parties, Financials */}
              <div className="space-y-6">
                {/* Parties Matrix */}
                <div className="space-y-3">
                  <h3 className="font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-500" /> Cause Parties
                  </h3>
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] space-y-3">
                    <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                      <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold uppercase block mb-1">
                        Plaintiff / Claimant ({selectedMatter.applicantRole || 'Applicant'})
                      </span>
                      <strong className="text-sm font-bold text-[var(--text-main)] block">
                        {selectedMatter.applicant}
                      </strong>
                    </div>

                    <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                      <span className="text-[10px] font-mono text-red-600 dark:text-red-400 font-bold uppercase block mb-1">
                        Defendant / Respondent ({selectedMatter.respondentRole || 'Respondent'})
                      </span>
                      <strong className="text-sm font-bold text-[var(--text-main)] block">
                        {selectedMatter.respondent}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Forum & Coram Breakdown */}
                <div className="space-y-3">
                  <h3 className="font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                    <Gavel className="w-3.5 h-3.5 text-blue-500" /> Court Forum & Coram
                  </h3>
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] space-y-2.5">
                    <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                      <span className="text-[var(--text-muted)]">Judicial Forum:</span>
                      <strong className="text-[var(--text-main)] font-mono">{selectedMatter.forum}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                      <span className="text-[var(--text-muted)]">Registry Number:</span>
                      <strong className="text-[var(--text-main)] font-mono">{selectedMatter.caseNo}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                      <span className="text-[var(--text-muted)]">Filing Advocate:</span>
                      <strong className="text-[var(--text-main)]">{selectedMatter.filedBy || 'Guyo Halake'}</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[var(--text-muted)]">Case State:</span>
                      <span className="font-bold text-emerald-600 font-mono">{selectedMatter.status}</span>
                    </div>
                  </div>
                </div>

                {/* Claim Value & Recovery */}
                <div className="space-y-3">
                  <h3 className="font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Financial Value
                  </h3>
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono block uppercase">Claim Value</span>
                      <strong className="text-base font-mono font-bold text-[var(--text-main)] block mt-0.5">
                        KES {selectedMatter.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono block uppercase">Billed to Date</span>
                      <strong className="text-base font-mono font-bold text-emerald-600 block mt-0.5">
                        KES {selectedFeeNotes.reduce((sum, fn) => sum + fn.grandTotal, 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Linked Bills of Costs, Taxations & Vault Pleadings */}
              <div className="space-y-6">
                {/* Linked Bills of Costs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" /> Linked Bills of Costs & Fee Notes
                    </h3>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                      {selectedFeeNotes.length} Generated
                    </span>
                  </div>

                  {selectedFeeNotes.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-subtle)] space-y-2">
                      <p className="text-xs text-[var(--text-muted)] font-mono">No bills drafted yet for this cause.</p>
                      <button
                        onClick={() => {
                          handleDraftBOC(selectedMatter);
                          setSelectedMatter(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-mono text-xs font-bold hover:bg-amber-500/20 cursor-pointer"
                      >
                        + Draft Bill of Costs Now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedFeeNotes.map(fn => (
                        <div key={fn.id} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-xs text-[var(--text-main)] block">{fn.billNumber}</span>
                            <span className="text-[10px] font-mono text-[var(--text-muted)]">
                              Taxed / Issued on {fn.createdAt}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-xs text-[var(--text-main)] block">
                              KES {fn.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            </span>
                            <button
                              onClick={() => {
                                if (onNavigateToBuilder) onNavigateToBuilder(fn, true);
                                setSelectedMatter(null);
                              }}
                              className="text-[10px] text-amber-600 hover:underline font-mono font-bold"
                            >
                              Review PDF →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Connected Pleadings & Documents */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-purple-500" /> Connected Pleadings & Documents
                    </h3>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                      {selectedDocuments.length} Documents
                    </span>
                  </div>

                  {selectedDocuments.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-subtle)]">
                      <p className="text-xs text-[var(--text-muted)] font-mono">No pleadings securely vaulted.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDocuments.map(doc => (
                        <div key={doc.id} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded bg-purple-500/10 text-purple-600 shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-[var(--text-main)] block truncate">{doc.filename}</span>
                              <span className="text-[10px] font-mono text-[var(--text-muted)]">{doc.size}</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-zinc-800 text-[10px] font-mono font-bold shrink-0">
                            VAULTED ✓
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW MATTER MODAL (Clean, Simple English, No Placeholders, Auto-connects Fee Note) */}
      {showNewMatterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-main)]">
                Register New Matter
              </h3>
              <button onClick={() => setShowNewMatterModal(false)} className="text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMatter} className="space-y-3.5">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Matter Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Case Number</label>
                  <input
                    type="text"
                    value={newCaseNo}
                    onChange={(e) => setNewCaseNo(e.target.value)}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Court Forum</label>
                  <select
                    value={newForum}
                    onChange={(e) => setNewForum(e.target.value)}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  >
                    <option value="High Court — Commercial">High Court — Commercial</option>
                    <option value="Arbitration / High Court">Arbitration / High Court</option>
                    <option value="Subordinate / Magistrate's Court">Subordinate / Magistrate's Court</option>
                    <option value="Environment & Land Court (ELC)">Environment & Land Court (ELC)</option>
                    <option value="Employment & Labour Relations Court (ELRC)">Employment & Labour (ELRC)</option>
                    <option value="Non-Contentious Conveyancing">Non-Contentious Conveyancing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Claimant / Client</label>
                  <input
                    type="text"
                    required
                    value={newApplicant}
                    onChange={(e) => setNewApplicant(e.target.value)}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Defendant</label>
                  <input
                    type="text"
                    required
                    value={newRespondent}
                    onChange={(e) => setNewRespondent(e.target.value)}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Claim Amount (KES)</label>
                <input
                  type="number"
                  value={newClaimAmount === 0 ? '' : newClaimAmount}
                  onChange={(e) => setNewClaimAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] font-mono focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[11px] text-[var(--text-muted)] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-500 shrink-0" />
                <span>A connected draft Fee Note will automatically be created and linked to this matter.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowNewMatterModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs cursor-pointer shadow-xs"
                >
                  Register Matter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MATTER MODAL (Clean, Simple English) */}
      {editingMatter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-main)]">
                Edit Matter
              </h3>
              <button onClick={() => setEditingMatter(null)} className="text-[var(--text-muted)] hover:text-red-500 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateMatter} className="space-y-3.5">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Matter Title</label>
                <input
                  type="text"
                  required
                  value={editingMatter.title}
                  onChange={(e) => setEditingMatter({ ...editingMatter, title: e.target.value })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Case Number</label>
                  <input
                    type="text"
                    value={editingMatter.caseNo}
                    onChange={(e) => setEditingMatter({ ...editingMatter, caseNo: e.target.value })}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Court Forum</label>
                  <select
                    value={editingMatter.forum}
                    onChange={(e) => setEditingMatter({ ...editingMatter, forum: e.target.value })}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  >
                    <option value="High Court — Commercial">High Court — Commercial</option>
                    <option value="Arbitration / High Court">Arbitration / High Court</option>
                    <option value="Subordinate / Magistrate's Court">Subordinate / Magistrate's Court</option>
                    <option value="Environment & Land Court (ELC)">Environment & Land Court (ELC)</option>
                    <option value="Employment & Labour Relations Court (ELRC)">Employment & Labour (ELRC)</option>
                    <option value="Non-Contentious Conveyancing">Non-Contentious Conveyancing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Claimant / Client</label>
                  <input
                    type="text"
                    value={editingMatter.applicant}
                    onChange={(e) => setEditingMatter({ ...editingMatter, applicant: e.target.value })}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Defendant</label>
                  <input
                    type="text"
                    value={editingMatter.respondent}
                    onChange={(e) => setEditingMatter({ ...editingMatter, respondent: e.target.value })}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Claim Amount (KES)</label>
                <input
                  type="number"
                  value={editingMatter.amount}
                  onChange={(e) => setEditingMatter({ ...editingMatter, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] font-mono focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setEditingMatter(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] text-xs cursor-pointer hover:bg-[var(--bg-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMAIL SHARE MODAL */}
      {emailShareMatter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[var(--text-main)]">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-main)]">Share Matter File</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">Dispatch matter summary via email</p>
                </div>
              </div>
              <button onClick={() => setEmailShareMatter(null)} className="text-[var(--text-muted)] hover:text-red-500 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendMatterEmail} className="space-y-3">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Recipient Email</label>
                <input
                  type="email"
                  required
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Subject</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Message</label>
                <textarea
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-main)] font-mono text-[11px] focus:outline-none focus:border-slate-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setEmailShareMatter(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingMatterEmail}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs hover:bg-black dark:hover:bg-slate-100 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingMatterEmail ? 'Sending...' : 'Send Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MattersView;
