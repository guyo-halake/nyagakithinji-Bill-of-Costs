import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ShieldCheck,
  Eye,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  Phone,
  MessageSquare,
  Trash2,
  FileText
} from 'lucide-react';
import {
  SystemUser,
  ExactFeeNoteRecord,
  ExactMatterRecord,
  ExactClientRecord
} from '../../services/supabase';
import { RoleTemplate } from '../../services/rbac';

interface ExecutiveTabbedTablesProps {
  feeNotes: ExactFeeNoteRecord[];
  matters: ExactMatterRecord[];
  users: SystemUser[];
  clients: ExactClientRecord[];
  userRoleMap: Record<string, string>;
  roleTemplates: RoleTemplate[];
  onNavigateTab: (tab: string, targetUserId?: string) => void;
  handleOpenAddUserModal: () => void;
  handleOpenNote: (note: ExactFeeNoteRecord) => void;
  handleToggleProcess: (noteId: string, currentStatus: string) => void;
  handleViewMatter: (matterId: string) => void;
  setManagingUser: (user: SystemUser | null) => void;
  setMessagingUser: (user: SystemUser | null) => void;
  setMessageText: (text: string) => void;
  handleDeleteUser: (user: SystemUser) => void;
}

export const ExecutiveTabbedTables: React.FC<ExecutiveTabbedTablesProps> = ({
  feeNotes,
  matters,
  users,
  clients,
  userRoleMap,
  roleTemplates,
  onNavigateTab,
  handleOpenAddUserModal,
  handleOpenNote,
  handleToggleProcess,
  handleViewMatter,
  setManagingUser,
  setMessagingUser,
  setMessageText,
  handleDeleteUser
}) => {
  const [activeTab, setActiveTab] = useState<'bills' | 'matters' | 'users_permissions' | 'clients'>('users_permissions');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [viewingPermissionsUserId, setViewingPermissionsUserId] = useState<string | null>(null);

  // Table Controls State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<string>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleTabChange = (tab: 'bills' | 'matters' | 'users_permissions' | 'clients') => {
    setActiveTab(tab);
    setSearchQuery('');
    setStatusFilter('all');
    setSortColumn('default');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Render Sort Header Indicator
  const renderSortIndicator = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-zinc-600 ml-1 inline shrink-0" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400 ml-1 inline shrink-0 font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600 dark:text-blue-400 ml-1 inline shrink-0 font-bold" />
    );
  };

  // 1. Filtered Bills
  const processedBills = useMemo(() => {
    let result = [...feeNotes];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(n =>
        (n.billNumber || '').toLowerCase().includes(q) ||
        (n.matterTitle || '').toLowerCase().includes(q) ||
        (n.clientName || '').toLowerCase().includes(q) ||
        (n.generatedByUser || '').toLowerCase().includes(q) ||
        (n.courtSchedule || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(n => n.status === statusFilter);
    }
    if (sortColumn !== 'default') {
      result.sort((a, b) => {
        let valA: any = (a as any)[sortColumn];
        let valB: any = (b as any)[sortColumn];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [feeNotes, searchQuery, statusFilter, sortColumn, sortDirection]);

  // 2. Filtered Matters
  const processedMatters = useMemo(() => {
    let result = [...matters];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(m =>
        (m.caseNo || '').toLowerCase().includes(q) ||
        (m.title || '').toLowerCase().includes(q) ||
        (m.applicant || '').toLowerCase().includes(q) ||
        (m.respondent || '').toLowerCase().includes(q) ||
        (m.forum || '').toLowerCase().includes(q) ||
        (m.leadAdvocate || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(m =>
        (m.status || '').toLowerCase().includes(statusFilter.toLowerCase()) ||
        (m.forum || '').toLowerCase().includes(statusFilter.toLowerCase())
      );
    }
    if (sortColumn !== 'default') {
      result.sort((a, b) => {
        let valA: any = (a as any)[sortColumn];
        let valB: any = (b as any)[sortColumn];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [matters, searchQuery, statusFilter, sortColumn, sortDirection]);

  // 3. Filtered Users
  const processedUsers = useMemo(() => {
    let result = [...users];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(u =>
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.workEmail || '').toLowerCase().includes(q) ||
        (u.position || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q) ||
        (u.lskNo || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(u => u.role === statusFilter);
    }
    if (sortColumn !== 'default') {
      result.sort((a, b) => {
        let valA: any = (a as any)[sortColumn];
        let valB: any = (b as any)[sortColumn];
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [users, searchQuery, statusFilter, sortColumn, sortDirection]);

  // 4. Filtered Clients
  const processedClients = useMemo(() => {
    let result = [...clients];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.code || '').toLowerCase().includes(q) ||
        (c.kraPin || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(c => c.category === statusFilter);
    }
    if (sortColumn !== 'default') {
      result.sort((a, b) => {
        let valA: any = (a as any)[sortColumn];
        let valB: any = (b as any)[sortColumn];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [clients, searchQuery, statusFilter, sortColumn, sortDirection]);

  // Current Active List and Pagination Slice
  const activeItems =
    activeTab === 'bills'
      ? processedBills
      : activeTab === 'matters'
      ? processedMatters
      : activeTab === 'users_permissions'
      ? processedUsers
      : processedClients;

  const totalItems = activeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSlice = activeItems.slice(startIndex, startIndex + pageSize);

  return (
    <div className="modulix-card p-0 overflow-hidden border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs">
      {/* Header Title Bar */}
      <div className="px-5 pt-4 pb-3 border-b border-[var(--border-color)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white">
            {activeTab === 'bills'
              ? 'Bills of Costs Register'
              : activeTab === 'matters'
              ? 'Active Causes & Matters'
              : activeTab === 'users_permissions'
              ? 'Firm Members & Permissions'
              : 'Registered Client Accounts'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            {activeTab === 'bills'
              ? 'Statutory Remuneration Order fee notes, draft briefs, and taxation records'
              : activeTab === 'matters'
              ? 'High Court, Commercial Division, and Arbitration tribunal causes'
              : activeTab === 'users_permissions'
              ? 'Firm partners, advocates, and RBAC granular access levels'
              : 'Corporate and institutional client accounts and dossier ledgers'}
          </p>
        </div>
      </div>

      {/* iOS Minimalist Segmented Pill Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-color)] px-5 py-3 bg-[var(--bg-subtle)]/60 gap-3">
        {/* Segmented Control Pill Group */}
        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-zinc-800 border border-[var(--border-color)]/50 shrink-0">
          {[
            { id: 'bills' as const, label: 'Bills of Costs', count: feeNotes.length },
            { id: 'matters' as const, label: 'Active Matters', count: matters.length },
            { id: 'users_permissions' as const, label: 'Users & Permissions', count: users.length },
            { id: 'clients' as const, label: 'Client Accounts', count: clients.length }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isActive
                      ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold'
                      : 'bg-slate-300/50 dark:bg-zinc-700/50 text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === 'users_permissions' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenAddUserModal}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New User</span>
            </button>
            <button
              onClick={() => onNavigateTab('permissions')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-[var(--border-color)] hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Permissions Studio</span>
            </button>
          </div>
        )}
      </div>

      {/* Universal Search, Status Filtering, and Page Size Controls */}
      <div className="p-4 bg-[var(--bg-subtle)]/30 border-b border-[var(--border-color)]/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 flex items-center gap-2 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                activeTab === 'bills'
                  ? 'Search bill number, matter, client, or advocate...'
                  : activeTab === 'matters'
                  ? 'Search cause number, title, parties, or forum...'
                  : activeTab === 'users_permissions'
                  ? 'Search staff name, email, department, or LSK...'
                  : 'Search client company, code, KRA PIN...'
              }
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Status Faceted Filter Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-mono text-[11px]">Filter:</span>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="all">All Records</option>
              {activeTab === 'bills' && (
                <>
                  <option value="processed">Approved / Processed</option>
                  <option value="draft">Drafts Only</option>
                </>
              )}
              {activeTab === 'matters' && (
                <>
                  <option value="Taxation">Taxation Ready</option>
                  <option value="Commercial">Commercial Division</option>
                  <option value="Arbitration">Arbitration Tribunal</option>
                </>
              )}
              {activeTab === 'users_permissions' && (
                <>
                  <option value="Admin">Admin</option>
                  <option value="Advocate">Advocate</option>
                  <option value="Developer">Developer</option>
                </>
              )}
              {activeTab === 'clients' && (
                <>
                  <option value="Corporate or Institutional">Corporate</option>
                  <option value="Individual Client">Individual</option>
                </>
              )}
            </select>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-mono text-[11px]">Show:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs px-2 py-1.5 bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: BILLS OF COSTS REGISTER */}
      {activeTab === 'bills' && (
        <div className="divide-y divide-[var(--border-color)]/60">
          {activeItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No fee notes match the active filter or search query.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="h-[42px] border-b border-[var(--border-color)] text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider bg-[var(--bg-subtle)]">
                    <th
                      onClick={() => handleSort('billNumber')}
                      className="py-3.5 px-4 font-mono cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      Bill Number {renderSortIndicator('billNumber')}
                    </th>
                    <th
                      onClick={() => handleSort('matterTitle')}
                      className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      Matter & Client {renderSortIndicator('matterTitle')}
                    </th>
                    <th
                      onClick={() => handleSort('generatedByUser')}
                      className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      Advocate {renderSortIndicator('generatedByUser')}
                    </th>
                    <th className="py-3.5 px-4">Court / Schedule</th>
                    <th
                      onClick={() => handleSort('grandTotal')}
                      className="py-3.5 px-4 text-right cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      Grand Total (KES) {renderSortIndicator('grandTotal')}
                    </th>
                    <th
                      onClick={() => handleSort('status')}
                      className="py-3.5 px-4 text-center cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      Status {renderSortIndicator('status')}
                    </th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]/60 font-sans">
                  {(paginatedSlice as ExactFeeNoteRecord[]).map(note => {
                    const isProcessed = note.status === 'processed';
                    const isExpanded = expandedNoteId === note.id;

                    return (
                      <React.Fragment key={note.id}>
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {note.billNumber}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <span className="font-semibold text-slate-900 dark:text-white block truncate" title={note.matterTitle}>
                              {note.matterTitle}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {note.clientName}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-zinc-300">
                            {note.generatedByUser}
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-slate-500">
                            {note.courtSchedule}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-right text-slate-900 dark:text-white">
                            {note.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold capitalize ${
                                isProcessed
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isProcessed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              {note.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                title="View Item Breakdown"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleOpenNote(note)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Open</span>
                              </button>
                              <button
                                onClick={() => handleToggleProcess(note.id, note.status)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                                  isProcessed
                                    ? 'bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{isProcessed ? 'Reopen' : 'Approve'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Executive Mini-Ledger Expander */}
                        {isExpanded && (() => {
                          const instr = note.instructionFee || 0;
                          const gup = note.gettingUpFee || 0;
                          const vat = Number(((instr + gup) * 0.16).toFixed(2));
                          const grand = note.grandTotal || (instr + gup + vat);

                          return (
                            <tr className="bg-[var(--bg-subtle)]/70">
                              <td colSpan={7} className="px-5 py-3">
                                <div className="p-4 bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-2xl shadow-xs max-w-xl space-y-3">
                                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                                    <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                                      Executive Statutory Fee Breakdown
                                    </span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                      Taxation Ready
                                    </span>
                                  </div>
                                  <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between py-1 border-b border-[var(--border-color)]/40">
                                      <span className="text-slate-600 dark:text-zinc-400 font-medium">Item 1: Instruction Fee</span>
                                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                                        KES {instr.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-[var(--border-color)]/40">
                                      <span className="text-slate-600 dark:text-zinc-400 font-medium">Item 2: Getting-Up Fee (Defended)</span>
                                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                                        KES {gup.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-[var(--border-color)]/40">
                                      <span className="text-slate-600 dark:text-zinc-400 font-medium">VAT (16% on Professional Fees)</span>
                                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                                        KES {vat.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-1.5 font-bold text-sm pt-2">
                                      <span className="text-slate-900 dark:text-white">Grand Total</span>
                                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                                        KES {grand.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })()}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE MATTERS */}
      {activeTab === 'matters' && (
        <div className="overflow-x-auto w-full">
          {activeItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No causes match the active filter or search query.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[11px] font-mono font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider bg-[var(--bg-subtle)]">
                  <th
                    onClick={() => handleSort('caseNo')}
                    className="py-4 px-6 min-w-[160px] cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    Cause / Matter ID {renderSortIndicator('caseNo')}
                  </th>
                  <th
                    onClick={() => handleSort('title')}
                    className="py-4 px-6 min-w-[240px] cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    Matter Title & Parties {renderSortIndicator('title')}
                  </th>
                  <th
                    onClick={() => handleSort('forum')}
                    className="py-4 px-6 min-w-[180px] cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    Court / Forum {renderSortIndicator('forum')}
                  </th>
                  <th
                    onClick={() => handleSort('amount')}
                    className="py-4 px-6 min-w-[140px] cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    Claim Amount {renderSortIndicator('amount')}
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="py-4 px-6 min-w-[120px] cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    Status {renderSortIndicator('status')}
                  </th>
                  <th className="py-4 px-6 min-w-[140px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60 font-sans">
                {(paginatedSlice as ExactMatterRecord[]).map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900 dark:text-white">
                      {m.caseNo || m.id}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 dark:text-white block">{m.title}</span>
                      <span className="text-[11px] text-slate-500 font-sans">
                        {m.applicant} v. {m.respondent}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-zinc-400 font-sans">
                      {m.forum}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900 dark:text-blue-400">
                      KES {(m.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {m.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleViewMatter(m.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Matter</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: USERS & PERMISSIONS */}
      {activeTab === 'users_permissions' && (
        <div className="overflow-x-auto w-full">
          {activeItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No users match the active filter or search query.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider bg-[var(--bg-subtle)] h-[42px]">
                  <th
                    onClick={() => handleSort('fullName')}
                    className="py-3.5 px-4 min-w-[200px] cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    User {renderSortIndicator('fullName')}
                  </th>
                  <th className="py-3.5 px-4 min-w-[200px]">Contact</th>
                  <th
                    onClick={() => handleSort('role')}
                    className="py-3.5 px-4 min-w-[240px] cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    Role & Access {renderSortIndicator('role')}
                  </th>
                  <th className="py-3.5 px-4 min-w-[240px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60 font-sans">
                {(paginatedSlice as SystemUser[]).map(user => {
                  const roleCode =
                    userRoleMap[user.id] ||
                    (user.role === 'Developer'
                      ? 'developer_sys_admin'
                      : user.role === 'Admin'
                      ? 'managing_partner_exec'
                      : 'senior_advocates_lawyers');
                  const tpl = roleTemplates.find(t => t.code === roleCode) || roleTemplates[0];
                  const initials = user.fullName
                    .split(' ')
                    .filter(Boolean)
                    .map(n => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  const isFullAccess = roleCode === 'developer_sys_admin' || roleCode === 'managing_partner_exec';

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      {/* User Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.fullName}
                              className="w-8 h-8 rounded-lg object-cover border border-[var(--border-color)] shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-[var(--border-color)] shrink-0 shadow-2xs">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white truncate text-sm leading-snug">
                              {user.fullName}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5 font-sans">
                              {user.position || user.role}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details Column */}
                      <td className="py-3.5 px-4 text-xs font-mono">
                        <div className="text-slate-800 dark:text-zinc-200 truncate flex items-center gap-2 leading-snug">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{user.workEmail || user.personalEmail}</span>
                        </div>
                        <div className="text-slate-500 dark:text-zinc-400 text-[11px] mt-1 flex items-center gap-2 leading-tight">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{user.phonePrimary || '+254 700 000 000'}</span>
                        </div>
                      </td>

                      {/* Granted Permissions Column */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                isFullAccess
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800'
                              }`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {isFullAccess
                                  ? `Full Access (${tpl?.permissions.length || 68})`
                                  : `${tpl?.permissions.length || 45} Permissions`}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setViewingPermissionsUserId(viewingPermissionsUserId === user.id ? null : user.id)
                              }
                              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer shrink-0"
                            >
                              {viewingPermissionsUserId === user.id ? 'Hide' : 'Details'}
                            </button>
                          </div>

                          {viewingPermissionsUserId === user.id && (
                            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-[var(--border-color)] max-h-32 overflow-y-auto flex flex-wrap gap-1.5 animate-fadeIn">
                              {(tpl?.permissions || []).map(p => (
                                <span
                                  key={p.code}
                                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-900 text-[10px] font-mono text-slate-600 dark:text-zinc-400 border border-[var(--border-color)]/70"
                                >
                                  {p.code}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setManagingUser(user)}
                            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                            title="View User Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Profile</span>
                          </button>

                          <button
                            onClick={() => onNavigateTab('permissions', user.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                            title="Configure User Permissions"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Permissions</span>
                          </button>

                          <button
                            onClick={() => {
                              setMessagingUser(user);
                              setMessageText('');
                            }}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Send Note to User"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                            title={`Permanently delete ${user.fullName} from firm database`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 4: CLIENT ACCOUNTS */}
      {activeTab === 'clients' && (
        <div className="overflow-x-auto w-full">
          {activeItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No clients match the active filter or search query.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider bg-[var(--bg-subtle)] h-[42px]">
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3.5 px-4 min-w-[200px] cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    Client {renderSortIndicator('name')}
                  </th>
                  <th className="py-3.5 px-4 min-w-[120px]">Category</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Contact Person</th>
                  <th
                    onClick={() => handleSort('activeMattersCount')}
                    className="py-3.5 px-4 font-mono text-center min-w-[100px] cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    Active Matters {renderSortIndicator('activeMattersCount')}
                  </th>
                  <th
                    onClick={() => handleSort('totalBilledAmount')}
                    className="py-3.5 px-4 font-mono text-right min-w-[140px] cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    Total Billed {renderSortIndicator('totalBilledAmount')}
                  </th>
                  <th className="py-3.5 px-4 text-right min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60 font-sans">
                {(paginatedSlice as ExactClientRecord[]).map(client => (
                  <tr key={client.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 dark:text-white block">{client.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {client.code} &middot; PIN: {client.kraPin}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-[var(--border-color)]/70">
                        {client.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-800 dark:text-zinc-200 block font-medium">{client.contactPerson}</span>
                      <span className="text-[11px] font-mono text-slate-400">{client.email}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-center text-slate-900 dark:text-white">
                      {client.activeMattersCount ?? 0}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
                      KES {(client.totalBilledAmount ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onNavigateTab('clients')}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                      >
                        View Client
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Standardized Responsive Pagination Bar */}
      <div className="px-5 py-3 border-t border-[var(--border-color)]/60 bg-[var(--bg-subtle)]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="text-slate-500 dark:text-zinc-400 font-mono text-[11px]">
          Showing{' '}
          <strong className="text-slate-900 dark:text-white font-mono">
            {totalItems === 0 ? 0 : startIndex + 1}
          </strong>{' '}
          to{' '}
          <strong className="text-slate-900 dark:text-white font-mono">
            {Math.min(startIndex + pageSize, totalItems)}
          </strong>{' '}
          of <strong className="text-slate-900 dark:text-white font-mono">{totalItems}</strong> entries
        </span>

        <div className="flex items-center gap-1.5">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--border-color)] bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
            .map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-7 h-7 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                  currentPage === p
                    ? 'bg-blue-600 text-white'
                    : 'border border-[var(--border-color)] bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--border-color)] bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
