import React, { useState, useEffect } from 'react';
import { Menu, X, Bell, Sun, Moon, User, CheckCircle2, LogOut, Search, Settings } from 'lucide-react';
import { EXACT_FIRM_INFO, SystemUser } from '../../services/supabase';

interface NavbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onNavigateTab?: (tab: string) => void;
  onLogout?: () => void;
  currentUser?: SystemUser | null;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  isDarkMode,
  toggleTheme,
  onNavigateTab,
  onLogout,
  currentUser,
  searchQuery = '',
  setSearchQuery,
}) => {
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const [firmSettings, setFirmSettings] = useState(() => {
    const saved = localStorage.getItem('BILLSZIP_FIRM_SETTINGS');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return { topbarTitle: 'Kithinji & Co', topbarSubtitle: 'Advocates of the High Court of Kenya', logoUrl: '/logo.png' };
  });

  useEffect(() => {
    const handleSettingsChange = () => {
      const saved = localStorage.getItem('BILLSZIP_FIRM_SETTINGS');
      if (saved) {
        try { setFirmSettings(JSON.parse(saved)); } catch(e) {}
      }
    };
    window.addEventListener('firmSettingsChanged', handleSettingsChange);
    return () => window.removeEventListener('firmSettingsChanged', handleSettingsChange);
  }, []);

  const [realNotifications, setRealNotifications] = useState<Array<{ id: string; title: string; desc: string; time: string }>>([]);

  const loadRealNotifications = () => {
    const items: Array<{ id: string; title: string; desc: string; time: string; timestamp: number }> = [];

    // 1. Outgoing emails / dispatches
    try {
      const storedMails = localStorage.getItem('OUTGOING_EMAILS');
      if (storedMails) {
        const mails = JSON.parse(storedMails);
        if (Array.isArray(mails)) {
          mails.slice(0, 10).forEach((m: any, idx: number) => {
            const recipient = Array.isArray(m.to) ? m.to.join(', ') : (m.to || 'Recipient');
            const sentAt = m.timestamp ? new Date(m.timestamp).getTime() : Date.now();
            const minutesAgo = Math.max(1, Math.floor((Date.now() - sentAt) / 60000));
            const timeStr = minutesAgo < 60 ? `${minutesAgo} mins ago` : `${Math.floor(minutesAgo / 60)}h ago`;
            items.push({
              id: `mail-${m.id || idx}`,
              title: `Email Sent: ${m.subject || 'Dispatch'}`,
              desc: `To: ${recipient} • ${m.category || 'Notification'} delivered.`,
              time: timeStr,
              timestamp: sentAt
            });
          });
        }
      }
    } catch (e) {}

    // 2. Real System activities (Fee notes created, users added, etc.)
    try {
      const savedLogs = localStorage.getItem('SYSTEM_ACTIVITY_LOGS');
      if (savedLogs) {
        const logs = JSON.parse(savedLogs);
        if (Array.isArray(logs)) {
          logs.slice(0, 10).forEach((l: any, idx: number) => {
            const ts = l.timestamp || Date.now();
            const minutesAgo = Math.max(1, Math.floor((Date.now() - ts) / 60000));
            const timeStr = minutesAgo < 60 ? `${minutesAgo} mins ago` : `${Math.floor(minutesAgo / 60)}h ago`;
            let title = 'System Activity';
            if (l.type === 'feenote') title = 'Fee Note Activity';
            else if (l.type === 'permission') title = 'User & Access Update';
            else if (l.type === 'letter') title = 'Legal Document';

            items.push({
              id: `log-${l.id || idx}`,
              title,
              desc: `${l.advocateName}: ${l.action}`,
              time: l.timeAgo || timeStr,
              timestamp: ts
            });
          });
        }
      }
    } catch (e) {}

    // Sort newest first
    items.sort((a, b) => b.timestamp - a.timestamp);
    setRealNotifications(items.slice(0, 15));
  };

  useEffect(() => {
    loadRealNotifications();
    const interval = setInterval(loadRealNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogOut = () => {
    setShowProfileMenu(false);
    localStorage.removeItem('BILLSZIP_SESSION');
    if (onLogout) {
      onLogout();
    }
  };

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="h-14 bg-[var(--bg-main)] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200 border-b border-[var(--border-color)]/40">
      
      {/* Left Area: Hamburger Toggle + Mobile-only Logo */}
      <div className="flex items-center gap-3 shrink-0 relative z-10">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none cursor-pointer shrink-0"
          title="Toggle Navigation Menu"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Firm Logo: Shown on mobile/tablet when sidebar is hidden */}
        <div className="flex items-center gap-2 shrink-0 py-0.5 lg:hidden">
          <img
            src={firmSettings.logoUrl || '/logo.png'}
            alt=""
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/logo.png';
            }}
            className="h-8 max-h-8 max-w-[160px] w-auto object-contain shrink-0"
          />
        </div>
      </div>

      {/* Center Area: Global Top Search Bar */}
      <div className="flex-1 max-w-lg px-4 hidden sm:block relative z-0 mx-auto">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 rounded-xl px-3 py-1.5 w-full transition-all focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-zinc-900 focus-within:ring-2 focus-within:ring-blue-500/10">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            placeholder="Search anything... matters, clients, fee notes"
            className="bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none w-full font-sans"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery && setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/70 dark:bg-zinc-700/70 rounded">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Right Controls: Theme Switcher, Notifications Bell, Profile Avatar */}
      <div className="flex items-center gap-3 relative shrink-0 z-10">
        {/* Mobile Search Icon (Shows on small screens) */}
        <button className="sm:hidden p-2 rounded-xl text-slate-700 dark:text-zinc-300 hover:text-blue-500 transition-colors">
          <Search className="w-5 h-5" />
        </button>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-[var(--text-main)] hover:text-blue-500 transition-colors cursor-pointer"
          title="Toggle Light / Dark Mode"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-blue-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifModal(!showNotifModal);
              setShowProfileMenu(false);
            }}
            className="p-2 rounded-xl text-[var(--text-main)] hover:text-blue-500 transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[var(--bg-main)]"></span>
          </button>

          {/* Floating Notifications Popover */}
          {showNotifModal && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-50 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                <h4 className="font-brand font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  Notifications &amp; Activity
                </h4>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                  {realNotifications.length > 0 ? `${realNotifications.length} Recent` : '0 New'}
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {realNotifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No new notifications right now.
                  </div>
                ) : (
                  realNotifications.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 text-xs space-y-1 hover:border-blue-400/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">{n.desc}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Advocate Profile Avatar */}
        <div className="relative">
          <div
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifModal(false);
            }}
            className="flex items-center gap-2.5 pl-3 border-l border-[var(--border-color)] cursor-pointer group select-none"
            title="Account Options"
          >
            <div className="text-right hidden sm:block">
              <span className="font-bold text-xs text-slate-900 dark:text-white block group-hover:text-blue-600 transition-colors">
                {currentUser?.advocateTitle || currentUser?.fullName || EXACT_FIRM_INFO.user.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                {currentUser?.workEmail || "alexkaranivic@gmail.com"}
              </span>
            </div>

            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="w-9 h-9 rounded-xl object-cover shadow-xs border border-slate-200 dark:border-zinc-700"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:bg-blue-600 transition-colors uppercase font-mono">
                {currentUser?.fullName ? currentUser.fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('') : "NK"}
              </div>
            )}
          </div>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 top-12 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-50 py-1.5 text-xs space-y-1">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  if (onNavigateTab) onNavigateTab('profile');
                }}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-900 dark:text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-blue-600" /> View Profile
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  if (onNavigateTab) onNavigateTab('settings');
                }}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-900 dark:text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-500" /> Firm Settings
              </button>

              <button
                onClick={handleLogOut}
                className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-red-500 font-semibold flex items-center gap-2 transition-colors cursor-pointer border-t border-[var(--border-color)] pt-2"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
