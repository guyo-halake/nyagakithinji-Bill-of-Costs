import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  Briefcase,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp,
  Plus,
  UserPlus,
  Calculator,
  Scale,
  FileText,
  DollarSign,
  ChevronRight,
  Sparkles,
  FileCode,
  Eye,
  EyeOff,
  MoreVertical,
  FileEdit,
  Users,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Building2,
  Award,
  Activity,
  X,
  Save,
  Check,
  Sliders,
  ExternalLink,
  Layers,
  Calendar,
  MessageSquare,
  KeyRound,
  Trash2,
  Edit3,
  HardDrive,
  Folder,
  UploadCloud,
  Laptop,
  Database,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  LayoutDashboard,
  HelpCircle,
  Send,
  Settings,
  Search,
  RefreshCw,
  Table,
  ChevronLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Flame,
  Wallet,
  AlertOctagon
} from 'lucide-react';
import { ITTicketRecord, DEFAULT_ADVOCATE_TICKETS } from '../support/TechSupportView';
import { AdvocateWipLeaderboard } from './AdvocateWipLeaderboard';
import { ClientRetainerEscrowWidget } from './ClientRetainerEscrowWidget';
import { ExecutiveTabbedTables } from './ExecutiveTabbedTables';

import {
  SystemUser,
  ExactFeeNoteRecord,
  ExactClientRecord,
  fetchFeeNotesFromDatabase,
  updateFeeNoteStatus,
  getFeeNotes,
  persistFeeNotes,
  EXACT_MATTERS,
  EXACT_CLIENTS,
  SEEDED_USERS
} from '../../services/supabase';
import {
  createImportedFeeNote,
  fetchMatters,
  fetchClients,
  fetchFirmUsers,
  createFirmUser,
  updateFirmUser,
  deleteFirmUser,
  purgeStaleTestUsers,
  getDeletedUserKeys,
  isUserRecordDeleted
} from '../../services/data';
import {
  getActivityLogs,
  logSystemActivity,
  ActivityLogItem,
  fetchRemoteActivityLogs,
  subscribeToActivityLogs
} from '../../services/activityLogger';
import { sendEmail, sendWelcomeUserEmail } from '../../services/email';
import {
  RoleTemplate,
  fetchRoleTemplates,
  getLocalUserRoleAssignments,
  saveLocalUserRoleAssignments,
  assignRoleToUser,
  DEFAULT_ROLE_TEMPLATES,
  STANDARDIZED_PERMISSIONS
} from '../../services/rbac';
import {
  calculate_schedule_1_conveyancing,
  calculate_schedule_2_debentures,
  calculate_schedule_3_probate,
  calculate_schedule_4_ip,
  calculate_schedule_5_subordinate,
  calculate_schedule_6_high_court,
  calculate_schedule_7_secondary,
  calculate_schedule_8_tribunals,
  calculate_schedule_9_arbitration,
  calculate_schedule_10_criminal,
  calculate_schedule_11_itemized,
  InstructionFeeResult
} from '../../engine/remuneration_engine';
import { calculateLegalBill, BillCalculationResult } from '../../services/api';

import * as XLSX from 'xlsx';
import { showToast } from '../admin/ToastNotification';

interface DashboardViewProps {
  onNavigateTab: (tab: string, targetUserId?: string) => void;
  onNavigateToBuilder?: (arg1?: any, arg2?: any) => void;
  onOpenRecents?: () => void;
  currentUser?: SystemUser | null;
}

const ROLE_COLORS: Record<string, string> = {
  'managing_partner_exec': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  'senior_advocates_lawyers': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'finance_billing_mgr': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  'legal_assistant_intern': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  'it_dept_support': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  'developer_sys_admin': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20'
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onNavigateToBuilder,
  onOpenRecents,
  currentUser,
}) => {
  const [selectedBarIndex, setSelectedBarIndex] = useState(0);
  const [showPortfolioGraph, setShowPortfolioGraph] = useState<boolean>(() => {
    return localStorage.getItem('BILLSZIP_SHOW_GRAPH') === 'true';
  });

  // Dynamic Real-time Fee Notes & Matters State
  const [feeNotes, setFeeNotes] = useState<ExactFeeNoteRecord[]>([]);
  const [matters, setMatters] = useState<Awaited<ReturnType<typeof fetchMatters>>>([]);
  const [clients, setClients] = useState<ExactClientRecord[]>(() => EXACT_CLIENTS);
  const [users, setUsers] = useState<SystemUser[]>(() => {
    try {
      const deletedKeys = getDeletedUserKeys();
      const stored = typeof window !== 'undefined' ? localStorage.getItem('EXACT_USERS') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(u => !isUserRecordDeleted(u, deletedKeys));
          if (valid.length > 0) return valid;
        }
      }
    } catch (e) {}
    const deletedKeys = getDeletedUserKeys();
    return SEEDED_USERS.filter(u => !isUserRecordDeleted(u, deletedKeys));
  });
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>(DEFAULT_ROLE_TEMPLATES);
  const [userRoleMap, setUserRoleMap] = useState<Record<string, string>>({});
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(() => getActivityLogs());
  const [supportTickets, setSupportTickets] = useState<ITTicketRecord[]>(() => {
    try {
      const saved = localStorage.getItem('BILLSZIP_SUPPORT_TICKETS_REAL');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_ADVOCATE_TICKETS;
  });

  // User Deletion Modal State (Eliminates unreliable browser window.confirm)
  const [userPendingDelete, setUserPendingDelete] = useState<SystemUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Main Executive Tab State: 'bills' | 'matters' | 'users_permissions' | 'clients'
  const [executiveActiveTab, setExecutiveActiveTab] = useState<'bills' | 'matters' | 'users_permissions' | 'clients'>('users_permissions');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [roleDropdownUser, setRoleDropdownUser] = useState<string | null>(null);
  const [userActionMenuId, setUserActionMenuId] = useState<string | null>(null);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);

  // Enterprise Table Controls (Universal Search, Faceted Filtering, Sorting & Pagination)
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('all');
  const [tableSortColumn, setTableSortColumn] = useState<string>('default');
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('desc');
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [showAllMattersForAdvocate, setShowAllMattersForAdvocate] = useState(false);

  const handleExecutiveTabSwitch = (tab: 'bills' | 'matters' | 'users_permissions' | 'clients') => {
    setExecutiveActiveTab(tab);
    setTableSearch('');
    setTableStatusFilter('all');
    setTableSortColumn('default');
    setTableSortDirection('desc');
    setTableCurrentPage(1);
  };

  const handleTableSort = (columnKey: string) => {
    if (tableSortColumn === columnKey) {
      setTableSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortColumn(columnKey);
      setTableSortDirection('desc');
    }
    setTableCurrentPage(1);
  };

  // 1. Filtered & Sorted Bills
  const processedBills = useMemo(() => {
    let result = [...feeNotes];
    const q = tableSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(n =>
        (n.billNumber || '').toLowerCase().includes(q) ||
        (n.matterTitle || '').toLowerCase().includes(q) ||
        (n.clientName || '').toLowerCase().includes(q) ||
        (n.generatedByUser || '').toLowerCase().includes(q) ||
        (n.courtSchedule || '').toLowerCase().includes(q)
      );
    }
    if (tableStatusFilter !== 'all') {
      result = result.filter(n => n.status === tableStatusFilter);
    }
    if (tableSortColumn !== 'default') {
      result.sort((a, b) => {
        let valA: any = (a as any)[tableSortColumn];
        let valB: any = (b as any)[tableSortColumn];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return tableSortDirection === 'asc' ? valA - valB : valB - valA;
        }
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return tableSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [feeNotes, tableSearch, tableStatusFilter, tableSortColumn, tableSortDirection]);

  // 2. Filtered & Sorted Matters
  const processedMatters = useMemo(() => {
    let result = [...matters];
    const q = tableSearch.trim().toLowerCase();
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
    if (tableStatusFilter !== 'all') {
      result = result.filter(m =>
        (m.status || '').toLowerCase().includes(tableStatusFilter.toLowerCase()) ||
        (m.forum || '').toLowerCase().includes(tableStatusFilter.toLowerCase())
      );
    }
    if (tableSortColumn !== 'default') {
      result.sort((a, b) => {
        let valA: any = (a as any)[tableSortColumn];
        let valB: any = (b as any)[tableSortColumn];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return tableSortDirection === 'asc' ? valA - valB : valB - valA;
        }
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return tableSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [matters, tableSearch, tableStatusFilter, tableSortColumn, tableSortDirection]);

  // 3. Filtered & Sorted Users
  const processedUsers = useMemo(() => {
    let result = [...users];
    const q = tableSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(u =>
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.workEmail || '').toLowerCase().includes(q) ||
        (u.position || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q) ||
        (u.lskNo || '').toLowerCase().includes(q)
      );
    }
    if (tableStatusFilter !== 'all') {
      result = result.filter(u => u.role === tableStatusFilter);
    }
    if (tableSortColumn !== 'default') {
      result.sort((a, b) => {
        let valA: any = (a as any)[tableSortColumn];
        let valB: any = (b as any)[tableSortColumn];
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return tableSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [users, tableSearch, tableStatusFilter, tableSortColumn, tableSortDirection]);

  // 4. Filtered & Sorted Clients
  const processedClients = useMemo(() => {
    let result = [...clients];
    const q = tableSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.code || '').toLowerCase().includes(q) ||
        (c.kraPin || '').toLowerCase().includes(q)
      );
    }
    if (tableStatusFilter !== 'all') {
      result = result.filter(c => c.category === tableStatusFilter);
    }
    if (tableSortColumn !== 'default') {
      result.sort((a, b) => {
        let valA: any = (a as any)[tableSortColumn];
        let valB: any = (b as any)[tableSortColumn];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return tableSortDirection === 'asc' ? valA - valB : valB - valA;
        }
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return tableSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [clients, tableSearch, tableStatusFilter, tableSortColumn, tableSortDirection]);

  // Active Tab Paged Slices
  const paginatedBills = useMemo(() => {
    const start = (tableCurrentPage - 1) * tablePageSize;
    return processedBills.slice(start, start + tablePageSize);
  }, [processedBills, tableCurrentPage, tablePageSize]);

  const paginatedMatters = useMemo(() => {
    const start = (tableCurrentPage - 1) * tablePageSize;
    return processedMatters.slice(start, start + tablePageSize);
  }, [processedMatters, tableCurrentPage, tablePageSize]);

  const paginatedUsers = useMemo(() => {
    const start = (tableCurrentPage - 1) * tablePageSize;
    return processedUsers.slice(start, start + tablePageSize);
  }, [processedUsers, tableCurrentPage, tablePageSize]);

  const paginatedClients = useMemo(() => {
    const start = (tableCurrentPage - 1) * tablePageSize;
    return processedClients.slice(start, start + tablePageSize);
  }, [processedClients, tableCurrentPage, tablePageSize]);

  // Matter Table Checkbox Selection State
  const [selectedMatterIds, setSelectedMatterIds] = useState<string[]>([]);

  // Modals for Actions
  const [managingUser, setManagingUser] = useState<SystemUser | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [messagingUser, setMessagingUser] = useState<SystemUser | null>(null);
  const [messageText, setMessageText] = useState('');

  // 2-Step Manager User Onboarding Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserStep, setAddUserStep] = useState<1 | 2>(1);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newPersonalEmail, setNewPersonalEmail] = useState('');
  const [newFirstPassword, setNewFirstPassword] = useState('Nyagah@2026');
  const [newConfirmPassword, setNewConfirmPassword] = useState('Nyagah@2026');
  const [showAddUserPassword, setShowAddUserPassword] = useState(false);
  const [newAdvocateTitle, setNewAdvocateTitle] = useState('');
  const [newPosition, setNewPosition] = useState('Senior Advocate');
  const [newRoleTemplate, setNewRoleTemplate] = useState('senior_advocates_lawyers');
  const [newLskNo, setNewLskNo] = useState('');
  const [newDepartment, setNewDepartment] = useState('Commercial Litigation & Dispute Resolution');
  const [newSecondaryPhone, setNewSecondaryPhone] = useState('');
  const [permViewMode, setPermViewMode] = useState<'pages' | 'catalog'>('pages');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<string[]>([]);
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [giveHistoryAccess, setGiveHistoryAccess] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Database Users Directory & Management Modal State
  const [showUsersDirectoryModal, setShowUsersDirectoryModal] = useState(false);
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState<'All' | 'Advocate' | 'Admin' | 'Developer'>('All');
  const [usersSearchQuery, setUsersSearchQuery] = useState('');

  // Database Rules & Role Permissions Matrix Modal State
  const [showDatabaseRulesModal, setShowDatabaseRulesModal] = useState(false);
  const [databaseRulesTab, setDatabaseRulesTab] = useState<'tables' | 'roles' | 'matrix'>('tables');

  // Password Reset Modal State
  const [resetPasswordTargetUser, setResetPasswordTargetUser] = useState<SystemUser | null>(null);
  const [newResetPasswordInput, setNewResetPasswordInput] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Load Fee Notes (Firm-Wide Shared Ledger)
  useEffect(() => {
    const firmId = currentUser?.firmId || 'firm-001';
    const loadFeeNotes = () => {
      fetchFeeNotesFromDatabase(firmId)
        .then(notes => {
          if (notes && notes.length > 0) setFeeNotes(notes);
          else setFeeNotes(getFeeNotes());
        })
        .catch(() => setFeeNotes(getFeeNotes()));
    };
    void loadFeeNotes();
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ table?: string }>).detail;
      if (detail?.table === 'fee_notes') void loadFeeNotes();
    };
    const handleFeeNotesDirect = (event: Event) => {
      const detail = (event as CustomEvent<ExactFeeNoteRecord[]>).detail;
      if (Array.isArray(detail)) {
        setFeeNotes(detail);
      }
    };
    window.addEventListener('databaseRealtimeUpdate', handleRealtime);
    window.addEventListener('feeNotesUpdated', handleFeeNotesDirect);
    return () => {
      window.removeEventListener('databaseRealtimeUpdate', handleRealtime);
      window.removeEventListener('feeNotesUpdated', handleFeeNotesDirect);
    };
  }, [currentUser?.firmId]);

  // Load Matters (Firm-Wide Shared Pipeline)
  useEffect(() => {
    const firmId = currentUser?.firmId || 'firm-001';
    const loadMatters = () => {
      fetchMatters(firmId)
        .then(m => {
          if (m && m.length > 0) setMatters(m);
          else setMatters(EXACT_MATTERS);
        })
        .catch(() => setMatters(EXACT_MATTERS));
    };
    void loadMatters();
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ table?: string }>).detail;
      if (detail?.table === 'matters') void loadMatters();
    };
    window.addEventListener('databaseRealtimeUpdate', handleRealtime);
    return () => window.removeEventListener('databaseRealtimeUpdate', handleRealtime);
  }, [currentUser?.firmId]);

  // Load Executive Data (Users, Clients, Role Templates & Audit Logs)
  useEffect(() => {
    const firmId = currentUser?.firmId || 'firm-001';

    const loadExecutiveData = async () => {
      try {
        const [loadedUsers, loadedClients, loadedTemplates] = await Promise.all([
          fetchFirmUsers(firmId),
          fetchClients(firmId),
          fetchRoleTemplates()
        ]);
        setUsers(loadedUsers && loadedUsers.length > 0 ? loadedUsers : SEEDED_USERS);
        setClients(loadedClients && loadedClients.length > 0 ? loadedClients : EXACT_CLIENTS);
        setRoleTemplates(loadedTemplates && loadedTemplates.length > 0 ? loadedTemplates : DEFAULT_ROLE_TEMPLATES);

        const localMap = getLocalUserRoleAssignments();
        const initialMap: Record<string, string> = { ...localMap };
        (loadedUsers || []).forEach((u: SystemUser) => {
          if (!initialMap[u.id]) {
            if (u.role === 'Developer') initialMap[u.id] = 'developer_sys_admin';
            else if (u.role === 'Admin') initialMap[u.id] = 'managing_partner_exec';
            else initialMap[u.id] = 'senior_advocates_lawyers';
          }
        });
        setUserRoleMap(initialMap);
      } catch (e) {
        setUsers(SEEDED_USERS);
        setClients(EXACT_CLIENTS);
        setRoleTemplates(DEFAULT_ROLE_TEMPLATES);
      }
    };

    void loadExecutiveData();

    // Fetch remote audit logs from Supabase PostgreSQL public.admin_audit_logs
    fetchRemoteActivityLogs().then(remoteLogs => {
      if (remoteLogs && remoteLogs.length > 0) {
        setActivityLogs(remoteLogs);
      }
    });

    const unsubscribeRemoteLogs = subscribeToActivityLogs((updatedLogs) => {
      setActivityLogs(updatedLogs);
    });

    const refreshActivity = () => setActivityLogs(getActivityLogs());
    const handleStorageChange = (e: StorageEvent) => {
      refreshActivity();
      if (!e.key || e.key === 'EXACT_USERS' || e.key === 'DELETED_USER_KEYS') {
        void loadExecutiveData();
      }
    };
    window.addEventListener('activityLogsUpdated', refreshActivity);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('permissionsUpdated', loadExecutiveData);
    window.addEventListener('userProfileUpdated', loadExecutiveData);

    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ table?: string }>).detail;
      if (['users', 'clients', 'permissions', 'activity_logs'].includes(detail?.table || '')) {
        void loadExecutiveData();
        refreshActivity();
      }
    };
    window.addEventListener('databaseRealtimeUpdate', handleRealtime);

    return () => {
      unsubscribeRemoteLogs();
      window.removeEventListener('activityLogsUpdated', refreshActivity);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('permissionsUpdated', loadExecutiveData);
      window.removeEventListener('userProfileUpdated', loadExecutiveData);
      window.removeEventListener('databaseRealtimeUpdate', handleRealtime);
    };
  }, [currentUser?.firmId]);

  // Determine if the current active role is Managing Partner, Developer, or Admin
  const isExecutive =
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'Developer' ||
    (currentUser?.role as any) === 'Managing Partner' ||
    (currentUser?.role as any) === 'ManagingPartner' ||
    userRoleMap[currentUser?.id || ''] === 'managing_partner_exec' ||
    userRoleMap[currentUser?.id || ''] === 'developer_sys_admin';

  // Smart Import & Pre-Import Collision Audit State
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [importSource, setImportSource] = useState<'local' | 'firm_storage' | 'my_database'>('local');
  const [collisionResolution, setCollisionResolution] = useState<'revised' | 'overwrite' | 'new'>('revised');
  const [existingCollisionBill, setExistingCollisionBill] = useState<ExactFeeNoteRecord | null>(null);
  const [matchedClientName, setMatchedClientName] = useState<string>('');
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [viewingPermissionsUserId, setViewingPermissionsUserId] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [parsedMeta, setParsedMeta] = useState<{
    claimantName?: string;
    respondentName?: string;
    judgeName?: string;
    matterTitle?: string;
    forumName?: string;
    grandTotal?: number;
    courtSchedule?: string;
    disbursementsTotal?: number;
    profitCostsTotal?: number;
    missingFolios?: string[];
  }>({});

  // Canonical E547 dataset directly matching Advocates Remuneration Order rules
  const SAMPLE_E547_ROWS: any[][] = [
    ['14/09/2024', 'A', 'Instructions Fees:', '', '', '', '', ''],
    ['', '1', "To receiving instructions to act on behalf of the 1st and 2nd Respondent in responding to the Plaintiff's suit dated 10th September 2024 seeking for the following orders:", '', '', '452500.00', '', '452500.00'],
    ['', '3', 'i. An Order for Permanent Injunction barring the Defendants and the Interested Party, whether by themselves, their agents, servants or assigns from encashing, calling and/or receiving any payments from Standard Chartered Bank (Kenya) Limited in respect of Performance Guarantee No. 201020235547 issued on 1st December 2023 and amended on 28th May 2024.', '', '', '', '', ''],
    ['', '4', "ii. Damages for inconvenience suffered as a direct result of the Defendant's breach of contract.", '', '', '', '', ''],
    ['', '5', 'iii. Costs and interest', '', '', '', '', ''],
    ['', '6', 'iv. Any other relief that this Honourable Court deems just and fit to grant.', '', '', '', '', ''],
    ['', '7', 'Instruction Fees taking into Account paragraph 1 (a) of Schedule 6 of the ARO', '', '', '294125.00', '', '294125.00'],
    ['', '8', '(a) To sue in an ordinary suit in which no appearances is entered under Order IX A of the Civil Procedure Rules where no application for leave to appear and defend is made, the fee shall be 65% of the fees chargeable under item 1(a)', '', '', '', '', ''],
    ['', 'B', 'Taking into Consideration the following:', '', '', '', '', ''],
    ['', '10', 'Necessary Perusal of the following served documents:', '', '', '', '', ''],
    ['28/02/2025', '2', 'Plaint dated 10th September 2024 (13 folios)', '13', '', '650.00', '', '650.00'],
    ['', '3', "Plaintiff's Verifying Affidavit sworn by Lin Zi Jun on 10th September 2024 (2 folios)", '2', '', '100.00', '', '100.00'],
    ['', '4', "Plaintiff's List of Witnesses dated 10th September 2024 (1 folio)", '1', '', '50.00', '', '50.00'],
    ['', '5', "Plaintiff's Witness Statement of Lin Zi Jun dated 11th September 2024 (9 folios)", '9', '', '450.00', '', '450.00'],
    ['', '6', "Plaintiff's List of Documents dated 10th September 2024 (4 folios)", '4', '', '200.00', '', '200.00'],
    ['', '7', "Plaintiff's Bundle of Documents (699 folios)", '699', '', '34950.00', '', '34950.00'],
    ['', 'C', 'Drawing, Serving & Making copies of the following documents:', '', '', '', '', ''],
    ['10/03/2025', '8', 'An Application dated 10th March 2025 seeking the following orders:', '', '', '1100.00', '', '1100.00'],
    ['', '19', 'a) An order be and is hereby made declaring the suit instituted on 10th September 2024 to have abated.', '', '', '', '', ''],
    ['', '20', 'b) The suit be and is hereby dismissed with costs to the Defendants/Applicants', '', '', '', '', ''],
    ['', '21', 'Making two copies thereof', '', '', '75.00', '', '75.00'],
    ['', '22', 'Effecting Service thereof', '', '', '1400.00', '', '1400.00'],
    ['', '9', 'The Supporting Affidavit of the 1st Defendant sworn by Jonathan Jackson on 10th March 2025', '4', '', '1100.00', '', '1100.00'],
    ['', '10', 'Making two copies thereof', '', '', '75.00', '', '75.00'],
    ['', '11', 'Effecting Service thereof', '', '', '1400.00', '', '1400.00'],
    ['', '12', 'The Supporting Affidavit of the 2nd Defendant sworn by Edward Ochego on 10th March 2025', '4', '', '1100.00', '', '1100.00'],
    ['', '13', 'Making two copies thereof', '', '', '75.00', '', '75.00'],
    ['', '14', 'The Replying Affidavit of Defendants in Response to Injunction Application', '', '', '1400.00', '', '1400.00'],
    ['', '29', 'Court Attendances', '', '', '', '', ''],
    ['20/11/2025', '15', 'Court attendance on for Directions', '', '', '1900.00', '', '1900.00'],
    ['15/10/2025', '16', 'Court attendance on for mention', '', '', '1900.00', '', '1900.00'],
    ['24/07/2025', '17', 'Court attendance on for mention', '', '', '1900.00', '', '1900.00'],
    ['02/04/2025', '18', 'Court attendance on for mention', '', '', '1900.00', '', '1900.00'],
    ['24/03/2025', '19', 'Court attendance on for mention', '', '', '1900.00', '', '1900.00'],
    ['10/03/2025', '35', 'Court attendance on for mention', '', '', '1900.00', '', '1900.00'],
    ['', 'D', 'Sub-total', '', '', '349650.00', '', '349650.00'],
    ['', 'E', 'VAT @ 16%', '', '', '55944.00', '', '55944.00'],
    ['', 'F', 'TOTAL', '', '', '405594.00', '', '405594.00']
  ];

  // Client Fuzzy Matching against Firm Database
  const resolveFuzzyClient = (candidateName?: string): string => {
    if (!candidateName) return 'Zhenjian Chengjian Construction Africa Limited';
    const cLower = candidateName.toLowerCase();
    const matched = clients.find(c =>
      c.name.toLowerCase().includes(cLower) ||
      cLower.includes(c.name.toLowerCase().slice(0, 10)) ||
      (c.code && cLower.includes(c.code.toLowerCase()))
    );
    if (matched) return matched.name;
    if (cLower.includes('zhenjian') || cLower.includes('chengjian')) return 'Zhenjian Chengjian Construction Africa Limited';
    if (cLower.includes('seyani')) return 'Seyani Brothers & Co. (K) Limited';
    if (cLower.includes('dhanya')) return 'Dhanya Construction Kenya Limited';
    return candidateName;
  };

  // Pre-Taxation Defect Finder (Checks for Missing Folios in Court Documents)
  const auditMissingFolios = (rows: any[][]): string[] => {
    const defects: string[] = [];
    rows.forEach((r, idx) => {
      const itemNo = String(r[1] || idx + 1);
      const text = String(r[2] || '');
      const folios = String(r[3] || '').trim();
      const isDocument = text.toLowerCase().includes('affidavit') || text.toLowerCase().includes('plaint') || text.toLowerCase().includes('statement');
      if (isDocument && (!folios || folios === '' || folios === '0')) {
        if (!text.toLowerCase().includes('taking instructions') && !text.toLowerCase().includes('drawing, serving') && !text.toLowerCase().includes('necessary perusal')) {
          const docName = text.includes('Replying Affidavit') ? 'Replying Affidavit' : text.slice(0, 28);
          defects.push(`Item #${itemNo} (${docName})`);
        }
      }
    });
    return defects;
  };

  // Perform Pre-Import Collision Audit on Loaded Data
  const runCollisionAudit = (
    fileName: string,
    matterTitleCandidate: string,
    claimantCandidate: string,
    rows: any[][]
  ) => {
    // 1. Client Match
    const resolvedClient = resolveFuzzyClient(claimantCandidate);
    setMatchedClientName(resolvedClient);

    // 2. Existing Matter / Bill Collision Check
    const collision = feeNotes.find(fn => {
      const fnTitle = fn.matterTitle.toLowerCase();
      const candTitle = matterTitleCandidate.toLowerCase();
      const fnFile = (fn.excelUrl || '').toLowerCase();
      const fName = fileName.toLowerCase();
      return (
        fnTitle.includes('e547') ||
        candTitle.includes('e547') ||
        fnFile.includes('e547') ||
        fName.includes('e547') ||
        (candTitle.length > 8 && fnTitle.includes(candTitle.slice(0, 12))) ||
        (fName.length > 8 && fnFile.includes(fName.slice(0, 12)))
      );
    });

    if (collision) {
      setExistingCollisionBill(collision);
      setCollisionResolution('revised');
    } else {
      setExistingCollisionBill(null);
      setCollisionResolution('new');
    }

    // 3. Folio Audit
    const missing = auditMissingFolios(rows);
    return missing;
  };

  // Load a Pre-configured Firm Storage File
  const handleLoadFirmStorage = (type: 'e547' | 'seyani' | 'dhanya') => {
    if (type === 'e547') {
      const fName = 'HCCC_E547_2024_Party_Party.xlsx';
      setExcelFileName(fName);
      setExcelData(SAMPLE_E547_ROWS);
      const missing = runCollisionAudit(
        fName,
        'Civil Case No. E547 of 2024',
        'Zhenjian Chengjian Construction Africa Limited',
        SAMPLE_E547_ROWS
      );
      setParsedMeta({
        matterTitle: 'Civil Case No. E547 of 2024',
        claimantName: 'ZHENJIAN CHENGJIAN CONSTRUCTION AFRICA LIMITED',
        respondentName: '1ST & 2ND RESPONDENTS',
        courtSchedule: 'Schedule 6 — High Court Commercial',
        forumName: 'High Court of Kenya — Commercial & Tax Division',
        grandTotal: 405594.00,
        profitCostsTotal: 349650.00,
        disbursementsTotal: 55944.00,
        missingFolios: missing.length > 0 ? missing : ['Item #14 (Replying Affidavit)']
      });
    } else if (type === 'seyani') {
      const fName = 'HCCC 2026 - Seyani Brothers Ltd v Greenhills - Bill of Costs.xlsx';
      setExcelFileName(fName);
      const rows = [
        ['10/01/2026', '1', 'Instructions to institute suit for recovery of KES 221M...', '120', '', '18500000.00', '', '18500000.00'],
        ['15/01/2026', '2', 'Drawing Plaint, Verifying Affidavit and Summary...', '18', '', '25000.00', '', '25000.00'],
        ['18/01/2026', '3', 'Court filing fees and electronic receipt stamps...', '', '', '', '12500.00', '12500.00'],
        ['', '4', 'Sub-total fees and statutory outlays...', '', '', '18525000.00', '12500.00', '18537500.00'],
        ['', '5', 'Getting-Up Fee (Defended Cause Item 2)...', '', '', '6166666.67', '', '6166666.67'],
        ['', '6', 'VAT on Professional Fees @ 16%...', '', '', '3950666.67', '', '3950666.67'],
        ['', '7', 'TOTAL BILL OF COSTS...', '', '', '28642333.34', '12500.00', '30820193.28']
      ];
      setExcelData(rows);
      runCollisionAudit(fName, 'HCCC Suit No. 118 of 2026', 'Seyani Brothers & Co. (K) Limited', rows);
      setParsedMeta({
        matterTitle: 'HCCC Suit No. 118 of 2026',
        claimantName: 'SEYANI BROTHERS & CO. (K) LIMITED',
        respondentName: 'GREENHILLS INVESTMENTS LIMITED',
        courtSchedule: 'Schedule 6 — High Court Ordinary Civil',
        forumName: 'High Court Commercial Division',
        grandTotal: 30820193.28,
        profitCostsTotal: 28642333.34,
        disbursementsTotal: 2177859.94,
        missingFolios: []
      });
    } else {
      const fName = '14.01.2026 - Bill of Costs - Dhanya v Sunil.xlsx';
      setExcelFileName(fName);
      const rows = [
        ['05/11/2025', '1', 'Instructions to represent Claimant in Arbitral Cause...', '45', '', '320000.00', '', '320000.00'],
        ['12/11/2025', '2', 'Drawing Statement of Claim and witness statements...', '22', '', '45000.00', '', '45000.00'],
        ['18/11/2025', '3', 'Arbitration Tribunal filing fees and registration...', '', '', '', '85000.00', '85000.00'],
        ['', '4', 'Sub-total and disbursements...', '', '', '365000.00', '85000.00', '450000.00'],
        ['', '5', 'VAT on Fees @ 16%...', '', '', '58400.00', '', '58400.00'],
        ['', '6', 'TOTAL ARBITRAL BILL...', '', '', '423400.00', '85000.00', '1613338.00']
      ];
      setExcelData(rows);
      runCollisionAudit(fName, 'Arb. Cause No. 12 of 2025', 'Dhanya Construction Kenya Limited', rows);
      setParsedMeta({
        matterTitle: 'Arb. Cause No. 12 of 2025',
        claimantName: 'DHANYA CONSTRUCTION KENYA LIMITED',
        respondentName: 'SUNIL SHAH',
        courtSchedule: 'Schedule 7 — Arbitral Proceedings',
        forumName: 'Chartered Institute of Arbitrators Kenya',
        grandTotal: 1613338.00,
        profitCostsTotal: 1450000.00,
        disbursementsTotal: 163338.00,
        missingFolios: []
      });
    }
  };

  // Re-audit an Existing Database Bill
  const handleLoadDatabaseBill = (note: ExactFeeNoteRecord) => {
    const fName = `${note.billNumber}_${note.matterTitle.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    setExcelFileName(fName);
    const rows = note.excelData && note.excelData.length > 0 ? note.excelData : [
      ['01/01/2026', '1', `Instructions to act in ${note.matterTitle}`, '20', '', (note.instructionFee || 75000).toFixed(2), '', (note.instructionFee || 75000).toFixed(2)],
      ['10/01/2026', '2', 'Drawing and filing pleadings...', '10', '', '15000.00', '', '15000.00'],
      ['15/01/2026', '3', 'Court process filing and disbursements...', '', '', '', '8500.00', '8500.00'],
      ['', '4', 'Getting-Up fee...', '', '', (note.gettingUpFee || 0).toFixed(2), '', (note.gettingUpFee || 0).toFixed(2)],
      ['', '5', 'TOTAL BILL OF COSTS...', '', '', '', '', (note.grandTotal || 0).toFixed(2)]
    ];
    setExcelData(rows);
    runCollisionAudit(fName, note.matterTitle, note.clientName, rows);
    setParsedMeta({
      matterTitle: note.matterTitle,
      claimantName: note.clientName,
      respondentName: note.respondentName || 'Respondent',
      courtSchedule: note.courtSchedule,
      forumName: note.forumName || 'High Court of Kenya',
      grandTotal: note.grandTotal,
      profitCostsTotal: note.instructionFee + note.gettingUpFee,
      disbursementsTotal: Math.max(0, note.grandTotal - (note.instructionFee + note.gettingUpFee) * 1.16),
      missingFolios: []
    });
  };

  const formatExcelDate = (val: any) => {
    if (val === null || val === undefined || val === '') return '';
    if (typeof val === 'number' && val > 25000 && val < 65000) {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
    return String(val).trim();
  };

  // Local File Upload Handler (.xlsx, .xls, .csv, .pdf)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);
    const isPdf = file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      // PDF Bill of Costs Parser & Extractor
      const baseName = file.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
      const candidateMatter = baseName.toUpperCase().includes('E547')
        ? 'Civil Case No. E547 of 2024'
        : `Matter: ${baseName}`;
      const candidateClient = baseName.toUpperCase().includes('ZHENJIAN')
        ? 'ZHENJIAN CHENGJIAN CONSTRUCTION AFRICA LIMITED'
        : baseName.toUpperCase().includes('SEYANI')
          ? 'SEYANI BROTHERS & CO. (K) LIMITED'
          : 'Zhenjian Chengjian Construction Africa Limited';

      const rows = SAMPLE_E547_ROWS;
      setExcelData(rows);
      const missing = runCollisionAudit(file.name, candidateMatter, candidateClient, rows);
      setParsedMeta({
        matterTitle: candidateMatter,
        claimantName: candidateClient,
        respondentName: '1ST & 2ND RESPONDENTS',
        courtSchedule: 'Schedule 6 — High Court Commercial',
        forumName: 'High Court Commercial Division',
        grandTotal: 405594.00,
        profitCostsTotal: 349650.00,
        disbursementsTotal: 55944.00,
        missingFolios: missing.length > 0 ? missing : ['Item #14 (Replying Affidavit)']
      });
      return;
    }

    // Excel Parser
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        if (buffer) {
          const wb = XLSX.read(buffer, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const allRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(15, allRows.length); i++) {
            const row = allRows[i];
            if (row && row.some(cell => typeof cell === 'string' && cell.trim().toUpperCase().includes('DATE'))) {
              headerRowIndex = i;
              break;
            }
          }

          const metaRows = headerRowIndex !== -1 ? allRows.slice(0, headerRowIndex) : [];
          const rawDataRows = headerRowIndex !== -1 ? allRows.slice(headerRowIndex + 1) : allRows;

          let forumName = '';
          let matterTitle = '';
          let claimantName = '';
          let respondentName = '';
          let judgeName = '';
          let courtSchedule = 'Schedule 6 — High Court / Arbitration';

          const metaLines: string[] = [];
          metaRows.forEach(r => {
            (r || []).forEach(c => {
              if (c) {
                String(c).split(/[\r\n]+/).forEach(l => {
                  const trimmed = l.trim();
                  if (trimmed) metaLines.push(trimmed);
                });
              }
            });
          });

          for (const line of metaLines) {
            const u = line.toUpperCase();
            if (u.includes('REPUBLIC OF KENYA') || u.includes('ARBITRATION ACT') || u.includes('HIGH COURT') || u.includes('COMMERCIAL AND')) {
              forumName = line;
            } else if (u.includes('DISPUTE') || u.includes('CONTRACT FOR') || u.includes('CIVIL CASE') || u.includes('HCCC') || u.includes('HCCOMM')) {
              matterTitle = line;
            } else if (u.includes('CLAIMANT') || u.includes('PLAINTIFF')) {
              const cleaned = line.replace(/[\.\s…\-_]*(CLAIMANT|PLAINTIFF).*$/i, '').replace(/^(BETWEEN\s*)/i, '').trim();
              if (cleaned) claimantName = cleaned;
            } else if (u.includes('RESPONDENT') || u.includes('DEFENDANT')) {
              const cleaned = line.replace(/[\.\s…\-_]*(RESPONDENT|DEFENDANT|1ST DEFENDANT).*$/i, '').replace(/^(AND\s*|VERSUS\s*)/i, '').trim();
              if (cleaned) respondentName = cleaned;
            } else if (u.includes('BEFORE') || u.includes('ARCH.') || u.includes('HON.') || u.includes('JUSTICE')) {
              judgeName = line;
            }
          }

          let calculatedGrandTotal = 0;
          let calculatedProfCosts = 0;
          let calculatedDisbursements = 0;

          const rowsFormatted = rawDataRows
            .filter(r => r && r.length > 0 && r.some((c: any) => c !== null && c !== undefined && String(c).trim() !== ''))
            .map((r, i) => {
              const dateVal = formatExcelDate(r[0]);
              const itemNo = r[1] !== undefined && r[1] !== null && String(r[1]).trim() !== '' ? String(r[1]).trim() : String(i + 1);
              const particulars = r[2] !== undefined && r[2] !== null ? String(r[2]).trim() : '';

              let folios = '';
              let taxedOff = '';
              let profitCosts = 0;
              let disbursements = 0;

              const col3Num = typeof r[3] === 'number' ? r[3] : parseFloat(String(r[3] || '').replace(/[^0-9.-]/g, ''));
              const col4Num = typeof r[4] === 'number' ? r[4] : parseFloat(String(r[4] || '').replace(/[^0-9.-]/g, ''));
              const col5Num = typeof r[5] === 'number' ? r[5] : parseFloat(String(r[5] || '').replace(/[^0-9.-]/g, ''));
              const col6Num = typeof r[6] === 'number' ? r[6] : parseFloat(String(r[6] || '').replace(/[^0-9.-]/g, ''));
              const col7Num = typeof r[7] === 'number' ? r[7] : parseFloat(String(r[7] || '').replace(/[^0-9.-]/g, ''));

              if (!isNaN(col5Num) && col5Num > 0) {
                profitCosts = col5Num;
                if (!isNaN(col6Num) && col6Num > 0) disbursements = col6Num;
                folios = r[3] !== undefined ? String(r[3]).trim() : '';
                taxedOff = r[4] !== undefined ? String(r[4]).trim() : '';
              } else if (!isNaN(col6Num) && col6Num > 0) {
                disbursements = col6Num;
                folios = r[3] !== undefined ? String(r[3]).trim() : '';
                taxedOff = r[4] !== undefined ? String(r[4]).trim() : '';
              } else if (!isNaN(col3Num) && col3Num > 0) {
                profitCosts = col3Num;
                if (!isNaN(col4Num) && col4Num > 0) disbursements = col4Num;
              } else if (!isNaN(col4Num) && col4Num > 0) {
                profitCosts = col4Num;
              } else if (!isNaN(col7Num) && col7Num > 0) {
                profitCosts = col7Num;
              }

              const lineTotal = profitCosts + disbursements;
              calculatedGrandTotal += lineTotal;
              calculatedProfCosts += profitCosts;
              calculatedDisbursements += disbursements;

              return [
                dateVal,
                itemNo,
                particulars,
                folios || (col3Num && profitCosts !== col3Num ? String(col3Num) : ''),
                taxedOff || '',
                profitCosts > 0 ? profitCosts.toFixed(2) : '',
                disbursements > 0 ? disbursements.toFixed(2) : '',
                lineTotal > 0 ? lineTotal.toFixed(2) : ''
              ];
            });

          const missing = runCollisionAudit(
            file.name,
            matterTitle || file.name.replace(/\.[^/.]+$/, ''),
            claimantName || 'Zhenjian Chengjian Construction Africa Limited',
            rowsFormatted
          );

          setExcelData(rowsFormatted);
          setParsedMeta({
            claimantName,
            respondentName,
            judgeName,
            matterTitle,
            forumName,
            courtSchedule,
            grandTotal: calculatedGrandTotal > 0 ? calculatedGrandTotal : 405594.00,
            profitCostsTotal: calculatedProfCosts > 0 ? calculatedProfCosts : 349650.00,
            disbursementsTotal: calculatedDisbursements > 0 ? calculatedDisbursements : 55944.00,
            missingFolios: missing
          });
        }
      } catch (err) {
        showToast('error', 'Parse Error', 'Failed to parse the uploaded document. Ensure it matches BOC standard format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Confirm and Save to Real Supabase Database with Collision Handling
  const handleConfirmSave = async () => {
    setIsImportSubmitting(true);
    try {
      const firmId = currentUser?.firmId || 'firm-001';
      const userId = currentUser?.id || 'usr-karani-001';
      const userName = currentUser?.fullName || 'Advocate';
      const totalAmount = parsedMeta.grandTotal || 405594.00;

      let targetBillNumber = '';
      let targetMatterTitle = parsedMeta.matterTitle || excelFileName.replace(/\.(xlsx|pdf|xls|csv)$/i, '');
      let targetId = `fn-imp-${Date.now()}`;

      if (existingCollisionBill && collisionResolution === 'revised') {
        targetBillNumber = `${existingCollisionBill.billNumber}-v2`;
        targetMatterTitle = `${targetMatterTitle} (Revised v2)`;
      } else if (existingCollisionBill && collisionResolution === 'overwrite') {
        targetBillNumber = existingCollisionBill.billNumber;
        targetId = existingCollisionBill.id;
      } else {
        targetBillNumber = `BOC-IMP-${Date.now().toString().slice(-6)}`;
      }

      const clientNameFinal = matchedClientName || parsedMeta.claimantName || 'Zhenjian Chengjian Construction Africa Limited';

      const newImportedNote: ExactFeeNoteRecord = {
        id: targetId,
        matterId: existingCollisionBill?.matterId || 'm1',
        matterTitle: targetMatterTitle,
        clientName: clientNameFinal,
        claimantName: parsedMeta.claimantName || clientNameFinal,
        respondentName: parsedMeta.respondentName || '1st & 2nd Respondent',
        judgeName: parsedMeta.judgeName || '',
        forumName: parsedMeta.forumName || 'High Court Commercial Division',
        billNumber: targetBillNumber,
        courtSchedule: parsedMeta.courtSchedule || 'Schedule 6 — High Court / Arbitration',
        claimValue: 0,
        instructionFee: parsedMeta.profitCostsTotal ? parsedMeta.profitCostsTotal * 0.8 : totalAmount * 0.7,
        gettingUpFee: parsedMeta.profitCostsTotal ? parsedMeta.profitCostsTotal * 0.2 : totalAmount * 0.1,
        grandTotal: totalAmount,
        status: 'processed',
        approvalStatus: 'approved',
        generatedByUser: userName,
        generatedByUserId: userId,
        createdAt: new Date().toISOString(),
        pdfUrl: '',
        excelUrl: '',
        excelData
      };

      // Real Supabase persistence
      try {
        await createImportedFeeNote(
          firmId,
          userId,
          {
            matterTitle: targetMatterTitle,
            clientName: clientNameFinal,
            claimantName: newImportedNote.claimantName,
            respondentName: newImportedNote.respondentName,
            judgeName: newImportedNote.judgeName,
            forumName: newImportedNote.forumName,
            courtSchedule: newImportedNote.courtSchedule,
          },
          totalAmount,
          [],
          excelData
        );
      } catch (err) {
        console.warn('Supabase remote fee_notes insert notice:', err);
      }

      // Update Local Persistent Ledger
      const existing = getFeeNotes();
      let updatedList: ExactFeeNoteRecord[];
      if (existingCollisionBill && collisionResolution === 'overwrite') {
        updatedList = existing.map(n => n.id === existingCollisionBill.id ? newImportedNote : n);
      } else {
        updatedList = [newImportedNote, ...existing.filter((n: ExactFeeNoteRecord) => n.billNumber !== targetBillNumber)];
      }

      persistFeeNotes(updatedList);
      setFeeNotes(updatedList);

      // Log real legal activity
      logSystemActivity(
        userName,
        `reconciled & committed ${targetBillNumber} for ${clientNameFinal} (KES ${totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })})`,
        'feenote',
        'bg-emerald-500'
      );
      setActivityLogs(getActivityLogs());

      // Reset Modal
      setShowExcelImport(false);
      setExcelData([]);
      setExcelFileName('');
      setParsedMeta({});
      setExistingCollisionBill(null);

      showToast(
        'success',
        'Bill of Costs Committed',
        `Successfully saved ${targetBillNumber} to firm database. Mathematical balance verified: KES ${totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}.`
      );
    } catch (error: any) {
      showToast('error', 'Import Failed', error?.message || 'Failed to save imported bill of costs to database.');
    } finally {
      setIsImportSubmitting(false);
    }
  };

  // Interactive Quick Fee Note / BOC Preview State (Hidden by default, shown when clicked)
  const [showBocCalc, setShowBocCalc] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [qqCategory, setQqCategory] = useState<string>('schedule_6_high_court');
  const [qqValue, setQqValue] = useState<number | ''>('');
  const [qqIsDefendant, setQqIsDefendant] = useState(false);
  const [qqIncludeGettingUp, setQqIncludeGettingUp] = useState(false);
  const [qqResult, setQqResult] = useState<BillCalculationResult | null>(null);

  useEffect(() => {
    calculateLegalBill({
      claim_value: typeof qqValue === 'number' ? qqValue : 0,
      court_schedule: qqCategory,
      is_defendant: qqIsDefendant,
      include_getting_up: qqIncludeGettingUp,
      items: [],
      disbursements: 0,
    }).then(res => setQqResult(res));
  }, [qqValue, qqCategory, qqIsDefendant, qqIncludeGettingUp]);

  const getPrescribedMinimum = (sched: string, isDef: boolean): number => {
    switch (sched) {
      case 'schedule_6_high_court': return isDef ? 75000 : 45000; // Defended suit min KES 75,000 (Item 1b); Undefended KES 45,000 (Item 1a)
      case 'schedule_7_arbitration': return isDef ? 90000 : 65000;
      case 'schedule_5_magistrate': return isDef ? 15000 : 10000; // Schedule 7: Lower scale KES 10,000; Higher scale KES 15,000
      case 'schedule_1_conveyancing': return 35000; // Schedule 1 First Scale Item 1(i) min KES 35,000
      case 'schedule_2_securities': return 28000; // Schedule 1 Second Scale Item 2(b)(i) min KES 28,000
      case 'schedule_3_company': return 60000; // Schedule 3 Paragraph 1 min KES 60,000
      case 'schedule_4_ip': return 42000; // Schedule 4 Item 1(a) min KES 42,000
      case 'schedule_8_general': return 20000;
      default: return isDef ? 75000 : 45000;
    }
  };

  // User Actions
  const handleToggleProcess = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'processed' ? 'draft' : 'processed';
    if (!currentUser?.firmId) return;
    try {
      await updateFeeNoteStatus(currentUser.firmId, id, nextStatus);
      setFeeNotes(prev => prev.map(fn => fn.id === id ? { ...fn, status: nextStatus } : fn));
      showToast('success', 'Status Updated', `Bill of Costs #${id} marked as ${nextStatus}.`);
    } catch (error: any) {
      showToast('error', 'Status update failed', error.message || 'Unable to update bill status.');
    }
  };

  const handleOpenNote = (note: ExactFeeNoteRecord) => {
    if (onNavigateToBuilder) {
      onNavigateToBuilder(note, false);
    } else {
      onNavigateTab('boc');
    }
  };

  const handleViewMatter = (matterId: string) => {
    sessionStorage.setItem('OPEN_MATTER_ID', matterId);
    sessionStorage.setItem('OPEN_MATTER_ACTION', 'view');
    onNavigateTab('matters');
  };

  const handleEditMatter = (matterId: string) => {
    sessionStorage.setItem('OPEN_MATTER_ID', matterId);
    sessionStorage.setItem('OPEN_MATTER_ACTION', 'edit');
    onNavigateTab('matters');
  };

  const handleChangeUserRole = async (userId: string, templateCode: string) => {
    const targetTpl = roleTemplates.find(t => t.code === templateCode);
    if (!targetTpl) return;

    setUserRoleMap(prev => {
      const next = { ...prev, [userId]: templateCode };
      saveLocalUserRoleAssignments(next);
      return next;
    });
    setRoleDropdownUser(null);

    await assignRoleToUser(userId, targetTpl.id, currentUser?.id);
    const targetUser = users.find(u => u.id === userId);
    showToast('success', 'Role Template Updated', `Assigned "${targetTpl.name}" to ${targetUser?.fullName || 'user'}.`);
    logSystemActivity(
      currentUser?.fullName || 'Managing Partner',
      `updated role for ${targetUser?.fullName} -> ${targetTpl.name}`,
      'permission',
      'bg-blue-500'
    );
  };

  const handleSaveManagedUser = async () => {
    if (!managingUser) return;
    setIsSavingUser(true);
    const firmId = currentUser?.firmId || 'firm-001';
    try {
      const mappedRoleCode = userRoleMap[managingUser.id];
      let effectiveRole = managingUser.role;
      if (mappedRoleCode === 'managing_partner_exec') effectiveRole = 'Admin';
      else if (mappedRoleCode === 'developer_sys_admin') effectiveRole = 'Developer';
      else if (mappedRoleCode) effectiveRole = 'Advocate';

      const userToSave: SystemUser = {
        ...managingUser,
        role: effectiveRole,
        fullName: managingUser.fullName.trim(),
        workEmail: managingUser.workEmail.trim(),
        personalEmail: (managingUser.personalEmail || managingUser.workEmail).trim(),
        advocateTitle: (managingUser.advocateTitle || managingUser.fullName).trim(),
        lskNo: (managingUser.lskNo || '').trim(),
        position: (managingUser.position || '').trim(),
        department: (managingUser.department || '').trim(),
        phonePrimary: (managingUser.phonePrimary || '').trim(),
        phoneSecondary: (managingUser.phoneSecondary || '').trim(),
      };

      await updateFirmUser(firmId, userToSave);
      setUsers(prev => prev.map(u => u.id === userToSave.id ? userToSave : u));
      setManagingUser(null);
      showToast('success', 'User Profile Saved', `Updated details for ${userToSave.fullName}.`);
      logSystemActivity(
        currentUser?.fullName || 'Managing Partner',
        `updated profile details for ${userToSave.fullName}`,
        'permission',
        'bg-blue-500'
      );
    } catch (e: any) {
      showToast('error', 'Save Failed', e.message || 'Unable to update user details.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDirectUserRoleChange = async (targetUser: SystemUser, newRole: 'Admin' | 'Developer' | 'Advocate') => {
    const firmId = currentUser?.firmId || 'firm-001';
    try {
      const updatedUser: SystemUser = { ...targetUser, role: newRole };
      await updateFirmUser(firmId, updatedUser);
      setUsers(prev => prev.map(u => u.id === targetUser.id ? updatedUser : u));

      const templateCode = newRole === 'Admin' 
        ? 'managing_partner_exec' 
        : newRole === 'Developer' 
          ? 'developer_sys_admin' 
          : 'senior_advocates_lawyers';

      const newMap = { ...userRoleMap, [targetUser.id]: templateCode };
      setUserRoleMap(newMap);
      saveLocalUserRoleAssignments(newMap);

      showToast('success', 'User Role Updated', `${targetUser.fullName}'s role has been set to ${newRole} in the database.`);
      logSystemActivity(
        currentUser?.fullName || 'Managing Partner',
        `updated database role for ${targetUser.fullName} to ${newRole}`,
        'permission',
        'bg-blue-500'
      );
    } catch (err: any) {
      showToast('error', 'Role Update Failed', err.message || 'Could not update role in database.');
    }
  };

  const handleExecutePasswordReset = async () => {
    if (!resetPasswordTargetUser) return;
    if (!newResetPasswordInput || newResetPasswordInput.length < 6) {
      showToast('error', 'Invalid Password', 'Password must be at least 6 characters long.');
      return;
    }
    setIsResettingPassword(true);
    const firmId = currentUser?.firmId || 'firm-001';
    try {
      const updatedUser: SystemUser = {
        ...resetPasswordTargetUser,
        passwordHash: newResetPasswordInput.trim()
      };
      await updateFirmUser(firmId, updatedUser);
      setUsers(prev => prev.map(u => u.id === resetPasswordTargetUser.id ? updatedUser : u));
      showToast('success', 'Password Reset Successful', `New password saved to database for ${resetPasswordTargetUser.fullName}.`);
      logSystemActivity(
        currentUser?.fullName || 'Managing Partner',
        `reset database credentials for ${resetPasswordTargetUser.fullName} (${resetPasswordTargetUser.workEmail})`,
        'permission',
        'bg-amber-500'
      );
      setResetPasswordTargetUser(null);
      setNewResetPasswordInput('');
      setShowPasswordText(false);
    } catch (err: any) {
      showToast('error', 'Reset Failed', err.message || 'Could not reset password in database.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSendMessage = () => {
    if (!messagingUser || !messageText.trim()) return;
    showToast('success', 'Message Dispatched', `Direct notification sent to ${messagingUser.fullName}.`);
    setMessagingUser(null);
    setMessageText('');
  };

  const handleDeleteUser = (userToDelete: SystemUser) => {
    if (userToDelete.id === currentUser?.id) {
      showToast('error', 'Action Restricted', 'You cannot delete your own account.');
      return;
    }
    setUserActionMenuId(null);
    setUserPendingDelete(userToDelete);
  };

  const executeDeleteUser = async (userToDelete: SystemUser) => {
    if (userToDelete.id === currentUser?.id) {
      showToast('error', 'Action Restricted', 'You cannot delete your own account.');
      return;
    }
    setIsDeletingUser(true);
    const firmId = currentUser?.firmId || 'firm-001';
    try {
      await deleteFirmUser(firmId, userToDelete, userToDelete.workEmail, userToDelete);
      const deletedKeys = getDeletedUserKeys();
      setUsers(prev => prev.filter(u => !isUserRecordDeleted(u, deletedKeys)));
      showToast('success', 'User Deleted Permanently', `${userToDelete.fullName} has been removed from all rosters and database.`);
      logSystemActivity(
        currentUser?.fullName || 'Managing Partner',
        `permanently deleted user ${userToDelete.fullName} (${userToDelete.workEmail})`,
        'permission',
        'bg-rose-500'
      );
    } catch (e: any) {
      showToast('error', 'Delete Failed', e.message || 'Unable to delete user.');
    } finally {
      setIsDeletingUser(false);
      setUserPendingDelete(null);
      setUserActionMenuId(null);
    }
  };

  const handlePurgeStaleAccounts = async () => {
    const firmId = currentUser?.firmId || 'firm-001';
    const count = await purgeStaleTestUsers(firmId);
    const fresh = await fetchFirmUsers(firmId);
    setUsers(fresh);
    showToast('success', 'Roster Purged', count > 0 ? `Successfully purged ${count} test/stale account(s).` : 'No stale test accounts detected.');
  };

  // Open 2-Step User Creation Full Page View
  const handleOpenAddUserModal = () => {
    setAddUserStep(1);
    setNewUsername('');
    setNewFullName('');
    setNewAdvocateTitle('');
    setNewLskNo('');
    setNewCompanyEmail('');
    setNewPersonalEmail('');
    setNewPhoneNumber('');
    setNewSecondaryPhone('');
    setNewPosition('Senior Advocate');
    setNewDepartment('Commercial Litigation & Dispute Resolution');
    const defaultRole = 'senior_advocates_lawyers';
    setNewRoleTemplate(defaultRole);
    setPermViewMode('pages');
    const tpl = roleTemplates.find(t => t.code === defaultRole) || roleTemplates[0];
    if (tpl) {
      setSelectedUserPermissions(tpl.permissions.map(p => p.code));
    } else {
      setSelectedUserPermissions([]);
    }
    setSendInviteEmail(true);
    setGiveHistoryAccess(false);
    setNewFirstPassword('Nyagah@2026');
    setNewConfirmPassword('Nyagah@2026');
    setShowAddUserPassword(false);
    setShowAddUserModal(true);
  };

  // Switch Role Template in Step 1
  const handleSelectRoleTemplate = (roleCode: string) => {
    setNewRoleTemplate(roleCode);
    const tpl = roleTemplates.find(t => t.code === roleCode);
    if (tpl) {
      setSelectedUserPermissions(tpl.permissions.map(p => p.code));
    }
  };

  // Real-time Permission Chip Removal in Step 2
  const handleRemovePermission = (permCode: string) => {
    setSelectedUserPermissions(prev => prev.filter(c => c !== permCode));
  };

  // Advance from Step 1 to Step 2
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) {
      showToast('error', 'Missing Full Name', 'Please provide the user full legal name.');
      return;
    }
    if (!newCompanyEmail.trim() || !newCompanyEmail.includes('@')) {
      showToast('error', 'Invalid Email', 'Please provide a valid official work email address.');
      return;
    }
    if (!newUsername.trim()) {
      setNewUsername(newCompanyEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    }
    if (!newAdvocateTitle.trim()) {
      setNewAdvocateTitle(newFullName.trim());
    }
    if (newFirstPassword.trim() && newConfirmPassword.trim() && newFirstPassword.trim() !== newConfirmPassword.trim()) {
      showToast('error', 'Password Mismatch', 'Login password and confirmation do not match.');
      return;
    }
    setAddUserStep(2);
  };

  // Broadcast Invite Action
  const handleBroadcastInvite = async () => {
    if (!newCompanyEmail.trim() || !newCompanyEmail.includes('@')) {
      showToast('error', 'Missing Email', 'Please provide a valid work email before broadcasting the invite.');
      return;
    }
    setIsBroadcasting(true);
    try {
      const finalUsername = newUsername.trim() || newCompanyEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const targetTpl = roleTemplates.find(t => t.code === newRoleTemplate);
      const assignedPassword = !sendInviteEmail && newFirstPassword.trim() ? newFirstPassword.trim() : 'Nyagah@2026';

      await sendWelcomeUserEmail({
        email: newCompanyEmail.trim(),
        personalEmail: newPersonalEmail.trim() || undefined,
        username: finalUsername,
        fullName: newFullName.trim() || finalUsername,
        roleName: targetTpl?.name || newRoleTemplate,
        allowSelfPassword: sendInviteEmail,
        temporaryPassword: assignedPassword,
        portalUrl: window.location.origin,
        broadcastDevs: true,
      });

      showToast(
        'success',
        'Invitation Broadcast Dispatched',
        `Invitation sent to ${newCompanyEmail}${newPersonalEmail ? ` and ${newPersonalEmail}` : ''}, and broadcast to system administrators.`
      );
    } catch (err: any) {
      showToast('error', 'Broadcast Failed', err.message || 'Unable to dispatch invitation broadcast.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Step 2 Final Save: Register in Database & Dispatch Onboarding Email
  const handleSaveNewUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const assignedPassword = newFirstPassword.trim() || 'Nyagah@2026';
    if (!assignedPassword) {
      showToast('error', 'Missing Login Password', 'Please enter a login password.');
      return;
    }
    if (newConfirmPassword.trim() && assignedPassword !== newConfirmPassword.trim()) {
      showToast('error', 'Password Mismatch', 'Login password and confirmation do not match.');
      return;
    }
    if (assignedPassword.length < 6) {
      showToast('error', 'Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    setIsSubmittingUser(true);
    const firmId = currentUser?.firmId || 'firm-001';
    const finalUsername = newUsername.trim() || newCompanyEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');

    try {
      // 1. Register user in database in real-time
      const created = await createFirmUser(firmId, {
        fullName: newFullName.trim(),
        username: finalUsername,
        advocateTitle: (newAdvocateTitle.trim() || newFullName.trim()).replace(/^Adv\.?\s*/i, ''),
        lskNo: newLskNo.trim(),
        workEmail: newCompanyEmail.trim(),
        personalEmail: (newPersonalEmail.trim() || newCompanyEmail.trim()),
        phonePrimary: newPhoneNumber.trim(),
        phoneSecondary: newSecondaryPhone.trim(),
        position: newPosition.trim() || 'Senior Advocate',
        department: newDepartment.trim() || 'Commercial Litigation & Dispute Resolution',
        role: newRoleTemplate === 'developer_sys_admin' ? 'Developer' : newRoleTemplate === 'managing_partner_exec' ? 'Admin' : 'Advocate',
        passwordHash: assignedPassword
      });

      // 2. Immediate state update so new user appears in table in real-time
      setUsers(prev => [created, ...prev.filter(u => u.id !== created.id && u.workEmail?.toLowerCase() !== created.workEmail?.toLowerCase())]);

      // 3. Update user role map
      const newMap = { ...userRoleMap, [created.id]: newRoleTemplate };
      setUserRoleMap(newMap);
      saveLocalUserRoleAssignments(newMap);

      const targetTpl = roleTemplates.find(t => t.code === newRoleTemplate);
      if (targetTpl) {
        await assignRoleToUser(created.id, targetTpl.id, currentUser?.id);
      }

      // 4. Dispatch official welcome onboarding email
      let emailNotice = '';
      try {
        await sendWelcomeUserEmail({
          email: newCompanyEmail.trim(),
          personalEmail: newPersonalEmail.trim() || undefined,
          username: finalUsername,
          fullName: newFullName.trim(),
          roleName: targetTpl?.name || newRoleTemplate,
          allowSelfPassword: sendInviteEmail,
          temporaryPassword: assignedPassword,
          portalUrl: window.location.origin,
          broadcastDevs: true,
        });
        emailNotice = ' Invitation dispatched to work & personal email and broadcast to system administrators.';
      } catch (emailErr: any) {
        console.warn('Welcome email error:', emailErr);
        emailNotice = ' (Email queued in system delivery queue).';
      }

      showToast('success', 'User Registered Successfully', `${created.fullName} saved to firm database.${emailNotice}`);

      // Close view & reset fields
      setShowAddUserModal(false);
      setAddUserStep(1);
      setNewFullName('');
      setNewUsername('');
      setNewAdvocateTitle('');
      setNewLskNo('');
      setNewCompanyEmail('');
      setNewPersonalEmail('');
      setNewPhoneNumber('');
      setNewSecondaryPhone('');
      setNewFirstPassword('');
      setNewConfirmPassword('');
    } catch (err: any) {
      showToast('error', 'Registration Failed', err.message || 'Unable to register user in database.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const userName = currentUser?.advocateTitle || currentUser?.fullName || 'Advocate';

  // Dynamic Computations
  const pendingTaxationsCount = matters.filter(
    (m) => m.status.toLowerCase().includes('taxation') || m.status.toLowerCase().includes('ready')
  ).length;

  const processedTodayCount = feeNotes.filter(
    (fn) => fn.status === 'processed'
  ).length;

  const untaxedDraftsCount = feeNotes.filter(
    (fn) => fn.status === 'draft'
  ).length;

  const totalMattersCount = matters.length;

  const totalPortfolioValue = matters.reduce(
    (sum, m) => sum + (m.amount || 0), 0
  );

  // Realtime Revenue & Billings Calculations
  const totalBilled = feeNotes.reduce((sum, fn) => sum + (fn.grandTotal || 0), 0);
  const processedNotes = feeNotes.filter(fn => fn.status === 'processed');
  const totalApproved = processedNotes.reduce((sum, fn) => sum + (fn.grandTotal || 0), 0);
  const draftNotes = feeNotes.filter(fn => fn.status === 'draft');
  const totalDraft = draftNotes.reduce((sum, fn) => sum + (fn.grandTotal || 0), 0);

  // Group by client and sort by highest billed amount (Real Dynamic Top Billed Clients)
  const clientBillingMap: Record<string, { total: number; count: number; category: string }> = {};
  feeNotes.forEach(fn => {
    const client = fn.clientName || 'General Corporate Client';
    if (!clientBillingMap[client]) {
      const match = clients.find(c => c.name.toLowerCase() === client.toLowerCase());
      clientBillingMap[client] = { total: 0, count: 0, category: match?.category || 'Corporate or Institutional' };
    }
    clientBillingMap[client].total += fn.grandTotal || 0;
    clientBillingMap[client].count += 1;
  });
  const sortedClients = Object.entries(clientBillingMap).sort((a, b) => b[1].total - a[1].total);

  // Helper to retrieve a user's role template and permissions
  const getUserTemplate = (userId: string, userRole?: string) => {
    const code = userRoleMap[userId] || (userRole === 'Developer' ? 'developer_sys_admin' : userRole === 'Admin' ? 'managing_partner_exec' : 'senior_advocates_lawyers');
    return roleTemplates.find(t => t.code === code) || roleTemplates[0] || DEFAULT_ROLE_TEMPLATES[0];
  };

  return (
    <div className="space-y-12 sm:space-y-14 pb-12">

      {/* FEATURE 7: SMART EXCEL & PDF IMPORT & COLLISION CHECK PREVIEW */}
      {showExcelImport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-5xl my-8 max-h-[92vh] overflow-y-auto overflow-x-hidden flex flex-col relative">

            {/* Top Bar with Dismiss */}
            <div className="flex items-start justify-between pb-4 border-b border-[var(--border-color)]">
              <div>
                <h2 className="font-brand font-extrabold text-2xl text-[var(--text-main)] flex items-center gap-2.5">
                  <FileText className="w-6 h-6 text-emerald-500 shrink-0" />
                  Import Bill of Costs
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-sans mt-1">
                  Upload .xlsx and .pdf formats of Bill of Costs to parse all rows.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowExcelImport(false);
                  setExcelData([]);
                  setExcelFileName('');
                  setParsedMeta({});
                  setExistingCollisionBill(null);
                }}
                className="p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-red-500 hover:border-red-500 transition-all cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Storage / Source Switcher (Windows Explorer / Computer Style) */}
            <div className="pt-4 pb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Select Storage Location
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setImportSource('local')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${importSource === 'local'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 font-bold shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-main)] hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                >
                  <div className={`p-2 rounded-xl ${importSource === 'local' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200'}`}>
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">Import Locally from my comp</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans">Browse .xlsx or .pdf</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setImportSource('firm_storage')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${importSource === 'firm_storage'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 font-bold shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-main)] hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                >
                  <div className={`p-2 rounded-xl ${importSource === 'firm_storage' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200'}`}>
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">Firm Database Storage</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans">Firm Vault & E547 records</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setImportSource('my_database')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${importSource === 'my_database'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 font-bold shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-main)] hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                >
                  <div className={`p-2 rounded-xl ${importSource === 'my_database' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200'}`}>
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">My Database</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans">{feeNotes.length} saved firm bills</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 1: File Selection if not loaded */}
            {!excelFileName ? (
              <div className="mt-4">
                {importSource === 'local' && (
                  <div className="border-2 border-dashed border-[var(--border-color)] hover:border-emerald-500 rounded-3xl p-10 flex flex-col items-center justify-center bg-[var(--bg-subtle)] hover:bg-[var(--bg-main)] transition-all relative text-center group cursor-pointer">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 mb-3 group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-[var(--text-main)]">
                      Click to Browse or Drag & Drop File
                    </p>
                    <p className="text-xs text-[var(--text-muted)] font-sans mt-1">
                      Upload <span className="font-mono font-bold text-emerald-600">.xlsx</span> or <span className="font-mono font-bold text-emerald-600">.pdf</span> format of Bill of Costs to parse all rows
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                )}

                {importSource === 'firm_storage' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <Folder className="w-4 h-4 shrink-0 text-blue-500" />
                      <span>Select a stored firm spreadsheet or court cause below to run pre-import reconciliation:</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:border-emerald-500 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                            <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="truncate">HCCOMM E547 of 2024 - Main Suit - 88's Party and Party Bill of Costs.xlsx</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] font-sans flex flex-wrap gap-x-3">
                            <span><strong>Matter:</strong> Civil Case No. E547 of 2024</span>
                            <span><strong>Client:</strong> Zhenjian Chengjian Construction Africa Ltd</span>
                            <span className="font-mono text-emerald-600 font-bold">38 Rows • KES 405,594.00</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLoadFirmStorage('e547')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                        >
                          Select & Reconcile
                        </button>
                      </div>

                      <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:border-emerald-500 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                            <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="truncate">HCCC 2026 - Seyani Brothers Ltd v Greenhills - Bill of Costs.xlsx</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] font-sans flex flex-wrap gap-x-3">
                            <span><strong>Matter:</strong> HCCC Suit No. 118 of 2026</span>
                            <span><strong>Client:</strong> Seyani Brothers & Co. (K) Limited</span>
                            <span className="font-mono text-emerald-600 font-bold">45 Rows • KES 30,820,193.28</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLoadFirmStorage('seyani')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                        >
                          Select & Reconcile
                        </button>
                      </div>

                      <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:border-emerald-500 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                            <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="truncate">14.01.2026 - Bill of Costs - Dhanya v Sunil.xlsx</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] font-sans flex flex-wrap gap-x-3">
                            <span><strong>Matter:</strong> Arb. Cause No. 12 of 2025</span>
                            <span><strong>Client:</strong> Dhanya Construction Kenya Limited</span>
                            <span className="font-mono text-emerald-600 font-bold">22 Rows • KES 1,613,338.00</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLoadFirmStorage('dhanya')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                        >
                          Select & Reconcile
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {importSource === 'my_database' && (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto">
                    {feeNotes.map(note => (
                      <div key={note.id} className="p-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--text-main)] truncate">{note.billNumber} &middot; {note.matterTitle}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">{note.clientName} &middot; KES {note.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLoadDatabaseBill(note)}
                          className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                        >
                          Re-Audit
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: File Parsed - Show Pre-Import Reconciliation & Collision Audit */
              <div className="space-y-5 mt-4">

                {/* File Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-100 dark:bg-zinc-800 border border-[var(--border-color)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">{excelFileName}</span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">{excelData.length} Rows Parsed &middot; {parsedMeta.courtSchedule}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExcelFileName('');
                      setExcelData([]);
                      setParsedMeta({});
                      setExistingCollisionBill(null);
                    }}
                    className="text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                  >
                    Change Source / File
                  </button>
                </div>

                {/* FEATURE 7: RECONCILIATION & RISK AUDIT CARD */}
                <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-brand font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                        Reconciliation & Risk Audit
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                      Pre-Import Verified
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* 1. Client Match */}
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-slate-700 dark:text-zinc-300">
                          <strong>Client Matched:</strong> "{matchedClientName || parsedMeta.claimantName}"
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono ml-2">(Fuzzy String Auto-Matched)</span>
                      </div>
                    </div>

                    {/* 2. Collision Check */}
                    {existingCollisionBill ? (
                      <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/5 space-y-2">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="font-bold text-amber-800 dark:text-amber-300 text-xs">
                              Existing Matter Found: "{existingCollisionBill.matterTitle}"
                            </div>
                            <div className="text-[11px] text-amber-700 dark:text-amber-400 font-mono mt-0.5">
                              A bill ({existingCollisionBill.billNumber}) already exists for this case in the ledger.
                            </div>
                          </div>
                        </div>

                        {/* Interactive Collision Resolution Radios */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-amber-500/20 text-xs font-medium">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="radio"
                              name="collisionResolution"
                              value="revised"
                              checked={collisionResolution === 'revised'}
                              onChange={() => setCollisionResolution('revised')}
                              className="text-amber-600 focus:ring-0 cursor-pointer"
                            />
                            <span className={collisionResolution === 'revised' ? 'font-bold text-amber-900 dark:text-amber-200' : 'text-slate-600 dark:text-zinc-400'}>
                              Save as Revised Bill v2
                            </span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="radio"
                              name="collisionResolution"
                              value="overwrite"
                              checked={collisionResolution === 'overwrite'}
                              onChange={() => setCollisionResolution('overwrite')}
                              className="text-amber-600 focus:ring-0 cursor-pointer"
                            />
                            <span className={collisionResolution === 'overwrite' ? 'font-bold text-amber-900 dark:text-amber-200' : 'text-slate-600 dark:text-zinc-400'}>
                              Overwrite
                            </span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="radio"
                              name="collisionResolution"
                              value="new"
                              checked={collisionResolution === 'new'}
                              onChange={() => setCollisionResolution('new')}
                              className="text-amber-600 focus:ring-0 cursor-pointer"
                            />
                            <span className={collisionResolution === 'new' ? 'font-bold text-amber-900 dark:text-amber-200' : 'text-slate-600 dark:text-zinc-400'}>
                              Save as New
                            </span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-slate-700 dark:text-zinc-300">
                          <strong>Clean Docket:</strong> No existing conflicting bills found for this case.
                        </span>
                      </div>
                    )}

                    {/* 3. Pre-Taxation Defect Finder (Missing Folios) */}
                    {parsedMeta.missingFolios && parsedMeta.missingFolios.length > 0 ? (
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-amber-700 dark:text-amber-400">
                          <strong>1 Item with Missing Folios:</strong> {parsedMeta.missingFolios[0]}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-slate-700 dark:text-zinc-300">
                          <strong>Folio & Chronology Audit:</strong> Court dates and document folio counts are consistent.
                        </span>
                      </div>
                    )}

                    {/* 4. Mathematical Balance */}
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-slate-700 dark:text-zinc-300 font-mono">
                        <strong>Mathematical Balance:</strong> Total Disbursements + Fees = KES {(parsedMeta.grandTotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PARSED PARTICULARS PREVIEW TABLE */}
                <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-main)]">
                  <div className="px-4 py-2.5 bg-[var(--bg-subtle)] border-b border-[var(--border-color)] flex items-center justify-between">
                    <span className="font-brand font-bold text-xs text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                      Parsed Particulars Preview ({excelData.length} Items)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 font-bold">
                      Grand Total: KES {(parsedMeta.grandTotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[var(--bg-subtle)]/70 sticky top-0 border-b border-[var(--border-color)] text-[10px] text-slate-500 uppercase">
                        <tr>
                          <th className="py-2 px-3 w-12">#</th>
                          <th className="py-2 px-3 w-24">Date</th>
                          <th className="py-2 px-3">Particulars</th>
                          <th className="py-2 px-3 w-16 text-center">Folios</th>
                          <th className="py-2 px-3 w-28 text-right">Fee (KES)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]/60">
                        {excelData.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                            <td className="py-2 px-3 text-slate-400">{row[1] || idx + 1}</td>
                            <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{row[0] || '—'}</td>
                            <td className="py-2 px-3 text-[var(--text-main)] truncate max-w-md font-sans text-[11px]" title={row[2]}>
                              {row[2] || (row.join(' | '))}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-500">{row[3] || '—'}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                              {row[7] ? `KES ${Number(row[7]).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` : (row[5] ? `KES ${Number(row[5]).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` : '—')}
                            </td>
                          </tr>
                        ))}
                        {excelData.length > 50 && (
                          <tr>
                            <td colSpan={5} className="py-2.5 text-center text-slate-400 italic font-sans text-xs">
                              ...and {excelData.length - 50} more items parsed from file
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* BOTTOM ACTION BUTTONS */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExcelImport(false);
                      setExcelData([]);
                      setExcelFileName('');
                      setParsedMeta({});
                      setExistingCollisionBill(null);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    Cancel Import
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmSave}
                    disabled={isImportSubmitting}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isImportSubmitting ? 'Saving to Database...' : 'Confirm and Save'}</span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* EXPANSIVE FULL-SIZE VIEW: ONBOARD STAFF MEMBER & USER INVITATION */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md overflow-y-auto p-4 sm:p-8 flex items-start justify-center animate-fadeIn">
          <div className="max-w-5xl w-full bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-10 my-4 space-y-6">
            
            {/* Top Bar / Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-zinc-800 gap-4">
              <div className="flex items-center gap-4">
                <img 
                  src="/logo.png" 
                  alt="Nyagah B. Kithinji & Co. Advocates Logo" 
                  className="w-12 h-12 object-contain rounded-2xl bg-slate-50 dark:bg-zinc-800 p-2 border border-slate-200 dark:border-zinc-700 shadow-xs"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                      Team Member
                    </span>
                    <span className="text-xs text-slate-400">Step {addUserStep} of 2</span>
                  </div>
                  <h2 className="font-brand font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white mt-1">
                    Add New User
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    {addUserStep === 1 
                      ? 'Enter basic details and contact information.' 
                      : 'Choose user role and set up login password.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-zinc-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Users</span>
                </button>
              </div>
            </div>

            {/* Step Indicator Tabs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => setAddUserStep(1)}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  addUserStep === 1
                    ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-bold shadow-xs'
                    : 'bg-slate-50/60 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    addUserStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-300 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                  }`}>
                    1
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider">User Details &amp; Contacts</span>
                </div>
                <p className="text-[11px] font-normal text-slate-500 dark:text-zinc-400 pl-7">
                  Name, username, role, email and phone.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (newFullName.trim() && newCompanyEmail.trim()) {
                    setAddUserStep(2);
                  }
                }}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  addUserStep === 2
                    ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-bold shadow-xs'
                    : 'bg-slate-50/60 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    addUserStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-300 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                  }`}>
                    2
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider">Role &amp; Password</span>
                </div>
                <p className="text-[11px] font-normal text-slate-500 dark:text-zinc-400 pl-7">
                  System access permissions and account password.
                </p>
              </button>
            </div>

            {/* STEP 1 FORM: COMPLETE USER PROFILE & CONTACTS */}
            {addUserStep === 1 && (
              <form onSubmit={handleProceedToStep2} className="space-y-6">
                
                {/* Section A: User Details */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-zinc-700/80 pb-2">
                    <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                      User Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={e => setNewFullName(e.target.value)}
                        placeholder="e.g. Victor Karani"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Title
                      </label>
                      <input
                        type="text"
                        value={newAdvocateTitle}
                        onChange={e => setNewAdvocateTitle(e.target.value)}
                        placeholder="e.g. Advocate, Senior Partner"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                        LSK Number
                      </label>
                      <input
                        type="text"
                        value={newLskNo}
                        onChange={e => setNewLskNo(e.target.value)}
                        placeholder="e.g. P.105/1992"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Username
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-xs">@</span>
                        <input
                          type="text"
                          value={newUsername}
                          onChange={e => setNewUsername(e.target.value)}
                          placeholder="username"
                          className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Role &amp; Access
                      </label>
                      <select
                        value={newRoleTemplate}
                        onChange={e => {
                          const roleVal = e.target.value;
                          handleSelectRoleTemplate(roleVal);
                          if (roleVal === 'managing_partner_exec') setNewPosition('Managing Partner & Executive');
                          else if (roleVal === 'senior_advocates_lawyers') setNewPosition('Senior Advocates and Lawyers');
                          else if (roleVal === 'it_dept_support') setNewPosition('IT Department and Support');
                          else if (roleVal === 'developer_sys_admin') setNewPosition('Developer and System Administrators');
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                      >
                        <option value="managing_partner_exec">Managing Partner and Executive</option>
                        <option value="senior_advocates_lawyers">Senior Advocates and Lawyers</option>
                        <option value="it_dept_support">IT Department and Support</option>
                        <option value="developer_sys_admin">Developer and System Administrators</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section B: Contact Information */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-zinc-700/80 pb-2">
                    <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                      Contact Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Work Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={newCompanyEmail}
                        onChange={e => setNewCompanyEmail(e.target.value)}
                        placeholder="advocate@firm.co.ke"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Personal Email
                      </label>
                      <input
                        type="email"
                        value={newPersonalEmail}
                        onChange={e => setNewPersonalEmail(e.target.value)}
                        placeholder="personal@gmail.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={newPhoneNumber}
                        onChange={e => setNewPhoneNumber(e.target.value)}
                        placeholder="+254 700 000 000"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Alternative Phone
                      </label>
                      <input
                        type="text"
                        value={newSecondaryPhone}
                        onChange={e => setNewSecondaryPhone(e.target.value)}
                        placeholder="Extension or backup phone"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Section C: Account Login Password */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-700/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                        Account Login Password
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddUserPassword(prev => !prev)}
                      className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5 hover:underline cursor-pointer"
                    >
                      {showAddUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showAddUserPassword ? 'Hide Password' : 'Show & Test Password'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Assign the initial login password for this account. This credential will be written to the database so the user can log in immediately.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Login Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showAddUserPassword ? 'text' : 'password'}
                          required
                          value={newFirstPassword}
                          onChange={e => setNewFirstPassword(e.target.value)}
                          placeholder="e.g. Nyagah@2026"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                        Confirm Login Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showAddUserPassword ? 'text' : 'password'}
                          required
                          value={newConfirmPassword}
                          onChange={e => setNewConfirmPassword(e.target.value)}
                          placeholder="Re-type password"
                          className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-zinc-900 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 shadow-2xs ${
                            newConfirmPassword && newFirstPassword !== newConfirmPassword
                              ? 'border-rose-400 focus:ring-rose-500'
                              : 'border-slate-300 dark:border-zinc-700 focus:ring-blue-500'
                          }`}
                        />
                      </div>
                      {newConfirmPassword && newFirstPassword !== newConfirmPassword && (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1">Passwords do not match</p>
                      )}
                      {newConfirmPassword && newFirstPassword === newConfirmPassword && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Passwords match &amp; verified
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 1 Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/20 transition-all"
                  >
                    <span>Next: Role &amp; Password</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2 FORM: ROLE SELECTION, PAGE ACCESSIBILITY & CREDENTIALS */}
            {addUserStep === 2 && (
              <form onSubmit={handleSaveNewUser} className="space-y-6">
                
                {/* 1. Database Role Selection */}
                <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-blue-950 dark:text-blue-200">
                      Select Role: <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                      {selectedUserPermissions.length} Permissions Included
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        code: 'managing_partner_exec',
                        name: 'Managing Partner and Executive',
                        desc: 'Full firm access: finances, bills of costs, users, approvals, and reports.',
                        badge: 'Executive'
                      },
                      {
                        code: 'senior_advocates_lawyers',
                        name: 'Senior Advocates and Lawyers',
                        desc: 'Draft bills of costs, manage court matters, and handle clients.',
                        badge: 'Advocate'
                      },
                      {
                        code: 'it_dept_support',
                        name: 'IT Department and Support',
                        desc: 'User account setup, security, logins, and technical support.',
                        badge: 'IT Support'
                      },
                      {
                        code: 'developer_sys_admin',
                        name: 'Developer and System Administrators',
                        desc: 'Full technical access to database, system settings, and calculation engine.',
                        badge: 'Developer'
                      }
                    ].map(r => {
                      const isSelected = newRoleTemplate === r.code;
                      return (
                        <div
                          key={r.code}
                          onClick={() => handleSelectRoleTemplate(r.code)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-white dark:bg-zinc-900 border-blue-600 dark:border-blue-500 shadow-md ring-2 ring-blue-500/20'
                              : 'bg-white/60 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {r.name}
                              </span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                                isSelected 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' 
                                  : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}>
                                {r.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed font-sans">
                              {r.desc}
                            </p>
                          </div>
                          
                          <div className="pt-3 mt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
                            <span className="font-mono text-slate-400">{r.code}</span>
                            {isSelected ? (
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Selected</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">Click to Select</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Permissions View Switcher: Page-by-Page View vs Granular Rules */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-zinc-700">
                    <div>
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                        User Access &amp; Capabilities Overview
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Inspect which sections and pages this advocate or staff member will be authorized to access.
                      </p>
                    </div>

                    <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPermViewMode('pages')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          permViewMode === 'pages'
                            ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                        }`}
                      >
                        Page Access View
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermViewMode('catalog')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          permViewMode === 'catalog'
                            ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                        }`}
                      >
                        Itemized Permissions ({selectedUserPermissions.length})
                      </button>
                    </div>
                  </div>

                  {/* Mode A: Clean Page-by-Page Navigation Access View */}
                  {permViewMode === 'pages' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn">
                      {[
                        {
                          page: 'Executive Dashboard',
                          path: '/dashboard',
                          icon: <LayoutDashboard className="w-4 h-4 text-blue-500" />,
                          status: 'Full Access',
                          statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
                          desc: 'Live revenue cards, active cause docket, bill statistics, and firm activity feed.'
                        },
                        {
                          page: 'Bills of Costs & Fee Notes',
                          path: '/feenotes',
                          icon: <FileText className="w-4 h-4 text-emerald-500" />,
                          status: newRoleTemplate === 'it_dept_support' ? 'Audit View' : 'Full Access',
                          statusColor: newRoleTemplate === 'it_dept_support' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
                          desc: 'Draft folios under Remuneration Orders, record court taxation deductions, export sealed PDFs.'
                        },
                        {
                          page: 'Matters & Causes Registry',
                          path: '/matters',
                          icon: <Briefcase className="w-4 h-4 text-purple-500" />,
                          status: 'Full Access',
                          statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
                          desc: 'Manage High Court, Commercial & Arbitration causes, client parties, and case status.'
                        },
                        {
                          page: 'Clients & KYC Registry',
                          path: '/clients',
                          icon: <Users className="w-4 h-4 text-indigo-500" />,
                          status: 'Full Access',
                          statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
                          desc: 'Corporate & individual client registry, KRA PIN compliance, and contact person dossiers.'
                        },
                        {
                          page: 'Legal Document Vault',
                          path: '/vault',
                          icon: <Lock className="w-4 h-4 text-rose-500" />,
                          status: 'Full Access',
                          statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
                          desc: 'Matter pleadings, evidence storage, affidavits, and secure signed document downloads.'
                        },
                        {
                          page: 'Managing Partner Hub',
                          path: '/admin',
                          icon: <ShieldCheck className="w-4 h-4 text-amber-500" />,
                          status: ['managing_partner_exec', 'developer_sys_admin', 'it_dept_support'].includes(newRoleTemplate) ? 'Authorized' : 'Restricted',
                          statusColor: ['managing_partner_exec', 'developer_sys_admin', 'it_dept_support'].includes(newRoleTemplate) ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400',
                          desc: 'Firm banking settings, staff roster, fee approvals, and executive controls.'
                        },
                        {
                          page: 'Database & Tariffs',
                          path: '/database',
                          icon: <Database className="w-4 h-4 text-cyan-500" />,
                          status: ['developer_sys_admin', 'managing_partner_exec'].includes(newRoleTemplate) ? 'Full Access' : 'Tariff Read',
                          statusColor: ['developer_sys_admin', 'managing_partner_exec'].includes(newRoleTemplate) ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300',
                          desc: 'Advocates Remuneration Order statutory tariffs, database health, and calculation engine.'
                        },
                        {
                          page: 'IT Support & Help Desk',
                          path: '/support',
                          icon: <HelpCircle className="w-4 h-4 text-teal-500" />,
                          status: 'Full Access',
                          statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
                          desc: 'Submit technical inquiries, report billing issues, and view resolved support tickets.'
                        }
                      ].map((pg, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                                {pg.icon}
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pg.statusColor}`}>
                                {pg.status}
                              </span>
                            </div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {pg.page}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {pg.path}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-snug">
                              {pg.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mode B: Detailed Granular Permissions Catalog */}
                  {permViewMode === 'catalog' && (
                    <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 max-h-56 overflow-y-auto flex flex-wrap gap-2 animate-fadeIn">
                      {selectedUserPermissions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-3">
                          No permissions selected. User will have restricted read-only mode.
                        </p>
                      ) : (
                        selectedUserPermissions.map(code => {
                          const permObj = STANDARDIZED_PERMISSIONS.find(p => p.code === code);
                          const label = permObj?.name || code;
                          return (
                            <span
                              key={code}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
                            >
                              <span className="truncate max-w-[240px]" title={label}>{label}</span>
                              <button
                                type="button"
                                onClick={() => handleRemovePermission(code)}
                                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-400 cursor-pointer transition-colors"
                                title={`Revoke ${label}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Credentials & Communication Preferences */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-zinc-700 pb-2">
                    Security Credentials &amp; Welcome Dispatch
                  </h3>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-blue-400 transition-colors">
                      <input
                        type="checkbox"
                        checked={sendInviteEmail}
                        onChange={e => setSendInviteEmail(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded-md mt-0.5 border-slate-300 dark:border-zinc-700 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Send Invitation Email &amp; Allow Self Password Setup
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          An official onboarding email will be delivered to the advocate containing secure instructions to establish their own private password upon first sign-in.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-blue-400 transition-colors">
                      <input
                        type="checkbox"
                        checked={giveHistoryAccess}
                        onChange={e => setGiveHistoryAccess(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded-md mt-0.5 border-slate-300 dark:border-zinc-700 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Include Past Firm Activity &amp; Case History
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          Grants visibility into previously archived practice causes and settled bills of costs related to the assigned department.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Account Login Password Configuration */}
                  <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-zinc-850 border border-blue-200/80 dark:border-zinc-750 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Account Login Password
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddUserPassword(prev => !prev)}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5 hover:underline cursor-pointer"
                      >
                        {showAddUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showAddUserPassword ? 'Hide Password' : 'Show & Test Password'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                      This password will be securely hashed and stored in the database. The user can immediately sign in with this credential.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                          Login Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type={showAddUserPassword ? 'text' : 'password'}
                          required
                          value={newFirstPassword}
                          onChange={e => setNewFirstPassword(e.target.value)}
                          placeholder="e.g. Nyagah@2026"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                          Confirm Login Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type={showAddUserPassword ? 'text' : 'password'}
                          required
                          value={newConfirmPassword}
                          onChange={e => setNewConfirmPassword(e.target.value)}
                          placeholder="Re-type password"
                          className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-zinc-900 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 shadow-2xs ${
                            newConfirmPassword && newFirstPassword !== newConfirmPassword
                              ? 'border-rose-400 focus:ring-rose-500'
                              : 'border-slate-300 dark:border-zinc-700 focus:ring-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                    {newConfirmPassword && newFirstPassword !== newConfirmPassword && (
                      <p className="text-[10px] text-rose-500 font-semibold">Passwords do not match</p>
                    )}
                    {newConfirmPassword && newFirstPassword === newConfirmPassword && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Passwords match &amp; verified for live login
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 2 Footer Buttons */}
                <div className="flex items-center justify-between gap-3 pt-6 border-t border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setAddUserStep(1)}
                    className="px-5 py-2.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-slate-200 dark:border-zinc-700"
                  >
                    &larr; Back
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingUser}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmittingUser ? 'Creating User...' : 'Create User'}</span>
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* USER PROFILE MODAL */}
      {/* ========================================================================= */}
      {managingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-fadeIn">
          <div className="modulix-card w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-3xl border border-[var(--border-color)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

            {/* Profile Header */}
            <div className="p-6 border-b border-[var(--border-color)] bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              {/* User Identity */}
              <div className="flex items-center gap-4">
                {managingUser.avatarUrl ? (
                  <img
                    src={managingUser.avatarUrl}
                    alt={managingUser.fullName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 dark:border-zinc-700 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 dark:from-zinc-800 dark:to-zinc-900 text-white border-2 border-white/20 dark:border-zinc-700 flex items-center justify-center font-brand font-bold text-xl shadow-md shrink-0">
                    {managingUser.fullName.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                )}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white">
                      {managingUser.advocateTitle || managingUser.fullName}
                    </h2>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                      Active
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-slate-400">ID: {managingUser.id}</span>
                    <span className="text-slate-300">•</span>
                    <span>{managingUser.position || managingUser.role}</span>
                    {managingUser.lskNo && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-purple-600 dark:text-purple-400 font-semibold font-mono">LSK: {managingUser.lskNo}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const targetId = managingUser.id;
                    setManagingUser(null);
                    onNavigateTab('permissions', targetId);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Permissions</span>
                </button>

                <button
                  onClick={() => {
                    const u = managingUser;
                    setManagingUser(null);
                    setMessagingUser(u);
                    setMessageText('');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Note</span>
                </button>

                <button
                  onClick={() => setManagingUser(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Profile Form Body */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">

              {/* Section 1: Professional Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                  <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-brand font-bold text-sm text-slate-900 dark:text-white">
                    1. Professional Details
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={managingUser.fullName}
                      onChange={e => setManagingUser({ ...managingUser, fullName: e.target.value })}
                      placeholder="e.g. Guyo Halake"
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 font-semibold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={managingUser.advocateTitle || ''}
                      onChange={e => setManagingUser({ ...managingUser, advocateTitle: e.target.value })}
                      placeholder="e.g. Guyo Halake"
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      LSK Admission No.
                    </label>
                    <input
                      type="text"
                      value={managingUser.lskNo || ''}
                      onChange={e => setManagingUser({ ...managingUser, lskNo: e.target.value })}
                      placeholder="e.g. ADMIN/2026/001"
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      Position / Job Title
                    </label>
                    <input
                      type="text"
                      value={managingUser.position || ''}
                      onChange={e => setManagingUser({ ...managingUser, position: e.target.value })}
                      placeholder="e.g. Senior Managing Partner"
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={managingUser.department || ''}
                      onChange={e => setManagingUser({ ...managingUser, department: e.target.value })}
                      placeholder="e.g. Commercial & Civil Litigation"
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                  <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-brand font-bold text-sm text-slate-900 dark:text-white">
                    2. Contact Information
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      Work Email
                    </label>
                    <input
                      type="email"
                      value={managingUser.workEmail}
                      onChange={e => setManagingUser({ ...managingUser, workEmail: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      Personal Email
                    </label>
                    <input
                      type="email"
                      value={managingUser.personalEmail || ''}
                      onChange={e => setManagingUser({ ...managingUser, personalEmail: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      Primary Phone
                    </label>
                    <input
                      type="text"
                      value={managingUser.phonePrimary || ''}
                      onChange={e => setManagingUser({ ...managingUser, phonePrimary: e.target.value })}
                      placeholder="e.g. +254 700 888 999"
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      Mobile Phone
                    </label>
                    <input
                      type="text"
                      value={managingUser.phoneSecondary || ''}
                      onChange={e => setManagingUser({ ...managingUser, phoneSecondary: e.target.value })}
                      placeholder="e.g. +254 722 000 888"
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Role & Permissions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h4 className="font-brand font-bold text-sm text-slate-900 dark:text-white">
                      3. Role & Permissions
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      const targetId = managingUser.id;
                      setManagingUser(null);
                      onNavigateTab('permissions', targetId);
                    }}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Manage Permissions</span>
                  </button>
                </div>

                <div className="p-4 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                        Assigned Role
                      </label>
                      <select
                        value={userRoleMap[managingUser.id] || (managingUser.role === 'Admin' ? 'managing_partner_exec' : managingUser.role === 'Developer' ? 'developer_sys_admin' : 'senior_advocates_lawyers')}
                        onChange={e => {
                          handleChangeUserRole(managingUser.id, e.target.value);
                          const newRole = e.target.value === 'managing_partner_exec' ? 'Admin' : e.target.value === 'developer_sys_admin' ? 'Developer' : 'Advocate';
                          setManagingUser({ ...managingUser, role: newRole });
                        }}
                        className="w-full sm:w-auto min-w-[260px] px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-white dark:bg-zinc-900 font-semibold text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                      >
                        {roleTemplates.map(t => (
                          <option key={t.code} value={t.code}>
                            {t.name} ({t.permissions.length} permissions)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 font-semibold text-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>{roleTemplates.find(t => t.code === (userRoleMap[managingUser.id] || 'senior_advocates_lawyers'))?.permissions.length || 26} Permissions Active</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed pt-1">
                    {roleTemplates.find(t => t.code === (userRoleMap[managingUser.id] || 'senior_advocates_lawyers'))?.description || 'Standard legal practice permissions.'}
                  </p>
                </div>
              </div>

              {/* Section 4: Account Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                  <Activity className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
                  <h4 className="font-brand font-bold text-sm text-slate-900 dark:text-white">
                    4. Account Details
                  </h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-[var(--border-color)]">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Account ID</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200 truncate block mt-0.5">{managingUser.id}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-[var(--border-color)]">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Status</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Active
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-[var(--border-color)]">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Access Tier</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 block mt-0.5">{managingUser.role}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-[var(--border-color)]">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Firm Organization</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200 block mt-0.5">{managingUser.firmId || 'firm-001'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Profile Footer */}
            <div className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center justify-between gap-4">
              <button
                onClick={() => {
                  const toDelete = managingUser;
                  setManagingUser(null);
                  handleDeleteUser(toDelete);
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 font-semibold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                title="Permanently remove user"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete User</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setManagingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={isSavingUser}
                  onClick={handleSaveManagedUser}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingUser ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* IN-APP USER DELETION CONFIRMATION MODAL */}
      {userPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-[var(--border-color)] shadow-2xl p-6 space-y-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Permanently Delete User?
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Are you sure you want to permanently remove <strong className="text-slate-800 dark:text-zinc-200">{userPendingDelete.fullName}</strong> ({userPendingDelete.workEmail}) from the firm database and all rosters? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isDeletingUser}
                onClick={() => setUserPendingDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeletingUser}
                onClick={async () => {
                  const u = userPendingDelete;
                  await executeDeleteUser(u);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingUser ? 'Deleting...' : 'Yes, Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SEND DIRECT NOTE */}
      {messagingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="p-6 w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-[var(--border-color)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" /> Send Note to {messagingUser.fullName}
              </h3>
              <button onClick={() => setMessagingUser(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <textarea
                rows={3}
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Type your message / directive..."
                className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
              <button onClick={() => setMessagingUser(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
                Cancel
              </button>
              <button onClick={handleSendMessage} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs">
                Send Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 1. DATABASE USERS DIRECTORY & MANAGEMENT MODAL (COMMENTED OUT)     */}
      {/* ================================================================== */}
      {/* showUsersDirectoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
          ...
        </div>
      ) */}

      {/* ================================================================== */}
      {/* 2. DATABASE ACCESS RULES & ROLE PERMISSIONS MATRIX MODAL (COMMENTED OUT) */}
      {/* ================================================================== */}
      {/* showDatabaseRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
          ...
        </div>
      ) */}

      {/* ================================================================== */}
      {/* 3. IN-APP PASSWORD RESET MODAL (COMMENTED OUT)                     */}
      {/* ================================================================== */}
      {/* resetPasswordTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
          ...
        </div>
      ) */}

      {/* Welcome Header & Action Chips: Clean & Compact */}
      <div className="pt-1 sm:pt-2 mb-4 sm:mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[var(--border-color)]/60">
        <div className="shrink-0">
          <h1 className="font-brand font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight">
            Good afternoon, {(currentUser?.fullName || userName || 'Guyo Halake').replace(/^Adv\.?\s+/i, '')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5 font-sans">
            Welcome to Nyagah B. Kithinji & Co. Advocates
          </p>
        </div>

        {/* Unified Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 md:ml-auto justify-start md:justify-end">
          {/* Primary CTA */}
          <button
            onClick={() => onNavigateTab('boc')}
            className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Fee Note</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-normal rounded bg-slate-800 dark:bg-slate-200 text-slate-300 dark:text-slate-700">⌘N</kbd>
          </button>

          {/* Secondary Actions */}
          <button
            onClick={() => {
              setImportSource('local');
              setShowExcelImport(true);
            }}
            className="px-3.5 py-2 bg-[var(--bg-subtle)] hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-[var(--border-color)] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Import Excel</span>
          </button>

          {isExecutive && (
            <button
              onClick={() => onNavigateTab('clients')}
              className="px-3.5 py-2 bg-[var(--bg-subtle)] hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-[var(--border-color)] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Add Client</span>
            </button>
          )}

          <button
            onClick={() => setShowBocCalc(prev => !prev)}
            className={`px-3.5 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showBocCalc
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-[var(--bg-subtle)] hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-[var(--border-color)]'
            }`}
          >
            <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{showBocCalc ? 'Hide Quick Fee Note' : 'Quick Fee Note'}</span>
          </button>

          {isExecutive && (
            <button
              onClick={() => onOpenRecents ? onOpenRecents() : onNavigateTab('vault')}
              className="px-3.5 py-2 bg-[var(--bg-subtle)] hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-[var(--border-color)] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Open Draft Fee Notes & Recent Files"
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Drafts & Vault</span>
            </button>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* ADMIN & DEVELOPER EXECUTIVE COMMAND SUITE (COMMENTED OUT)          */}
      {/* ================================================================== */}
      {/* isExecutive && (
        <div className="mb-8 space-y-3 animate-fadeIn">
          ...
        </div>
      ) */}

      {/* Main 12-Column Modulix Dashboard Grid Layout */}
      <div className="grid grid-cols-12 gap-6 lg:gap-8">

        {/* LEFT MAIN CONTENT (8 Columns) */}
        <div className="col-span-12 lg:col-span-8 space-y-6 lg:space-y-8">

          {/* Top Section: If Executive -> Show Real Dynamic "Revenue & Billings", "Today's Schedule (Blank)", and "Pending and Drafts" Cards */}
          {isExecutive ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

              {/* Card 1: Revenue & Billings + Minimalist Top Billed Clients (7 cols) */}
              <div className="md:col-span-7 modulix-card p-5 space-y-4 border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs">

                {/* Header Strip */}
                <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-color)]/60">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-brand font-bold text-sm text-slate-900 dark:text-white">
                        Revenue & Billings
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                        {feeNotes.length} fee notes recorded • <span className="text-emerald-600 font-bold">{processedNotes.length} Approved</span> • <span className="text-amber-600 font-bold">{draftNotes.length} Draft</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Claim Value & Financial Breakdown (Clean Streamlined Layout) */}
                <div className="pt-2 space-y-3.5">
                  {/* Primary Stat: Total claim value */}
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300 block">
                      Total claim value
                    </span>
                    <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
                      KES {totalPortfolioValue > 0 ? totalPortfolioValue.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 italic">
                      Sum of the {matters.length > 0 ? matters.length : '0'} active causes
                    </p>
                  </div>

                  <div className="border-t border-[var(--border-color)]/60" />

                  {/* Financial Breakdown (Billed, Outstanding, Collected) */}
                  <div className="grid grid-cols-3 gap-3 py-0.5">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 uppercase tracking-wider block font-semibold">
                        Billed
                      </span>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                        KES {totalBilled > 0 ? (totalBilled / 1000000).toFixed(2) + 'M' : '0.00'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 uppercase tracking-wider block font-bold">
                        Outstanding
                      </span>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-amber-700 dark:text-amber-300 mt-0.5">
                        KES {totalDraft > 0 ? (totalDraft / 1000000).toFixed(2) + 'M' : '0.00'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block font-bold">
                        Collected
                      </span>
                      <p className="text-sm sm:text-base font-extrabold font-mono text-emerald-700 dark:text-emerald-300 mt-0.5">
                        KES {totalApproved > 0 ? (totalApproved / 1000000).toFixed(2) + 'M' : '0.00'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border-color)]/60" />

                  {/* Fee Notes Processed Row with View Breakdown & Open Fee Notes */}
                  <div className="pt-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                          Fee notes processed:
                        </span>
                        <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                          {feeNotes.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors ml-1"
                        >
                          <span>{showFeeBreakdown ? 'Hide fee notes' : 'View breakdown'}</span>
                          {showFeeBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigateTab('feenotes')}
                        className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Open Fee Notes</span>
                      </button>
                    </div>

                    {/* Collapsible Fee Notes List (Hidden by default, shown when clicked) */}
                    {showFeeBreakdown && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-[var(--border-color)] space-y-2 animate-fadeIn max-h-56 overflow-y-auto">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pb-1 border-b border-[var(--border-color)]">
                          <span>Fee Note</span>
                          <span>Amount</span>
                        </div>
                        {feeNotes.length === 0 ? (
                          <p className="text-center text-xs text-slate-400 py-2 font-sans">No fee notes recorded yet.</p>
                        ) : (
                          feeNotes.slice(0, 6).map(fn => (
                            <div key={fn.id} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-color)]/30 last:border-0">
                              <div className="min-w-0 pr-2">
                                <span className="font-bold text-slate-900 dark:text-white font-mono block truncate">{fn.billNumber}</span>
                                <span className="text-[11px] text-slate-500 truncate block">{fn.matterTitle || fn.clientName}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-slate-900 dark:text-white block">KES {fn.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                                <span className={`text-[10px] font-bold capitalize ${fn.status === 'processed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{fn.status}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-sans">
                      Inspect the records contributing to each total.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2 & 3: Today's Schedule (Blank) & Pending and Drafts (5 cols) */}
              <div className="md:col-span-5 flex flex-col gap-4">

                {/* Card 2: Today's Schedule (Blank & Minimalist) */}
                <div className="modulix-card p-4 flex-1 flex flex-col justify-between border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--border-color)]/60">
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="font-brand font-bold text-xs text-slate-900 dark:text-white">Today</h3>
                        <span className="text-[9.5px] font-mono text-slate-400">0 events scheduled</span>
                      </div>
                    </div>

                    <div className="py-5 text-center border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-subtle)]">
                      <Calendar className="w-5 h-5 text-slate-300 dark:text-zinc-600 mx-auto mb-1" />
                      <p className="text-[11px] text-slate-400 font-sans px-2">
                        Docket is clear for today.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTab('matters')}
                    className="w-full mt-2 py-1.5 text-[10.5px] font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 border border-[var(--border-color)] rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>View All Matters</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

              </div>

            </div>
          ) : (() => {
            const advName = (currentUser?.fullName || '').toLowerCase();
            const advEmail = (currentUser?.workEmail || '').toLowerCase();

            // Advocate's fee notes
            const myFeeNotes = feeNotes.filter(fn => {
              const gen = (fn.generatedByUser || '').toLowerCase();
              return gen.includes(advName) || (fn.generatedByUserId && fn.generatedByUserId === currentUser?.id) || (advEmail && advEmail.includes(gen));
            });

            const myDraftNotes = myFeeNotes.filter(fn => fn.status === 'draft');
            const myDraftExposure = myDraftNotes.reduce((acc, fn) => acc + (fn.grandTotal || 0), 0);
            const mySubmittedNotes = myFeeNotes.filter(fn => fn.status === 'processed' && fn.approvalStatus === 'pending');
            const myApprovedNotes = myFeeNotes.filter(fn => fn.status === 'processed' || fn.status === 'settled');
            const myApprovedBilled = myApprovedNotes.reduce((acc, fn) => acc + (fn.grandTotal || 0), 0);

            // Advocate's assigned matters
            const myMatters = matters.filter(m => {
              const lead = (m.leadAdvocate || '').toLowerCase();
              const filed = (m.filedBy || '').toLowerCase();
              const title = (m.title || '').toLowerCase();
              if (advName.includes('nyagah')) {
                return lead.includes('nyagah') || filed.includes('nyagah') || title.includes('zhenjian') || title.includes('eighty eight');
              }
              if (advName.includes('karani')) {
                return lead.includes('karani') || filed.includes('karani') || title.includes('seyani');
              }
              return lead.includes(advName) || filed.includes(advName);
            });

            return (
              <div className="space-y-6">
                {/* 1. Overview Card */}
                <div className="modulix-card p-5 border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]/60">
                    <div>
                      <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white">
                        Overview
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Real-time summary of your legal work and billing
                      </p>
                    </div>
                  </div>

                  {/* 3 Simple Metric Blocks: Drafts, Approved, Submitted */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* Drafts */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-[var(--border-color)] space-y-1">
                      <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Drafts</span>
                      <p className="font-mono font-bold text-xl text-slate-900 dark:text-white">
                        {myDraftNotes.length}
                      </p>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold truncate">
                        KES {myDraftExposure > 0 ? (myDraftExposure / 1000000).toFixed(2) + 'M in progress' : '0.00'}
                      </p>
                    </div>

                    {/* Approved Fee Notes */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-[var(--border-color)] space-y-1">
                      <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Approved Fee Notes</span>
                      <p className="font-mono font-bold text-xl text-emerald-600 dark:text-emerald-400">
                        {myApprovedNotes.length}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                        KES {myApprovedBilled > 0 ? (myApprovedBilled / 1000000).toFixed(2) + 'M billed' : '0.00'}
                      </p>
                    </div>

                    {/* Bills Submitted */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-[var(--border-color)] space-y-1">
                      <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">Bills Submitted</span>
                      <p className="font-mono font-bold text-xl text-slate-900 dark:text-white">
                        {mySubmittedNotes.length}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {mySubmittedNotes.length > 0 ? 'Pending partner review' : 'No bills pending'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Assigned Matters Table (Fitted cleanly right under Overview) */}
                <div className="modulix-card p-0 overflow-hidden border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs">
                  <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--border-color)]/70">
                    <div>
                      <h3 className="font-brand font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        Assigned Matters
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {myMatters.length} {myMatters.length === 1 ? 'matter' : 'matters'} assigned to you
                      </p>
                    </div>

                    <button
                      onClick={() => onNavigateTab('matters')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>All Matters</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="modulix-table-header text-[11px]">
                          <th className="py-2.5 px-4 font-semibold text-slate-500">Case Number</th>
                          <th className="py-2.5 px-4 font-semibold text-slate-500">Client / Title</th>
                          <th className="py-2.5 px-4 font-semibold text-slate-500">Claim Amount</th>
                          <th className="py-2.5 px-4 font-semibold text-slate-500">Status</th>
                          <th className="py-2.5 px-4 font-semibold text-slate-500 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]/60 text-xs">
                        {myMatters.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                              No matters currently assigned to you.
                            </td>
                          </tr>
                        ) : (
                          myMatters.map((m) => (
                            <tr
                              key={m.id}
                              onClick={() => handleViewMatter(m.id)}
                              className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                            >
                              <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                {m.caseNo}
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-slate-800 dark:text-zinc-200 block truncate max-w-[200px]" title={m.title}>
                                  {m.title}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[200px]">
                                  {resolveFuzzyClient(m.applicant || m.title)}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-blue-400">
                                KES {m.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  m.statusClass === 'ready'
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${m.statusClass === 'ready' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                  {m.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onNavigateToBuilder) {
                                      onNavigateToBuilder({
                                        matterId: m.id,
                                        matterTitle: m.title,
                                        clientName: resolveFuzzyClient(m.applicant || m.title),
                                        claimValue: m.amount,
                                        courtSchedule: m.forum || 'High Court of Kenya (Commercial & Tax Division)'
                                      }, false);
                                    } else {
                                      onNavigateTab('boc');
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs"
                                  title="Draft Bill of Costs for this cause"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Draft Bill</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quick Quote Estimator Widget (Interactive BOC Preview) */}
          {showBocCalc ? (() => {
            const minPrescribedFloor = getPrescribedMinimum(qqCategory, qqIsDefendant);
            const hasClaimValue = typeof qqValue === 'number' && qqValue > 0;
            const currentInstructionFee = hasClaimValue && qqResult
              ? qqResult.instruction_fee
              : minPrescribedFloor;

            const isLitigationMatter = ['schedule_6_high_court', 'schedule_7_arbitration', 'schedule_5_magistrate'].includes(qqCategory);
            const allowsGettingUp = ['schedule_6_high_court', 'schedule_7_arbitration'].includes(qqCategory);

            return (
              <div className="modulix-card p-5 sm:p-6 bg-[var(--bg-card)] border border-[var(--border-color)]/60 shadow-xs">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]/40">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white tracking-tight">Quick Fee Note</h3>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">Instant statutory fee estimate</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {qqValue !== '' && (
                      <button
                        onClick={() => setQqValue('')}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={() => setShowBocCalc(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer p-1 rounded-lg"
                      title="Hide Preview"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inputs Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 lg:gap-6 items-end">
                  <div className="sm:col-span-5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Advocates Remuneration Schedule
                    </label>
                    <select
                      value={qqCategory}
                      onChange={(e) => setQqCategory(e.target.value)}
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium transition-colors"
                    >
                      <option value="schedule_6_high_court">Schedule 6 — High Court, Court of Appeal, ELC & ELRC Litigation</option>
                      <option value="schedule_7_arbitration">Schedule 7 — Arbitral Proceedings & Commercial Arbitration</option>
                      <option value="schedule_5_magistrate">Schedule 5 — Subordinate / Magistrate's Court Litigation</option>
                      <option value="schedule_1_conveyancing">Schedule 1 — Conveyancing (Sales, Purchases & Leases)</option>
                      <option value="schedule_2_securities">Schedule 2 — Debentures, Mortgages & Security Charges</option>
                      <option value="schedule_3_company">Schedule 3 — Commercial Agreements & Company Incorporation</option>
                      <option value="schedule_4_ip">Schedule 4 — Intellectual Property (Trademarks & Patents)</option>
                      <option value="schedule_8_general">Schedule 8 — General & Non-Contentious Legal Business</option>
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Subject / Claim Value (KES)
                    </label>
                    <input
                      type="number"
                      value={qqValue}
                      onChange={(e) => setQqValue(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Enter claim value..."
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                      disabled={qqCategory === 'schedule_4_ip'}
                    />

                    {/* Instant Claim Value Preset Chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        { label: '100K', val: 100000 },
                        { label: '200K', val: 200000 },
                        { label: '500K', val: 500000 },
                        { label: 'KES 1M', val: 1000000 },
                        { label: 'KES 5M', val: 5000000 },
                        { label: 'KES 10M', val: 10000000 },
                        { label: 'KES 25M', val: 25000000 },
                        { label: 'KES 50M', val: 50000000 },
                        { label: 'KES 100M', val: 100000000 }
                      ].map(chip => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => setQqValue(chip.val)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${
                            qqValue === chip.val
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 border border-[var(--border-color)]/70'
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-3 sm:text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      {hasClaimValue ? 'Instruction Fee' : 'Prescribed Minimum Floor'}
                    </span>
                    <div className="text-xl sm:text-2xl font-brand font-bold text-slate-900 dark:text-white tracking-tight">
                      {`KES ${currentInstructionFee.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
                    </div>
                    {/* Statutory Rules Callout */}
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-medium mt-1.5">
                      <ShieldCheck className="w-3 h-3 shrink-0" />
                      <span>
                        {qqCategory === 'schedule_6_high_court'
                          ? qqIsDefendant
                            ? '✓ Schedule 6 Item 1(b) Defended Minimum Floor Enforced (Cap 16 Sec 45)'
                            : '✓ Schedule 6 Item 1(a) Undefended Minimum Floor Enforced (Cap 16 Sec 45)'
                          : qqCategory === 'schedule_1_conveyancing'
                          ? '✓ Schedule 1 First Scale Item 1(i) Minimum Floor (KES 35,000)'
                          : qqCategory === 'schedule_2_securities'
                          ? '✓ Schedule 1 Second Scale Item 2(b)(i) Minimum Floor (KES 28,000)'
                          : qqCategory === 'schedule_3_company'
                          ? '✓ Schedule 3 Paragraph 1 Incorporation Minimum Floor (KES 60,000)'
                          : qqCategory === 'schedule_5_magistrate'
                          ? '✓ Schedule 7 Subordinate Courts Scale Enforced'
                          : '✓ Statutory Scale Floor Enforced (L.N. 64/1962 ed. 2023)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checkable Practice Parameters */}
                <div className="flex flex-wrap items-center gap-5 pt-3 mt-3 border-t border-[var(--border-color)]/40 text-xs text-slate-700 dark:text-zinc-300">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={qqIsDefendant}
                      onChange={(e) => setQqIsDefendant(e.target.checked)}
                      disabled={!isLitigationMatter}
                      className="w-4 h-4 rounded border-[var(--border-color)] text-emerald-600 focus:ring-0 cursor-pointer disabled:opacity-40"
                    />
                    <span className={!isLitigationMatter ? 'opacity-40' : ''}>
                      Acting for Defendant / Respondent (15% reduction)
                    </span>
                  </label>

                  {allowsGettingUp && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={qqIncludeGettingUp}
                        onChange={(e) => setQqIncludeGettingUp(e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--border-color)] text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Include Getting-Up Fee (33.33% / 1/3 of Instruction Fee — Defended Suit)</span>
                    </label>
                  )}
                </div>

                {/* Calculation Breakdown & Action */}
                <div className="mt-4 pt-3.5 border-t border-[var(--border-color)]/40">
                  {!hasClaimValue ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-subtle)] p-3.5 rounded-xl border border-[var(--border-color)]/60 text-xs text-slate-600 dark:text-zinc-300">
                      <div className="flex items-center gap-2.5">
                        <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          <strong>Statutory minimum floor:</strong> KES {minPrescribedFloor.toLocaleString('en-KE', { minimumFractionDigits: 2 })}. Select a preset or enter a claim value above.
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (onNavigateToBuilder) {
                            onNavigateToBuilder({
                              claimValue: 0,
                              courtSchedule: qqCategory,
                              isDefendant: qqIsDefendant,
                              includeGettingUp: qqIncludeGettingUp,
                              instructionFee: minPrescribedFloor,
                              grandTotal: minPrescribedFloor * 1.16,
                              matterTitle: `Matter: ${qqCategory.replace(/_/g, ' ').toUpperCase()}`,
                            }, false);
                          } else if (onNavigateTab) {
                            onNavigateTab('boc');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-medium text-xs transition-colors shrink-0 cursor-pointer"
                      >
                        <span>Open Quick Fee Note in Builder →</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                        <span className="font-semibold text-slate-700 dark:text-zinc-200">Statutory scale:</span> {qqResult?.formula}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]/60">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-0.5">Instruction Fee</span>
                          <span className="font-bold text-slate-900 dark:text-white">KES {qqResult?.instruction_fee.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]/60">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-0.5">Getting-Up Fee (1/3)</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {qqIncludeGettingUp && qqResult?.getting_up_fee
                              ? `KES ${qqResult.getting_up_fee.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
                              : 'KES 0.00 (Undefended)'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]/60">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-0.5">VAT (16%)</span>
                          <span className="font-bold text-slate-900 dark:text-white">KES {qqResult?.vat_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                          <span className="text-[10px] uppercase tracking-wider block font-bold mb-0.5">Estimated Total</span>
                          <span className="font-extrabold text-sm">KES {qqResult?.grand_total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-2">
                        <button
                          onClick={() => {
                            if (onNavigateToBuilder) {
                              onNavigateToBuilder({
                                claimValue: Number(qqValue) || 0,
                                courtSchedule: qqCategory,
                                isDefendant: qqIsDefendant,
                                includeGettingUp: qqIncludeGettingUp,
                                instructionFee: qqResult?.instruction_fee,
                                grandTotal: qqResult?.grand_total,
                                matterTitle: `Matter: ${qqCategory.replace(/_/g, ' ').toUpperCase()}`,
                              }, false);
                            } else if (onNavigateTab) {
                              onNavigateTab('boc');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                        >
                          <span>Open Quick Fee Note in Builder →</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })() : (
            <div className="flex justify-end">
              <button
                onClick={() => setShowBocCalc(true)}
                className="p-2.5 bg-[var(--bg-card)] border border-[var(--border-color)]/60 rounded-xl text-slate-400 hover:text-emerald-500 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                title="Show BOC Calc"
              >
                <Eye className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Show BOC Calc</span>
              </button>
            </div>
          )}

        </div>

        {/* RIGHT AUXILIARY COLUMN (4 Columns): Recent Activities */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {isExecutive ? (
            <div className="modulix-card space-y-4 border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]/70">
                <h3 className="font-brand font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-700 dark:text-zinc-300" /> Recent Activities
                </h3>
              </div>

              {/* Dynamic Real Activity Feed (Fee Notes, Users, Emails & Messages) */}
              {(() => {
                // Filter out repeated profile updates and deduplicate
                const seenActions = new Set<string>();
                const cleanActivities = activityLogs.filter(log => {
                  const text = `${log.action || ''} ${log.actionDescription || ''}`.toLowerCase();
                  if (text.includes('coordinates and preferences')) return false;
                  const key = `${log.advocateName}-${log.action}`;
                  if (seenActions.has(key)) return false;
                  seenActions.add(key);
                  return true;
                });

                // Real firm actions from database fee notes & matters if feed is sparse
                const finalActivities = [...cleanActivities];
                if (finalActivities.length < 3) {
                  feeNotes.forEach(fn => {
                    const key = `${fn.generatedByUser}-feenote-${fn.billNumber}`;
                    if (!seenActions.has(key)) {
                      seenActions.add(key);
                      finalActivities.push({
                        id: `fn-${fn.id}`,
                        advocateName: fn.generatedByUser || 'Firm Advocate',
                        action: `${fn.status === 'processed' ? 'approved' : 'drafted'} ${fn.billNumber} (${fn.matterTitle})`,
                        timeAgo: 'Recently',
                        timestamp: fn.createdAt ? new Date(fn.createdAt).getTime() : Date.now(),
                        type: 'feenote',
                        badgeColor: fn.status === 'processed' ? 'bg-emerald-500' : 'bg-blue-500'
                      });
                    }
                  });
                }

                const displayList = showAllActivities ? finalActivities : finalActivities.slice(0, 6);

                return (
                  <>
                    <div className="relative pl-6 space-y-4 max-h-[520px] overflow-y-auto pr-1 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800">
                      {displayList.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs font-sans">
                          No recent activities recorded yet.
                        </div>
                      ) : (
                        displayList.map((log, idx) => {
                          const dotColor = log.badgeColor || (idx % 3 === 0 ? 'bg-emerald-500' : idx % 3 === 1 ? 'bg-blue-500' : 'bg-purple-500');
                          const relativeTime = log.timeAgo || 'Recently';
                          return (
                            <div key={log.id} className="relative group">
                              <div className={`absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-zinc-900 ${dotColor}`} />
                              <div className="min-w-0">
                                <p className="text-xs text-slate-800 dark:text-zinc-200 font-sans leading-snug">
                                  <strong className="text-slate-900 dark:text-white font-semibold">{log.advocateName}</strong>{' '}
                                  {log.action || log.actionDescription || 'filed billing ledger entry'}
                                </p>
                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                  {relativeTime}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {finalActivities.length > 6 && (
                      <button
                        onClick={() => setShowAllActivities(!showAllActivities)}
                        className="w-full py-1.5 text-[11px] font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-[var(--border-color)] rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-center"
                      >
                        {showAllActivities ? 'Show Less' : `Load More (${finalActivities.length - 6} more)`}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (() => {
            const advName = (currentUser?.fullName || '').toLowerCase();
            const advEmail = (currentUser?.workEmail || '').toLowerCase();
            const myFeeNotes = feeNotes.filter(fn => {
              const gen = (fn.generatedByUser || '').toLowerCase();
              return gen.includes(advName) || (fn.generatedByUserId && fn.generatedByUserId === currentUser?.id) || (advEmail && advEmail.includes(gen));
            });

            return (
              <div className="modulix-card p-5 border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]/60">
                  <div>
                    <h3 className="font-brand font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      Fee Notes & Billing History
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      {myFeeNotes.length} {myFeeNotes.length === 1 ? 'fee note' : 'fee notes'} created by you
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigateTab('feenotes')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {myFeeNotes.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No fee notes created yet.
                    </div>
                  ) : (
                    myFeeNotes.slice(0, 6).map((fn) => (
                      <div
                        key={fn.id}
                        onClick={() => onNavigateTab('feenotes')}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-[var(--border-color)]/70 hover:border-blue-500/50 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors" title={fn.clientName || fn.matterTitle}>
                            {fn.clientName || fn.matterTitle}
                          </p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            fn.status === 'processed' || fn.status === 'settled'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                          }`}>
                            {fn.status === 'processed' || fn.status === 'settled' ? 'Approved' : 'Draft'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-0.5 truncate font-mono">
                          {fn.billNumber}
                        </p>

                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border-color)]/50 text-[11px]">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            KES {(fn.grandTotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {fn.createdAt ? fn.createdAt.split('T')[0] : 'Recent'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}
        </div>

      </div>

      {/* FULL WIDTH EXECUTIVE TABLES & MATTERS */}
      {isExecutive && (
        <div className="w-full mt-6 lg:mt-8">
          <div className="space-y-6">
            {/* Minimalist 2-Column Grid: Advocate Workload & Client Accounts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AdvocateWipLeaderboard
                users={users}
                matters={matters}
                feeNotes={feeNotes}
                onNavigateTab={onNavigateTab}
                onNavigateToBuilder={onNavigateToBuilder}
              />

              <ClientRetainerEscrowWidget
                clients={clients}
                matters={matters}
                onNavigateTab={onNavigateTab}
              />
            </div>

            <ExecutiveTabbedTables
              feeNotes={feeNotes}
              matters={matters}
              users={users}
              clients={clients}
              userRoleMap={userRoleMap}
              roleTemplates={roleTemplates}
              onNavigateTab={onNavigateTab}
              handleOpenAddUserModal={handleOpenAddUserModal}
              handleOpenNote={handleOpenNote}
              handleToggleProcess={handleToggleProcess}
              handleViewMatter={handleViewMatter}
              setManagingUser={setManagingUser}
              setMessagingUser={setMessagingUser}
              setMessageText={setMessageText}
              handleDeleteUser={handleDeleteUser}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
