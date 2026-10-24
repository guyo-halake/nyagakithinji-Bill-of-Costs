import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Scale,
  FileText,
  Briefcase,
  Users,
  FolderLock,
  BookOpen,
  Settings,
  HelpCircle,
  X,
  ChevronDown,
  ChevronRight,
  Lock,
  CreditCard,
  MessageSquare,
  Plus,
  FilePlus,
  UserPlus,
  UploadCloud,
  Calculator,
  Pin,
  Trash2,
  Check,
  Mail,
  Database
} from 'lucide-react';

import { SystemUser, getFeeNotes, getMatters, getClients } from '../../services/supabase';
import { hasPermission } from '../../services/rbac';

export interface PinnedItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'matter' | 'feenote' | 'client';
}

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentUser?: SystemUser | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  sidebarOpen,
  setSidebarOpen,
  currentUser,
  onLogout
}) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [feeNotesCount, setFeeNotesCount] = useState<number>(() => getFeeNotes().length);
  const [, setPermissionTick] = useState(0);

  // Dynamic Pinned Items loaded from localStorage (No hardcoding)
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>(() => {
    try {
      const saved = localStorage.getItem('KARANI_PINNED_WORKSPACE_ITEMS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const pinModalRef = useRef<HTMLDivElement>(null);

  const can = (code: string) => hasPermission(currentUser, code);

  const [firmSettings, setFirmSettings] = useState(() => {
    const saved = localStorage.getItem('BILLSZIP_FIRM_SETTINGS');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return { topbarTitle: '', topbarSubtitle: 'Advocates of the High Court of Kenya', logoUrl: '/logo.png' };
  });

  // Save pinned items to localStorage
  const savePinnedItems = (items: PinnedItem[]) => {
    setPinnedItems(items);
    try {
      localStorage.setItem('KARANI_PINNED_WORKSPACE_ITEMS', JSON.stringify(items));
    } catch (e) {}
  };

  const handleAddPin = (item: PinnedItem) => {
    if (!pinnedItems.some(p => p.id === item.id)) {
      savePinnedItems([...pinnedItems, item]);
    }
    setShowPinModal(false);
  };

  const handleRemovePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    savePinnedItems(pinnedItems.filter(p => p.id !== id));
  };

  // Keyboard navigation shortcuts: Alt+1 to Alt+7
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            handleSelect('home');
            break;
          case '2':
            e.preventDefault();
            handleSelect('feenotes');
            break;
          case '3':
            e.preventDefault();
            handleSelect('boc');
            break;
          case '4':
            e.preventDefault();
            handleSelect('matters');
            break;
          case '5':
            e.preventDefault();
            handleSelect('clients');
            break;
          case '6':
            e.preventDefault();
            handleSelect('vault');
            break;
          case '7':
            e.preventDefault();
            handleSelect('guide');
            break;
          case '8':
            e.preventDefault();
            handleSelect('payments');
            break;
          case '9':
            e.preventDefault();
            handleSelect('messages');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close pin modal on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pinModalRef.current && !pinModalRef.current.contains(e.target as Node)) {
        setShowPinModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time firm settings and fee notes synchronization
  useEffect(() => {
    const handleSettingsChange = () => {
      const saved = localStorage.getItem('BILLSZIP_FIRM_SETTINGS');
      if (saved) {
        try { setFirmSettings(JSON.parse(saved)); } catch(e) {}
      }
    };
    const handleFeeNotes = () => {
      setFeeNotesCount(getFeeNotes().length);
    };
    const handlePermissions = () => {
      setPermissionTick(t => t + 1);
    };

    window.addEventListener('firmSettingsChanged', handleSettingsChange);
    window.addEventListener('feeNotesUpdated', handleFeeNotes);
    window.addEventListener('permissionsUpdated', handlePermissions);
    window.addEventListener('storage', handlePermissions);
    window.addEventListener('storage', handleFeeNotes);

    return () => {
      window.removeEventListener('firmSettingsChanged', handleSettingsChange);
      window.removeEventListener('feeNotesUpdated', handleFeeNotes);
      window.removeEventListener('permissionsUpdated', handlePermissions);
      window.removeEventListener('storage', handlePermissions);
      window.removeEventListener('storage', handleFeeNotes);
    };
  }, []);

  const handleSelect = (id: string) => {
    setCurrentTab(id);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Primary Operations
  const primaryNavItems = [
    {
      id: 'home',
      label: 'Dashboard',
      icon: Home,
      iconColor: 'text-slate-600 dark:text-slate-400',
      shortcut: 'Alt+1',
      permission: 'dashboard.view'
    },
    {
      id: 'feenotes',
      label: 'Fee Notes',
      icon: Scale,
      iconColor: 'text-amber-600 dark:text-amber-400',
      shortcut: 'Alt+2',
      badge: feeNotesCount,
      permission: 'feenotes.view'
    },
    {
      id: 'boc',
      label: 'Create Fee Note',
      icon: FileText,
      iconColor: 'text-blue-600 dark:text-blue-400',
      shortcut: 'Alt+3',
      permission: 'boc.view'
    },
    {
      id: 'matters',
      label: 'Matters',
      icon: Briefcase,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      shortcut: 'Alt+4',
      permission: 'matters.view'
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Users,
      iconColor: 'text-teal-600 dark:text-teal-400',
      shortcut: 'Alt+5',
      permission: 'clients.view'
    },
    {
      id: 'vault',
      label: 'Documents',
      icon: FolderLock,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      shortcut: 'Alt+6',
      permission: 'vault.view'
    },
    {
      id: 'guide',
      label: 'Scale Guide',
      icon: BookOpen,
      iconColor: 'text-purple-600 dark:text-purple-400',
      shortcut: 'Alt+7',
      permission: 'guide.view'
    },
  ];

  // Controls Navigation
  const controlNavItems = [
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      iconColor: 'text-slate-600 dark:text-slate-400',
      permission: 'settings.view'
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: Lock,
      iconColor: 'text-rose-600 dark:text-rose-400',
      permission: 'permissions.view',
      adminOnly: true
    },
    {
      id: 'support',
      label: 'Support',
      icon: HelpCircle,
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      permission: 'support.view'
    }
  ];

  // Dedicated Admin & Developer Suite Navigation (Visible strictly to Admin and Developer)
  const adminDevNavItems = [
    {
      id: 'mailings',
      label: 'Mailings & Dispatch',
      icon: Mail,
      iconColor: 'text-amber-500'
    },
    {
      id: 'database_studio',
      label: 'Database Studio',
      icon: Database,
      iconColor: 'text-blue-500'
    }
  ];

  // Available candidate items for the Pin Picker Modal
  const availableMatters = getMatters();
  const availableFeeNotes = getFeeNotes();
  const availableClients = getClients();

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 transition-opacity lg:hidden"
        />
      )}

      {/* Main Sidebar Shell: Fixed on Desktop, Slide-out on Mobile */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 w-64 bg-white dark:bg-[#0d131f] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between z-50 lg:z-10 transition-transform duration-300 ease-in-out shrink-0 shadow-xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          
          {/* Logo Header (Dropped down a bit, bigger logo, NO "Kithinji and Co" name, just tagline) */}
          <div className="flex flex-col items-center text-center pt-3 pb-3 border-b border-slate-100 dark:border-slate-800/80 relative">
            <div className="py-1">
              <img
                src={firmSettings.logoUrl || '/logo.png'}
                alt="Law Firm Crest"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/logo.png';
                }}
                className="h-16 sm:h-20 max-w-[200px] w-auto object-contain mx-auto transition-transform hover:scale-105"
              />
            </div>
            <p className="text-[11px] font-serif font-medium text-slate-500 dark:text-slate-400 mt-1 tracking-wide">
              Advocates of the High Court of Kenya
            </p>

            {/* Mobile Close Button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-0 top-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-md lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Operations Navigation Section */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operations
            </div>

            {primaryNavItems.map(item => {
              if (item.permission && !can(item.permission)) return null;
              const Icon = item.icon;
              const isSelected = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  title={`${item.label} (${item.shortcut})`}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-xs border-l-4 border-blue-600 dark:border-blue-500'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white dark:text-slate-900' : item.iconColor}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isSelected
                          ? 'bg-blue-500/20 text-blue-200 dark:text-blue-700'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {item.shortcut && (
                      <kbd className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                        isSelected
                          ? 'bg-slate-800 text-slate-300 dark:bg-slate-200 dark:text-slate-700'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400'
                      }`}>
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Pinned Matters Section (NO hardcoding; interactive pin picker) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Pinned Matters</span>
              <button
                onClick={() => setShowPinModal(true)}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                title="Pin a Matter, Bill of Costs or Client"
              >
                <Plus className="w-3 h-3" />
                <span>Pin</span>
              </button>
            </div>
            
            {pinnedItems.length === 0 ? (
              <button
                onClick={() => setShowPinModal(true)}
                className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center justify-between text-xs cursor-pointer"
              >
                <span>Pin a Matter or Bill of Costs</span>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ) : (
              pinnedItems.slice(0, 4).map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'matter') handleSelect('matters');
                    else if (item.type === 'feenote') handleSelect('feenotes');
                    else handleSelect('clients');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      item.type === 'matter' ? 'bg-indigo-500' : item.type === 'feenote' ? 'bg-amber-500' : 'bg-teal-500'
                    }`} />
                    <div className="truncate">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-[10px] font-mono text-slate-400 truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleRemovePin(e, item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                    title="Unpin"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Controls & Management Section (Executive Hub has NO icon as requested) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Controls
            </div>

            {controlNavItems.map(item => {
              if (item.adminOnly && !(can(item.permission) || currentUser?.role === 'Admin' || currentUser?.role === 'Developer')) {
                return null;
              }
              if (!item.adminOnly && item.permission && !can(item.permission)) return null;

              const Icon = item.icon;
              const isSelected = currentTab === item.id || (item.id === 'permissions' && currentTab === 'managing_permissions');

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  title={item.label}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-xs border-l-4 border-blue-600 dark:border-blue-500'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    {Icon ? (
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white dark:text-slate-900' : item.iconColor}`} />
                    ) : (
                      // Executive Hub: No icon, subtle elegant bullet
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        isSelected ? 'bg-amber-400 dark:bg-amber-600' : 'bg-slate-400 dark:bg-slate-600'
                      }`} />
                    )}
                    <span className="truncate">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Admin & Developer Suite (COMMENTED OUT) */}
          {/* (currentUser?.role === 'Admin' || currentUser?.role === 'Developer' || currentUser?.hasAllPermissions) && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Admin & Dev Suite
              </div>
              ...
            </div>
          ) */}
        </div>

        {/* Minimalist Professional Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center font-['Sora'] text-[10px] text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-200">FNB v1.3</span>
          <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Maintained by P3L Developers</span>
        </div>
      </aside>

      {/* Pin Picker Modal: Allows choosing real Matters, Bills of Costs, or Clients */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            ref={pinModalRef}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-5 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Pin to Workspace
                </h3>
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-500 text-[11px]">
              Select a matter, bill of costs, or client to pin for quick one-click workspace access:
            </p>

            {/* Matter Candidates */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                Active Matters
              </div>
              {availableMatters.length === 0 ? (
                <div className="text-slate-400 italic">No matters found.</div>
              ) : (
                availableMatters.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleAddPin({
                      id: `pin-matter-${m.id}`,
                      title: m.title || m.caseNo || 'Matter',
                      subtitle: m.caseNo || `${m.applicant} v ${m.respondent}`,
                      type: 'matter'
                    })}
                    className="w-full text-left p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{m.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{m.caseNo}</div>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))
              )}

              <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider pt-2 border-t border-slate-100 dark:border-slate-800">
                Recent Bills of Costs
              </div>
              {availableFeeNotes.slice(0, 5).map(fn => (
                <button
                  key={fn.id}
                  onClick={() => handleAddPin({
                    id: `pin-fn-${fn.id}`,
                    title: fn.matterTitle || fn.billNumber,
                    subtitle: `Bill ${fn.billNumber} · KES ${(fn.grandTotal || 0).toLocaleString()}`,
                    type: 'feenote'
                  })}
                  className="w-full text-left p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{fn.matterTitle}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Bill #{fn.billNumber}</div>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
