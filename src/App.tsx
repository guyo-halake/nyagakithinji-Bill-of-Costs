import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { BreadcrumbsNav } from './components/layout/BreadcrumbsNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { FeeNoteBuilderView } from './components/feenotes/FeeNoteBuilderView';
import { FeeNotesListView } from './components/feenotes/FeeNotesListView';
import { MattersView } from './components/matters/MattersView';
import { ClientsView } from './components/clients/ClientsView';
import { MessagesView } from './components/messages/MessagesView';
import { DocumentVaultView } from './components/vault/DocumentVaultView';
import { RemunerationGuideView } from './components/guide/RemunerationGuideView';
import { CompanyProfileView } from './components/profile/CompanyProfileView';
import { MyProfileView } from './components/profile/MyProfileView';
import { ProfileSettingsView } from './components/settings/ProfileSettingsView';
import { TechSupportView } from './components/support/TechSupportView';
import { LoginView } from './components/auth/LoginView';
import { PasswordResetView } from './components/auth/PasswordResetView';
import { RecentsDraftsDrawer } from './components/layout/RecentsDraftsDrawer';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ManagingPartnerGodMode } from './components/admin/ManagingPartnerGodMode';
import { ManagingPartnerHubView } from './components/admin/ManagingPartnerHubView';
import { ApprovalQueueView } from './components/admin/ApprovalQueueView';
import { RevenueAnalyticsView } from './components/admin/RevenueAnalyticsView';
import { AdvocatePermissionsView } from './components/admin/AdvocatePermissionsView';
import { LiveActivityFeedView } from './components/admin/LiveActivityFeedView';
import { ToastContainer } from './components/admin/ToastNotification';
import { AccessDeniedView } from './components/common/AccessDeniedView';
import { DocumentVerifyView } from './components/verify/DocumentVerifyView';
import { PaymentsBillingView } from './components/payments/PaymentsBillingView';
import { DeveloperPage } from './components/admin/DeveloperPage';
import { MailingTemplatesView } from './components/admin/MailingTemplatesView';
import { DatabaseStudioView } from './components/admin/DatabaseStudioView';

import { supabase, SystemUser, fetchFeeNotesFromDatabase } from './services/supabase';
import { getCurrentUserProfile, signOut, subscribeToAuthState } from './services/auth';
import { subscribeToFirmTable } from './services/realtime';
import { hasPermission } from './services/rbac';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
    try {
      const stored = localStorage.getItem('BILLSZIP_SESSION');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {}
    return null;
  });

  const [currentTab, setCurrentTab] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('developer-page') || path.includes('developers.azure') || path.includes('developer')) return 'developer_page';
        const p = new URLSearchParams(window.location.search);
        if (p.get('tab') === 'developer-page' || p.get('tab') === 'developer_page' || p.get('tab') === 'developers.azure') return 'developer_page';
        if (p.get('tab') === 'verify' || p.get('ref')) return 'verify';
      }
    } catch (e) {}
    return 'home';
  });
  const [previousTab, setPreviousTab] = useState<string>('home');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('BILLSZIP_THEME') || localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return false;
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showRecentsDrawer, setShowRecentsDrawer] = useState<boolean>(false);
  const [, setPermissionTick] = useState(0);

  const can = (code: string) => hasPermission(currentUser, code);

  const [builderNote, setBuilderNote] = useState<any>(null);
  const [builderPreview, setBuilderPreview] = useState<boolean>(false);

  useEffect(() => {
    // Apply saved theme class to html & body
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode', 'dark');
    }

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setCurrentUser(e.detail);
      }
    };

    const handlePermissions = () => {
      setPermissionTick(t => t + 1);
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    window.addEventListener('permissionsUpdated', handlePermissions);
    window.addEventListener('storage', handlePermissions);

    let isMounted = true;
    // Hydrate fee notes from database
    void fetchFeeNotesFromDatabase().catch(() => {});

    // Hydrate firm settings from persistent backend store
    fetch('/api/v1/users/firm-settings')
      .then(res => res.ok ? res.json() : null)
      .then(firmData => {
        if (firmData && Object.keys(firmData).length > 0) {
          const current = localStorage.getItem('BILLSZIP_FIRM_SETTINGS');
          const merged = current ? { ...JSON.parse(current), ...firmData } : firmData;
          localStorage.setItem('BILLSZIP_FIRM_SETTINGS', JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent('firmSettingsChanged', { detail: merged }));
        }
      })
      .catch(() => {});

    void getCurrentUserProfile().then(profile => {
      if (isMounted && profile) {
        localStorage.setItem('BILLSZIP_SESSION', JSON.stringify(profile));
        setCurrentUser(profile);
      }
    }).catch(() => {});

    const unsubscribeAuth = subscribeToAuthState((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('BILLSZIP_SESSION');
        setCurrentUser(null);
        return;
      }
      if (session) {
        void getCurrentUserProfile().then(profile => {
          if (isMounted && profile) {
            localStorage.setItem('BILLSZIP_SESSION', JSON.stringify(profile));
            setCurrentUser(profile);
          }
        }).catch(() => {});
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
      window.removeEventListener('permissionsUpdated', handlePermissions);
      window.removeEventListener('storage', handlePermissions);
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.firmId) return;

    const tables = ['clients', 'matters', 'fee_notes', 'documents', 'messages', 'notifications', 'activity_logs'] as const;
    const cleanups = tables.map(table => subscribeToFirmTable(currentUser.firmId!, table, change => {
      window.dispatchEvent(new CustomEvent('databaseRealtimeUpdate', {
        detail: { table, ...change },
      }));
    }));

    return () => cleanups.forEach(cleanup => cleanup());
  }, [currentUser?.firmId]);

  const [selectedPermissionUserId, setSelectedPermissionUserId] = useState<string>('');

  const handleNavigateTab = (newTab: string, targetUserId?: string) => {
    if (targetUserId) {
      setSelectedPermissionUserId(targetUserId);
    }
    if (newTab === 'boc') {
      // Clear any previous note when opening blank BOC Builder from navigation
      setBuilderNote(null);
      setBuilderPreview(false);
    }
    if (newTab === 'developer_page' || newTab === 'developer-page') {
      try {
        window.history.pushState(null, '', '/developers.azure');
      } catch (e) {}
    }
    if (newTab !== currentTab) {
      setPreviousTab(currentTab);
      setCurrentTab(newTab);
    }
  };

  const handleLogout = () => {
    void signOut().catch(() => {});
    localStorage.removeItem('BILLSZIP_SESSION');
    setCurrentUser(null);
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark-mode', 'dark');
        localStorage.setItem('BILLSZIP_THEME', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark-mode', 'dark');
        localStorage.setItem('BILLSZIP_THEME', 'light');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  const handleNavigateToBuilder = (note?: any, isPreview?: boolean) => {
    setBuilderNote(note || null);
    setBuilderPreview(isPreview || false);
    if (currentTab !== 'boc') {
      setPreviousTab(currentTab);
      setCurrentTab('boc');
    }
  };

  // If user is accessing password reset recovery URL (supports pathname, query param, or hash)
  const [showPasswordReset, setShowPasswordReset] = useState<boolean>(() => {
    return (
      window.location.pathname.includes('reset-password') ||
      window.location.search.includes('reset-password') ||
      window.location.search.includes('view=reset-password') ||
      (window.location.search.includes('token=') && window.location.search.includes('email=')) ||
      window.location.hash.includes('recovery') ||
      window.location.hash.includes('reset-password') ||
      window.location.search.includes('type=recovery') ||
      (window.location.search.includes('code=') && window.location.pathname.includes('reset-password'))
    );
  });

  useEffect(() => {
    const { data: authSub } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true);
      }
    });
    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  if (showPasswordReset) {
    return (
      <PasswordResetView
        onBackToLogin={() => {
          setShowPasswordReset(false);
          try {
            window.history.pushState(null, '', '/');
          } catch (_) {}
        }}
      />
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentTab('home');
        }}
      />
    );
  }

  // Standalone admin URLs still require a real authenticated privileged profile.
  if (window.location.pathname === '/developer-page' || window.location.pathname === '/admin') {
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Developer') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] text-[var(--text-main)] p-6">
          <div className="vercel-card max-w-md p-8 text-center space-y-4">
            <ShieldAlert className="w-10 h-10 mx-auto text-amber-500" />
            <h1 className="font-brand font-bold text-xl">Access denied</h1>
            <p className="text-sm text-[var(--text-muted)]">Your account does not have platform administration access.</p>
          </div>
        </div>
      );
    }
    return <AdminDashboard />;
  }

  return (
    <div className="h-screen flex bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-200 font-sans relative overflow-hidden">
      
      {/* Sidebar: Full Height on Left */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleNavigateTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area: Stacking Navbar and Dashboard */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Top Bar Header */}
        <Navbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          onNavigateTab={handleNavigateTab}
          onLogout={handleLogout}
          currentUser={currentUser}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 w-full space-y-4">
          {/* Universal Back Button & Breadcrumb Navigation Bar (All Pages Except Home) */}
          <BreadcrumbsNav
            currentTab={currentTab}
            onNavigateTab={handleNavigateTab}
            previousTab={previousTab}
          />

          {/* BASIC NAVIGATION VIEWS */}
          {currentTab === 'home' && (
            can('dashboard.view') ? (
              <DashboardView
                onNavigateTab={handleNavigateTab}
                onNavigateToBuilder={handleNavigateToBuilder}
                onOpenRecents={() => setShowRecentsDrawer(true)}
                currentUser={currentUser}
              />
            ) : (
              <AccessDeniedView
                resourceName="Advocate Dashboard"
                permissionCode="dashboard.view"
                onNavigateHome={() => handleNavigateTab('support')}
              />
            )
          )}

          {currentTab === 'boc' && (
            can('boc.view') ? (
              <FeeNoteBuilderView
                initialNote={builderNote}
                isPreview={builderPreview}
                onNavigateToTab={handleNavigateTab}
                currentUser={currentUser}
              />
            ) : (
              <AccessDeniedView
                resourceName="Bill of Costs Builder"
                permissionCode="boc.view"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {currentTab === 'feenotes' && (
            can('feenotes.view') ? (
              <FeeNotesListView
                onNavigateTab={handleNavigateTab}
                onNavigateToBuilder={handleNavigateToBuilder}
                currentUser={currentUser}
              />
            ) : (
              <AccessDeniedView
                resourceName="Fee Notes Ledger"
                permissionCode="feenotes.view"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {currentTab === 'matters' && (
            can('matters.view') ? (
              <MattersView onNavigateTab={handleNavigateTab} onNavigateToBuilder={handleNavigateToBuilder} currentUser={currentUser} />
            ) : (
              <AccessDeniedView
                resourceName="My Matters Registry"
                permissionCode="matters.view"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {currentTab === 'clients' && (
            can('clients.view') ? (
              <ClientsView onNavigateTab={handleNavigateTab} onNavigateToBuilder={handleNavigateToBuilder} currentUser={currentUser} />
            ) : (
              <AccessDeniedView
                resourceName="Clients Directory"
                permissionCode="clients.view"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {/* PAYMENTS & MESSAGES TEMPORARILY COMMENTED OUT AS PER USER REQUEST */}
          {/* {currentTab === 'payments' && <PaymentsBillingView currentUser={currentUser} />} */}

          {/* {currentTab === 'messages' && <MessagesView currentUser={currentUser} />} */}

          {currentTab === 'vault' && (
            can('vault.view') ? (
              <DocumentVaultView currentUser={currentUser} />
            ) : (
              <AccessDeniedView
                resourceName="Document Vault"
                permissionCode="vault.view"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {currentTab === 'guide' && (
            can('guide.view') ? (
              <RemunerationGuideView />
            ) : (
              <AccessDeniedView
                resourceName="Remuneration Guide"
                permissionCode="guide.view"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {currentTab === 'company' && <CompanyProfileView currentUser={currentUser} />}

          {currentTab === 'profile' && (
            <ProfileSettingsView 
              currentUser={currentUser} 
              isDarkMode={isDarkMode} 
              toggleTheme={toggleTheme} 
              initialTab="profile" 
            />
          )}

          {currentTab === 'settings' && (
            can('settings.view') ? (
              <ProfileSettingsView 
                currentUser={currentUser} 
                isDarkMode={isDarkMode} 
                toggleTheme={toggleTheme} 
                initialTab="firm" 
              />
            ) : (
              <AccessDeniedView
                resourceName="Firm Settings"
                permissionCode="settings.view"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {currentTab === 'support' && (
            can('support.view') ? (
              <TechSupportView currentUser={currentUser} />
            ) : (
              <AccessDeniedView
                resourceName="Support & Help"
                permissionCode="support.view"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {/* DOCUMENT AUTHENTICITY VERIFICATION VIEW */}
          {currentTab === 'verify' && (
            <DocumentVerifyView onNavigateHome={() => handleNavigateTab('home')} />
          )}

          {/* MANAGING PARTNER SUITE PAGES: EXECUTIVE HUB COMMENTED OUT AS PER USER REQUEST */}
          {/*
          {currentTab === 'managing_hub' && (
            can('managing_hub.view') ? (
              <ManagingPartnerHubView 
                onNavigateTab={handleNavigateTab} 
                onNavigateToBuilder={handleNavigateToBuilder}
                currentUser={currentUser} 
              />
            ) : (
              <AccessDeniedView
                resourceName="Executive Hub"
                permissionCode="managing_hub.view"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}
          */}

          {currentTab === 'managing_approvals' && (
            can('feenotes.approve') ? (
              <ApprovalQueueView
                onNavigateToBuilder={handleNavigateToBuilder}
                onNavigateTab={handleNavigateTab}
                currentUser={currentUser}
              />
            ) : (
              <AccessDeniedView
                resourceName="Fee Note Approvals Queue"
                permissionCode="feenotes.approve"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {currentTab === 'managing_revenue' && (
            can('managing_hub.financial_summary') ? (
              <RevenueAnalyticsView currentUser={currentUser} />
            ) : (
              <AccessDeniedView
                resourceName="Revenue Analytics"
                permissionCode="managing_hub.financial_summary"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {(currentTab === 'managing_permissions' || currentTab === 'permissions') && (
            can('permissions.view') ? (
              <AdvocatePermissionsView currentUser={currentUser} initialUserId={selectedPermissionUserId} />
            ) : (
              <AccessDeniedView
                resourceName="Advocate Permissions & Role Templates"
                permissionCode="permissions.view"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {currentTab === 'managing_audit' && (
            can('managing_hub.activity_logs') ? (
              <LiveActivityFeedView />
            ) : (
              <AccessDeniedView
                resourceName="Firm Activity Audit Log"
                permissionCode="managing_hub.activity_logs"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {/* MASTER DEVELOPER CONSOLE */}
          {currentTab === 'admin' && (
            (currentUser?.role === 'Admin' || currentUser?.role === 'Developer' || can('permissions.manage_roles')) ? (
              <ManagingPartnerGodMode
                onNavigateToBuilder={handleNavigateToBuilder}
                onNavigateTab={handleNavigateTab}
              />
            ) : (
              <AccessDeniedView
                resourceName="Platform Administration"
                permissionCode="permissions.manage_roles"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {/* DEVELOPER PAGE (ACCESSIBLE VIA /developer-page OR /developers.azure) */}
          {(currentTab === 'developer_page' || currentTab === 'developer-page') && (
            <DeveloperPage />
          )}

          {/* MAILINGS & COMMUNICATIONS (ADMIN/DEV ONLY) */}
          {currentTab === 'mailings' && (
            (currentUser?.role === 'Admin' || currentUser?.role === 'Developer' || currentUser?.hasAllPermissions) ? (
              <MailingTemplatesView />
            ) : (
              <AccessDeniedView
                resourceName="Mailings & Dispatch"
                permissionCode="permissions.manage_roles"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          )}

          {/* DATABASE STUDIO (COMMENTED OUT) */}
          {/* currentTab === 'database_studio' && (
            (currentUser?.role === 'Admin' || currentUser?.role === 'Developer' || currentUser?.hasAllPermissions) ? (
              <DatabaseStudioView currentUser={currentUser} />
            ) : (
              <AccessDeniedView
                resourceName="Database Studio"
                permissionCode="permissions.manage_roles"
                onNavigateHome={() => handleNavigateTab('home')}
              />
            )
          ) */}
        </main>
      </div>

      {/* Recents & Drafts Right Sidebar Drawer */}
      <RecentsDraftsDrawer
        isOpen={showRecentsDrawer}
        onClose={() => setShowRecentsDrawer(false)}
        onNavigateTab={handleNavigateTab}
        onNavigateToBuilder={handleNavigateToBuilder}
        currentUser={currentUser}
      />
      <ToastContainer />
    </div>
  );
};

export default App;
