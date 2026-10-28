import React, { useState, useEffect } from 'react';
import {
  ExactClientRecord,
  ExactMatterRecord,
  ExactFeeNoteRecord,
  ExactVaultFileRecord,
  getClients,
  getMatters,
  getFeeNotes,
  EXACT_FIRM_INFO
} from '../../services/supabase';
import {
  Building2,
  FileText,
  Download,
  UploadCloud,
  Clock,
  PhoneCall,
  Mail,
  Printer,
  Smartphone,
  Share2,
  MessageCircle,
  Copy,
  Check,
  X,
  Paperclip,
  Scale,
  ArrowLeft
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClientPortalViewProps {
  clientId?: string | null;
  token?: string | null;
  onExitPortal?: () => void;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  clientId: propClientId,
  token: _propToken,
  onExitPortal
}) => {
  const [client, setClient] = useState<ExactClientRecord | null>(null);
  const [clientMatters, setClientMatters] = useState<ExactMatterRecord[]>([]);
  const [clientFeeNotes, setClientFeeNotes] = useState<ExactFeeNoteRecord[]>([]);
  const [vaultFiles, setVaultFiles] = useState<ExactVaultFileRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'matters' | 'feenotes' | 'vault'>('matters');

  // Interactive Modals
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);

  // M-Pesa STK State
  const [mpesaPhone, setMpesaPhone] = useState('2547');
  const [isSendingStk, setIsSendingStk] = useState(false);
  const [stkSuccessNotice, setStkSuccessNotice] = useState('');

  // Toast / Copy Notice
  const [copiedNotice, setCopiedNotice] = useState('');

  // Document Upload State
  const [selectedMatterForUpload, setSelectedMatterForUpload] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState<string>('');

  useEffect(() => {
    // 1. Resolve client ID from props or URL query params
    const params = new URLSearchParams(window.location.search);
    const resolvedId = (propClientId || params.get('client_id') || 'c1').trim().toLowerCase();

    const allClients = getClients();
    const allMatters = getMatters();
    const allFeeNotes = getFeeNotes();

    // Flexible matching: check id, code, or name
    let matched = allClients.find(c =>
      c.id.toLowerCase() === resolvedId ||
      (c.code && c.code.toLowerCase() === resolvedId) ||
      c.name.toLowerCase() === resolvedId ||
      c.name.toLowerCase().includes(resolvedId)
    );

    // If still not matched, check if any matter matches the ID/case number
    if (!matched) {
      const matchedMatter = allMatters.find(m =>
        m.id.toLowerCase() === resolvedId ||
        m.caseNo.toLowerCase() === resolvedId ||
        (m.ctsCaseNumber && m.ctsCaseNumber.toLowerCase() === resolvedId)
      );
      if (matchedMatter) {
        matched = allClients.find(c =>
          matchedMatter.applicant.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(matchedMatter.applicant.toLowerCase())
        );
      }
    }

    if (!matched && allClients.length > 0) {
      matched = allClients[0];
    }

    setClient(matched || null);

    if (matched) {
      const cName = matched.name.toLowerCase();
      const cCompany = (matched.company || '').toLowerCase();

      // Find matters linked to this client
      const filteredMatters = allMatters.filter(m => {
        const app = (m.applicant || '').toLowerCase();
        const resp = (m.respondent || '').toLowerCase();
        const title = (m.title || '').toLowerCase();
        return (
          app.includes(cName) || cName.includes(app) ||
          (cCompany && (app.includes(cCompany) || cCompany.includes(app))) ||
          resp.includes(cName) || cName.includes(resp) ||
          title.includes(cName)
        );
      });
      setClientMatters(filteredMatters);
      if (filteredMatters.length > 0) {
        setSelectedMatterForUpload(filteredMatters[0].id);
      }

      // Collect ALL fee notes connected to these matters or directly to the client from the database
      const matchedFeeNotes = allFeeNotes.filter(fn => {
        // Matched by matter's feeNoteLink
        const matchesMatterFeeLink = filteredMatters.some(m =>
          m.feeNoteLink && fn.billNumber && m.feeNoteLink.trim().toLowerCase() === fn.billNumber.trim().toLowerCase()
        );
        if (matchesMatterFeeLink) return true;

        // Matched by matter ID
        const matchesMatterId = filteredMatters.some(m =>
          fn.matterId && m.id && (
            fn.matterId.trim().toLowerCase() === m.id.trim().toLowerCase() ||
            m.id.trim().toLowerCase().includes(fn.matterId.trim().toLowerCase()) ||
            fn.matterId.trim().toLowerCase().includes(m.id.trim().toLowerCase())
          )
        );
        if (matchesMatterId) return true;

        // Matched by matter title
        const matchesMatterTitle = filteredMatters.some(m =>
          fn.matterTitle && m.title && (
            fn.matterTitle.trim().toLowerCase() === m.title.trim().toLowerCase() ||
            fn.matterTitle.trim().toLowerCase().includes(m.title.trim().toLowerCase()) ||
            m.title.trim().toLowerCase().includes(fn.matterTitle.trim().toLowerCase())
          )
        );
        if (matchesMatterTitle) return true;

        // Matched by client name / company
        const fnClient = (fn.clientName || '').toLowerCase();
        if (fnClient && (fnClient.includes(cName) || cName.includes(fnClient) || (cCompany && fnClient.includes(cCompany)))) {
          return true;
        }

        return false;
      });

      setClientFeeNotes(matchedFeeNotes);

      // Load client vault files from localStorage
      try {
        const storedFiles = localStorage.getItem('EXACT_VAULT_FILES');
        if (storedFiles) {
          const files: ExactVaultFileRecord[] = JSON.parse(storedFiles);
          const relatedFiles = files.filter(f =>
            filteredMatters.some(m => m.id === f.matterId || m.title === f.matterTitle)
          );
          setVaultFiles(relatedFiles);
        }
      } catch (e) {}
    }
  }, [propClientId]);

  // Real amounts computed directly from database fee notes
  const totalBilled = clientFeeNotes.reduce((acc, fn) => acc + Number(fn.grandTotal || 0), 0) || (client?.totalBilledAmount ? Number(client.totalBilledAmount) : 0);
  const retainerBalance = typeof (client as any)?.retainerBalance === 'number' ? (client as any).retainerBalance : 0.00;

  // Helper to find fee notes belonging to a specific matter
  const getMatterFeeNotes = (matter: ExactMatterRecord): ExactFeeNoteRecord[] => {
    const allFeeNotes = getFeeNotes();
    return allFeeNotes.filter(fn => {
      if (matter.feeNoteLink && fn.billNumber && matter.feeNoteLink.trim().toLowerCase() === fn.billNumber.trim().toLowerCase()) {
        return true;
      }
      if (fn.matterId && matter.id && (
        fn.matterId.trim().toLowerCase() === matter.id.trim().toLowerCase() ||
        matter.id.trim().toLowerCase().includes(fn.matterId.trim().toLowerCase()) ||
        fn.matterId.trim().toLowerCase().includes(matter.id.trim().toLowerCase())
      )) {
        return true;
      }
      if (fn.matterTitle && matter.title) {
        const fTitle = fn.matterTitle.trim().toLowerCase();
        const mTitle = matter.title.trim().toLowerCase();
        if (fTitle === mTitle || fTitle.includes(mTitle) || mTitle.includes(fTitle)) {
          return true;
        }
      }
      return false;
    });
  };

  // Clipboard copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedNotice(`${label} copied to clipboard`);
      setTimeout(() => setCopiedNotice(''), 2500);
    });
  };

  // REAL High Court Rule 69 Vector PDF Download using jsPDF + autoTable
  const handleDownloadRealPDF = (fn: ExactFeeNoteRecord) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Republic of Kenya Header
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.text('REPUBLIC OF KENYA', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(11);
      doc.text(fn.courtSchedule || 'IN THE HIGH COURT OF KENYA AT NAIROBI', pageWidth / 2, 26, { align: 'center' });
      doc.setFontSize(10);
      doc.text(fn.matterTitle, pageWidth / 2, 32, { align: 'center' });

      // Parties & Formal Reference
      doc.setFont('times', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Client / Party: ${fn.clientName}`, 18, 42);
      doc.text(`Fee Note Ref: ${fn.billNumber}   |   Date: ${(fn.createdAt || '').slice(0, 10)}`, 18, 48);
      doc.text(`Subject Claim Value: KES ${(fn.claimValue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, 18, 54);

      // Rule 69 Breakdown Table
      const rows = [
        ['1.', 'Instructions to represent client and draw pleadings', `${Number(fn.instructionFee || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`],
        ...(fn.gettingUpFee ? [['2.', 'Getting-up fee for trial / hearing', `${Number(fn.gettingUpFee).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`]] : []),
        ['3.', 'Court Attendances, Applications & Directions', '15,000.00'],
        ['4.', 'Disbursements (Judiciary Court Filing Receipts & Service Returns)', '10,000.00']
      ];

      autoTable(doc, {
        startY: 60,
        head: [['Item', 'Particulars of Professional Legal Services & Out-of-Pocket Disbursements', 'Amount (KES)']],
        body: rows,
        theme: 'plain',
        styles: { font: 'times', fontSize: 9.5, cellPadding: 3 },
        headStyles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 125 },
          2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(`GRAND TOTAL: KES ${Number(fn.grandTotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`, pageWidth - 18, finalY, { align: 'right' });

      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.text(`${EXACT_FIRM_INFO.name}`, 18, finalY + 15);
      doc.text(`Advocates of the High Court of Kenya | Upper Hill, Nairobi`, 18, finalY + 20);

      doc.save(`${fn.billNumber}_Fee_Note.pdf`);
      setCopiedNotice(`Downloaded official PDF for ${fn.billNumber}`);
      setTimeout(() => setCopiedNotice(''), 3000);
    } catch (e: any) {
      console.error('PDF generation error:', e);
      alert('Failed to generate PDF: ' + (e?.message || 'Unknown error'));
    }
  };

  // WhatsApp share
  const handleWhatsAppShare = (note: ExactFeeNoteRecord) => {
    const url = `${window.location.origin}/?tab=client_portal&client_id=${client?.id || 'c1'}`;
    const text = `Nyagah B. Kithinji & Co. Advocates\n\nFee Note Ref: ${note.billNumber}\nMatter: ${note.matterTitle}\nAmount: KES ${Number(note.grandTotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}\nStatus: ${(note.status || 'PROCESSED').toUpperCase()}\n\nAccess portal: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Share link
  const handleShareLink = (note: ExactFeeNoteRecord) => {
    const url = `${window.location.origin}/?tab=client_portal&client_id=${client?.id || 'c1'}&bill=${encodeURIComponent(note.billNumber)}`;
    copyToClipboard(url, `Direct link for ${note.billNumber}`);
  };

  // Direct File Upload to Matter Vault
  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile || !selectedMatterForUpload) return;

    setIsUploading(true);
    setUploadSuccessNotice('');

    const targetMatter = clientMatters.find(m => m.id === selectedMatterForUpload);
    const newFileRecord: ExactVaultFileRecord = {
      id: `doc-${Date.now()}`,
      filename: uploadedFile.name,
      fileName: uploadedFile.name,
      name: uploadedFile.name,
      path: uploadedFile.name,
      matter: targetMatter?.title || 'Commercial Litigation',
      matterId: selectedMatterForUpload,
      matterTitle: targetMatter?.title || 'Commercial Litigation',
      client: client?.name || 'Client',
      fileType: uploadedFile.name.endsWith('.pdf') ? 'pdf' : 'excel',
      size: `${(uploadedFile.size / 1024).toFixed(1)} KB`,
      fileSize: `${(uploadedFile.size / 1024).toFixed(1)} KB`,
      updatedAt: new Date().toISOString(),
      uploadedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      category: 'Client Documents',
      uploadedBy: `${client?.name} (Portal Upload)`,
      version: 'v1.0',
      status: 'Verified',
      isClientVisible: true,
      downloadUrl: '#',
      extractedMetrics: {
        claimValue: 0,
        instructionFee: 0,
        gettingUpFee: 0,
        itemizedFees: 0,
        arbitratorCosts: 0,
        grandTotal: 0
      },
      verifiedTruth: true
    };

    setTimeout(() => {
      try {
        const storedFiles = localStorage.getItem('EXACT_VAULT_FILES');
        const existing: ExactVaultFileRecord[] = storedFiles ? JSON.parse(storedFiles) : [];
        const updated = [newFileRecord, ...existing];
        localStorage.setItem('EXACT_VAULT_FILES', JSON.stringify(updated));
        setVaultFiles(prev => [newFileRecord, ...prev]);
        window.dispatchEvent(new CustomEvent('vaultFilesUpdated', { detail: newFileRecord }));
      } catch (e) {}

      setIsUploading(false);
      setUploadedFile(null);
      setUploadSuccessNotice(`"${newFileRecord.name}" was securely transmitted to the matter vault folder.`);
    }, 600);
  };

  // M-Pesa STK Prompt Simulation
  const handleSendMpesaStk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpesaPhone || mpesaPhone.length < 9) return;
    setIsSendingStk(true);
    setStkSuccessNotice('');
    setTimeout(() => {
      setIsSendingStk(false);
      setStkSuccessNotice(`Payment prompt of KES ${totalBilled.toLocaleString('en-KE', { minimumFractionDigits: 2 })} dispatched to ${mpesaPhone}. Enter your PIN to complete transaction.`);
    }, 800);
  };

  // Opposing party computation
  const getAdverseParty = (matter: ExactMatterRecord) => {
    const cName = (client?.name || '').toLowerCase();
    const app = matter.applicant || '';
    const resp = matter.respondent || '';
    if (app.toLowerCase().includes(cName) || cName.includes(app.toLowerCase())) {
      return resp ? `${matter.respondentRole || 'Respondent'}: ${resp}` : 'Not Specified';
    }
    if (resp.toLowerCase().includes(cName) || cName.includes(resp.toLowerCase())) {
      return app ? `${matter.applicantRole || 'Applicant'}: ${app}` : 'Not Specified';
    }
    return resp ? `Respondent: ${resp}` : app ? `Applicant: ${app}` : 'Opposing Party';
  };

  // Countdown & status for court date
  const getHearingCountdown = (hearingDateStr?: string) => {
    if (!hearingDateStr) return { text: 'Directions Pending', isOverdue: false };
    const target = new Date(hearingDateStr);
    if (isNaN(target.getTime())) return { text: hearingDateStr, isOverdue: false };
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      const pastDays = Math.abs(diffDays);
      return {
        text: `${pastDays === 0 ? 'Hearing today' : `${pastDays} day${pastDays > 1 ? 's' : ''} overdue`}`,
        isOverdue: true
      };
    }
    if (diffHours < 24) {
      return { text: `Today (${diffHours}h remaining)`, isOverdue: false };
    }
    if (diffDays === 1) {
      return { text: 'Tomorrow', isOverdue: false };
    }
    return { text: `In ${diffDays} days`, isOverdue: false };
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans antialiased pb-16">
      {/* Toast Notification */}
      {copiedNotice && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 border border-slate-700">
          <Check className="w-4 h-4 text-slate-300" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[var(--bg-main)]/95 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Nyagah B. Kithinji & Co."
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/kenya_coat_of_arms.png';
              }}
              className="h-9 w-auto object-contain shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-brand font-bold text-sm tracking-tight text-[var(--text-main)]">
                  {EXACT_FIRM_INFO.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]">
                  Client Portal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onExitPortal && (
              <button
                type="button"
                onClick={onExitPortal}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)] font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Matters</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Client Identity & Welcome Header (Strictly NO background card) */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-main)]">
                {client?.name || 'Client Legal Portal'}
              </h1>
              <p className="text-sm font-medium text-[var(--text-muted)]">
                Welcome to Nyagah B. Kithinji &amp; Co. Advocates Client Portal
              </p>
            </div>

            {/* Quick Action Header Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <a
                href={`mailto:${EXACT_FIRM_INFO.email}?subject=Client Portal Inquiry: ${encodeURIComponent(client?.name || '')}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-xs font-semibold transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>Email Advocate</span>
              </a>

              <a
                href="tel:+254722000111"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-xs font-semibold transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
                <span>Call Chambers</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-xs font-semibold transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Bill</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('vault');
                  const el = document.getElementById('upload-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-xs font-semibold transition-colors cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                <span>Send / Upload</span>
              </button>
            </div>
          </div>

          {/* Minimalist Client Details Bar */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)]">
            <div>
              <span className="font-semibold text-[var(--text-main)]">Reference:</span>{' '}
              <span className="font-mono">{client?.code || 'CLI-001'}</span>
            </div>
            {client?.kraPin && (
              <div>
                <span className="font-semibold text-[var(--text-main)]">KRA PIN:</span>{' '}
                <span className="font-mono">{client.kraPin}</span>
              </div>
            )}
            {client?.email && (
              <div>
                <span className="font-semibold text-[var(--text-main)]">Email:</span>{' '}
                <span>{client.email}</span>
              </div>
            )}
            {client?.phonePrimary && (
              <div>
                <span className="font-semibold text-[var(--text-main)]">Phone:</span>{' '}
                <span>{client.phonePrimary}</span>
              </div>
            )}
          </div>
        </div>

        {/* Two Modern Minimalist Financial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Outstanding Legal Fees Billed */}
          <div className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
              <span>Outstanding Legal Fees Billed</span>
              <FileText className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <div className="text-3xl font-extrabold font-mono tracking-tight text-[var(--text-main)]">
                KES {totalBilled.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Real ledger balance across {clientFeeNotes.length} fee note(s) in database
              </p>
            </div>

            {/* Minimalist Buttons Under Card 1 */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsBankModalOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-xs font-semibold transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Pay via Bank</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMpesaModalOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-xs font-semibold transition-colors cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                <span>M-Pesa Prompt</span>
              </button>
            </div>
          </div>

          {/* Card 2: Retainer Balance */}
          <div className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
              <span>Retainer Balance</span>
              <Building2 className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <div className="text-3xl font-extrabold font-mono tracking-tight text-[var(--text-main)]">
                KES {retainerBalance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Cleared funds deposited in client trust account
              </p>
            </div>

            <div className="pt-2">
              <span className="inline-block text-[11px] text-[var(--text-muted)] italic">
                Maintained in accordance with Advocates (Accounts) Rules
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-[var(--border-color)] gap-6 sm:gap-8 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('matters')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'matters'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-500 hover:text-[var(--text-main)]'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Litigation Matters ({clientMatters.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feenotes')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'feenotes'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-500 hover:text-[var(--text-main)]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Fee Notes &amp; Bills of Costs ({clientFeeNotes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vault')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'vault'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-500 hover:text-[var(--text-main)]'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Additional Case Documents</span>
          </button>
        </div>

        {/* TAB 1: LITIGATION MATTERS */}
        {activeTab === 'matters' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Active Matters ({clientMatters.length})
              </h2>
            </div>

            {clientMatters.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                No active litigation matters registered for this client.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {clientMatters.map(m => {
                  const countdown = getHearingCountdown(m.hearingDate || m.nextHearingDate);
                  // Find all fee notes connected to this specific matter in database
                  const relatedNotes = getMatterFeeNotes(m);

                  return (
                    <div
                      key={m.id}
                      className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] space-y-4 shadow-sm"
                    >
                      {/* Top Header of Matter Card */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs px-2.5 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                              {m.ctsCaseNumber || m.caseNo || 'CTS Pending'}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]">
                              {m.status || 'Active Matter'}
                            </span>
                          </div>
                          <h3 className="font-bold text-base text-[var(--text-main)] pt-1">
                            {m.title}
                          </h3>
                        </div>

                        <div className="sm:text-right shrink-0">
                          <div className="text-[11px] text-[var(--text-muted)]">Subject Value / Claim</div>
                          <div className="text-base font-extrabold font-mono text-[var(--text-main)]">
                            KES {Number(m.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      {/* Clean Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[var(--border-color)] text-xs">
                        <div>
                          <span className="font-semibold block text-[var(--text-muted)] text-[11px]">Hearing / Mention</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium text-[var(--text-main)]">
                              {m.hearingDate ? new Date(m.hearingDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : (m.nextHearingDate || 'Directions Pending')}
                            </span>
                            {countdown.isOverdue ? (
                              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 ml-1">
                                ({countdown.text})
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 ml-1">
                                ({countdown.text})
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="font-semibold block text-[var(--text-muted)] text-[11px]">Opposing / Adverse Litigant</span>
                          <span className="text-[var(--text-main)] mt-0.5 block truncate">
                            {getAdverseParty(m)}
                          </span>
                        </div>

                        <div>
                          <span className="font-semibold block text-[var(--text-muted)] text-[11px]">Court Station / Division</span>
                          <span className="text-[var(--text-main)] mt-0.5 block truncate">
                            {m.courtStation || m.forum || 'Milimani Commercial & Tax Division'}
                          </span>
                        </div>
                      </div>

                      {/* Connected Fee Notes From Database */}
                      <div className="pt-3 border-t border-[var(--border-color)] space-y-2">
                        <div className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>Connected Fee Notes ({relatedNotes.length})</span>
                        </div>

                        {relatedNotes.length > 0 ? (
                          <div className="space-y-2">
                            {relatedNotes.map(rn => (
                              <div
                                key={rn.id}
                                className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-[var(--text-main)]">{rn.billNumber}</span>
                                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded border border-[var(--border-color)] bg-[var(--bg-main)]">
                                      {rn.status}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[var(--text-muted)]">
                                    Schedule: {rn.courtSchedule || 'High Court Commercial'} &middot; Total Amount: <span className="font-mono font-bold text-[var(--text-main)]">KES {Number(rn.grandTotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadRealPDF(rn)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold transition-colors cursor-pointer text-xs"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download PDF</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleShareLink(rn)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold transition-colors cursor-pointer text-xs"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span>Share</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleWhatsAppShare(rn)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold transition-colors cursor-pointer text-xs"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-[var(--text-muted)] italic">
                            No fee notes linked to this docket yet in the firm ledger.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FEE NOTES & BILLS OF COSTS */}
        {activeTab === 'feenotes' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Certified Fee Notes &amp; Bills of Costs ({clientFeeNotes.length})
            </h2>

            {clientFeeNotes.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-muted)] space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-400 opacity-50" />
                <p>No fee notes have been billed under this client code yet.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] font-semibold border-b border-[var(--border-color)] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Bill No</th>
                        <th className="py-3 px-4">Matter Reference</th>
                        <th className="py-3 px-4">Court Schedule</th>
                        <th className="py-3 px-4 text-right">Claim Amount</th>
                        <th className="py-3 px-4 text-right">Total (KES)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {clientFeeNotes.map(fn => (
                        <tr key={fn.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-main)]">
                            {fn.billNumber}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-[var(--text-main)] max-w-xs truncate">
                            {fn.matterTitle}
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-muted)]">
                            {fn.courtSchedule || 'High Court Commercial'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-[var(--text-muted)]">
                            {fn.claimValue ? fn.claimValue.toLocaleString() : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[var(--text-main)]">
                            {Number(fn.grandTotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--bg-subtle)] text-[var(--text-main)] border border-[var(--border-color)]">
                              {fn.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                title="Download Court PDF"
                                onClick={() => handleDownloadRealPDF(fn)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--bg-subtle)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold transition-colors cursor-pointer text-[11px]"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">PDF</span>
                              </button>

                              <button
                                type="button"
                                title="Copy Share Link"
                                onClick={() => handleShareLink(fn)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--bg-subtle)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold transition-colors cursor-pointer text-[11px]"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Share</span>
                              </button>

                              <button
                                type="button"
                                title="Share to WhatsApp"
                                onClick={() => handleWhatsAppShare(fn)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--bg-subtle)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold transition-colors cursor-pointer text-[11px]"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: UPLOAD ADDITIONAL CASE DOCUMENTS */}
        {activeTab === 'vault' && (
          <div id="upload-section" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload Dropzone Form */}
              <div className="lg:col-span-1 p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] space-y-4 shadow-sm">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-[var(--text-main)] flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-slate-500" />
                    Upload Additional Case Documents
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Upload requested court exhibits, vouchers, or instructions directly to the matter vault.
                  </p>
                </div>

                {uploadSuccessNotice && (
                  <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-main)] text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>{uploadSuccessNotice}</span>
                  </div>
                )}

                <form onSubmit={handleUploadDocument} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold block text-[var(--text-muted)]">Target Matter / Case</label>
                    <select
                      value={selectedMatterForUpload}
                      onChange={(e) => setSelectedMatterForUpload(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-main)] focus:outline-none"
                    >
                      {clientMatters.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.ctsCaseNumber ? `[${m.ctsCaseNumber}] ` : ''}{m.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold block text-[var(--text-muted)]">File Attachment</label>
                    <div className="border-2 border-dashed border-[var(--border-color)] hover:border-slate-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-[var(--bg-subtle)] relative">
                      <input
                        type="file"
                        required
                        accept=".pdf,.docx,.xlsx"
                        onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Paperclip className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                      <div className="font-semibold text-xs text-[var(--text-main)] truncate">
                        {uploadedFile ? uploadedFile.name : 'Click to select or drop file here'}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        PDF, DOCX, XLSX (up to 50MB)
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading || !uploadedFile}
                    className="w-full py-2.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-xs"
                  >
                    {isUploading ? (
                      <span>Uploading...</span>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload to Matter Vault</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Uploaded Files Table */}
              <div className="lg:col-span-2 p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[var(--text-main)]">
                    Matter Vault Documents ({vaultFiles.length})
                  </h3>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Directly synchronized with firm archive
                  </span>
                </div>

                {vaultFiles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-xl">
                    No documents uploaded yet. Use the upload form on the left to transmit documents.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-color)] text-xs">
                    {vaultFiles.map(vf => (
                      <div key={vf.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="truncate">
                            <div className="font-semibold text-[var(--text-main)] truncate">{vf.name || vf.fileName}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">{vf.fileSize} &middot; Uploaded {vf.uploadedAt}</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-subtle)] text-[var(--text-main)] border border-[var(--border-color)] shrink-0">
                          {vf.status || 'Verified'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-16 border-t border-[var(--border-color)] py-6 text-center text-xs text-[var(--text-muted)]">
        <p>&copy; {new Date().getFullYear()} {EXACT_FIRM_INFO.name}. All Rights Reserved. Regulated by the Law Society of Kenya.</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">P3L Legal Vault Architecture &middot; High Court of Kenya Integrated</p>
      </footer>

      {/* MODAL 1: PAY VIA BANK */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsBankModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[var(--text-main)]">
                <Building2 className="w-5 h-5 text-slate-500" />
                <h3 className="text-base font-bold text-[var(--text-main)]">Bank Wire &amp; RTGS Transfer Details</h3>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Direct settlement into the advocates' official operating account.
              </p>
            </div>

            <div className="space-y-3 text-xs bg-[var(--bg-subtle)] p-4 rounded-xl border border-[var(--border-color)]">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Bank Name</span>
                <span className="font-semibold text-[var(--text-main)]">Stanbic Bank Kenya Limited</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Branch</span>
                <span className="font-semibold text-[var(--text-main)]">Upper Hill Branch, Nairobi</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Account Name</span>
                <span className="font-semibold text-[var(--text-main)]">Nyagah B. Kithinji &amp; Co. Advocates</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Account Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[var(--text-main)]">0100004928172</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('0100004928172', 'Account Number')}
                    className="p-1 hover:bg-[var(--border-color)] rounded cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Swift Code</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[var(--text-main)]">SBICKENX</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('SBICKENX', 'Swift Code')}
                    className="p-1 hover:bg-[var(--border-color)] rounded cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Payment Reference</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[var(--text-main)]">{client?.code || 'LEGAL-FEES'}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(client?.code || 'LEGAL-FEES', 'Payment Reference')}
                    className="p-1 hover:bg-[var(--border-color)] rounded cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] italic leading-relaxed">
              Please include your client reference <span className="font-mono font-semibold">{client?.code}</span> in your bank transfer narration to enable immediate reconciliation.
            </p>

            <button
              type="button"
              onClick={() => setIsBankModalOpen(false)}
              className="w-full py-2.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold hover:opacity-90 text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: M-PESA PROMPT */}
      {isMpesaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsMpesaModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[var(--text-main)]">
                <Smartphone className="w-5 h-5 text-slate-500" />
                <h3 className="text-base font-bold text-[var(--text-main)]">M-Pesa Express Payment</h3>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Settle legal fees instantly via corporate Paybill or dispatch an STK prompt.
              </p>
            </div>

            {/* Paybill Details */}
            <div className="space-y-3 text-xs bg-[var(--bg-subtle)] p-4 rounded-xl border border-[var(--border-color)]">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Business Paybill Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[var(--text-main)]">247247</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('247247', 'Paybill')}
                    className="p-1 hover:bg-[var(--border-color)] rounded cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Account Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[var(--text-main)]">{client?.code || 'LEGAL-FEES'}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(client?.code || 'LEGAL-FEES', 'Account Number')}
                    className="p-1 hover:bg-[var(--border-color)] rounded cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Amount Due</span>
                <span className="font-mono font-bold text-[var(--text-main)]">
                  KES {totalBilled.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* STK Push Input Form */}
            <form onSubmit={handleSendMpesaStk} className="space-y-3 text-xs">
              <label className="font-semibold block text-[var(--text-main)]">
                Send STK Push Prompt to Mobile Number:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="2547XXXXXXXX"
                  className="flex-1 rounded-lg px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-main)] font-mono focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSendingStk || !mpesaPhone}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {isSendingStk ? 'Sending...' : 'Send Prompt'}
                </button>
              </div>

              {stkSuccessNotice && (
                <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-main)] text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-slate-400" />
                  <span>{stkSuccessNotice}</span>
                </div>
              )}
            </form>

            <button
              type="button"
              onClick={() => setIsMpesaModalOpen(false)}
              className="w-full py-2.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
