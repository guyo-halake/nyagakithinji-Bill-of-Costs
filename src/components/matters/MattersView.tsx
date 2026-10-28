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
import { sendEmail, sendHearingReminderEmail } from '../../services/email';
import { checkConflictOfInterest } from '../../services/conflict';
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
  Receipt,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Bell,
  BellOff
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

  // Extended CTS inputs for New Matter
  const [newCtsCaseNumber, setNewCtsCaseNumber] = useState('');
  const [newCourtStation, setNewCourtStation] = useState('Milimani Commercial & Tax Division');
  const [newHearingDate, setNewHearingDate] = useState('2026-11-05T09:30');
  const [newCourtActionRequired, setNewCourtActionRequired] = useState('Mention to confirm compliance with pre-trial directions');
  const [newLeadAdvocate, setNewLeadAdvocate] = useState('Karani Victor');
  const [newLeadAdvocateEmail, setNewLeadAdvocateEmail] = useState('vickarani@gmail.com');

  // Inline Advocate Picker State
  const [assigningMatterId, setAssigningMatterId] = useState<string | null>(null);

  // Reminder state per matter (toggled on/off)
  const [reminderDisabledMap, setReminderDisabledMap] = useState<Record<string, boolean>>({});

  // Email Share Modal State
  const [emailShareMatter, setEmailShareMatter] = useState<ExactMatterRecord | null>(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingMatterEmail, setIsSendingMatterEmail] = useState(false);
  const [shareToast, setShareToast] = useState('');

  // Real-time Automated Conflict of Interest Checks for New Matter
  const respondentConflict = React.useMemo(() => {
    if (!newRespondent || newRespondent.trim().length < 3) return null;
    return checkConflictOfInterest(newRespondent.trim(), { roleBeingAssigned: 'Respondent' });
  }, [newRespondent]);

  const applicantConflict = React.useMemo(() => {
    if (!newApplicant || newApplicant.trim().length < 3) return null;
    return checkConflictOfInterest(newApplicant.trim(), { roleBeingAssigned: 'Applicant' });
  }, [newApplicant]);

  const advocateRoster = [
    { name: 'Karani Victor', email: 'vickarani@gmail.com' },
    { name: 'Guyo Halake', email: 'guyohalakeofficial@gmail.com' },
    { name: 'Nyagah Kithinji', email: 'advocate@kithinjilegal.co.ke' },
    { name: 'Razak Wako', email: 'razak.admin@p3ldev.com' },
  ];

  // Minimalist Hearing Date & Countdown Formatter (strictly green for OK, red for overdue)
  const formatHearingDateAndCountdown = (dateStr?: string) => {
    if (!dateStr) {
      return {
        dateText: 'Date not set',
        countdownText: 'No date scheduled',
        isOverdue: false,
      };
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return {
        dateText: dateStr,
        countdownText: 'Scheduled',
        isOverdue: false,
      };
    }

    const dateText = d.toLocaleString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const now = Date.now();
    const diffMs = d.getTime() - now;

    if (diffMs <= 0) {
      const overdueHours = Math.abs(Math.round(diffMs / (1000 * 60 * 60)));
      const overdueDays = Math.floor(overdueHours / 24);
      const countdownText = overdueDays > 0 ? `${overdueDays}d overdue` : `${overdueHours}h overdue`;
      return {
        dateText,
        countdownText,
        isOverdue: true,
      };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;

    let countdownText = '';
    if (days > 0) {
      countdownText = remainingHours > 0 ? `${days}d ${remainingHours}h remaining` : `${days}d remaining`;
    } else if (diffHours > 0) {
      countdownText = `${diffHours}h remaining`;
    } else {
      const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      countdownText = `${mins}m remaining`;
    }

    return {
      dateText,
      countdownText,
      isOverdue: false,
    };
  };

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

  // Navigates directly to the read-only client portal for that matter
  const handleMatterClick = (m: ExactMatterRecord) => {
    const linkedFeeNote = getLinkedFeeNote(m);
    const client = getLinkedClient(m, linkedFeeNote);
    const targetClientId = client?.id || (
      m.id.includes('safari') || m.applicant.toLowerCase().includes('safari') ? 'c-safari' :
      m.id.includes('seyani') || m.applicant.toLowerCase().includes('seyani') ? 'c1' :
      m.id.includes('dhanya') || m.applicant.toLowerCase().includes('dhanya') ? 'c2' :
      m.id.includes('hccomm') || m.applicant.toLowerCase().includes('zhenjian') ? 'c4' :
      'c1'
    );

    if (onNavigateTab) {
      onNavigateTab('client_portal', targetClientId);
    } else {
      window.location.href = `/?portal_token=cpt_${targetClientId}&client_id=${targetClientId}`;
    }
  };

  // Assign advocate to matter inline
  const handleAssignAdvocate = async (matterId: string, advocate: { name: string; email: string }) => {
    if (!currentUser?.firmId) return;
    const target = mattersList.find(m => m.id === matterId);
    if (!target) return;
    const updated = {
      ...target,
      leadAdvocate: advocate.name || undefined,
      leadAdvocateEmail: advocate.email || undefined,
    };
    try {
      await updateMatter(currentUser.firmId, matterId, updated);
      setMattersList(prev => prev.map(m => m.id === matterId ? updated : m));
      setAssigningMatterId(null);
      setShareToast(`Advocate ${advocate.name || 'unassigned'} updated for ${target.ctsCaseNumber || target.caseNo}`);
      setTimeout(() => setShareToast(''), 3000);
    } catch (e: any) {
      setErrorMessage('Failed to assign advocate.');
    }
  };

  // Toggle reminder or send 48h court reminder alert
  const handleToggleOrSendReminder = async (matter: ExactMatterRecord) => {
    const isCurrentlyOff = reminderDisabledMap[matter.id] === true;
    if (isCurrentlyOff) {
      setReminderDisabledMap(prev => ({ ...prev, [matter.id]: false }));
      setShareToast(`Reminders enabled for ${matter.ctsCaseNumber || matter.caseNo}.`);
      setTimeout(() => setShareToast(''), 3000);
      return;
    }

    const advocateEmail = matter.leadAdvocateEmail || 'vickarani@gmail.com';
    const advocateName = matter.leadAdvocate || 'Karani Victor';
    const ctsNo = matter.ctsCaseNumber || matter.caseNo || 'CTS-PENDING';
    const court = matter.courtStation || matter.forum || 'Milimani Law Courts';
    const hearingTime = matter.hearingDate
      ? new Date(matter.hearingDate).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
      : matter.nextHearingDate || 'Upcoming Session';

    try {
      await sendHearingReminderEmail({
        matterId: matter.id,
        matterTitle: matter.title,
        ctsCaseNumber: ctsNo,
        courtStation: court,
        hearingDate: hearingTime,
        courtActionRequired: matter.courtActionRequired || 'Mention to confirm compliance with court directions',
        leadAdvocateName: advocateName,
        leadAdvocateEmail: advocateEmail,
        portalUrl: 'https://nyagahkithinji-advocates.azurewebsites.net',
      });
      setShareToast(`Hearing reminder sent to ${advocateName} (${advocateEmail}).`);
      setTimeout(() => setShareToast(''), 4000);
    } catch (err: any) {
      // Toggle off indicator
      setReminderDisabledMap(prev => ({ ...prev, [matter.id]: true }));
      setShareToast(`Reminder turned off for ${ctsNo}.`);
      setTimeout(() => setShareToast(''), 3000);
    }
  };

  // Filter matters by search & forum chip
  const filtered = mattersList.filter(m => {
    const q = search.toLowerCase();
    const matchesSearch =
      m.title.toLowerCase().includes(q) ||
      m.caseNo.toLowerCase().includes(q) ||
      (m.ctsCaseNumber && m.ctsCaseNumber.toLowerCase().includes(q)) ||
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
      ctsCaseNumber: newCtsCaseNumber.trim() || caseNumber,
      courtStation: newCourtStation.trim(),
      hearingDate: newHearingDate,
      courtActionRequired: newCourtActionRequired.trim(),
      leadAdvocate: newLeadAdvocate.trim(),
      leadAdvocateEmail: newLeadAdvocateEmail.trim(),
      forum: newForum,
      applicant: newApplicant.trim() || 'Claimant',
      applicantRole: 'Claimant',
      respondent: newRespondent.trim() || 'Respondent',
      respondentRole: 'Respondent',
      amount: newClaimAmount,
      status: 'Active',
      filedBy: currentUser?.fullName || newLeadAdvocate.trim(),
      feeNoteLink: feeNoteBillNo,
    };

    try {
      const savedMatter = await createMatter(currentUser.firmId, newRecord);

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
        excelUrl: '',
      };

      try {
        await saveFeeNoteToDatabase(newFeeNote);
      } catch (err) {}
      const updatedNotes = [newFeeNote, ...feeNotes];
      setFeeNotes(updatedNotes);
      persistFeeNotes(updatedNotes);

      setMattersList(prev => [savedMatter, ...prev]);
      setShowNewMatterModal(false);
      setNewTitle('');
      setNewCaseNo('');
      setNewCtsCaseNumber('');
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
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to delete matter.');
      }
    }
  };

  const handleOpenEmailShare = (m: ExactMatterRecord) => {
    const linkedFn = getLinkedFeeNote(m);
    setEmailShareMatter(m);
    setEmailRecipient(m.leadAdvocateEmail || '');
    setEmailSubject(`Legal Matter File: ${m.ctsCaseNumber || m.caseNo} — ${m.title}`);
    setEmailBody(
      `Dear ${m.applicant || 'Client'},

Matter: ${m.title}
Case Number: ${m.ctsCaseNumber || m.caseNo}
Court Station: ${m.courtStation || m.forum}
Hearing Date: ${m.hearingDate || m.nextHearingDate || 'Pending'}
Claim Amount: KES ${m.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}

Best regards,
Nyagah B. Kithinji & Co. Advocates`
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
        category: 'firm_to_client',
      });
      setShareToast(`Matter file emailed to ${emailRecipient.trim()} successfully.`);
      setTimeout(() => setShareToast(''), 3500);
      setEmailShareMatter(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to send email.');
    } finally {
      setIsSendingMatterEmail(false);
    }
  };

  const forumChips = [
    { id: 'All', label: 'All' },
    { id: 'Commercial', label: 'Commercial' },
    { id: 'ELC / ELRC', label: 'ELC / ELRC' },
    { id: 'Magistrate', label: 'Magistrate' },
    { id: 'Arbitration', label: 'Arbitration' },
    { id: 'Conveyancing', label: 'Conveyancing' },
  ];

  return (
    <div className="space-y-4 pb-12 w-full">
      {/* Title & Action Toolbar */}
      <div className="pt-1 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]/60">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-brand font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight">
              Matters
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-xs font-semibold border border-[var(--border-color)]">
              {mattersList.length} Matters
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-sans">
            Active litigation files, court hearings, and matters docket
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {can('matters.create') && (
            <button
              onClick={() => setShowNewMatterModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-sans font-semibold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Matter
            </button>
          )}
          {can('clients.view') && (
            <button
              onClick={() => onNavigateTab ? onNavigateTab('clients') : null}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-main)] hover:bg-[var(--bg-subtle)] font-sans font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-slate-500" /> Clients
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
              placeholder="Search case number, party, station..."
              className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl pl-10 pr-3.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-slate-400 transition-colors shadow-2xs"
            />
          </div>

          {/* Bulk Selection Actions */}
          {selectedMatterIds.length > 0 && (
            <div className="flex items-center gap-2 bg-[var(--bg-subtle)] border border-[var(--border-color)] px-3 py-1.5 rounded-xl shadow-xs text-xs animate-in fade-in">
              <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                {selectedMatterIds.length} selected
              </span>
              <span className="text-[var(--text-muted)]">|</span>
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
                onClick={() => setSelectedMatterIds([])}
                className="text-xs text-[var(--text-muted)] hover:text-red-500 ml-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Forum Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {forumChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => setForumFilter(chip.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                forumFilter === chip.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-color)] hover:text-[var(--text-main)]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-xs font-bold hover:underline">&times;</button>
        </div>
      )}

      {shareToast && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shareToast}</span>
          </div>
          <button onClick={() => setShareToast('')} className="text-xs font-bold hover:underline">&times;</button>
        </div>
      )}

      {/* MINIMALIST MATTERS TABLE */}
      <div className="w-full bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--text-main)] border-collapse">
            <thead className="h-[42px] bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase text-[10px] font-mono tracking-wider border-b border-[var(--border-color)] font-semibold select-none">
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
                <th className="py-3 px-3.5 min-w-[220px]">Case Number &amp; Parties</th>
                <th className="py-3 px-3.5 min-w-[180px]">Court Station</th>
                <th className="py-3 px-3.5 min-w-[200px]">Hearing Date</th>
                <th className="py-3 px-3.5 min-w-[160px]">Connected Client</th>
                <th className="py-3 px-3.5 min-w-[170px]">Assigned Advocate</th>
                <th className="py-3 px-3.5 text-center min-w-[100px]">Status</th>
                <th className="py-3 px-3.5 text-right min-w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--text-muted)] text-xs">
                    No matters found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isSelected = selectedMatterIds.includes(m.id);
                  const linkedFeeNote = getLinkedFeeNote(m);
                  const linkedClient = getLinkedClient(m, linkedFeeNote);
                  const timing = formatHearingDateAndCountdown(m.hearingDate);
                  const isReminderOff = reminderDisabledMap[m.id] === true;

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer group ${
                        isSelected ? 'bg-slate-100/60 dark:bg-zinc-800/40' : ''
                      }`}
                      onClick={() => handleMatterClick(m)}
                      title="Click to open read-only client portal for this matter"
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

                      {/* Case Number & Parties */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-bold text-xs text-[var(--text-main)] block group-hover:text-blue-600 transition-colors">
                          {m.ctsCaseNumber || m.caseNo}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 truncate max-w-[260px]">
                          {m.applicant} v {m.respondent}
                        </span>
                      </td>

                      {/* Court Station */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-xs text-[var(--text-muted)]">
                        <span className="truncate max-w-[180px] block font-medium text-[var(--text-main)]">
                          {m.courtStation || m.forum}
                        </span>
                      </td>

                      {/* Hearing Date & Countdown (Strictly Green for OK, Red for Overdue) */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-xs">
                        <span className="font-semibold text-slate-900 dark:text-white block font-sans">
                          {timing.dateText}
                        </span>
                        <span className={`block font-mono text-[11px] mt-0.5 ${
                          timing.isOverdue
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : 'text-emerald-600 dark:text-emerald-400 font-medium'
                        }`}>
                          {timing.countdownText}
                        </span>
                      </td>

                      {/* Connected Client */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-xs" onClick={(e) => e.stopPropagation()}>
                        {linkedClient ? (
                          <div className="font-medium text-[var(--text-main)] truncate max-w-[150px]">
                            {linkedClient.name}
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] italic text-[11px]">{m.applicant}</span>
                        )}
                        {linkedFeeNote && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToBuilder) onNavigateToBuilder(linkedFeeNote, false);
                            }}
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:underline mt-0.5"
                          >
                            <Receipt className="w-3 h-3 text-slate-400" />
                            <span>{linkedFeeNote.billNumber}</span>
                          </button>
                        )}
                      </td>

                      {/* Assigned Advocate (Click to Assign) */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-xs relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setAssigningMatterId(assigningMatterId === m.id ? null : m.id)}
                          className="font-medium text-[var(--text-main)] hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                          title="Click to assign or change advocate"
                        >
                          {m.leadAdvocate ? (
                            <span className="font-semibold text-slate-900 dark:text-white">{m.leadAdvocate}</span>
                          ) : (
                            <span className="text-slate-400 italic underline text-[11px]">Unassigned</span>
                          )}
                        </button>

                        {/* Inline Advocate Picker */}
                        {assigningMatterId === m.id && (
                          <div className="absolute left-0 mt-1 w-52 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] shadow-xl py-1 z-30 text-left">
                            <div className="px-3 py-1 text-[10px] font-mono text-[var(--text-muted)] uppercase border-b border-[var(--border-color)]">
                              Assign Lead Advocate
                            </div>
                            {advocateRoster.map(adv => (
                              <button
                                key={adv.email}
                                type="button"
                                onClick={() => handleAssignAdvocate(m.id, adv)}
                                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-subtle)] flex flex-col cursor-pointer ${
                                  m.leadAdvocate === adv.name ? 'font-bold bg-slate-100 dark:bg-zinc-800' : ''
                                }`}
                              >
                                <span className="text-[var(--text-main)]">{adv.name}</span>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono">{adv.email}</span>
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleAssignAdvocate(m.id, { name: '', email: '' })}
                              className="w-full px-3 py-1.5 text-left text-xs text-rose-500 hover:bg-rose-500/10 cursor-pointer border-t border-[var(--border-color)]"
                            >
                              Clear Assignment
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border border-[var(--border-color)] text-[var(--text-muted)] bg-[var(--bg-subtle)]">
                          {m.status}
                        </span>
                      </td>

                      {/* Action Icons */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Bell Icon: Reminder Status & Trigger */}
                          <button
                            type="button"
                            onClick={() => handleToggleOrSendReminder(m)}
                            className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer relative"
                            title={isReminderOff ? "Reminder is OFF. Click to turn ON & send alert." : "Reminder is ON. Click to dispatch 48h alert or toggle."}
                          >
                            {isReminderOff ? (
                              <span className="relative flex items-center justify-center">
                                <BellOff className="w-3.5 h-3.5 text-rose-500" />
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5" />
                              </span>
                            ) : (
                              <span className="relative flex items-center justify-center">
                                <Bell className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5" />
                              </span>
                            )}
                          </button>

                          {/* Share Icon */}
                          <button
                            type="button"
                            onClick={() => handleOpenEmailShare(m)}
                            className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                            title="Share Matter File via Email"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Icon */}
                          {can('matters.edit') && (
                            <button
                              type="button"
                              onClick={() => setEditingMatter(m)}
                              className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                              title="Edit Matter"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Icon */}
                          {can('matters.delete') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMatter(m.id, m.title)}
                              className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-600 transition-colors cursor-pointer"
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

      {/* NEW MATTER MODAL */}
      {showNewMatterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-main)]">
                Register New Matter
              </h3>
              <button onClick={() => setShowNewMatterModal(false)} className="text-[var(--text-muted)] hover:text-red-500 cursor-pointer">
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
                  placeholder="e.g. Seyani Brothers & Co. (K) Ltd v Greenhills Investment Ltd"
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">CTS Case Number</label>
                  <input
                    type="text"
                    value={newCtsCaseNumber}
                    onChange={(e) => setNewCtsCaseNumber(e.target.value)}
                    placeholder="e.g. HCCC E104/2025"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Court Station &amp; Division</label>
                  <input
                    type="text"
                    value={newCourtStation}
                    onChange={(e) => setNewCourtStation(e.target.value)}
                    placeholder="e.g. Milimani Commercial & Tax Division"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Claimant / Client</label>
                  <input
                    type="text"
                    value={newApplicant}
                    onChange={(e) => setNewApplicant(e.target.value)}
                    placeholder="e.g. Seyani Brothers & Co. (K) Ltd"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Defendant (Adverse Party)</label>
                  <input
                    type="text"
                    value={newRespondent}
                    onChange={(e) => setNewRespondent(e.target.value)}
                    placeholder="e.g. Greenhills Investment Ltd"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Conflict of Interest Warning */}
              {respondentConflict && respondentConflict.hasConflict && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Conflict of Interest Warning: {respondentConflict.conflictType?.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed font-sans">{respondentConflict.alertMessage}</p>
                </div>
              )}

              {applicantConflict && applicantConflict.hasConflict && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Conflict of Interest Warning: {applicantConflict.conflictType?.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed font-sans">{applicantConflict.alertMessage}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Hearing / Mention Date</label>
                  <input
                    type="datetime-local"
                    value={newHearingDate}
                    onChange={(e) => setNewHearingDate(e.target.value)}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Lead Advocate</label>
                  <input
                    type="text"
                    value={newLeadAdvocate}
                    onChange={(e) => setNewLeadAdvocate(e.target.value)}
                    placeholder="e.g. Karani Victor"
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

      {/* EDIT MATTER MODAL */}
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
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">CTS Case Number</label>
                  <input
                    type="text"
                    value={editingMatter.ctsCaseNumber || editingMatter.caseNo}
                    onChange={(e) => setEditingMatter({ ...editingMatter, ctsCaseNumber: e.target.value, caseNo: e.target.value })}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Court Station</label>
                  <input
                    type="text"
                    value={editingMatter.courtStation || editingMatter.forum}
                    onChange={(e) => setEditingMatter({ ...editingMatter, courtStation: e.target.value, forum: e.target.value })}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Hearing / Mention Date</label>
                  <input
                    type="datetime-local"
                    value={editingMatter.hearingDate || ''}
                    onChange={(e) => setEditingMatter({ ...editingMatter, hearingDate: e.target.value })}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Assigned Advocate</label>
                  <input
                    type="text"
                    value={editingMatter.leadAdvocate || ''}
                    onChange={(e) => setEditingMatter({ ...editingMatter, leadAdvocate: e.target.value })}
                    placeholder="e.g. Karani Victor"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  />
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
                  <p className="text-[11px] text-[var(--text-muted)]">{emailShareMatter.ctsCaseNumber || emailShareMatter.caseNo}</p>
                </div>
              </div>
              <button onClick={() => setEmailShareMatter(null)} className="text-[var(--text-muted)] hover:text-red-500 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendMatterEmail} className="space-y-3.5">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Recipient Email Address</label>
                <input
                  type="email"
                  required
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="e.g. advocate@kithinjilegal.co.ke"
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] font-mono focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Subject Line</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Message Body</label>
                <textarea
                  rows={5}
                  required
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-main)] font-mono text-[11px] focus:outline-none focus:border-slate-400 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setEmailShareMatter(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] text-xs cursor-pointer hover:bg-[var(--bg-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingMatterEmail}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingMatterEmail ? 'Sending...' : 'Send File'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
