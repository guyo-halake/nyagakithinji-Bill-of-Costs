import React, { useState, useEffect } from 'react';
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
  Lock,
  User,
  Mail,
  Database,
  Stamp,
} from 'lucide-react';

import { SystemUser, getFeeNotes } from '../../services/supabase';
import { hasPermission } from '../../services/rbac';

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
  const [feeNotesCount, setFeeNotesCount] = useState<number>(() => getFeeNotes().length);
  const [, setPermissionTick] = useState(0);

  const can = (code: string) => hasPermission(currentUser, code);

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
            handleSelect('boc');
            break;
          case '3':
            e.preventDefault();
            handleSelect('feenotes');
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

  // Real-time firm settings and fee notes synchronization
  useEffect(() => {
    const handleFeeNotes = () => {
      setFeeNotesCount(getFeeNotes().length);
    };
    const handlePermissions = () => {
      setPermissionTick(t => t + 1);
    };

    window.addEventListener('feeNotesUpdated', handleFeeNotes);
    window.addEventListener('permissionsUpdated', handlePermissions);
    window.addEventListener('storage', handlePermissions);
    window.addEventListener('storage', handleFeeNotes);

    return () => {
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
      id: 'boc',
      label: 'Create Fee Notes',
      icon: FileText,
      iconColor: 'text-blue-600 dark:text-blue-400',
      shortcut: 'Alt+2',
      permission: 'boc.view'
    },
    {
      id: 'feenotes',
      label: 'Fee Notes',
      icon: Scale,
      iconColor: 'text-amber-600 dark:text-amber-400',
      shortcut: 'Alt+3',
      badge: feeNotesCount,
      permission: 'feenotes.view'
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
      id: 'stamps_verification',
      label: 'Stamps',
      icon: Stamp,
      iconColor: 'text-rose-600 dark:text-rose-400',
      permission: 'settings.view'
    },
    {
      id: 'vault',
      label: 'Documents and Storage',
      icon: FolderLock,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      shortcut: 'Alt+6',
      permission: 'vault.view'
    },
    {
      id: 'guide',
      label: 'Remuneration Scale Guide',
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
    },
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

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed top-16 bottom-0 inset-x-0 bg-slate-900/50 backdrop-blur-xs z-40 transition-opacity lg:hidden"
        />
      )}

      {/* Sidebar remains independently toggleable; the firm identity stays in the global header. */}
      <aside
        className={`fixed top-16 bottom-0 left-0 w-64 bg-[var(--bg-main)] border-r border-[var(--border-color)] flex flex-col justify-between z-50 transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">

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
                      ? 'bg-slate-900 text-white dark:bg-zinc-800 dark:text-white font-semibold shadow-xs border-l-4 border-blue-600 dark:border-blue-500'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white dark:text-white' : item.iconColor}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isSelected
                          ? 'bg-blue-500/20 text-blue-200 dark:text-blue-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {item.shortcut && (
                      <kbd className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                        isSelected
                          ? 'bg-slate-800 text-slate-300 dark:bg-zinc-700 dark:text-zinc-200'
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

          {/* Settings and support */}
          <div className="pt-4 mt-4 border-t border-[var(--border-color)] space-y-1">
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
                      ? 'bg-slate-900 text-white dark:bg-zinc-800 dark:text-white font-semibold shadow-xs border-l-4 border-blue-600 dark:border-blue-500'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white dark:text-white' : item.iconColor}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-3 mt-3 border-t border-[var(--border-color)]">
            <button
              onClick={() => handleSelect('profile')}
              title="My Profile"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                currentTab === 'profile'
                  ? 'bg-slate-900 text-white dark:bg-zinc-800 dark:text-white font-semibold border-l-4 border-blue-600 dark:border-blue-500'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className={`w-4 h-4 shrink-0 ${currentTab === 'profile' ? 'text-white dark:text-white' : 'text-slate-600 dark:text-slate-400'}`} />
              <span>My Profile</span>
            </button>
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
        <div className="p-3 border-t border-[var(--border-color)] text-center font-['Sora'] text-[10px] text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-200">FNB v1.3</span>
          <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Maintained by P3L Developers</span>
        </div>
      </aside>

    </>
  );
};

export default Sidebar;
