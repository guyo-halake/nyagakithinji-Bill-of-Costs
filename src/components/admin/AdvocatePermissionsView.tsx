import React, { useState, useEffect } from 'react';
import { SystemUser } from '../../services/supabase';
import { fetchFirmUsers } from '../../services/data';
import { logSystemActivity } from '../../services/activityLogger';
import { showToast } from './ToastNotification';
import {
  Lock, ShieldCheck, CheckCircle2, Save, Users, Key, Search,
  Clock, Shield, Eye, AlertTriangle, ChevronDown, RefreshCw, Briefcase, FileText, Database,
  Layers, Check, Sparkles, Folder, HelpCircle, ArrowRight, Plus, Trash2, Edit3, Copy, X,
  Sliders, Calendar, UserCheck, ShieldAlert, CheckSquare, Square, Info, AlertOctagon, Terminal,
  User, MessageSquare, Home, BookOpen, Mail
} from 'lucide-react';
import { MailingTemplatesView } from './MailingTemplatesView';
import { AdminUsersRolesView } from './AdminUsersRolesView';
import {
  RoleTemplate,
  fetchRoleTemplates,
  saveRoleTemplateToDb,
  assignRoleToUser,
  setUserPermissionOverride,
  deleteUserOverride,
  resetUserOverrides,
  fetchUserOverrides,
  fetchPermissionCatalog,
  savePermissionCatalogItem,
  deletePermissionCatalogItem,
  calculateEffectivePermissions,
  STANDARDIZED_PERMISSIONS,
  PermissionCatalogItem,
  RoleTemplateCode,
  PermissionScope,
  SystemResource,
  UserPermissionOverride,
  UserEffectivePermission,
  RiskLevel,
  getLocalUserRoleAssignments
} from '../../services/rbac';

const ROLE_COLORS: Record<string, string> = {
  'managing_partner_exec': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  'senior_advocates_lawyers': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'finance_billing_mgr': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  'legal_assistant_intern': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  'it_dept_support': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  'developer_sys_admin': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20'
};

const RISK_BADGES: Record<RiskLevel, { bg: string; text: string; border: string; icon: any }> = {
  Standard: {
    bg: 'bg-slate-100 dark:bg-zinc-800',
    text: 'text-slate-600 dark:text-zinc-400',
    border: 'border-slate-200 dark:border-zinc-700',
    icon: ShieldCheck
  },
  Elevated: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    icon: AlertTriangle
  },
  Critical: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    icon: AlertOctagon
  }
};

const RESOURCE_ICONS: Record<string, any> = {
  dashboard: Home,
  boc_builder: FileText,
  feenotes: FileText,
  matters: Briefcase,
  clients: Users,
  vault: Folder,
  managing_hub: ShieldCheck,
  permissions: Lock,
  remuneration_guide: BookOpen,
  settings: Sliders,
  support: HelpCircle,
  database: Database,
  profile: User,
  system: Database,
  all: Layers,
};

interface AdvocatePermissionsViewProps {
  currentUser?: SystemUser | null;
  initialUserId?: string;
}

export const AdvocatePermissionsView: React.FC<AdvocatePermissionsViewProps> = ({ currentUser, initialUserId }) => {
  // Navigation Tabs: 'staff' | 'users' | 'templates' | 'mailings' | 'catalog'
  const [activeTab, setActiveTab] = useState<'staff' | 'users' | 'templates' | 'mailings' | 'catalog'>(initialUserId ? 'staff' : 'staff');

  // Core Data State
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionCatalogItem[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [firmUsers, setFirmUsers] = useState<SystemUser[]>([]);
  const [userRoleMap, setUserRoleMap] = useState<Record<string, string>>({});
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId || '');
  const [userOverrides, setUserOverrides] = useState<UserPermissionOverride[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<string>('all');

  // Dropdowns & Modals
  const [userSelectDropdownOpen, setUserSelectDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const [editingTemplate, setEditingTemplate] = useState<RoleTemplate | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplateData, setNewTemplateData] = useState<{
    code: string;
    name: string;
    description: string;
    permissions: { code: string; scope: PermissionScope }[];
  }>({
    code: '',
    name: '',
    description: '',
    permissions: []
  });

  // Permission Catalog Modals
  const [editingPermission, setEditingPermission] = useState<PermissionCatalogItem | null>(null);
  const [isCreatingPermission, setIsCreatingPermission] = useState(false);
  const [newPermissionData, setNewPermissionData] = useState<PermissionCatalogItem>({
    code: '',
    resource: 'matters',
    action: '',
    name: '',
    description: '',
    allowedScopes: ['Assigned', 'Firm'],
    riskLevel: 'Standard',
    targetComponent: '',
    isCustom: true
  });

  // Override Modals
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean;
    permissionCode: string;
    effect: 'grant' | 'deny';
    scope: PermissionScope;
    reason: string;
    expiresAt: string;
  }>({
    isOpen: false,
    permissionCode: 'feenotes.approve',
    effect: 'grant',
    scope: 'Firm',
    reason: '',
    expiresAt: ''
  });

  const [showManageOverridesModal, setShowManageOverridesModal] = useState(false);

  // Global Fee Notes Ledger Visibility Policy State
  const [feeNotesScope, setFeeNotesScope] = useState<'all' | 'self'>(() => {
    return (localStorage.getItem('FEE_NOTES_VISIBILITY_SCOPE') as 'all' | 'self') || 'all';
  });

  useEffect(() => {
    const handleScopeChange = (e: any) => {
      if (e.detail) {
        setFeeNotesScope(e.detail);
      }
    };
    window.addEventListener('feeNotesVisibilityChanged', handleScopeChange);
    return () => window.removeEventListener('feeNotesVisibilityChanged', handleScopeChange);
  }, []);

  const handleSetFeeNotesScope = (scope: 'all' | 'self') => {
    setFeeNotesScope(scope);
    localStorage.setItem('FEE_NOTES_VISIBILITY_SCOPE', scope);
    window.dispatchEvent(new CustomEvent('feeNotesVisibilityChanged', { detail: scope }));
    logSystemActivity(
      currentUser?.id || 'admin',
      'POLICY_CHANGE',
      'Advocate Fee Notes Access Policy',
      `Policy set to ${scope === 'all' ? 'Allow All Fee Notes (Full firm ledger visible)' : 'Allow Self Only (Restricted to self-drafted notes)'}`
    );
    showToast(
      'success',
      scope === 'all' ? 'All Fee Notes Allowed' : 'Self Only Policy Active',
      scope === 'all' 
        ? 'Advocates can now view the entire firm fee notes ledger.'
        : 'Advocates are now restricted to seeing only their own fee notes.'
    );
  };

  // Load all initial data
  const loadAllData = async () => {
    try {
      const [catalog, templates, users] = await Promise.all([
        fetchPermissionCatalog(),
        fetchRoleTemplates(),
        fetchFirmUsers(currentUser?.firmId || 'firm-001')
      ]);
      setPermissionCatalog(catalog);
      setRoleTemplates(templates);
      setFirmUsers(users);

      const localRoleMap = getLocalUserRoleAssignments();
      const initialMap: Record<string, string> = { ...localRoleMap };
      users.forEach(u => {
        if (!initialMap[u.id]) {
          if (u.role === 'Developer') initialMap[u.id] = 'developer_sys_admin';
          else if (u.role === 'Admin') initialMap[u.id] = 'managing_partner_exec';
          else initialMap[u.id] = 'senior_advocates_lawyers';
        }
      });
      setUserRoleMap(initialMap);

      if (users.length > 0 && !selectedUserId) {
        setSelectedUserId(initialUserId || users[0].id);
      }
    } catch (e) {
      console.error('Error loading RBAC data:', e);
    }
  };

  useEffect(() => {
    void loadAllData();
  }, [currentUser?.firmId]);

  // Load user overrides when selected user changes
  useEffect(() => {
    if (!selectedUserId) return;
    const loadOverrides = async () => {
      const ovrs = await fetchUserOverrides(selectedUserId);
      setUserOverrides(ovrs);
    };
    void loadOverrides();
  }, [selectedUserId]);

  const selectedUser = firmUsers.find(u => u.id === selectedUserId) || firmUsers[0];
  const selectedUserRoleCode = selectedUser ? (userRoleMap[selectedUser.id] || 'senior_advocates_lawyers') : 'senior_advocates_lawyers';
  const selectedUserTemplate = roleTemplates.find(t => t.code === selectedUserRoleCode) || roleTemplates[0] || {
    id: 'tpl-default',
    code: 'senior_advocates_lawyers',
    name: 'Senior Advocates and Lawyers',
    description: '',
    isSystem: true,
    permissions: []
  };

  // Calculate effective permissions for selected user
  const effectivePermissions: UserEffectivePermission[] = selectedUserTemplate
    ? calculateEffectivePermissions(selectedUserTemplate, userOverrides, permissionCatalog)
    : [];

  // 1-Click Role Template Assignment
  const handleAssignRoleTemplate = async (templateCode: string) => {
    if (!selectedUser) return;
    const targetTemplate = roleTemplates.find(t => t.code === templateCode);
    if (!targetTemplate) return;

    setUserRoleMap(prev => ({ ...prev, [selectedUser.id]: templateCode }));
    setRoleDropdownOpen(false);

    await assignRoleToUser(selectedUser.id, targetTemplate.id, currentUser?.id);
    showToast('success', 'Role Template Updated', `Assigned "${targetTemplate.name}" to ${selectedUser.fullName}.`);
    logSystemActivity(
      currentUser?.fullName || 'Managing Partner',
      `assigned role template "${targetTemplate.name}" to ${selectedUser.fullName}`,
      'permission',
      'bg-blue-500'
    );
  };

  // Live Checkbox Toggle on User's Permission Table
  const handleToggleUserPermission = async (permCode: string, currentlyGranted: boolean) => {
    if (!selectedUser) return;

    const templateHasIt = selectedUserTemplate.permissions.some(p => p.code === permCode);

    if (currentlyGranted) {
      if (templateHasIt) {
        await setUserPermissionOverride(
          selectedUser.id,
          permCode,
          'deny',
          'Firm',
          'Explicitly revoked by Managing Partner',
          null,
          currentUser?.id
        );
        const ovrs = await fetchUserOverrides(selectedUser.id);
        setUserOverrides(ovrs);
        showToast('info', 'Permission Revoked', `Explicit DENY override applied for ${permCode}.`);
      } else {
        await deleteUserOverride(selectedUser.id, permCode);
        const ovrs = await fetchUserOverrides(selectedUser.id);
        setUserOverrides(ovrs);
        showToast('info', 'Override Removed', `Reverted ${permCode} to template default.`);
      }
    } else {
      if (!templateHasIt) {
        await setUserPermissionOverride(
          selectedUser.id,
          permCode,
          'grant',
          'Firm',
          'Explicitly granted by Managing Partner',
          null,
          currentUser?.id
        );
        const ovrs = await fetchUserOverrides(selectedUser.id);
        setUserOverrides(ovrs);
        showToast('success', 'Permission Granted', `Explicit GRANT override applied for ${permCode}.`);
      } else {
        await deleteUserOverride(selectedUser.id, permCode);
        const ovrs = await fetchUserOverrides(selectedUser.id);
        setUserOverrides(ovrs);
        showToast('success', 'Override Removed', `Restored ${permCode} from template.`);
      }
    }
  };

  // Save Explicit Override from Modal
  const handleSaveExplicitOverride = async () => {
    if (!selectedUser || !overrideModal.permissionCode) return;
    if (!overrideModal.reason.trim()) {
      showToast('error', 'Reason Required', 'Please enter a justification for this security override.');
      return;
    }

    await setUserPermissionOverride(
      selectedUser.id,
      overrideModal.permissionCode,
      overrideModal.effect,
      overrideModal.scope,
      overrideModal.reason.trim(),
      overrideModal.expiresAt ? new Date(overrideModal.expiresAt).toISOString() : null,
      currentUser?.id
    );

    const ovrs = await fetchUserOverrides(selectedUser.id);
    setUserOverrides(ovrs);
    setOverrideModal(prev => ({ ...prev, isOpen: false, reason: '', expiresAt: '' }));
    showToast('success', 'Override Applied', `Explicit ${overrideModal.effect.toUpperCase()} override recorded.`);
  };

  // Delete Single Override
  const handleDeleteOverride = async (permissionCode: string) => {
    if (!selectedUser) return;
    await deleteUserOverride(selectedUser.id, permissionCode);
    const ovrs = await fetchUserOverrides(selectedUser.id);
    setUserOverrides(ovrs);
    showToast('info', 'Override Cleared', `Reverted ${permissionCode} to template default.`);
  };

  // Reset All Overrides for Selected User
  const handleResetOverrides = async () => {
    if (!selectedUser) return;
    await resetUserOverrides(selectedUser.id);
    setUserOverrides([]);
    setShowManageOverridesModal(false);
    showToast('success', 'Overrides Reset', `All explicit overrides cleared. ${selectedUser.fullName} restored to template defaults.`);
  };

  // Save Template (Edit / Create)
  const handleSaveTemplate = async (templateToSave: RoleTemplate) => {
    await saveRoleTemplateToDb(templateToSave);
    const updated = await fetchRoleTemplates();
    setRoleTemplates(updated);
    setEditingTemplate(null);
    setIsCreatingTemplate(false);
    showToast('success', 'Role Template Saved', `Template "${templateToSave.name}" updated with ${templateToSave.permissions.length} capabilities.`);
  };

  // Save Edited or Created Permission in Catalog
  const handleSaveCatalogPermission = async (perm: PermissionCatalogItem) => {
    if (!perm.name.trim() || !perm.code.trim()) {
      showToast('error', 'Required Fields', 'Permission Code and Name cannot be empty.');
      return;
    }
    await savePermissionCatalogItem(perm);
    const updatedCatalog = await fetchPermissionCatalog();
    setPermissionCatalog(updatedCatalog);
    setEditingPermission(null);
    setIsCreatingPermission(false);
    showToast('success', 'Permission Catalog Updated', `Capability "${perm.name}" (${perm.code}) saved.`);
    logSystemActivity(
      currentUser?.fullName || 'Managing Partner',
      `updated permission definition for "${perm.code}"`,
      'permission',
      'bg-purple-500'
    );
  };

  // Delete Custom Permission from Catalog
  const handleDeleteCatalogPermission = async (code: string) => {
    await deletePermissionCatalogItem(code);
    const updatedCatalog = await fetchPermissionCatalog();
    setPermissionCatalog(updatedCatalog);
    setEditingPermission(null);
    showToast('info', 'Permission Deleted', `Removed ${code} from catalog.`);
  };

  // Filtered Effective Permissions
  const filteredEffectivePermissions = effectivePermissions.filter(p => {
    const matchesRes = selectedResource === 'all' || p.resource === selectedResource;
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRes && matchesSearch;
  });

  // Filtered Catalog Items
  const filteredCatalog = permissionCatalog.filter(item => {
    const matchesRes = selectedResource === 'all' || item.resource === selectedResource;
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.targetComponent && item.targetComponent.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRes && matchesSearch;
  });

  return (
    <div className="space-y-5 text-slate-900 dark:text-white font-sans pb-16">

      {/* Fee Notes Access Policy Banner ("Allow All Fee Notes" vs. "Allow Self Only") */}
      <div className="bg-gradient-to-r from-blue-900/20 via-zinc-900 to-indigo-900/20 border border-blue-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Fee Notes Access Policy</span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                feeNotesScope === 'all'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}>
                {feeNotesScope === 'all' ? '● Firm-Wide: All Fee Notes Allowed' : '● Restricted: Self Only Allowed'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              {feeNotesScope === 'all'
                ? 'Allow All Fee Notes: Advocates see the entire firm\'s fee notes ledger across all matters and counsel.'
                : 'Allow Self Only: Restricts advocates so they can only see fee notes they drafted themselves.'}
            </p>
          </div>
        </div>

        {/* Dedicated Policy Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-100 dark:bg-zinc-950/80 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => handleSetFeeNotesScope('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              feeNotesScope === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800/80'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Allow All Fee Notes</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetFeeNotesScope('self')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              feeNotesScope === 'self'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-bold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800/80'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Allow Self Only</span>
          </button>
        </div>
      </div>

      {/* Minimalist Modern Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-color)]/60">

        {/* Switchable Tabs: Permissions, Role Templates, Mailing Templates */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800/70 rounded-xl w-fit flex-wrap">
          {[
            { id: 'staff' as const, label: 'Permissions Matrix', icon: ShieldCheck, count: firmUsers.length },
            { id: 'users' as const, label: 'Users & Roles', icon: Users, count: firmUsers.length },
            { id: 'templates' as const, label: 'Role Templates', icon: Layers, count: roleTemplates.length },
            { id: 'mailings' as const, label: 'Mailing Templates', icon: Mail, count: 6 },
            { id: 'catalog' as const, label: 'System Catalog', icon: Key, count: permissionCatalog.length },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${isActive
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${isActive
                    ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white'
                    : 'bg-slate-200/60 dark:bg-zinc-700/60 text-slate-500'
                  }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Action Bar: Minimalist User Dropdown + Search */}
        <div className="flex items-center gap-2.5">

          {/* Minimalist User Select Dropdown (Visible on Staff tab) */}
          {activeTab === 'staff' && (
            <div className="relative">
              <button
                onClick={() => setUserSelectDropdownOpen(!userSelectDropdownOpen)}
                className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-xl text-slate-800 dark:text-zinc-200 hover:border-blue-500 flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-bold">{selectedUser?.fullName || 'Select a User'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {userSelectDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 p-1.5 z-50 bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-2xl shadow-2xl space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 py-1 font-bold">
                    Select Staff Member
                  </div>
                  {firmUsers.map(u => {
                    const isSelected = u.id === selectedUser?.id;
                    const rCode = userRoleMap[u.id] || 'senior_advocates_lawyers';
                    const tpl = roleTemplates.find(t => t.code === rCode);
                    const rColor = ROLE_COLORS[rCode] || 'bg-slate-500/10 text-slate-600 border-slate-500/20';

                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUserId(u.id);
                          setUserSelectDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs cursor-pointer transition-colors flex items-center gap-2.5 ${isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200'
                          }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-[10.5px] shrink-0 border border-[var(--border-color)]">
                          {u.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{u.fullName}</div>
                          <div className="text-[10px] text-slate-400 truncate">{u.workEmail}</div>
                          <div className="mt-0.5">
                            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono border ${rColor}`}>
                              {tpl?.name || u.role}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Search Bar (Hidden when editing Mailing Templates) */}
          {activeTab !== 'mailings' && (
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search permissions, codes..."
                className="pl-8 pr-3 py-1.5 text-xs font-mono w-48 sm:w-56 bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: USERS & ROLES VIEW (ADMINISTRATION & ROSTER CONTROLS) */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="pt-2">
          <AdminUsersRolesView />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ROLE TEMPLATES STUDIO */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-4">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-brand font-bold text-base text-slate-900 dark:text-white">
                Role Templates
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Archetypes packaging statutory rights and system capabilities.
              </p>
            </div>

            <button
              onClick={() => {
                setNewTemplateData({
                  code: 'custom_role_' + Math.random().toString(36).substring(2, 6),
                  name: '',
                  description: '',
                  permissions: []
                });
                setIsCreatingTemplate(true);
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Create Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roleTemplates.map(template => {
              const roleColor = ROLE_COLORS[template.code] || 'bg-slate-500/10 text-slate-600 border-slate-500/20';
              const assignedUsers = firmUsers.filter(u => userRoleMap[u.id] === template.code);
              const isPlatformRoot = template.code === 'developer_sys_admin';

              const resourceCounts: Record<string, number> = {};
              template.permissions.forEach(p => {
                const prefix = p.code.split('.')[0];
                resourceCounts[prefix] = (resourceCounts[prefix] || 0) + 1;
              });

              return (
                <div
                  key={template.id || template.code}
                  className="p-4 space-y-3 border border-[var(--border-color)] rounded-2xl bg-white dark:bg-zinc-900 flex flex-col justify-between hover:border-blue-500/40 transition-all shadow-xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold border ${roleColor}`}>
                        {template.code}
                      </span>
                      <span className="text-[10.5px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Users className="w-3 h-3" /> {assignedUsers.length} Staff
                      </span>
                    </div>

                    <div>
                      <h3 className="font-brand font-bold text-sm text-slate-900 dark:text-white">
                        {template.name}
                      </h3>
                      <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 font-sans mt-0.5 leading-relaxed min-h-[32px]">
                        {template.description || 'Standard firm role template defining statutory and case workflow capabilities.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-color)]/60 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                        <span>Capabilities Granted:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {template.permissions.length} / {permissionCatalog.length}
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isPlatformRoot ? 'bg-cyan-500' : 'bg-blue-600'}`}
                          style={{ width: `${Math.min(100, Math.round((template.permissions.length / Math.max(1, permissionCatalog.length)) * 100))}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-1 pt-1">
                        {(['matters', 'feenotes', 'vault', 'clients', 'managing_hub', 'support'] as SystemResource[]).map(res => {
                          const count = resourceCounts[res] || 0;
                          const ResIcon = (res && RESOURCE_ICONS[res]) || FileText;
                          return (
                            <div
                              key={res}
                              className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono flex items-center justify-between border ${count > 0
                                  ? 'bg-slate-50 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border-[var(--border-color)]/60'
                                  : 'bg-transparent text-slate-400 border-dashed border-slate-200 dark:border-zinc-800'
                                }`}
                            >
                              <span className="flex items-center gap-1 capitalize">
                                <ResIcon className="w-2.5 h-2.5 text-slate-400" /> {res.replace('_', ' ')}
                              </span>
                              <span className="font-bold">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[var(--border-color)]/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="flex-1 py-1.5 px-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Template
                    </button>

                    <button
                      onClick={() => {
                        const copy: RoleTemplate = {
                          ...template,
                          id: 'tpl-' + Math.random().toString(36).substring(2, 7),
                          code: template.code + '_copy',
                          name: template.name + ' (Copy)',
                          isSystem: false
                        };
                        void handleSaveTemplate(copy);
                      }}
                      title="Clone Template"
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl border border-[var(--border-color)] hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STAFF PERMISSIONS & OVERRIDES */}
      {/* ========================================================================= */}
      {activeTab === 'staff' && (
        <div className="space-y-4">

          {/* Minimalist Modern User Control Strip */}
          {selectedUser && (
            <div className="py-2 px-1 space-y-4 border-b border-[var(--border-color)]/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                {/* User Summary Info */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white border border-[var(--border-color)] flex items-center justify-center font-brand font-bold text-sm shadow-xs shrink-0">
                    {selectedUser.fullName.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white">
                        {selectedUser.advocateTitle || selectedUser.fullName}
                      </h3>
                      <span className="text-[9.5px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                        Active Account
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono flex items-center gap-2 flex-wrap">
                      <span>{selectedUser.workEmail}</span>
                      <span className="text-slate-300">•</span>
                      <span>{selectedUser.position || selectedUser.role}</span>
                    </div>
                  </div>
                </div>

                {/* Role Template Dropdown & Quick Actions */}
                <div className="flex items-center gap-2.5 flex-wrap">

                  {/* Change Role Template Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                      className="px-3.5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-90 transition-opacity"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Role: {selectedUserTemplate.name}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {roleDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-72 p-1.5 z-40 bg-white dark:bg-zinc-900 border border-[var(--border-color)] rounded-2xl shadow-2xl space-y-1">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 py-1 font-bold">
                          Assign Base Role Template
                        </div>
                        {roleTemplates.map(t => (
                          <button
                            key={t.code}
                            onClick={() => handleAssignRoleTemplate(t.code)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${selectedUserRoleCode === t.code
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                                : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{t.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">{t.permissions.length} perms</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Explicit Override Button */}
                  <button
                    onClick={() => setOverrideModal({
                      isOpen: true,
                      permissionCode: 'feenotes.approve',
                      effect: 'grant',
                      scope: 'Firm',
                      reason: '',
                      expiresAt: ''
                    })}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Override
                  </button>

                  {/* Manage Overrides */}
                  <button
                    onClick={() => setShowManageOverridesModal(true)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer border transition-colors ${userOverrides.length > 0
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 border-transparent'
                      }`}
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Overrides ({userOverrides.length})</span>
                  </button>

                  {/* Reset to Defaults */}
                  {userOverrides.length > 0 && (
                    <button
                      onClick={handleResetOverrides}
                      title="Clear all overrides for this user"
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Minimalist Metrics Strip */}
              <div className="flex items-center gap-5 pt-3 border-t border-[var(--border-color)]/40 text-xs flex-wrap">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="font-medium">Base Template Rights:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedUserTemplate.permissions.length} Permissions
                  </span>
                </div>

                <span className="text-slate-300">•</span>

                <div className="flex items-center gap-2 text-slate-500">
                  <span className="font-medium">Explicit Overrides:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    +{userOverrides.filter(o => o.effect === 'grant').length} Grants / -{userOverrides.filter(o => o.effect === 'deny').length} Denials
                  </span>
                </div>

                <span className="text-slate-300">•</span>

                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <span className="font-medium">Effective Active Access:</span>
                  <span className="font-mono font-bold">
                    {effectivePermissions.filter(p => p.isGranted).length} / {permissionCatalog.length} Allowed
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Resource Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Capabilities' },
              { id: 'dashboard', label: '1.1 Dashboard' },
              { id: 'boc_builder', label: '1.2 BOC Builder' },
              { id: 'feenotes', label: '1.3 Fee Notes' },
              { id: 'matters', label: '1.4 My Matters' },
              { id: 'clients', label: '1.5 My Clients' },
              { id: 'vault', label: '1.6 Document Vault' },
              { id: 'managing_hub', label: '2.1 Executive Hub' },
              { id: 'permissions', label: '2.2 Permissions' },
              { id: 'remuneration_guide', label: '3.1 Remuneration Guide' },
              { id: 'settings', label: '3.2 Firm Settings' },
              { id: 'support', label: '3.3 Support & Help' },
              { id: 'database', label: '4. Database & System' },
            ].map(res => {
              const count = res.id === 'all'
                ? effectivePermissions.length
                : effectivePermissions.filter(p => p.resource === res.id).length;
              return (
                <button
                  key={res.id}
                  onClick={() => setSelectedResource(res.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer shrink-0 border ${selectedResource === res.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                      : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-[var(--border-color)] hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                >
                  {res.label} <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Permissions Table */}
          <div className="overflow-hidden border border-[var(--border-color)] rounded-2xl bg-white dark:bg-zinc-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70 dark:bg-zinc-800/50">
                    <th className="py-2.5 px-4 w-12 text-center">Status</th>
                    <th className="py-2.5 px-4">Permission Name & Code</th>
                    <th className="py-2.5 px-4">Resource</th>
                    <th className="py-2.5 px-4">Scope</th>
                    <th className="py-2.5 px-4">Authorization Source</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]/60 font-sans">
                  {filteredEffectivePermissions.map(perm => {
                    const ResIcon = RESOURCE_ICONS[perm.resource] || Key;
                    const hasExplicitOverride = perm.overrideEffect !== undefined;
                    const isGranted = perm.isGranted;
                    const risk = perm.riskLevel || 'Standard';
                    const riskStyle = RISK_BADGES[risk];

                    return (
                      <tr
                        key={perm.code}
                        className={`hover:bg-slate-50/70 dark:hover:bg-zinc-800/30 transition-colors ${hasExplicitOverride ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                          }`}
                      >
                        {/* Status Checkbox */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleUserPermission(perm.code, isGranted)}
                            className="cursor-pointer p-0.5 rounded focus:outline-none"
                            title={isGranted ? "Click to Revoke / Deny" : "Click to Grant"}
                          >
                            {isGranted ? (
                              <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300 dark:text-zinc-600 hover:text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* Name, Code & Impact */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {perm.name}
                            </span>
                            {risk !== 'Standard' && (
                              <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold border ${riskStyle.bg} ${riskStyle.text} ${riskStyle.border}`}>
                                {risk}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                            {perm.code}
                          </div>
                          <div className="text-[11px] text-slate-500 font-sans mt-0.5 max-w-md">
                            {perm.description}
                          </div>
                        </td>

                        {/* Resource */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                            <ResIcon className="w-2.5 h-2.5" />
                            {perm.resource}
                          </span>
                        </td>

                        {/* Scope */}
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border ${perm.scope === 'Platform' ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' :
                              perm.scope === 'Firm' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' :
                                perm.scope === 'Assigned' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' :
                                  'bg-slate-100 dark:bg-zinc-800 text-slate-600 border-slate-200'
                            }`}>
                            {perm.scope}
                          </span>
                        </td>

                        {/* Source / Override Details */}
                        <td className="py-3 px-4">
                          {perm.overrideEffect === 'grant' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200">
                              🟢 Explicit Grant
                            </span>
                          ) : perm.overrideEffect === 'deny' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200">
                              🔴 Explicit Deny
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500">
                              <ShieldCheck className="w-3 h-3 text-slate-400" /> Template
                            </span>
                          )}
                        </td>

                        {/* Quick Action */}
                        <td className="py-3 px-4 text-right">
                          {hasExplicitOverride ? (
                            <button
                              onClick={() => handleDeleteOverride(perm.code)}
                              className="px-2 py-1 text-[10px] font-mono text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded cursor-pointer transition-colors"
                            >
                              Clear Override
                            </button>
                          ) : (
                            <button
                              onClick={() => setOverrideModal({
                                isOpen: true,
                                permissionCode: perm.code,
                                effect: isGranted ? 'deny' : 'grant',
                                scope: perm.scope,
                                reason: '',
                                expiresAt: ''
                              })}
                              className="px-2 py-1 text-[10px] font-mono text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 rounded cursor-pointer transition-colors"
                            >
                              Override
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SYSTEM PERMISSION GLOBAL CATALOG */}
      {/* ========================================================================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-brand font-bold text-base text-slate-900 dark:text-white">
                Standardized Permissions Catalog ({permissionCatalog.length})
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Comprehensive dictionary of all security capabilities and operational hooks.
              </p>
            </div>

            <button
              onClick={() => {
                setNewPermissionData({
                  code: 'matters.custom_action_' + Math.random().toString(36).substring(2, 6),
                  resource: 'matters',
                  action: '',
                  name: '',
                  description: '',
                  allowedScopes: ['Assigned', 'Firm'],
                  riskLevel: 'Standard',
                  targetComponent: '',
                  isCustom: true
                });
                setIsCreatingPermission(true);
              }}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Create Permission
            </button>
          </div>

          {/* Catalog Resource Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Capabilities' },
              { id: 'dashboard', label: '1.1 Dashboard' },
              { id: 'boc_builder', label: '1.2 BOC Builder' },
              { id: 'feenotes', label: '1.3 Fee Notes' },
              { id: 'matters', label: '1.4 My Matters' },
              { id: 'clients', label: '1.5 My Clients' },
              { id: 'vault', label: '1.6 Document Vault' },
              { id: 'managing_hub', label: '2.1 Executive Hub' },
              { id: 'permissions', label: '2.2 Permissions' },
              { id: 'remuneration_guide', label: '3.1 Remuneration Guide' },
              { id: 'settings', label: '3.2 Firm Settings' },
              { id: 'support', label: '3.3 Support & Help' },
              { id: 'database', label: '4. Database & System' },
            ].map(res => {
              const count = res.id === 'all'
                ? permissionCatalog.length
                : permissionCatalog.filter(p => p.resource === res.id).length;
              return (
                <button
                  key={res.id}
                  onClick={() => setSelectedResource(res.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer shrink-0 border ${selectedResource === res.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                      : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-[var(--border-color)] hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                >
                  {res.label} <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden border border-[var(--border-color)] rounded-2xl bg-white dark:bg-zinc-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70 dark:bg-zinc-800/50">
                    <th className="py-2.5 px-5">Permission Code</th>
                    <th className="py-2.5 px-4">Resource</th>
                    <th className="py-2.5 px-4">Display Name & Real Impact</th>
                    <th className="py-2.5 px-4">Safety / Risk</th>
                    <th className="py-2.5 px-4">Allowed Scopes</th>
                    <th className="py-2.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]/60 font-sans">
                  {filteredCatalog.map(item => {
                    const ResIcon = (item.resource && RESOURCE_ICONS[item.resource]) || Key;
                    const risk = item.riskLevel || 'Standard';
                    const riskStyle = RISK_BADGES[risk] || RISK_BADGES['Standard'];
                    const RiskIcon = (riskStyle && riskStyle.icon) || ShieldCheck;

                    return (
                      <tr key={item.code} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-5 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {item.code}
                          {item.isCustom && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200">
                              Custom
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                            <ResIcon className="w-3 h-3" />
                            {item.resource}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-sm">
                          <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">{item.description}</div>
                          {item.targetComponent && (
                            <div className="text-[9.5px] font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                              <Terminal className="w-2.5 h-2.5" /> Hook: {item.targetComponent}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${riskStyle.bg} ${riskStyle.text} ${riskStyle.border}`}>
                            <RiskIcon className="w-2.5 h-2.5" />
                            {risk}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.allowedScopes.map(scope => (
                              <span key={scope} className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                                {scope}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <button
                            onClick={() => setEditingPermission(item)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MAILING TEMPLATES STUDIO */}
      {/* ========================================================================= */}
      {activeTab === 'mailings' && (
        <MailingTemplatesView showSmtpBanner={false} />
      )}

      {/* MODAL: EDIT PERMISSION */}
      {editingPermission && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="p-6 w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl border border-[var(--border-color)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white">
                  Edit Permission: {editingPermission.code}
                </h3>
              </div>
              <button
                onClick={() => setEditingPermission(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Human-Friendly Display Name:
                </label>
                <input
                  type="text"
                  value={editingPermission.name}
                  onChange={e => setEditingPermission({ ...editingPermission, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Plain-English Description & Real-World Impact:
                </label>
                <textarea
                  rows={2}
                  value={editingPermission.description}
                  onChange={e => setEditingPermission({ ...editingPermission, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Safety / Risk Classification:
                  </label>
                  <select
                    value={editingPermission.riskLevel || 'Standard'}
                    onChange={e => setEditingPermission({ ...editingPermission, riskLevel: e.target.value as RiskLevel })}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Elevated">Elevated</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Target UI Hook / API Endpoint:
                  </label>
                  <input
                    type="text"
                    value={editingPermission.targetComponent || ''}
                    onChange={e => setEditingPermission({ ...editingPermission, targetComponent: e.target.value })}
                    placeholder="e.g. MatterDetailsView.tsx"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Allowed Scopes:
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  {(['Own', 'Assigned', 'Firm', 'Platform'] as PermissionScope[]).map(sc => {
                    const checked = editingPermission.allowedScopes.includes(sc);
                    return (
                      <label key={sc} className="flex items-center gap-1.5 text-xs font-mono cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const newScopes = e.target.checked
                              ? [...editingPermission.allowedScopes, sc]
                              : editingPermission.allowedScopes.filter(s => s !== sc);
                            setEditingPermission({ ...editingPermission, allowedScopes: newScopes });
                          }}
                          className="rounded text-blue-600"
                        />
                        <span>{sc}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              {editingPermission.isCustom ? (
                <button
                  onClick={() => handleDeleteCatalogPermission(editingPermission.code)}
                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingPermission(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSaveCatalogPermission(editingPermission)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" /> Save Permission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CUSTOM PERMISSION */}
      {isCreatingPermission && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="p-6 w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl border border-[var(--border-color)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white">
                    Create Custom Permission
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsCreatingPermission(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    System Resource:
                  </label>
                  <select
                    value={newPermissionData.resource}
                    onChange={e => {
                      const res = e.target.value as SystemResource;
                      setNewPermissionData({
                        ...newPermissionData,
                        resource: res,
                        code: `${res}.${newPermissionData.action || 'custom_action'}`
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="matters">Matters (Litigation / Cases)</option>
                    <option value="feenotes">Fee Notes (Billing / BOC)</option>
                    <option value="vault">Vault (Documents / Pleadings)</option>
                    <option value="clients">Clients (KYC / Entities)</option>
                    <option value="database">Database (Scales / Tariffs)</option>
                    <option value="profile">Profile (Security / Staff)</option>
                    <option value="support">Support (Helpdesk / Alerts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Action Slug:
                  </label>
                  <input
                    type="text"
                    value={newPermissionData.action}
                    onChange={e => {
                      const act = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                      setNewPermissionData({
                        ...newPermissionData,
                        action: act,
                        code: `${newPermissionData.resource}.${act}`
                      });
                    }}
                    placeholder="e.g. request_taxation_hearing"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Full Permission Code:
                </label>
                <input
                  type="text"
                  value={newPermissionData.code}
                  readOnly
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-100 dark:bg-zinc-800/60 font-mono text-xs font-bold text-blue-600 dark:text-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Human-Friendly Display Name:
                </label>
                <input
                  type="text"
                  value={newPermissionData.name}
                  onChange={e => setNewPermissionData({ ...newPermissionData, name: e.target.value })}
                  placeholder="e.g. Request Formal Court Taxation Hearing"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Detailed Operational Impact:
                </label>
                <textarea
                  rows={2}
                  value={newPermissionData.description}
                  onChange={e => setNewPermissionData({ ...newPermissionData, description: e.target.value })}
                  placeholder="Authorize advocate to submit itemized Bill of Costs directly to the High Court / Deputy Registrar for taxation."
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => setIsCreatingPermission(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSaveCatalogPermission(newPermissionData)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" /> Register Permission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD OVERRIDE */}
      {overrideModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="p-6 w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-[var(--border-color)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white">
                  Add Permission Override
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Target: {selectedUser?.fullName}
                </p>
              </div>
              <button
                onClick={() => setOverrideModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Select Permission:
                </label>
                <select
                  value={overrideModal.permissionCode}
                  onChange={e => setOverrideModal(prev => ({ ...prev, permissionCode: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  {permissionCatalog.map(p => (
                    <option key={p.code} value={p.code}>
                      [{p.resource.toUpperCase()}] {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Override Effect:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOverrideModal(prev => ({ ...prev, effect: 'grant' }))}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border ${overrideModal.effect === 'grant'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 border-transparent'
                        }`}
                    >
                      <Check className="w-3.5 h-3.5" /> GRANT
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverrideModal(prev => ({ ...prev, effect: 'deny' }))}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border ${overrideModal.effect === 'deny'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 border-transparent'
                        }`}
                    >
                      <X className="w-3.5 h-3.5" /> DENY
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Effective Scope:
                  </label>
                  <select
                    value={overrideModal.scope}
                    onChange={e => setOverrideModal(prev => ({ ...prev, scope: e.target.value as PermissionScope }))}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Own">Own</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Firm">Firm</option>
                    <option value="Platform">Platform</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Justification Reason:
                </label>
                <input
                  type="text"
                  value={overrideModal.reason}
                  onChange={e => setOverrideModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Lead counsel approval for High Court Arbitration matter #ARB/2026"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => setOverrideModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExplicitOverride}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" /> Save Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE OVERRIDES */}
      {showManageOverridesModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="p-6 w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl border border-[var(--border-color)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white">
                  Active Overrides for {selectedUser?.fullName}
                </h3>
              </div>
              <button
                onClick={() => setShowManageOverridesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userOverrides.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No active overrides.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {userOverrides.map(ovr => (
                  <div
                    key={ovr.id || ovr.permissionCode}
                    className="p-3 rounded-xl border border-[var(--border-color)] bg-slate-50/70 dark:bg-zinc-800/40 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${ovr.effect === 'grant'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          }`}>
                          {ovr.effect.toUpperCase()}
                        </span>
                        <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                          {ovr.permissionCode}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {ovr.reason || 'Managing partner override'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteOverride(ovr.permissionCode)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                      title="Delete Override"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              {userOverrides.length > 0 && (
                <button
                  onClick={handleResetOverrides}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3 h-3" /> Reset All to Defaults
                </button>
              )}
              <button
                onClick={() => setShowManageOverridesModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ROLE TEMPLATE */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="p-6 w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl border border-[var(--border-color)] shadow-2xl space-y-4 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white">
                  Edit Role Template: {editingTemplate.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingTemplate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-2 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Template Name:
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Description:
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.description}
                    onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    Capabilities ({editingTemplate.permissions.length} / {permissionCatalog.length} Selected)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingTemplate({
                        ...editingTemplate,
                        permissions: permissionCatalog.map(p => ({ code: p.code, scope: 'Firm' }))
                      })}
                      className="text-[10.5px] font-mono text-blue-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => setEditingTemplate({
                        ...editingTemplate,
                        permissions: []
                      })}
                      className="text-[10.5px] font-mono text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-[var(--border-color)] rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-800/30 max-h-72 overflow-y-auto">
                  {permissionCatalog.map(p => {
                    const isChecked = editingTemplate.permissions.some(perm => perm.code === p.code);
                    const currentScope = editingTemplate.permissions.find(perm => perm.code === p.code)?.scope || 'Firm';

                    return (
                      <div
                        key={p.code}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${isChecked
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-zinc-900 border-[var(--border-color)]/60 text-slate-500'
                          }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) {
                                setEditingTemplate({
                                  ...editingTemplate,
                                  permissions: [...editingTemplate.permissions, { code: p.code, scope: currentScope }]
                                });
                              } else {
                                setEditingTemplate({
                                  ...editingTemplate,
                                  permissions: editingTemplate.permissions.filter(perm => perm.code !== p.code)
                                });
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                          <div className="truncate">
                            <div className="font-bold text-[11px] truncate">{p.name}</div>
                            <div className="text-[9.5px] font-mono text-slate-400 truncate">{p.code}</div>
                          </div>
                        </label>

                        {isChecked && (
                          <select
                            value={currentScope}
                            onChange={e => {
                              const newScope = e.target.value as PermissionScope;
                              setEditingTemplate({
                                ...editingTemplate,
                                permissions: editingTemplate.permissions.map(perm => perm.code === p.code ? { ...perm, scope: newScope } : perm)
                              });
                            }}
                            className="p-1 rounded text-[9.5px] font-mono border border-[var(--border-color)] bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                          >
                            <option value="Own">Own</option>
                            <option value="Assigned">Assigned</option>
                            <option value="Firm">Firm</option>
                            <option value="Platform">Platform</option>
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSaveTemplate(editingTemplate)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" /> Save Template
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdvocatePermissionsView;
