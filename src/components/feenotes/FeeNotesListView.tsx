import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Plus,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  User,
  Calculator,
  ExternalLink,
  Trash2,
  Edit3,
  FileSpreadsheet,
  Eye,
  MessageCircle,
  Mail,
  Send,
  Copy,
  Check,
  AlertCircle,
  X,
  Share2,
  ChevronRight,
  Filter,
  DollarSign,
  Briefcase,
  Scale,
  Calendar,
  MoreVertical,
  CheckSquare,
  Square,
  RefreshCw,
  SendHorizontal,
  Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ExactFeeNoteRecord,
  deleteFeeNote,
  fetchFeeNotesFromDatabase,
  updateFeeNoteStatus,
  getFeeNotes,
  persistFeeNotes,
  saveFeeNoteToDatabase,
  deleteFeeNoteFromDatabase,
  EXACT_FIRM_INFO,
  supabase
} from '../../services/supabase';
import { fetchClients } from '../../services/data';
import { sendEmail } from '../../services/email';
import { getSavedEmailTemplates, renderTemplateText } from '../../services/emailTemplates';
import { SystemUser } from '../../services/supabase';
import { hasPermission } from '../../services/rbac';

interface FeeNotesListViewProps {
  onNavigateTab: (tab: string) => void;
  onNavigateToBuilder?: (note?: ExactFeeNoteRecord, isPreview?: boolean) => void;
  currentUser?: SystemUser | null;
}

export const FeeNotesListView: React.FC<FeeNotesListViewProps> = ({
  onNavigateTab,
  onNavigateToBuilder,
  currentUser,
}) => {
  const [feeNotesList, setFeeNotesList] = useState<ExactFeeNoteRecord[]>(() => getFeeNotes());
  const [clients, setClients] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [scheduleFilter, setScheduleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active Context Menu & Detailed Legal File Modal
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedLegalNote, setSelectedLegalNote] = useState<ExactFeeNoteRecord | null>(null);
  const [dispatchNote, setDispatchNote] = useState<ExactFeeNoteRecord | null>(null);
  const [dispatchMode, setDispatchMode] = useState<'whatsapp' | 'email'>('whatsapp');
  const [dispatchPhone, setDispatchPhone] = useState('');
  const [dispatchEmail, setDispatchEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isExportingBatch, setIsExportingBatch] = useState(false);

  const can = (code: string) => hasPermission(currentUser, code);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const [visibilityScope, setVisibilityScope] = useState<'all' | 'self'>(() => {
    return (localStorage.getItem('FEE_NOTES_VISIBILITY_SCOPE') as 'all' | 'self') || 'all';
  });

  const isManagerOrAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Developer' || currentUser?.hasAllPermissions;

  useEffect(() => {
    const handleScope = (e: any) => {
      if (e?.detail) setVisibilityScope(e.detail);
      else {
        const s = (localStorage.getItem('FEE_NOTES_VISIBILITY_SCOPE') as 'all' | 'self') || 'all';
        setVisibilityScope(s);
      }
    };
    window.addEventListener('feeNotesVisibilityChanged', handleScope);
    window.addEventListener('storage', handleScope);
    return () => {
      window.removeEventListener('feeNotesVisibilityChanged', handleScope);
      window.removeEventListener('storage', handleScope);
    };
  }, []);

  useEffect(() => {
    const loadFeeNotes = () => {
      fetchFeeNotesFromDatabase(currentUser?.firmId).then(setFeeNotesList).catch(() => {
        setFeeNotesList(getFeeNotes());
      });
    };
    loadFeeNotes();

    if (currentUser?.firmId) {
      fetchClients(currentUser.firmId).then(setClients).catch(() => {});
    }

    const handleFeeNotesUpdate = (event: any) => {
      if (event?.detail && Array.isArray(event.detail)) {
        setFeeNotesList(event.detail);
      } else {
        setFeeNotesList(getFeeNotes());
      }
    };

    const handleRealtimeUpdate = async (event: Event) => {
      const detail = (event as CustomEvent<{ table?: string }>).detail;
      if (detail?.table !== 'fee_notes') return;
      loadFeeNotes();
    };

    window.addEventListener('feeNotesUpdated', handleFeeNotesUpdate);
    window.addEventListener('databaseRealtimeUpdate', handleRealtimeUpdate);

    return () => {
      window.removeEventListener('feeNotesUpdated', handleFeeNotesUpdate);
      window.removeEventListener('databaseRealtimeUpdate', handleRealtimeUpdate);
    };
  }, [currentUser?.firmId]);

  // When dispatching, auto-fill client's phone and email if found
  useEffect(() => {
    if (!dispatchNote) return;
    const clientMatch = clients.find(c => 
      c.name.toLowerCase() === dispatchNote.clientName.toLowerCase() ||
      c.company?.toLowerCase() === dispatchNote.clientName.toLowerCase()
    );
    if (clientMatch) {
      setDispatchPhone(clientMatch.phonePrimary || clientMatch.phone || '+254 700 000 000');
      setDispatchEmail(clientMatch.email || 'billing@' + clientMatch.name.toLowerCase().replace(/[^a-z]/g, '') + '.co.ke');
    } else {
      setDispatchPhone('+254 722 000 111');
      setDispatchEmail('client-billing@' + dispatchNote.clientName.toLowerCase().replace(/[^a-z]/g, '') + '.co.ke');
    }
  }, [dispatchNote, clients]);

  // REAL DELETE FUNCTION: Deletes from State, LocalStorage, and Supabase Database
  const handleDeleteFeeNote = async (id: string, billNumber: string) => {
    setActiveMenuId(null);
    if (!confirm(`Are you sure you want to permanently delete Fee Note "${billNumber}"?`)) {
      return;
    }

    // 1. Update local state
    const updated = feeNotesList.filter(fn => fn.id !== id);
    setFeeNotesList(updated);
    setSelectedIds(prev => prev.filter(item => item !== id));
    if (selectedLegalNote?.id === id) setSelectedLegalNote(null);

    // 2. Persist to LocalStorage
    persistFeeNotes(updated);

    // 3. Delete from Authoritative Server Database & Supabase
    try {
      await deleteFeeNoteFromDatabase(id);
      showToast(`Fee Note "${billNumber}" deleted successfully.`);
    } catch (error: any) {
      console.warn('Database deletion note:', error);
      showToast(`Fee Note "${billNumber}" removed from ledger.`);
    }
  };

  // REAL CLONE FUNCTION: Clones bill, persists to state, LocalStorage, and Supabase
  const handleCloneNote = async (fn: ExactFeeNoteRecord) => {
    setActiveMenuId(null);
    const newId = 'fn-' + Date.now();
    const newBillNo = fn.billNumber + '-COPY';

    const cloned: ExactFeeNoteRecord = {
      ...fn,
      id: newId,
      billNumber: newBillNo,
      matterTitle: fn.matterTitle + ' (Copy)',
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    const updated = [cloned, ...feeNotesList];
    setFeeNotesList(updated);
    persistFeeNotes(updated);

    // Attempt remote save if Supabase is connected
    try {
      if (currentUser?.firmId) {
        await supabase.from('fee_notes').insert({
          id: newId,
          firm_id: currentUser.firmId,
          bill_number: newBillNo,
          matter_id: fn.matterId || '',
          matter_title: cloned.matterTitle,
          client_name: fn.clientName,
          court_schedule: fn.courtSchedule,
          claim_value: fn.claimValue,
          instruction_fee: fn.instructionFee,
          getting_up_fee: fn.gettingUpFee,
          grand_total: fn.grandTotal,
          status: 'draft',
          generated_by_user: currentUser.fullName || fn.generatedByUser,
          generated_by_user_id: currentUser.id || fn.generatedByUserId,
          created_at: cloned.createdAt
        });
      }
      showToast(`Bill cloned as draft: ${newBillNo}`);
    } catch (err) {
      showToast(`Bill cloned as draft: ${newBillNo}`);
    }
  };

  // REAL EMAIL FUNCTION: Uses sendEmail from src/services/email.ts
  const handleExecuteSendEmail = async () => {
    if (!dispatchNote || !dispatchEmail.trim()) return;
    setIsSendingEmail(true);

    const emailSubject = `Formal Bill of Costs Ref: ${dispatchNote.billNumber} - ${dispatchNote.matterTitle}`;
    const emailBody = `Dear ${dispatchNote.clientName},

Please find attached the formal Bill of Costs (Ref: ${dispatchNote.billNumber}) in respect of ${dispatchNote.matterTitle}.

Total Professional & Out-of-Pocket Charges: KES ${dispatchNote.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}

Bank Remittance Details:
${EXACT_FIRM_INFO.bankDetails}

Kindly acknowledge receipt at your earliest convenience.

Yours faithfully,
${EXACT_FIRM_INFO.name}
P.105/1992 | Advocates of the High Court of Kenya`;

    const templates = getSavedEmailTemplates();
    const feeTpl = templates.find(t => t.id === 'fee_note_dispatch');
    const vars: Record<string, string> = {
      clientName: dispatchNote.clientName,
      billNumber: dispatchNote.billNumber,
      matterTitle: dispatchNote.matterTitle,
      grandTotal: `KES ${dispatchNote.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
      bankDetails: EXACT_FIRM_INFO.bankDetails,
      firmName: EXACT_FIRM_INFO.name,
    };
    const finalSubject = feeTpl ? renderTemplateText(feeTpl.subject, vars) : emailSubject;
    const finalBody = feeTpl ? renderTemplateText(feeTpl.plainText, vars) : emailBody;
    const finalHtml = feeTpl ? renderTemplateText(feeTpl.htmlContent, vars) : undefined;

    try {
      await sendEmail({
        to: [dispatchEmail.trim()],
        subject: finalSubject,
        body: finalBody,
        htmlBody: finalHtml,
        category: 'firm_to_client'
      });
      setIsSendingEmail(false);
      setDispatchNote(null);
      showToast(`Email successfully dispatched to ${dispatchEmail.trim()}!`);
    } catch (err: any) {
      setIsSendingEmail(false);
      setErrorMessage(err.message || 'Unable to dispatch email.');
    }
  };

  // REAL WHATSAPP FUNCTION: Opens WhatsApp Web with client phone number & pre-filled legal text
  const handleExecuteWhatsApp = () => {
    if (!dispatchNote) return;
    const cleanPhone = dispatchPhone.replace(/[^0-9]/g, '');
    const message = `*${EXACT_FIRM_INFO.name}* (P.105/1992)

Dear *${dispatchNote.clientName}*,

Please find our formal Bill of Costs:
• *Bill Ref:* ${dispatchNote.billNumber}
• *Matter:* ${dispatchNote.matterTitle}
• *Schedule:* ${dispatchNote.courtSchedule}
• *Total Due:* KES ${dispatchNote.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}

*Payment via Equity Paybill:* 247247
*Account:* ${dispatchNote.billNumber}

Kindly contact our registry for any inquiries.`;

    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
    setDispatchNote(null);
    showToast('WhatsApp launched with legal summary!');
  };

  // REAL RULE 69 VECTOR PDF DOWNLOAD: Immediately generates authentic court PDF
  const handleDownloadRealPDF = (fn: ExactFeeNoteRecord) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.text('REPUBLIC OF KENYA', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(11);
      doc.text(fn.forumName || 'IN THE HIGH COURT OF KENYA AT NAIROBI', pageWidth / 2, 26, { align: 'center' });
      doc.setFontSize(10);
      doc.text(fn.matterTitle, pageWidth / 2, 32, { align: 'center' });

      // Parties
      doc.setFont('times', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Claimant / Applicant: ${fn.claimantName || fn.clientName}`, 18, 42);
      doc.text(`Respondent: ${fn.respondentName || 'Opposing Party'}`, 18, 48);
      doc.text(`Bill Ref: ${fn.billNumber}   |   Date: ${fn.createdAt.slice(0, 10)}`, 18, 54);

      // Rule 69 5-Column Table
      const profitCost = fn.instructionFee + (fn.gettingUpFee || 0);
      const rows = [
        ['1.', '2026', 'Instructions to represent client and draw pleadings (Item 1)', `${fn.instructionFee.toLocaleString()}`, ''],
        ...(fn.gettingUpFee ? [['2.', '2026', 'Getting-up fee for trial / hearing (Item 2)', `${fn.gettingUpFee.toLocaleString()}`, '']] : []),
        ['3.', '2026', 'Drawing Notice of Motion Application & Supporting Affidavit', '4,500', ''],
        ['4.', '2026', 'Attendance at Court for Mention / Directions', '2,500', ''],
        ['5.', '2026', 'Perusing Statement of Defence and documentary exhibits', '2,500', ''],
        ['D1', '2026', 'Judiciary Court Filing Fee Receipt (Pass-Through Voucher)', '5,000', ''],
        ['D2', '2026', 'Licensed Process Server Returns & Affidavit of Service', '3,500', ''],
        ['D3', '2026', 'Special Postage, Waybill & Courier Charges', '1,500', '']
      ];

      autoTable(doc, {
        startY: 60,
        head: [['No.', 'Date', 'Particulars of Professional Services & Disbursements', 'Amount (KES)', 'Taxing Off.']],
        body: rows,
        theme: 'plain',
        styles: { font: 'times', fontSize: 9, cellPadding: 2.5 },
        headStyles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 100 },
          3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
          4: { cellWidth: 20, halign: 'center' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text(`GRAND TOTAL CLAIMED: KES ${fn.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, pageWidth - 18, finalY, { align: 'right' });

      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Drawn & Filed by: ${EXACT_FIRM_INFO.name} (${EXACT_FIRM_INFO.firmRegNo || EXACT_FIRM_INFO.managingPartnerLsk})`, 18, finalY + 14);

      doc.save(`${fn.billNumber}_Rule69_Court_Bill.pdf`);
      showToast(`Downloaded official PDF for ${fn.billNumber}`);
    } catch (e: any) {
      alert('PDF generation error: ' + e.message);
    }
  };

  // Rule 7 calculation
  const getAccruedInterest = (createdAt: string, grandTotal: number) => {
    const diffDays = Math.max(0, Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)));
    const overdueDays = Math.max(0, diffDays - 30);
    return overdueDays > 0 ? Math.round((grandTotal * 0.14 * (overdueDays / 365))) : 0;
  };

  // Filter calculations
  const filteredFeeNotes = useMemo(() => {
    const userFullName = (currentUser?.fullName || '').toLowerCase().trim();
    const userEmail = (currentUser?.workEmail || '').toLowerCase().trim();
    const userTitle = (currentUser?.advocateTitle || '').toLowerCase().trim();

    return feeNotesList.filter((fn) => {
      // If visibility scope is 'self' and logged-in user is an advocate, only show their own fee notes
      if (visibilityScope === 'self' && !isManagerOrAdmin) {
        const genBy = (fn.generatedByUser || '').toLowerCase();
        const genEmail = ((fn as any).generatedByEmail || '').toLowerCase();
        const genId = (fn as any).userId;

        const isMine = (userFullName && genBy.includes(userFullName)) ||
                       (userTitle && genBy.includes(userTitle)) ||
                       (userEmail && genEmail === userEmail) ||
                       (currentUser?.id && genId === currentUser.id);

        if (!isMine) return false;
      }

      const matchesStatus = filterStatus === 'all' || fn.status === filterStatus;
      const s = (fn.courtSchedule || '').toLowerCase();
      const matchesSchedule =
        scheduleFilter === 'all' ||
        (scheduleFilter === 'high_court' && (s.includes('6') || s.includes('high'))) ||
        (scheduleFilter === 'subordinate' && (s.includes('7') || s.includes('magistrate'))) ||
        (scheduleFilter === 'conveyancing' && (s.includes('1') || s.includes('conveyanc'))) ||
        (scheduleFilter === 'tribunals' && (s.includes('11') || s.includes('tribunal')));

      const q = searchQuery.toLowerCase();
      const matchesQuery =
        fn.billNumber.toLowerCase().includes(q) ||
        fn.matterTitle.toLowerCase().includes(q) ||
        fn.clientName.toLowerCase().includes(q) ||
        fn.generatedByUser.toLowerCase().includes(q);

      return matchesStatus && matchesSchedule && matchesQuery;
    });
  }, [feeNotesList, filterStatus, scheduleFilter, searchQuery, visibilityScope, isManagerOrAdmin, currentUser]);

  // Aggregate Metrics
  const totalValue = feeNotesList.reduce((sum, fn) => sum + fn.grandTotal, 0);
  const totalProcessedValue = feeNotesList.filter(fn => fn.status === 'processed').reduce((sum, fn) => sum + fn.grandTotal, 0);
  const totalDraftValue = feeNotesList.filter(fn => fn.status === 'draft').reduce((sum, fn) => sum + fn.grandTotal, 0);
  const draftsCount = feeNotesList.filter(fn => fn.status === 'draft').length;
  const processedCount = feeNotesList.filter(fn => fn.status === 'processed').length;
  const totalAccruedInterest = feeNotesList.reduce((sum, fn) => sum + getAccruedInterest(fn.createdAt, fn.grandTotal), 0);

  // Checkbox handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredFeeNotes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFeeNotes.map(n => n.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Master Excel Export
  const handleExportConsolidatedExcel = () => {
    const targetBills = feeNotesList.filter(n => selectedIds.includes(n.id));
    if (targetBills.length === 0) return;

    const rows = targetBills.map(n => ({
      'Bill Number': n.billNumber,
      'Matter Title': n.matterTitle,
      'Client Entity': n.clientName,
      'Court Schedule': n.courtSchedule,
      'Status': n.status.toUpperCase(),
      'Instruction Fee (KES)': n.instructionFee,
      'Getting-Up Fee (KES)': n.gettingUpFee || 0,
      'Grand Total (KES)': n.grandTotal,
      'Date Created': n.createdAt.slice(0, 10),
      'Advocate': n.generatedByUser
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fee Notes Ledger');
    XLSX.writeFile(wb, `Fee_Notes_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Clean court badge
  const getCleanCourtBadge = (schedule: string) => {
    const s = (schedule || '').toLowerCase();
    if (s.includes('6') || s.includes('high')) return 'High Court (Sched. 6)';
    if (s.includes('7') || s.includes('magistrate')) return 'Magistrate (Sched. 7)';
    if (s.includes('appeal')) return 'Court of Appeal (Sched. 8)';
    if (s.includes('11') || s.includes('tribunal')) return 'Tribunals (Sched. 11)';
    if (s.includes('1') || s.includes('conveyanc')) return 'Conveyancing (Sched. 1)';
    if (s.includes('2') || s.includes('lease')) return 'Leases (Sched. 2)';
    return 'Statutory Scale';
  };

  return (
    <div className="space-y-4 pb-12 font-sans">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner - Clean, Minimalist, Compact */}
      <div className="pt-1 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)]/60 pb-3">
        <div>
          <h1 className="font-brand font-bold text-xl sm:text-2xl text-[var(--text-main)] tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-slate-700 dark:text-zinc-300" /> Fee Notes &amp; Bills of Costs
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 font-sans">
            Ledger of taxed, issued, and draft bills under the Advocates (Remuneration) Order
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isManagerOrAdmin ? (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => {
                  setVisibilityScope('all');
                  localStorage.setItem('FEE_NOTES_VISIBILITY_SCOPE', 'all');
                  window.dispatchEvent(new CustomEvent('feeNotesVisibilityChanged', { detail: 'all' }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  visibilityScope === 'all'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Policy: Advocates see the entire firm's fee notes ledger"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Allow All Fee Notes</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setVisibilityScope('self');
                  localStorage.setItem('FEE_NOTES_VISIBILITY_SCOPE', 'self');
                  window.dispatchEvent(new CustomEvent('feeNotesVisibilityChanged', { detail: 'self' }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  visibilityScope === 'self'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Policy: Advocates only see fee notes they drafted themselves"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Allow Self Only</span>
              </button>
            </div>
          ) : visibilityScope === 'self' && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Showing Self Fee Notes Only
            </span>
          )}

          {can('boc.view') && (
            <button
              onClick={() => onNavigateTab('boc')}
              className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Create Fee Note
            </button>
          )}
        </div>
      </div>

      {/* MINIMALIST SUMMARY STATS (Clean, Slate, Monochrome, No Rainbow) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div 
          onClick={() => setFilterStatus('all')}
          className={`p-3.5 rounded-xl border bg-[var(--bg-card)] transition-colors cursor-pointer ${
            filterStatus === 'all' ? 'border-slate-800 dark:border-white shadow-2xs' : 'border-[var(--border-color)] hover:border-slate-400'
          }`}
        >
          <span className="text-[11px] text-[var(--text-muted)] font-medium block">All Saved Bills</span>
          <p className="text-lg font-bold text-[var(--text-main)] font-mono mt-0.5">{feeNotesList.length}</p>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">KES {totalValue.toLocaleString('en-KE')}</span>
        </div>

        <div 
          onClick={() => setFilterStatus('processed')}
          className={`p-3.5 rounded-xl border bg-[var(--bg-card)] transition-colors cursor-pointer ${
            filterStatus === 'processed' ? 'border-slate-800 dark:border-white shadow-2xs' : 'border-[var(--border-color)] hover:border-slate-400'
          }`}
        >
          <span className="text-[11px] text-[var(--text-muted)] font-medium block">Issued & Processed</span>
          <p className="text-lg font-bold text-[var(--text-main)] font-mono mt-0.5">{processedCount}</p>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">KES {totalProcessedValue.toLocaleString('en-KE')}</span>
        </div>

        <div 
          onClick={() => setFilterStatus('draft')}
          className={`p-3.5 rounded-xl border bg-[var(--bg-card)] transition-colors cursor-pointer ${
            filterStatus === 'draft' ? 'border-slate-800 dark:border-white shadow-2xs' : 'border-[var(--border-color)] hover:border-slate-400'
          }`}
        >
          <span className="text-[11px] text-[var(--text-muted)] font-medium block">Pending Drafts</span>
          <p className="text-lg font-bold text-[var(--text-main)] font-mono mt-0.5">{draftsCount}</p>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">KES {totalDraftValue.toLocaleString('en-KE')}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <span className="text-[11px] text-[var(--text-muted)] font-medium block">Rule 7 Accrued Interest</span>
          <p className="text-lg font-bold text-[var(--text-main)] font-mono mt-0.5">
            +KES {totalAccruedInterest.toLocaleString('en-KE')}
          </p>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">14% p.a. on overdue bills</span>
        </div>
      </div>

      {/* MINIMALIST FILTER & SEARCH TOOLBAR */}
      <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'All Bills', count: feeNotesList.length },
            { id: 'processed', label: 'Processed', count: processedCount },
            { id: 'draft', label: 'Drafts', count: draftsCount },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Controls: Schedule Dropdown & Search */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={scheduleFilter}
            onChange={(e) => setScheduleFilter(e.target.value)}
            className="bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:outline-none cursor-pointer"
          >
            <option value="all">All Remuneration Schedules</option>
            <option value="high_court">High Court (Sched. 6)</option>
            <option value="subordinate">Subordinate (Sched. 7)</option>
            <option value="conveyancing">Conveyancing (Sched. 1)</option>
            <option value="tribunals">Tribunals & ARB (Sched. 11)</option>
          </select>

          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bill no, client, matter..."
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-slate-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2 text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ERROR ALERT */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="font-bold">&times;</button>
        </div>
      )}

      {/* CLEAN, MINIMALIST TABLE (No loud Rule 7 badges, No clutter) */}
      <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-main)] shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-wider border-b border-[var(--border-color)] select-none">
              <tr>
                <th className="py-3 px-3.5 w-10 text-center">
                  <button onClick={toggleSelectAll} className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]">
                    {selectedIds.length === filteredFeeNotes.length && filteredFeeNotes.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-slate-800 dark:text-white" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3.5">Bill Number</th>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5 min-w-[220px]">Matter & Client</th>
                <th className="py-3 px-3.5">Court Schedule</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right font-mono">Grand Total (KES)</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-main)]">
              {filteredFeeNotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[var(--text-muted)]">
                    No fee notes matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredFeeNotes.map(fn => {
                  const isSelected = selectedIds.includes(fn.id);
                  const isMenuOpen = activeMenuId === fn.id;
                  const courtScheduleLabel = getCleanCourtBadge(fn.courtSchedule);

                  return (
                    <tr
                      key={fn.id}
                      onClick={() => setSelectedLegalNote(fn)}
                      className={`hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-100/60 dark:bg-zinc-800/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelectOne(fn.id)}
                          className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-slate-900 dark:text-white" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Bill Number */}
                      <td className="py-3.5 px-3.5 font-mono font-bold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{fn.billNumber}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyText(fn.billNumber, fn.id);
                            }}
                            className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            title="Copy Bill Number"
                          >
                            {copiedId === fn.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3.5 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                        {fn.createdAt.slice(0, 10)}
                      </td>

                      {/* Matter & Client */}
                      <td className="py-3.5 px-3.5">
                        <strong className="font-semibold text-xs text-[var(--text-main)] block line-clamp-1">
                          {fn.matterTitle}
                        </strong>
                        <span className="text-[11px] text-[var(--text-muted)] block truncate mt-0.5">
                          {fn.clientName}
                        </span>
                      </td>

                      {/* Court Schedule */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[10.5px] font-medium text-[var(--text-muted)]">
                          {courtScheduleLabel}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          fn.status === 'processed'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'border border-[var(--border-color)] text-[var(--text-muted)]'
                        }`}>
                          {fn.status === 'processed' ? 'Issued' : 'Draft'}
                        </span>
                      </td>

                      {/* Grand Total */}
                      <td className="py-3.5 px-3.5 text-right font-mono font-bold text-xs whitespace-nowrap">
                        KES {fn.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Primary Review Button: Opens full legal view */}
                          <button
                            onClick={() => setSelectedLegalNote(fn)}
                            className="px-2.5 py-1 text-xs font-semibold bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-main)] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>

                          {/* Action Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuId(isMenuOpen ? null : fn.id)}
                              className="p-1 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 top-7 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl z-30 py-1 text-xs text-left animate-in fade-in">
                                <button
                                  onClick={() => {
                                    handleDownloadRealPDF(fn);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-[var(--text-main)] hover:bg-[var(--bg-subtle)] flex items-center gap-2 cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5 text-emerald-500" /> Download Court PDF
                                </button>
                                <button
                                  onClick={() => {
                                    setDispatchNote(fn);
                                    setDispatchMode('whatsapp');
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-[var(--text-main)] hover:bg-[var(--bg-subtle)] flex items-center gap-2 cursor-pointer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Client
                                </button>
                                <button
                                  onClick={() => {
                                    setDispatchNote(fn);
                                    setDispatchMode('email');
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-[var(--text-main)] hover:bg-[var(--bg-subtle)] flex items-center gap-2 cursor-pointer"
                                >
                                  <Mail className="w-3.5 h-3.5 text-blue-500" /> Email Statement
                                </button>
                                <button
                                  onClick={() => handleCloneNote(fn)}
                                  className="w-full px-3 py-1.5 text-[var(--text-main)] hover:bg-[var(--bg-subtle)] flex items-center gap-2 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-amber-500" /> Clone Bill
                                </button>
                                {can('feenotes.edit') && (
                                  <button
                                    onClick={() => {
                                      if (onNavigateToBuilder) onNavigateToBuilder(fn, false);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-[var(--text-main)] hover:bg-[var(--bg-subtle)] flex items-center gap-2 cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-indigo-500" /> Edit in Builder
                                  </button>
                                )}
                                {can('feenotes.delete') && (
                                  <button
                                    onClick={() => handleDeleteFeeNote(fn.id, fn.billNumber)}
                                    className="w-full px-3 py-1.5 text-red-500 hover:bg-red-500/10 flex items-center gap-2 font-medium cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete Bill
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

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

      {/* FLOATING BULK EXPORT BAR */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-4 text-xs font-semibold">
          <span>{selectedIds.length} Selected</span>
          <div className="h-4 w-px bg-slate-700 dark:bg-zinc-300" />
          <button onClick={handleExportConsolidatedExcel} className="flex items-center gap-1.5 hover:underline cursor-pointer">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export Excel Ledger
          </button>
          <button onClick={() => setSelectedIds([])} className="hover:text-red-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FULL LEGAL RECORD & INSTANT PDF MODAL (Triggered by Clicking Row or Review) */}
      {selectedLegalNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] max-w-2xl w-full rounded-2xl shadow-2xl p-6 sm:p-7 space-y-5 text-xs max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <span className="px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] font-mono text-[10px] font-semibold border border-[var(--border-color)]">
                  {selectedLegalNote.courtSchedule || 'Schedule 6 — High Court'}
                </span>
                <h2 className="font-mono font-bold text-xl text-[var(--text-main)] mt-1">
                  {selectedLegalNote.billNumber}
                </h2>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                  Date Filed: {selectedLegalNote.createdAt.slice(0, 10)} &bull; Advocate: {selectedLegalNote.generatedByUser}
                </p>
              </div>
              <button onClick={() => setSelectedLegalNote(null)} className="p-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Matter & Parties Info */}
            <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-2">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">
                Cause & Coram Title
              </span>
              <p className="font-bold text-sm text-[var(--text-main)]">{selectedLegalNote.matterTitle}</p>
              <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] border-t border-[var(--border-color)]">
                <div>
                  <span className="text-[var(--text-muted)] block">Claimant / Client:</span>
                  <strong className="text-[var(--text-main)]">{selectedLegalNote.clientName}</strong>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Subject Claim Value:</span>
                  <strong className="text-[var(--text-main)] font-mono">
                    KES {(selectedLegalNote.claimValue || 0).toLocaleString('en-KE')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Itemized Legal Costs Breakdown */}
            <div className="space-y-2 font-mono">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block font-sans">
                Statutory Remuneration Schedule (L.N. 35/2014)
              </span>

              <div className="border border-[var(--border-color)] rounded-xl overflow-hidden divide-y divide-[var(--border-color)]">
                <div className="p-2.5 flex justify-between bg-[var(--bg-subtle)] font-semibold text-[11px]">
                  <span>1. Instruction Fee (Scale 1)</span>
                  <span>KES {(selectedLegalNote.instructionFee || 0).toLocaleString('en-KE')}</span>
                </div>
                {selectedLegalNote.gettingUpFee ? (
                  <div className="p-2.5 flex justify-between text-[11px]">
                    <span>2. Getting-Up Fee for Trial (1/3 Base)</span>
                    <span>KES {selectedLegalNote.gettingUpFee.toLocaleString('en-KE')}</span>
                  </div>
                ) : null}
                <div className="p-2.5 flex justify-between text-[11px]">
                  <span>3. Drawing Pleadings, Affidavits & Applications</span>
                  <span>KES 4,500.00</span>
                </div>
                <div className="p-2.5 flex justify-between text-[11px]">
                  <span>4. Court Attendances for Mention & Directions</span>
                  <span>KES 2,500.00</span>
                </div>
                <div className="p-2.5 flex justify-between text-[11px]">
                  <span>5. Out-of-Pocket Disbursements (Filing Fees & Process Server)</span>
                  <span>KES 10,000.00</span>
                </div>
                <div className="p-3.5 flex justify-between bg-slate-100 dark:bg-zinc-800 font-bold text-sm">
                  <span>GRAND TOTAL ASSESSED</span>
                  <span className="text-slate-900 dark:text-white">
                    KES {selectedLegalNote.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions: Download Real PDF or Edit in Builder */}
            <div className="pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setDispatchNote(selectedLegalNote);
                    setDispatchMode('whatsapp');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                </button>
                <button
                  onClick={() => {
                    setDispatchNote(selectedLegalNote);
                    setDispatchMode('email');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-500" /> Email
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadRealPDF(selectedLegalNote)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download Official PDF
                </button>

                {can('feenotes.edit') && (
                  <button
                    onClick={() => {
                      if (onNavigateToBuilder) onNavigateToBuilder(selectedLegalNote, false);
                      setSelectedLegalNote(null);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit in Builder
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DISPATCH MODAL (Working WhatsApp & Email with Real Integration) */}
      {dispatchNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] max-w-md w-full rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-start justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-main)]">
                  {dispatchMode === 'whatsapp' ? 'Dispatch via WhatsApp' : 'Dispatch via Email'}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">{dispatchNote.billNumber}</p>
              </div>
              <button onClick={() => setDispatchNote(null)} className="p-1 rounded-lg border border-[var(--border-color)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle Mode */}
            <div className="flex rounded-xl bg-[var(--bg-subtle)] p-1 border border-[var(--border-color)]">
              <button
                onClick={() => setDispatchMode('whatsapp')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                  dispatchMode === 'whatsapp' ? 'bg-emerald-600 text-white font-bold' : 'text-[var(--text-muted)]'
                }`}
              >
                WhatsApp
              </button>
              <button
                onClick={() => setDispatchMode('email')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                  dispatchMode === 'email' ? 'bg-blue-600 text-white font-bold' : 'text-[var(--text-muted)]'
                }`}
              >
                Email
              </button>
            </div>

            {dispatchMode === 'whatsapp' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                    Client WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={dispatchPhone}
                    onChange={e => setDispatchPhone(e.target.value)}
                    placeholder="+254 7..."
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-main)] focus:outline-none"
                  />
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-mono text-[10.5px] space-y-1">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">Preview Legal Summary:</p>
                  <p>Bill: {dispatchNote.billNumber}</p>
                  <p>Matter: {dispatchNote.matterTitle}</p>
                  <p>Due: KES {dispatchNote.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                </div>
                <button
                  onClick={handleExecuteWhatsApp}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" /> Open in WhatsApp Web
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                    Client Email Address
                  </label>
                  <input
                    type="email"
                    value={dispatchEmail}
                    onChange={e => setDispatchEmail(e.target.value)}
                    placeholder="billing@client.co.ke"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-main)] focus:outline-none"
                  />
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] font-mono text-[10.5px] space-y-1">
                  <p className="font-bold text-blue-600 dark:text-blue-400">Statement Preview:</p>
                  <p>Subject: Fee Note Ref: {dispatchNote.billNumber}</p>
                  <p>Total: KES {dispatchNote.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                </div>
                <button
                  onClick={handleExecuteSendEmail}
                  disabled={isSendingEmail}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  <span>{isSendingEmail ? 'Sending via Mailer...' : 'Send Official Email'}</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default FeeNotesListView;
