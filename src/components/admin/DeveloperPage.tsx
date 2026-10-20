import React, { useState } from 'react';
import { 
  FiSettings, FiDatabase, FiServer, FiUsers, FiFileText, 
  FiActivity, FiHelpCircle, FiCheckCircle, FiBookOpen,
  FiTerminal, FiSave, FiSearch
} from 'react-icons/fi';

export const DeveloperPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiActivity /> },
    { id: 'boc', label: 'BOC Settings', icon: <FiFileText /> },
    { id: 'crm', label: 'Clients & Matters', icon: <FiUsers /> },
    { id: 'vault', label: 'Document Vault', icon: <FiDatabase /> },
    { id: 'guide', label: 'Remuneration Guide', icon: <FiBookOpen /> },
    { id: 'firm', label: 'Firm Settings', icon: <FiSettings /> },
    { id: 'support', label: 'Support Tickets', icon: <FiHelpCircle /> },
    { id: 'devops', label: 'Server Settings', icon: <FiTerminal /> }
  ];

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Settings saved successfully.');
    }, 800);
  };

  const ToggleRow = ({ label, desc, defaultOn = false }: { label: string, desc: string, defaultOn?: boolean }) => (
    <div className="flex items-center justify-between p-4 bg-white border border-black rounded-sm hover:bg-gray-50 transition-colors">
      <div className="flex-1 pr-6">
        <h4 className="font-bold text-black text-sm mb-1">{label}</h4>
        <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input type="checkbox" className="sr-only peer" defaultChecked={defaultOn} />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
      </label>
    </div>
  );

  const ActionRow = ({ label, desc, btnText, danger = false }: { label: string, desc: string, btnText: string, danger?: boolean }) => (
    <div className="flex items-center justify-between p-4 bg-white border border-black rounded-sm hover:bg-gray-50 transition-colors">
      <div className="flex-1 pr-6">
        <h4 className="font-bold text-black text-sm mb-1">{label}</h4>
        <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
      </div>
      <button className={`px-4 py-2 text-sm font-bold border border-black transition-colors flex-shrink-0 ${danger ? 'bg-black text-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-100'}`}>
        {btnText}
      </button>
    </div>
  );

  const InputRow = ({ label, desc, placeholder, defaultValue = '' }: { label: string, desc: string, placeholder: string, defaultValue?: string }) => (
    <div className="flex items-center justify-between p-4 bg-white border border-black rounded-sm hover:bg-gray-50 transition-colors gap-6">
      <div className="flex-1">
        <h4 className="font-bold text-black text-sm mb-1">{label}</h4>
        <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
      </div>
      <input 
        type="text" 
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-48 bg-white border border-black px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black" 
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-black">
      {/* Top Navbar */}
      <div className="bg-white border-b border-black px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-sm">
            <FiServer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Admin Settings</h1>
            <p className="text-xs text-gray-500 font-medium">System Configuration</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="pl-9 pr-4 py-2 bg-gray-100 border border-transparent focus:border-black rounded-sm text-sm w-64 focus:outline-none focus:bg-white"
            />
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-black text-white px-5 py-2.5 rounded-sm text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {isSaving ? 'Saving...' : <><FiSave className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden max-w-[1600px] w-full mx-auto">
        {/* Sidebar */}
        <div className="w-72 bg-white border-r border-black flex flex-col overflow-y-auto">
          <div className="p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white">
          <div className="max-w-4xl mx-auto space-y-6 pb-20">
            
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-black">Dashboard Settings</h2>
                  <p className="text-sm text-gray-500">Configure dashboard metrics and layout.</p>
                </div>
                <div className="grid gap-4">
                  <InputRow label="Global Banner Injection" desc="Push critical alerts to the top of all dashboards." placeholder="e.g. System Maintenance at 2 AM" />
                  <ToggleRow label="KPI Widget Toggles" desc="Show 'Untaxed Pending' metric on the dashboard." defaultOn />
                  <ToggleRow label="Financial Currency Override" desc="Toggle global display from Kshs to USD." />
                  <ActionRow label="Dashboard Cache Invalidation" desc="Clear the Redis/Supabase cache for instant live numbers." btnText="Clear Cache" />
                  <InputRow label="Quick-Action Re-routing" desc="Change destination of 'New Fee Note' button." placeholder="/boc-builder" defaultValue="/boc-builder" />
                  <InputRow label="Live Widget Scale Limits" desc="Adjust max values allowed in live calc widget." placeholder="Max Amount" defaultValue="1000000000" />
                  <InputRow label="Upcoming Court Filter Config" desc="Set default lookahead days for active causes." placeholder="Days" defaultValue="30" />
                  <ToggleRow label="Status Color Mapping" desc="Force 'Taxation Ready' to display as Blue instead of Green." />
                  <ToggleRow label="User Session Overlay" desc="Enable admin radar showing active advocates." defaultOn />
                  <ToggleRow label="Data Source Exclusions" desc="Include Drafts in the 35.2M Claim Overview." />
                  <ToggleRow label="Widget Rearrangement" desc="Allow users to drag-and-drop dashboard widgets." />
                  <ToggleRow label="Audit Snippet Viewer" desc="Show live mini-feed of generated fee notes." defaultOn />
                  <ToggleRow label="Dashboard Analytics" desc="Track which widgets are clicked most frequently." defaultOn />
                  <ActionRow label="Onboarding Walkthrough Toggle" desc="Reset the 'Welcome' tutorial for all users." btnText="Reset Walkthrough" />
                  <ActionRow label="Dashboard Export" desc="Export entire dashboard state to PDF report." btnText="Export PDF" />
                </div>
              </div>
            )}

            {activeTab === 'boc' && (
              <div className="space-y-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-black">BOC Builder Settings</h2>
                  <p className="text-sm text-gray-500">Configure fee note calculations and templates.</p>
                </div>
                <div className="grid gap-4">
                  <InputRow label="Global Statutory VAT Rate" desc="Update VAT percentage globally (e.g. 16% or 14%)." placeholder="16" defaultValue="16" />
                  <ToggleRow label="Getting-Up Fee Logic Switch" desc="Enforce strict 1/3 of Instruction Fee math." defaultOn />
                  <ToggleRow label="Statutory Scale Versioning" desc="Use 2026 Rules instead of legacy 2014 rules." defaultOn />
                  <ToggleRow label="PDF Engine Selector" desc="Use Server-Side Headless Chrome instead of Client HTML2PDF." />
                  <InputRow label="PDF Print Margin Config" desc="Adjust A4 padding globally in mm." placeholder="15" defaultValue="15" />
                  <ToggleRow label="Watermark Enforcement" desc="Force DRAFT watermark until explicitly processed." defaultOn />
                  <ToggleRow label="Disbursement Category Lock" desc="Prevent junior lawyers from adding custom expenses." />
                  <InputRow label="Signature Block Layout" desc="Alignment for signatures (left, center, right)." placeholder="right" defaultValue="right" />
                  <ToggleRow label="Font Enforcement Lock" desc="Force Sora/Inter globally and block custom uploads." defaultOn />
                  <InputRow label="Max Claim Warning Limits" desc="Claim amount triggering partner approval." placeholder="1000000000" defaultValue="1000000000" />
                  <InputRow label="Auto-Save Interval Tweaks" desc="Draft sync frequency in seconds." placeholder="30" defaultValue="30" />
                  <InputRow label="Disclaimer Text Injection" desc="Fine print at the bottom of Bill of Costs." placeholder="E&OE" defaultValue="Errors & Omissions Excepted" />
                  <InputRow label="Itemized Limit Capping" desc="Max items per bill to prevent freezing." placeholder="500" defaultValue="500" />
                  <InputRow label="Custom Jurisdiction Adder" desc="Inject new courts into the dropdown." placeholder="e.g. Small Claims Court" />
                  <ToggleRow label="Rounding Math Rules" desc="Round calculations to the nearest flat shilling." defaultOn />
                </div>
              </div>
            )}

            {activeTab === 'crm' && (
              <div className="space-y-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-black">Clients & Matters</h2>
                  <p className="text-sm text-gray-500">Manage client data and matter statuses.</p>
                </div>
                <div className="grid gap-4">
                  <ActionRow label="Bulk Database Import" desc="Upload CSV of legacy clients to Supabase." btnText="Upload CSV" />
                  <ActionRow label="Client Merge Engine" desc="Merge duplicate records (e.g. Seyani Bros & Seyani Brothers)." btnText="Launch Merger" />
                  <ActionRow label="Conflict of Interest Scanner" desc="Scan database for cross-representation conflicts." btnText="Run Scanner" />
                  <ActionRow label="Orphaned Matter Reassignment" desc="Bulk re-assign cases from deactivated lawyers." btnText="Re-assign Cases" />
                  <ActionRow label="Soft-Delete Recovery Bin" desc="Restore accidentally deleted clients or matters." btnText="View Bin" />
                  <InputRow label="Taxonomy & Status Builder" desc="Add custom matter statuses." placeholder="Status Name" defaultValue="Awaiting Supreme Court" />
                  <InputRow label="Client Category Manager" desc="Add new entity classifications." placeholder="Category" defaultValue="NGO" />
                  <ToggleRow label="Compliance Export Lock" desc="Prevent lawyers from downloading the client list." defaultOn />
                  <ToggleRow label="Automated Archiving Rules" desc="Auto-archive matters with no activity > 24 months." defaultOn />
                  <InputRow label="Client Billing Sequence" desc="Document ID prefix format." placeholder="BOC-YYYY" defaultValue="BOC-2026" />
                  <ActionRow label="Global Search Re-indexing" desc="Force Supabase to rebuild text-search indices." btnText="Re-index DB" />
                  <ToggleRow label="Lawyer LSK Verification" desc="Ping LSK API to verify advocate practice numbers." defaultOn />
                  <ActionRow label="Role Elevation Matrix" desc="Manage user roles (Admin/Developer/Advocate)." btnText="Manage Roles" />
                  <InputRow label="Branch Office Tagging" desc="Tag matters to specific firm branches." placeholder="e.g. Nairobi HQ" defaultValue="Nairobi HQ" />
                  <ActionRow label="User Deactivation Kill-Switch" desc="Instantly lock a user out of the platform." btnText="Deactivate User" danger />
                </div>
              </div>
            )}

            {activeTab === 'vault' && (
              <div className="space-y-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-black">Document Vault</h2>
                  <p className="text-sm text-gray-500">Manage file storage and size limits.</p>
                </div>
                <div className="grid gap-4">
                  <InputRow label="Max File Size Enforcement" desc="Cap file uploads in MB to save bandwidth." placeholder="50" defaultValue="50" />
                  <ToggleRow label="File Type Whitelisting" desc="Strictly allow only .pdf and .xlsx files." defaultOn />
                  <ActionRow label="Vault Quota Monitor" desc="Check current Supabase 100GB storage usage." btnText="Check Quota" />
                  <ToggleRow label="Deep Archive Automator" desc="Compress files older than 3 years to cold storage." defaultOn />
                  <ActionRow label="Orphaned File Sweeper" desc="Permanently delete PDFs with no database record." btnText="Sweep Orphans" danger />
                  <ToggleRow label="Malware / Virus Scan" desc="Pass files through Python scanner before saving." defaultOn />
                  <InputRow label="Document Versioning Rules" desc="Number of historical Excel versions to keep." placeholder="3" defaultValue="3" />
                  <ActionRow label="Access & Download Ledger" desc="View exactly who downloaded which files." btnText="View Audit Log" />
                  <ActionRow label="Global CDN Cache Purge" desc="Clear Vercel edge network cache for static PDFs." btnText="Purge Edge Cache" />
                  <ActionRow label="Vault Backup Sync" desc="Mirror Supabase bucket to secondary encrypted cloud vault." btnText="Trigger Backup" />
                  <ToggleRow label="Automated OCR Integration" desc="Extract text from scanned PDFs via Python." />
                  <ToggleRow label="File Renaming Regex Rules" desc="Force uploads to follow YYYY-MM-DD standard." defaultOn />
                  <ActionRow label="Folder Structure Taxonomy" desc="Manage global virtual folders (Pleadings, Evidence)." btnText="Manage Folders" />
                  <ActionRow label="Storage Region Migrator" desc="Migrate bucket to faster regional server." btnText="Migrate Region" />
                  <ToggleRow label="Watermark on Download" desc="Force firm logo onto PDFs upon download." />
                </div>
              </div>
            )}
            
            {activeTab === 'guide' && (
              <div className="space-y-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-black">Remuneration Guide</h2>
                  <p className="text-sm text-gray-500">Update legal text and statutory values.</p>
                </div>
                <div className="grid gap-4">
                  <ActionRow label="Markdown Content Injector" desc="Update the legal guide text natively." btnText="Edit Markdown" />
                  <InputRow label="Statutory Multiplier Adjustments" desc="Exceptional Complexity multiplier (Section 5)." placeholder="1.5" defaultValue="1.5" />
                  <ActionRow label="Kenya Law Gazette Link Sync" desc="Verify all external legal URLs are alive." btnText="Ping URLs" />
                  <InputRow label="Folio Math Overrides" desc="Words per folio definition (Section 17)." placeholder="100" defaultValue="100" />
                  <InputRow label="Statutory Interest Configurator" desc="Overdue bill interest rate % (Section 7)." placeholder="14" defaultValue="14" />
                  <ActionRow label="New Schedule Injector" desc="Add new statutory schedules to the platform." btnText="Add Schedule" />
                  <ActionRow label="Math Simulator Calibration" desc="Fine-tune values for the mock calculation engine." btnText="Calibrate Simulator" />
                  <ToggleRow label="Service Worker Offline Cache" desc="Cache the entire guide offline on user devices." defaultOn />
                  <ToggleRow label="Legal Jargon Tooltips" desc="Show hover definitions for terms like 'Taxing Officer'." defaultOn />
                  <ActionRow label="Reading Analytics" desc="Track which sections are viewed most." btnText="View Metrics" />
                  <ActionRow label="PDF Gazette Replacement" desc="Upload latest official government gazette PDF." btnText="Upload PDF" />
                  <ToggleRow label="Section Highlighting" desc="Force highlight heavily litigated sections globally." />
                  <InputRow label="Guide Search Aliases" desc="Map keywords (e.g. Divorce -> Schedule 8)." placeholder="Keyword Map" />
                  <ToggleRow label="Changelog Generator" desc="Notify users when guide text is updated." defaultOn />
                  <ToggleRow label="Print-Friendly Rules" desc="Optimize guide layout for physical printing." defaultOn />
                </div>
              </div>
            )}

            {activeTab === 'firm' && (
              <div className="space-y-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-black">Firm Settings</h2>
                  <p className="text-sm text-gray-500">Configure firm branding and security.</p>
                </div>
                <div className="grid gap-4">
                  <ActionRow label="Dynamic Firm Branding" desc="Upload official logo for all dashboards & PDFs." btnText="Update Logo" />
                  <InputRow label="Bank Routing Overrides" desc="Update SWIFT/Account details globally." placeholder="KCB Account..." defaultValue="1104889922" />
                  <ToggleRow label="MFA (Multi-Factor Auth) Enforcer" desc="Force Google Authenticator for all advocates." />
                  <InputRow label="Session Timeout Master" desc="Force inactivity logout globally in minutes." placeholder="15" defaultValue="30" />
                  <InputRow label="IP Whitelisting" desc="Restrict access strictly to office Wi-Fi IP." placeholder="192.168..." />
                  <InputRow label="Notification Routing Map" desc="Direct taxation emails to specific department." placeholder="taxation@kithinjilegal.co.ke" defaultValue="taxation@kithinjilegal.co.ke" />
                  <ToggleRow label="UI Theme Lock" desc="Force Light Mode globally for strict corporate look." defaultOn />
                  <ActionRow label="Automated Onboarding" desc="Generate password & welcome email for new hire." btnText="Provision User" />
                  <InputRow label="Email Domain Enforcement" desc="Block registrations from unauthorized domains." placeholder="@kithinjilegal.co.ke" defaultValue="@kithinjilegal.co.ke" />
                  <InputRow label="Data Retention Policy Limits" desc="Hard-delete trash after X days." placeholder="30" defaultValue="30" />
                  <ToggleRow label="Global Maintenance Mode" desc="Lock out non-admins with ETA message." />
                  <ActionRow label="Custom CSS Injector" desc="Add quick UI tweaks without GitHub deploy." btnText="Edit CSS" />
                  <ActionRow label="API Key Vault" desc="Securely store Twilio/SendGrid credentials." btnText="Manage Secrets" />
                  <ActionRow label="Firm Hierarchy Mapper" desc="Set approval workflows (Associate -> Partner)." btnText="Edit Hierarchy" />
                  <InputRow label="Legal Entity Updater" desc="KRA PIN and Firm Reg Number updates." placeholder="P0511..." defaultValue="P051123456Z" />
                </div>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-black">Support Settings</h2>
                  <p className="text-sm text-gray-500">Manage support tickets and FAQs.</p>
                </div>
                <div className="grid gap-4">
                  <ActionRow label="Live Ticket Kanban Board" desc="Track issues as New, In Progress, Resolved." btnText="Open Board" />
                  <InputRow label="SLA Countdown Engine" desc="Timer limit before SLA breaches (hours)." placeholder="1" defaultValue="1" />
                  <ActionRow label="Dynamic FAQ Ordering" desc="Drag-and-drop FAQ priority ranking." btnText="Order FAQs" />
                  <ActionRow label="God-Mode 'Impersonate'" desc="Securely log in as reporting user to view bug." btnText="Impersonate..." />
                  <ActionRow label="Auto-Responder Templates" desc="Manage pre-written macro replies." btnText="Edit Macros" />
                  <ToggleRow label="Browser Console Extraction" desc="Auto-pull JS errors and attach to tickets." defaultOn />
                  <ActionRow label="Ticket Routing Rules" desc="Route UI bugs to frontend, Math bugs to Python dev." btnText="Routing Map" />
                  <ActionRow label="Support Analytics" desc="Track ticket frequency by advocate." btnText="View Metrics" />
                  <ActionRow label="FAQ Article CMS" desc="Rich-text editor to publish troubleshooting guides." btnText="Write Article" />
                  <ToggleRow label="Live Chat Websocket Monitor" desc="Monitor active real-time support chats." />
                  <ToggleRow label="Email Integration Sync" desc="Auto-create tickets from p3lcodes@gmail.com emails." defaultOn />
                  <InputRow label="Support Phone Number Switcher" desc="Update support hotline globally." placeholder="+254..." defaultValue="+254 141888585" />
                  <ActionRow label="Attachment Viewer" desc="Safely sandbox uploaded bug screenshots." btnText="View Media" />
                  <ActionRow label="Mass Announcement Broadcaster" desc="Send firm-wide resolved bug email." btnText="Broadcast Message" />
                  <ToggleRow label="User Satisfaction Metrics" desc="Send automated 1-5 star rating after closure." defaultOn />
                </div>
              </div>
            )}

            {activeTab === 'devops' && (
              <div className="space-y-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-black">Server Settings</h2>
                  <p className="text-sm text-gray-500">Manage database and deployment rules.</p>
                </div>
                <div className="grid gap-4">
                  <ToggleRow label="GitHub PR Auto-Deploy" desc="Push to main branch goes live to Vercel instantly." defaultOn />
                  <ActionRow label="Vercel Edge Cache Purge" desc="Clear global CDN for stale React builds." btnText="Purge Edge Cache" />
                  <ActionRow label="1-Click Production Rollback" desc="Instantly revert to previous stable Git commit." btnText="ROLLBACK PROD" danger />
                  <ActionRow label="Railway Docker Diagnostics" desc="Live monitoring of FastAPI container RAM/CPU." btnText="View Gauges" />
                  <InputRow label="FastAPI Uvicorn Thread Scaler" desc="Number of Python worker threads." placeholder="4" defaultValue="4" />
                  <ActionRow label="Database Schema Migration GUI" desc="Push raw SQL updates to Supabase safely." btnText="Launch SQL Editor" />
                  <InputRow label="Supabase Connection Limits" desc="PgBouncer connection pool max size." placeholder="100" defaultValue="100" />
                  <ActionRow label="Automated PostgreSQL pg_dump" desc="Trigger hard backup to secondary cloud storage." btnText="Trigger Backup" />
                  <ActionRow label="Python API Latency Heatmaps" desc="Track routes taking > 500ms to resolve." btnText="View Trace Logs" />
                  <ActionRow label="Supabase RLS Generator" desc="Adjust strict Row Level Security rules." btnText="Edit RLS Rules" />
                  <ActionRow label="Secrets Vault Manager" desc="Rotate JWT/API secrets without touching .env." btnText="Rotate Keys" />
                  <ActionRow label="Unhandled Exception Sentry" desc="Dashboard catching fatal Python/React crashes." btnText="Open Sentry" />
                  <ActionRow label="Vercel Webhook Monitor" desc="Catch failed frontend builds (TypeScript errors)." btnText="View Webhooks" />
                  <InputRow label="Supabase JWT Token Expiration" desc="Auth token lifespan in hours." placeholder="24" defaultValue="24" />
                  <ActionRow label="Celery / Task Monitor" desc="Monitor backend queue depth for PDF jobs." btnText="View Queues" />
                  <ToggleRow label="Database Deadlock Alarms" desc="SMS alerts for PostgreSQL query locks." defaultOn />
                  <ToggleRow label="Traffic Geo-Blocking" desc="Block all non-Kenyan IPs via Vercel Edge." />
                  <InputRow label="Rate Limiting (Throttling)" desc="Max API requests per minute per user." placeholder="100" defaultValue="100" />
                  <ToggleRow label="Read-Replica Syncing" desc="Route analytics queries to secondary database." />
                  <ActionRow label="Zero-Downtime Deployment Logs" desc="Watch Docker container swap over." btnText="View Swap Logs" />
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
};
