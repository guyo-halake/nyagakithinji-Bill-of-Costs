import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Table,
  Search,
  RefreshCw,
  Download,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronRight,
  Shield,
  Layers,
  FileText,
  Users,
  Briefcase,
  Scale,
  Activity,
  AlertCircle,
  HelpCircle,
  Eye,
  CheckCircle2,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import {
  getFeeNotes,
  persistFeeNotes,
  ExactFeeNoteRecord,
  SystemUser,
  SEEDED_USERS,
  EXACT_CLIENTS,
  ExactClientRecord,
  EXACT_MATTERS,
  supabase,
  saveUserProfile,
  getMatters,
  getClients
} from '../../services/supabase';
import { updateFirmUser, fetchFirmUsers } from '../../services/data';
import { getActivityLogs, logSystemActivity, ActivityLogItem } from '../../services/activityLogger';
import { DEFAULT_ADVOCATE_TICKETS, ITTicketRecord } from '../support/TechSupportView';
import { showToast } from './ToastNotification';

type TableKey = 'fee_notes' | 'matters' | 'clients' | 'system_users' | 'support_tickets' | 'activity_logs';

interface TableDefinition {
  key: TableKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  columns: { key: string; label: string; type?: 'text' | 'badge' | 'currency' | 'date' | 'role' }[];
}

const TABLE_DEFINITIONS: TableDefinition[] = [
  {
    key: 'fee_notes',
    label: 'Fee Notes (fee_notes)',
    description: 'Statutory legal bills of costs, instruction fees, disbursements, and taxation records',
    icon: Scale,
    columns: [
      { key: 'billNumber', label: 'Bill Number', type: 'badge' },
      { key: 'clientName', label: 'Client / Party' },
      { key: 'matterTitle', label: 'Matter Title' },
      { key: 'courtSchedule', label: 'ARO Schedule' },
      { key: 'grandTotal', label: 'Grand Total (KES)', type: 'currency' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'dateCreated', label: 'Created', type: 'date' }
    ]
  },
  {
    key: 'matters',
    label: 'Court Causes (matters)',
    description: 'Active High Court, Commercial Division, and Arbitral causes and corams',
    icon: Briefcase,
    columns: [
      { key: 'caseNo', label: 'Cause No', type: 'badge' },
      { key: 'title', label: 'Matter Title' },
      { key: 'courtForum', label: 'Court / Forum' },
      { key: 'plaintiff', label: 'Plaintiff / Claimant' },
      { key: 'defendant', label: 'Defendant / Adverse' },
      { key: 'claimValue', label: 'Claim Value (KES)', type: 'currency' },
      { key: 'status', label: 'Status', type: 'badge' }
    ]
  },
  {
    key: 'clients',
    label: 'Client Registry (clients)',
    description: 'Institutional, corporate, and individual clients with KRA PIN compliance',
    icon: Users,
    columns: [
      { key: 'name', label: 'Client Name' },
      { key: 'company', label: 'Company / Group' },
      { key: 'category', label: 'Category', type: 'badge' },
      { key: 'email', label: 'Contact Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'matters', label: 'Matters Count' }
    ]
  },
  {
    key: 'system_users',
    label: 'User Accounts (system_users)',
    description: 'Practice advocates, managing partners, and developers with RBAC roles',
    icon: Shield,
    columns: [
      { key: 'fullName', label: 'Full Legal Name' },
      { key: 'workEmail', label: 'Work Email' },
      { key: 'role', label: 'System Role', type: 'role' },
      { key: 'position', label: 'Position' },
      { key: 'lskNo', label: 'LSK Reg No' },
      { key: 'department', label: 'Department' }
    ]
  },
  {
    key: 'support_tickets',
    label: 'Support Tickets (support_tickets)',
    description: 'Helpdesk requests, SMTP dispatch notices, and IT support tickets',
    icon: HelpCircle,
    columns: [
      { key: 'id', label: 'Ticket Ref', type: 'badge' },
      { key: 'title', label: 'Issue Description' },
      { key: 'creatorName', label: 'Submitted By' },
      { key: 'priority', label: 'Priority', type: 'badge' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'createdAt', label: 'Dispatched', type: 'date' }
    ]
  },
  {
    key: 'activity_logs',
    label: 'Audit Trail (activity_logs)',
    description: 'Immutable ledger of every record touched, fee note drafted, and user login',
    icon: Activity,
    columns: [
      { key: 'action', label: 'Action Performed' },
      { key: 'actor', label: 'Advocate / Actor' },
      { key: 'category', label: 'Category', type: 'badge' },
      { key: 'timeAgo', label: 'Timestamp' }
    ]
  }
];

interface DatabaseStudioViewProps {
  currentUser?: SystemUser | null;
}

export const DatabaseStudioView: React.FC<DatabaseStudioViewProps> = ({ currentUser }) => {
  const [activeTableKey, setActiveTableKey] = useState<TableKey>('fee_notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real Database State
  const [feeNotes, setFeeNotes] = useState<ExactFeeNoteRecord[]>(() => getFeeNotes());
  const [matters, setMatters] = useState<any[]>(() => getMatters());
  const [clients, setClients] = useState<ExactClientRecord[]>(() => getClients());
  const [users, setUsers] = useState<SystemUser[]>(() => {
    try {
      const stored = localStorage.getItem('EXACT_USERS');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return SEEDED_USERS;
  });
  const [tickets, setTickets] = useState<ITTicketRecord[]>(() => {
    try {
      const stored = localStorage.getItem('BILLSZIP_SUPPORT_TICKETS_REAL');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return DEFAULT_ADVOCATE_TICKETS;
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(() => getActivityLogs());

  // Reload data from storage
  const handleReload = () => {
    setIsRefreshing(true);
    setFeeNotes(getFeeNotes());
    setMatters(getMatters());
    setClients(getClients());
    fetchFirmUsers().then(u => { if (u && u.length > 0) setUsers(u); }).catch(() => {});
    try {
      const t = localStorage.getItem('BILLSZIP_SUPPORT_TICKETS_REAL');
      if (t) setTickets(JSON.parse(t));
    } catch (e) {}
    setActivityLogs(getActivityLogs());
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('success', 'Database Synced', 'All real-life tables reloaded from storage and PostgreSQL.');
    }, 400);
  };

  const activeTableDef = TABLE_DEFINITIONS.find(t => t.key === activeTableKey)!;

  // Active dataset
  const activeData = useMemo(() => {
    switch (activeTableKey) {
      case 'fee_notes':
        return feeNotes;
      case 'matters':
        return matters;
      case 'clients':
        return clients;
      case 'system_users':
        return users;
      case 'support_tickets':
        return tickets;
      case 'activity_logs':
        return activityLogs;
      default:
        return [];
    }
  }, [activeTableKey, feeNotes, matters, clients, users, tickets, activityLogs]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return activeData;
    const q = searchQuery.toLowerCase();
    return activeData.filter((item: any) => {
      return Object.values(item).some(val => {
        if (typeof val === 'string') return val.toLowerCase().includes(q);
        if (typeof val === 'number') return val.toString().includes(q);
        return false;
      });
    });
  }, [activeData, searchQuery]);

  // Save changes to edited row
  const handleSaveRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;

    if (activeTableKey === 'system_users') {
      const updated = users.map(u => (u.id === editingRow.id ? editingRow : u));
      setUsers(updated);
      localStorage.setItem('EXACT_USERS', JSON.stringify(updated));
      saveUserProfile(editingRow);
      updateFirmUser('firm-001', editingRow);
      window.dispatchEvent(new CustomEvent('permissionsUpdated'));
      logSystemActivity(
        'User Role & Account Updated',
        `Admin updated record for ${editingRow.fullName} (${editingRow.role})`,
        'system'
      );
      showToast('success', 'User Record Saved', `Updated ${editingRow.fullName} successfully.`);
    } else if (activeTableKey === 'fee_notes') {
      const updated = feeNotes.map(fn => (fn.id === editingRow.id ? editingRow : fn));
      setFeeNotes(updated);
      persistFeeNotes(updated);
      window.dispatchEvent(new CustomEvent('feeNotesUpdated'));
      showToast('success', 'Fee Note Saved', `Saved ${editingRow.billNumber} to database.`);
    } else if (activeTableKey === 'support_tickets') {
      const updated = tickets.map(t => (t.id === editingRow.id ? editingRow : t));
      setTickets(updated);
      localStorage.setItem('BILLSZIP_SUPPORT_TICKETS_REAL', JSON.stringify(updated));
      showToast('success', 'Ticket Saved', `Updated ${editingRow.id} status.`);
    } else {
      showToast('info', 'Record Updated', 'Data refreshed in session.');
    }

    setIsEditingModalOpen(false);
    setEditingRow(null);
  };

  // Change user role directly from table
  const handleQuickRoleChange = (userId: string, newRole: 'Admin' | 'Developer' | 'Advocate') => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;
    const updatedUser: SystemUser = {
      ...userToUpdate,
      role: newRole,
      hasAllPermissions: newRole === 'Admin' || newRole === 'Developer'
    };
    const updated = users.map(u => (u.id === userId ? updatedUser : u));
    setUsers(updated);
    localStorage.setItem('EXACT_USERS', JSON.stringify(updated));
    saveUserProfile(updatedUser);
    updateFirmUser('firm-001', updatedUser);
    window.dispatchEvent(new CustomEvent('permissionsUpdated'));
    logSystemActivity(
      'Role Modified',
      `Assigned ${newRole} role to ${updatedUser.fullName}`,
      'system'
    );
    showToast('success', 'Role Updated', `${updatedUser.fullName} is now ${newRole}.`);
  };

  // Export Table Data to JSON
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(activeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `karani_db_${activeTableKey}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Table Exported', `Downloaded ${activeTableDef.label} as JSON.`);
  };

  return (
    <div className="w-full space-y-6 pb-16 font-sans text-slate-900 dark:text-zinc-100 animate-fadeIn">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-[var(--border-color)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold shadow-xs">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-brand font-bold text-xl text-slate-900 dark:text-white tracking-tight">
                Database Studio & Live Tables
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Admin / Developer Only
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Direct live viewer and editor for firm records, matters, clients, and role configurations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReload}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Table (.json)</span>
          </button>
        </div>
      </div>

      {/* Table Selector Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {TABLE_DEFINITIONS.map(tbl => {
          const Icon = tbl.icon;
          const isSelected = activeTableKey === tbl.key;
          let count = 0;
          if (tbl.key === 'fee_notes') count = feeNotes.length;
          else if (tbl.key === 'matters') count = matters.length;
          else if (tbl.key === 'clients') count = clients.length;
          else if (tbl.key === 'system_users') count = users.length;
          else if (tbl.key === 'support_tickets') count = tickets.length;
          else if (tbl.key === 'activity_logs') count = activityLogs.length;

          return (
            <button
              key={tbl.key}
              onClick={() => {
                setActiveTableKey(tbl.key);
                setSearchQuery('');
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border-[var(--border-color)] hover:border-slate-400 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-4 h-4" />
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-zinc-800'
                }`}>
                  {count}
                </span>
              </div>
              <div className="text-xs font-bold truncate">
                {tbl.label.split(' ')[0]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Table Data View */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-[var(--border-color)] p-5 space-y-4 shadow-xs">
        {/* Table Search & Meta */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
          <div>
            <h3 className="font-brand font-bold text-sm text-slate-900 dark:text-white">
              {activeTableDef.label}
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              {activeTableDef.description} &middot; <strong className="text-slate-800 dark:text-zinc-200">{filteredData.length} rows loaded</strong>
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={`Search ${activeTableDef.label.split(' ')[0]}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-zinc-800/80 text-[10.5px] font-mono uppercase text-slate-500 font-bold border-b border-[var(--border-color)]">
              <tr>
                {activeTableDef.columns.map(col => (
                  <th key={col.key} className="p-3 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={activeTableDef.columns.length + 1} className="p-8 text-center text-slate-400 text-xs">
                    No matching records found in this table.
                  </td>
                </tr>
              ) : (
                filteredData.map((row: any, idx: number) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    {activeTableDef.columns.map(col => {
                      const val = row[col.key];

                      if (col.type === 'role' && activeTableKey === 'system_users') {
                        return (
                          <td key={col.key} className="p-3 whitespace-nowrap">
                            <select
                              value={row.role || 'Advocate'}
                              onChange={(e) => handleQuickRoleChange(row.id, e.target.value as any)}
                              className="px-2 py-1 rounded-lg text-[11px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 border border-[var(--border-color)] text-slate-900 dark:text-white cursor-pointer"
                            >
                              <option value="Admin">Admin</option>
                              <option value="Developer">Developer</option>
                              <option value="Advocate">Advocate</option>
                            </select>
                          </td>
                        );
                      }

                      if (col.type === 'currency') {
                        return (
                          <td key={col.key} className="p-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            KES {typeof val === 'number' ? val.toLocaleString('en-KE', { minimumFractionDigits: 2 }) : '0.00'}
                          </td>
                        );
                      }

                      if (col.type === 'badge') {
                        return (
                          <td key={col.key} className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-[var(--border-color)]">
                              {String(val || 'N/A')}
                            </span>
                          </td>
                        );
                      }

                      if (col.type === 'date') {
                        return (
                          <td key={col.key} className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {val ? new Date(val).toLocaleDateString('en-KE') : '—'}
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} className="p-3 text-slate-700 dark:text-zinc-300 max-w-xs truncate">
                          {String(val || '—')}
                        </td>
                      );
                    })}

                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditingRow({ ...row });
                          setIsEditingModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Edit Row"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Row Modal */}
      {isEditingModalOpen && editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white">
                Edit Record ({activeTableDef.label.split(' ')[0]})
              </h3>
              <button
                onClick={() => {
                  setIsEditingModalOpen(false);
                  setEditingRow(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRow} className="space-y-3.5 text-xs">
              {activeTableDef.columns.map(col => (
                <div key={col.key}>
                  <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {col.label}:
                  </label>
                  {col.key === 'role' && activeTableKey === 'system_users' ? (
                    <select
                      value={editingRow[col.key] || 'Advocate'}
                      onChange={(e) => setEditingRow({ ...editingRow, [col.key]: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Developer">Developer</option>
                      <option value="Advocate">Advocate</option>
                    </select>
                  ) : (
                    <input
                      type={col.type === 'currency' ? 'number' : 'text'}
                      value={editingRow[col.key] ?? ''}
                      onChange={(e) => setEditingRow({ ...editingRow, [col.key]: col.type === 'currency' ? Number(e.target.value) : e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-sans focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              ))}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingModalOpen(false);
                    setEditingRow(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] hover:bg-slate-100 dark:hover:bg-zinc-800 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default DatabaseStudioView;
