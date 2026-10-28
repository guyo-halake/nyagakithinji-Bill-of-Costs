import React, { useState, useEffect } from 'react';
import { ExactClientRecord, ExactFeeNoteRecord, getFeeNotes, fetchFeeNotesFromDatabase } from '../../services/supabase';
import { createClient, deleteClient, fetchClients } from '../../services/data';
import { SystemUser } from '../../services/supabase';
import { sendEmail } from '../../services/email';
import { getSavedEmailTemplates, renderTemplateText } from '../../services/emailTemplates';
import { hasPermission } from '../../services/rbac';
import { checkConflictOfInterest } from '../../services/conflict';
import { generateClientPortalToken } from '../../services/data';
import {
  UserPlus,
  Search,
  Phone,
  Mail,
  MessageCircle,
  X,
  Trash2,
  Building2,
  Briefcase,
  MoreVertical,
  Eye,
  FileText,
  Plus,
  Receipt,
  Scale,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';

interface ClientsViewProps {
  onNavigateTab?: (tab: string, targetUserId?: string) => void;
  onNavigateToBuilder?: (initialNote?: any, isPreview?: boolean) => void;
  currentUser?: SystemUser | null;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  onNavigateTab,
  onNavigateToBuilder,
  currentUser
}) => {
  const [clientsList, setClientsList] = useState<ExactClientRecord[]>([]);
  const [feeNotesList, setFeeNotesList] = useState<ExactFeeNoteRecord[]>(() => getFeeNotes());
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [, setPermissionTick] = useState(0);

  // Client Details Drawer State (Simple & Clean)
  const [selectedDossierClient, setSelectedDossierClient] = useState<ExactClientRecord | null>(null);

  // Registration Modal State
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newKraPin, setNewKraPin] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCategory, setNewCategory] = useState('Corporate or Institutional');
  const [newEmail, setNewEmail] = useState('');
  const [newPhonePrimary, setNewPhonePrimary] = useState('');
  const [newPhoneSecondary, setNewPhoneSecondary] = useState('');

  // Email Compose Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailClient, setEmailClient] = useState<ExactClientRecord | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Client Portal Magic Link Modal State
  const [portalModalClient, setPortalModalClient] = useState<ExactClientRecord | null>(null);
  const [portalLinkCopied, setPortalLinkCopied] = useState(false);
  const [generatedMagicLink, setGeneratedMagicLink] = useState('');

  const handleOpenPortalModal = (client: ExactClientRecord) => {
    setActiveMenuId(null);
    const { url } = generateClientPortalToken(client);
    setGeneratedMagicLink(url);
    setPortalLinkCopied(false);
    setPortalModalClient(client);
  };

  const handleCopyMagicLink = () => {
    if (!generatedMagicLink) return;
    navigator.clipboard.writeText(generatedMagicLink);
    setPortalLinkCopied(true);
    setTimeout(() => setPortalLinkCopied(false), 3000);
  };

  const conflictCheck = React.useMemo(() => {
    const query = newCompany.trim() || newName.trim();
    if (!query || query.length < 3) return null;
    return checkConflictOfInterest(query, { roleBeingAssigned: 'Client' });
  }, [newName, newCompany]);

  const can = (code: string) => hasPermission(currentUser, code);

  useEffect(() => {
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

  useEffect(() => {
    if (!currentUser?.firmId) return;
    const loadClients = () =>
      fetchClients(currentUser.firmId!)
        .then(setClientsList)
        .catch(error => setErrorMessage(error.message || 'Unable to load clients.'));

    const loadFeeNotes = () => {
      fetchFeeNotesFromDatabase(currentUser.firmId!)
        .then((notes: ExactFeeNoteRecord[]) => {
          if (notes && notes.length > 0) setFeeNotesList(notes);
          else setFeeNotesList(getFeeNotes());
        })
        .catch(() => setFeeNotesList(getFeeNotes()));
    };

    void loadClients();
    void loadFeeNotes();

    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ table?: string }>).detail;
      if (detail?.table === 'clients') void loadClients();
      if (detail?.table === 'fee_notes') void loadFeeNotes();
    };
    const handleClientsUpdated = (event: any) => {
      if (event?.detail && Array.isArray(event.detail)) {
        setClientsList(event.detail);
      } else {
        void loadClients();
      }
    };
    window.addEventListener('databaseRealtimeUpdate', handleRealtime);
    window.addEventListener('clientsUpdated', handleClientsUpdated);
    window.addEventListener('feeNotesUpdated', loadFeeNotes);
    window.addEventListener('storage', () => {
      void loadClients();
      void loadFeeNotes();
    });
    return () => {
      window.removeEventListener('databaseRealtimeUpdate', handleRealtime);
      window.removeEventListener('clientsUpdated', handleClientsUpdated);
      window.removeEventListener('feeNotesUpdated', loadFeeNotes);
      window.removeEventListener('storage', () => {});
    };
  }, [currentUser?.firmId]);

  // Find fee notes for a given client
  const getClientFeeNotes = (client: ExactClientRecord) => {
    const clientName = client.name.toLowerCase();
    const clientCompany = (client.company || '').toLowerCase();
    const clientCode = (client.code || '').toLowerCase();

    return feeNotesList.filter(fn => {
      const noteClient = (fn.clientName || '').toLowerCase();
      const noteMatter = (fn.matterTitle || '').toLowerCase();
      const noteNumber = (fn.billNumber || '').toLowerCase();

      if (noteClient && (noteClient.includes(clientName) || clientName.includes(noteClient))) return true;
      if (clientCompany && noteClient && (noteClient.includes(clientCompany) || clientCompany.includes(noteClient))) return true;
      if (clientCode && (noteNumber.includes(clientCode) || noteMatter.includes(clientCode))) return true;
      return false;
    });
  };

  // Debounced search & category filtering
  const filtered = clientsList.filter(c => {
    const query = search.toLowerCase();
    const matchesQuery =
      c.name.toLowerCase().includes(query) ||
      (c.company && c.company.toLowerCase().includes(query)) ||
      (c.kraPin && c.kraPin.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.phonePrimary && c.phonePrimary.toLowerCase().includes(query));

    if (!matchesQuery) return false;
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'corporate') return c.category.includes('Corporate') || c.category.includes('Institutional');
    if (selectedCategory === 'individual') return c.category.includes('Individual');
    if (selectedCategory === 'financial') return c.category.includes('Financial') || c.category.includes('Bank');
    if (selectedCategory === 'government') return c.category.includes('Government') || c.category.includes('State');
    return true;
  });

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (!currentUser?.firmId) return;

    try {
      const newRecord = await createClient(currentUser.firmId, {
        name: newName.trim(),
        company: newCompany.trim() || newName.trim(),
        category: newCategory as ExactClientRecord['category'],
        email: newEmail.trim(),
        phonePrimary: newPhonePrimary.trim(),
        phoneSecondary: newPhoneSecondary.trim(),
        kraPin: newKraPin.trim().toUpperCase(),
        address: newAddress.trim(),
      });
      setClientsList(prev => [newRecord, ...prev]);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to register client.');
      return;
    }

    setShowNewClientModal(false);
    setNewName('');
    setNewCompany('');
    setNewKraPin('');
    setNewAddress('');
    setNewEmail('');
    setNewPhonePrimary('');
    setNewPhoneSecondary('');
  };

  const handleDeleteClient = async (client: ExactClientRecord) => {
    setActiveMenuId(null);
    const activeCauses = client.activeMattersCount ?? client.matters ?? 0;
    if (activeCauses > 0) {
      const proceed = confirm(
        `WARNING: Client "${client.name}" has ${activeCauses} active matter(s) registered in the court docket.\n\nDeleting this client record may orphan active litigation records.\n\nAre you sure you want to permanently delete this client?`
      );
      if (!proceed) return;
    } else {
      if (!confirm(`Are you sure you want to delete client "${client.name}" from the database?`)) {
        return;
      }
    }

    if (!currentUser?.firmId) return;
    try {
      await deleteClient(currentUser.firmId, client.id);
      setClientsList(prev => prev.filter(c => c.id !== client.id));
      if (selectedDossierClient?.id === client.id) {
        setSelectedDossierClient(null);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to delete client.');
    }
  };

  const handleOpenEmail = (client: ExactClientRecord) => {
    setActiveMenuId(null);
    setEmailClient(client);

    const templates = getSavedEmailTemplates();
    const tpl = templates.find(t => t.id === 'fee_note_dispatch');
    const clientFeeNotes = getClientFeeNotes(client);
    const primaryFn = clientFeeNotes[0];
    const totalBilledVal = client.totalBilledAmount ?? 0;

    if (tpl) {
      const vars = {
        clientName: client.name,
        billNumber: primaryFn?.billNumber || 'BOC-2026-FEE',
        matterTitle: primaryFn?.matterTitle || 'General Legal Representation',
        grandTotal: `KES ${totalBilledVal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
        bankDetails: `Bank: Stanbic Bank Kenya\nAccount Name: Nyagah B. Kithinji & Co. Advocates Clients A/C\nAccount Number: 0100088992211\nBranch: Upper Hill Nairobi\nSwift: SBICKENA`,
        firmName: 'Nyagah B. Kithinji & Co. Advocates'
      };
      setEmailSubject(renderTemplateText(tpl.subject, vars));
      setEmailBody(renderTemplateText(tpl.plainText, vars));
    } else {
      setEmailSubject(`Legal Correspondence — Nyagah B. Kithinji & Co. Advocates`);
      setEmailBody(`Dear ${client.name},\n\nPlease find attached the official legal correspondence, fee note records, and updates from Nyagah B. Kithinji & Co. Advocates.\n\nPlease feel free to reach out if you have any questions.\n\nYours faithfully,\nNyagah B. Kithinji & Co. Advocates\nHigh Court of Kenya`);
    }
    setShowEmailModal(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailClient?.email) return;
    setIsSending(true);
    setErrorMessage('');
    try {
      await sendEmail({
        to: [emailClient.email],
        subject: emailSubject,
        body: emailBody,
        category: 'firm_to_client',
      });
      setIsSending(false);
      setShowEmailModal(false);
      setSuccessMessage(`Email successfully sent to ${emailClient.email}`);
      window.dispatchEvent(new Event('activityLogsUpdated'));
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to send email.');
      setIsSending(false);
    }
  };

  const handleWhatsApp = (phone: string, name: string) => {
    setActiveMenuId(null);
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const message = encodeURIComponent(`Hello ${name}, this is Nyagah B. Kithinji & Co. Advocates regarding your legal matter.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleNewBillForClient = (client: ExactClientRecord) => {
    if (onNavigateToBuilder) {
      onNavigateToBuilder({
        clientName: client.name,
        matterTitle: `Matter: ${client.name}`,
        claimValue: 0,
        courtSchedule: 'schedule_6_high_court',
      }, false);
    } else if (onNavigateTab) {
      onNavigateTab('boc');
    }
  };

  return (
    <div className="space-y-4 pb-12 w-full">
      {/* Title & Action Toolbar */}
      <div className="pt-1 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]/60">
        <div>
          <h1 className="font-brand font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight">
            Clients
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-sans">
            Registered firm clients &amp; tax accounts ({clientsList.length} active records)
          </p>
        </div>

        {can('clients.create') && (
          <button
            onClick={() => setShowNewClientModal(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        )}
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-zinc-800 border border-[var(--border-color)]/50 shrink-0 overflow-x-auto">
          {[
            { id: 'all', label: 'All Clients', count: clientsList.length },
            { id: 'corporate', label: 'Corporate & Institutional' },
            { id: 'individual', label: 'Individual' },
            { id: 'financial', label: 'Financial Institutions' },
          ].map(tab => {
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
              </button>
            );
          })}
        </div>

        {/* Real-time Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, KRA PIN, email..."
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[var(--text-main)] placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="cursor-pointer font-bold">&times;</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="cursor-pointer font-bold">&times;</button>
        </div>
      )}

      {/* EXECUTIVE FULL-WIDTH LINE / TABLE VIEW (Clean line format with consistent h-[42px] geometry) */}
      <div className="modulix-card p-0 overflow-hidden border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider bg-[var(--bg-subtle)] h-[42px]">
                <th className="py-3.5 px-4 min-w-[220px]">Client / Organization</th>
                <th className="py-3.5 px-4 min-w-[140px] font-mono">KRA PIN / Tax</th>
                <th className="py-3.5 px-4 min-w-[200px]">Direct Contact</th>
                <th className="py-3.5 px-4 font-mono text-center min-w-[170px]">Active Causes &amp; Fee Notes</th>
                <th className="py-3.5 px-4 font-mono text-right min-w-[140px]">Total Billed</th>
                <th className="py-3.5 px-4 text-right min-w-[180px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]/60 font-sans">
              {filtered.map((client) => {
                const initials = client.name
                  .split(' ')
                  .filter(Boolean)
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const isMenuOpen = activeMenuId === client.id;
                const activeCauses = client.activeMattersCount ?? client.matters ?? 0;
                const totalBilled = client.totalBilledAmount ?? 0;
                const clientFeeNotes = getClientFeeNotes(client);

                return (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedDossierClient(client)}
                    className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                  >
                    {/* 1. Client & Organization */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0 border border-[var(--border-color)] uppercase shadow-2xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 dark:text-white block truncate leading-snug group-hover:text-blue-600 transition-colors">
                            {client.name}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 block truncate font-sans">
                            {client.company || client.name} &bull; <span className="font-mono text-[10px] text-slate-400">{client.code}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. KRA PIN */}
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {client.kraPin ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-[var(--border-color)] font-bold text-[11px]">
                          {client.kraPin}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Not on file</span>
                      )}
                    </td>

                    {/* 3. Direct Contact */}
                    <td className="py-3.5 px-4 text-xs font-mono">
                      <div className="text-slate-800 dark:text-zinc-200 truncate flex items-center gap-1.5 leading-snug">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{client.email || '—'}</span>
                      </div>
                      <div className="text-slate-500 dark:text-zinc-400 text-[11px] mt-0.5 flex items-center gap-1.5 leading-tight">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{client.phonePrimary || client.phone || '—'}</span>
                      </div>
                    </td>

                    {/* 4. Active Causes & Clickable Fee Notes */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {clientFeeNotes.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[220px] mx-auto">
                          {clientFeeNotes.map(n => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => {
                                if (onNavigateToBuilder) {
                                  onNavigateToBuilder(n, true);
                                } else if (onNavigateTab) {
                                  onNavigateTab('feenotes');
                                }
                              }}
                              className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-mono font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 hover:scale-105 transition-all cursor-pointer shadow-2xs"
                              title={`Open Fee Note: ${n.billNumber} (KES ${(n.grandTotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })})`}
                            >
                              {n.billNumber}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="font-mono text-slate-400 text-xs">
                          {activeCauses > 0 ? `${activeCauses} Causes` : '—'}
                        </span>
                      )}
                    </td>

                    {/* 5. Total Billed */}
                    <td className="py-3.5 px-4 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                      KES {totalBilled.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>

                    {/* 6. Unified Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {/* Details button (No "Dossier") */}
                        <button
                          type="button"
                          onClick={() => setSelectedDossierClient(client)}
                          className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                          title="View Client Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>

                        {/* New Bill CTA */}
                        {can('boc.create') && (
                          <button
                            type="button"
                            onClick={() => handleNewBillForClient(client)}
                            className="px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                            title="Draft New Bill of Costs for this Client"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>New Bill</span>
                          </button>
                        )}

                        {/* Dropdown Menu */}
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(isMenuOpen ? null : client.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="More actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white dark:bg-zinc-900 border border-[var(--border-color)] shadow-xl py-1 z-30 font-sans text-left">
                              <button
                                  type="button"
                                  onClick={() => handleOpenPortalModal(client)}
                                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Portal Magic Link</span>
                                </button>
                              {can('clients.email') && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEmail(client)}
                                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                                >
                                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Send Email</span>
                                </button>
                              )}
                              {can('clients.whatsapp') && client.phonePrimary && (
                                <button
                                  type="button"
                                  onClick={() => handleWhatsApp(client.phonePrimary, client.name)}
                                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>WhatsApp Message</span>
                                </button>
                              )}
                              {can('clients.delete') && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClient(client)}
                                  className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer border-t border-[var(--border-color)]/60"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Delete Client</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm">No clients found matching "{search}"</p>
          </div>
        )}
      </div>

      {/* CLIENT DETAILS (Slide-over Drawer / Modal) */}
      {selectedDossierClient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden text-xs">
            {/* Header */}
            <div className="p-5 border-b border-[var(--border-color)] flex items-start justify-between bg-[var(--bg-subtle)]/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm flex items-center justify-center font-mono">
                  {selectedDossierClient.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white">
                    {selectedDossierClient.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {selectedDossierClient.company || selectedDossierClient.name} &bull; PIN: {selectedDossierClient.kraPin || 'Pending'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDossierClient(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Financial Snapshot KPI Tiles */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 block font-mono">
                    Total Billed
                  </span>
                  <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    KES {(selectedDossierClient.totalBilledAmount ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Active Causes & Clickable Fee Notes */}
                {(() => {
                  const clientFeeNotes = getClientFeeNotes(selectedDossierClient);
                  return (
                    <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 block font-mono">
                        Active Causes &amp; Fee Notes
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {clientFeeNotes.length > 0 ? (
                          clientFeeNotes.map(n => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => {
                                setSelectedDossierClient(null);
                                if (onNavigateToBuilder) onNavigateToBuilder(n, true);
                                else if (onNavigateTab) onNavigateTab('feenotes');
                              }}
                              className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 font-mono text-[11px] font-bold hover:bg-blue-200 transition-colors cursor-pointer"
                              title={`Click to open fee note ${n.billNumber}`}
                            >
                              {n.billNumber} &rarr;
                            </button>
                          ))
                        ) : (
                          <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
                            {selectedDossierClient.activeMattersCount ?? selectedDossierClient.matters ?? 0} Matters
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 block font-mono">
                    Taxation Status
                  </span>
                  <p className="text-base font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-1">
                    Good Standing
                  </p>
                </div>
              </div>

              {/* Client Profile Details */}
              <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-2">
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Contact &amp; Registration Profile</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Official Email</span>
                    <span className="font-medium text-slate-800 dark:text-zinc-200 font-mono">{selectedDossierClient.email || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Telephone</span>
                    <span className="font-medium text-slate-800 dark:text-zinc-200 font-mono">{selectedDossierClient.phonePrimary || selectedDossierClient.phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Category</span>
                    <span className="font-medium text-slate-800 dark:text-zinc-200">{selectedDossierClient.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Client Code</span>
                    <span className="font-mono text-slate-800 dark:text-zinc-200 font-bold">{selectedDossierClient.code}</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-2 flex items-center justify-between border-t border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEmail(selectedDossierClient)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Email</span>
                  </button>
                  {selectedDossierClient.phonePrimary && (
                    <button
                      type="button"
                      onClick={() => handleWhatsApp(selectedDossierClient.phonePrimary, selectedDossierClient.name)}
                      className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>WhatsApp</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenPortalModal(selectedDossierClient)}
                    className="px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Generate Passwordless Client Portal Magic Link"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Client Portal</span>
                  </button>
                </div>

                {can('boc.create') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDossierClient(null);
                      handleNewBillForClient(selectedDossierClient);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs hover:bg-black dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Draft Bill of Costs</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECURE CLIENT PORTAL MAGIC LINK MODAL */}
      {portalModalClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="font-brand font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  <span>Secure Client Portal Magic Link</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Passwordless client-facing access for {portalModalClient.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPortalModalClient(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800/60 border border-[var(--border-color)] space-y-2">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                What your client will see in this read-only portal:
              </div>
              <ul className="text-[11px] text-slate-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
                <li>Real-time status of their active litigation and advisory matters</li>
                <li>Instant download of approved Fee Notes and Bills of Costs with official receipts</li>
                <li>Cleared client trust retainer balance widget (e.g. KES 1,450,000 cleared)</li>
                <li>Direct matter vault upload dropzone for requested documents and evidence</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                Production Magic Link (Valid for 30 days):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedMagicLink}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[11px] font-mono text-[var(--text-main)] select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyMagicLink}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    portalLinkCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90'
                  }`}
                >
                  {portalLinkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{portalLinkCopied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <span className="text-[10px] text-slate-400">
                Production host: nyagahkithinji-advocates.azurewebsites.net
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.open(generatedMagicLink, '_blank')}
                  className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPortalModalClient(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW CLIENT MODAL */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-brand font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-slate-800 dark:text-zinc-200" /> Register Client Account
              </h3>
              <button
                type="button"
                onClick={() => setShowNewClientModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterClient} className="space-y-3.5">
              <div>
                <label className="block text-[var(--text-main)] font-semibold mb-1">
                  Client Name / Authorized Contact Person
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Seyani Brothers & Co. (K) Limited"
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                />
              </div>

              {conflictCheck && conflictCheck.hasConflict && (
                <div className={`p-3 rounded-xl border text-xs space-y-1.5 animate-in fade-in ${
                  conflictCheck.severity === 'CRITICAL'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Conflict of Interest Warning ({conflictCheck.conflictType?.replace(/_/g, ' ')})</span>
                  </div>
                  <p className="text-[11px] leading-relaxed font-sans">{conflictCheck.alertMessage}</p>
                  {conflictCheck.details && conflictCheck.details.length > 0 && (
                    <div className="text-[10px] space-y-0.5 opacity-90 font-mono">
                      {conflictCheck.details.map((d, i) => (
                        <div key={i}>&bull; {d}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-main)] font-semibold mb-1">
                    Company / Entity Name
                  </label>
                  <input
                    type="text"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="e.g. Seyani Brothers Ltd"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-main)] font-semibold mb-1">
                    KRA PIN (E-TIMS Fiscal ID)
                  </label>
                  <input
                    type="text"
                    value={newKraPin}
                    onChange={(e) => setNewKraPin(e.target.value)}
                    placeholder="e.g. P051234567Z"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] font-mono uppercase focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-main)] font-semibold mb-1">
                    Client Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400 cursor-pointer"
                  >
                    <option value="Corporate or Institutional">Corporate or Institutional</option>
                    <option value="Individual Client">Individual Client</option>
                    <option value="Financial Institution">Financial Institution / Bank</option>
                    <option value="Government Entity">Government Entity / Parastatal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-main)] font-semibold mb-1">
                    Physical Office / County
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="e.g. Upper Hill, Nairobi"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-main)] font-semibold mb-1">
                  Official Billing Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="legal@seyani.co.ke"
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] font-mono focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-main)] font-semibold mb-1">
                    Primary Telephone
                  </label>
                  <input
                    type="text"
                    value={newPhonePrimary}
                    onChange={(e) => setNewPhonePrimary(e.target.value)}
                    placeholder="+254 700 000 000"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-main)] font-semibold mb-1">
                    Secondary Telephone
                  </label>
                  <input
                    type="text"
                    value={newPhoneSecondary}
                    onChange={(e) => setNewPhoneSecondary(e.target.value)}
                    placeholder="+254 20 000 0000"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-zinc-700 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMAIL COMPOSE MODAL */}
      {showEmailModal && emailClient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-brand font-bold text-sm text-[var(--text-main)]">
                Send Email to {emailClient.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-3">
              <div>
                <label className="block text-[var(--text-main)] font-semibold mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={emailClient.email}
                  readOnly
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] font-mono opacity-80"
                />
              </div>

              <div>
                <label className="block text-[var(--text-main)] font-semibold mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[var(--text-main)] font-semibold mb-1">
                  Email Message
                </label>
                <textarea
                  required
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-[var(--text-main)] font-sans focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-zinc-700 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSending ? 'Sending Email...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
