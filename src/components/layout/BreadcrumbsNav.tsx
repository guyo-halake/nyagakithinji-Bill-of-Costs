import React from 'react';
import {
  ArrowLeft,
  Home,
  FileText,
  Briefcase,
  Users,
  MessageSquare,
  Folder,
  BookOpen,
  Building2,
  User,
  Settings,
  HelpCircle,
  ChevronRight,
  Sliders,
  Building,
  ShieldCheck,
  Bot,
  Cpu,
  Lock,
  Bell,
  Database,
  Power
} from 'lucide-react';

interface BreadcrumbsNavProps {
  currentTab: string;
  onNavigateTab: (tab: string) => void;
  previousTab?: string;
}

export const TAB_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  home: { label: 'Home', icon: Home },
  boc: { label: 'Bill of Costs Builder', icon: FileText },
  matters: { label: 'My Matters', icon: Briefcase },
  clients: { label: 'My Clients', icon: Users },
  messages: { label: 'Messages', icon: MessageSquare },
  vault: { label: 'Documentations & Storage', icon: Folder },
  guide: { label: 'Remuneration Guide', icon: BookOpen },
  company: { label: 'Company Profile', icon: Building2 },
  profile: { label: 'My Profile', icon: User },
  settings: { label: 'Firm Settings', icon: Settings },
  support: { label: 'Tech Support', icon: HelpCircle },
  
  // ADMIN CONTROL PANEL PAGES
  admin_boc: { label: 'Home & BOC Settings', icon: Sliders },
  admin_firms: { label: 'Firms Management', icon: Building },
  admin_documents: { label: 'Documents Policy', icon: Folder },
  admin_support: { label: 'Tech Support Settings', icon: Bot },
  admin_python: { label: 'Python BOC Engine', icon: Cpu },
  admin_permissions: { label: 'Permissions Matrix', icon: ShieldCheck },
  admin_users: { label: 'Users & Roles', icon: Users },
  admin_notifications: { label: 'Notifications Dispatch', icon: Bell },
  admin_ticketing: { label: 'Helpdesk Ticketing', icon: HelpCircle },
  admin_database: { label: 'Supabase DB Health', icon: Database },
  admin_server: { label: 'Server & Infra Control', icon: Power },
  
  // MANAGING PARTNER
  managing_hub: { label: 'Executive Hub', icon: ShieldCheck }
};

export const BreadcrumbsNav: React.FC<BreadcrumbsNavProps> = ({
  currentTab,
  onNavigateTab,
  previousTab = 'home',
}) => {
  if (currentTab === 'home' || currentTab === 'boc') return null;

  const currentConfig = TAB_CONFIG[currentTab] || { label: currentTab, icon: Folder };
  const CurrentIcon = currentConfig.icon;

  const prevConfig = TAB_CONFIG[previousTab] || TAB_CONFIG['home'];
  const PrevIcon = prevConfig.icon;

  const handleBack = () => {
    onNavigateTab(previousTab || 'home');
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 py-1 text-xs">


      <div className="flex items-center gap-1.5 font-medium text-[var(--text-muted)] overflow-x-auto py-0.5">
        <button
          onClick={() => onNavigateTab('home')}
          className="flex items-center gap-1 hover:text-[var(--text-main)] transition-colors shrink-0"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>

        {previousTab !== 'home' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-60 shrink-0" />
            <button
              onClick={() => onNavigateTab(previousTab)}
              className="flex items-center gap-1 hover:text-[var(--text-main)] transition-colors shrink-0"
            >
              <PrevIcon className="w-3.5 h-3.5" />
              <span>{prevConfig.label}</span>
            </button>
          </>
        )}

        <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-60 shrink-0" />

        <div className="flex items-center gap-1 text-[var(--text-main)] font-semibold shrink-0">
          <CurrentIcon className="w-3.5 h-3.5 text-emerald-500" />
          <span>{currentConfig.label}</span>
        </div>
      </div>
    </div>
  );
};

export default BreadcrumbsNav;
