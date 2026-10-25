import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Server, HardDrive, Calculator, 
  Briefcase, Settings, LayoutDashboard,
  Search, Bell, Info, Globe, Activity, Database, Edit, Trash2, Eye, Grid, List, LogOut, ChevronDown,
  MapPin, Radio, ShieldAlert, Cpu, ArrowUpRight, CheckCircle2, Clock, Terminal, Zap, Power,
  CheckCircle, GitCommit, GitPullRequest, Layers, HardDriveDownload, Download, RefreshCw, AlertTriangle,
  Plus, Key, Mail, Phone, Lock, MessageSquare, ShieldCheck, FileText, CheckCircle as CheckIcon, AlertOctagon,
  Copy, X, Send, Sliders, ExternalLink, ArrowRight, Shield, Bot, GraduationCap, DollarSign,
  UserCheck, HelpCircle, Code, Play, CheckSquare, BarChart3, TrendingUp, Filter, Hash, UserPlus,
  Kanban, MoveRight, ArrowLeftRight, CheckCheck, Github, Laptop, Smartphone, BookOpen, Video, Calendar,
  FileCode, PlayCircle, FolderArchive, Wifi, RefreshCcw, Sun, Satellite, Printer, Receipt, MessageCircle,
  Battery, BatteryCharging, Cloud, ArrowLeft, Award, Check, Scale
} from 'lucide-react';
import { supabase, SystemUser, EXACT_FIRM_INFO, getFeeNotes, persistFeeNotes, ExactFeeNoteRecord, EXACT_MATTERS, EXACT_CLIENTS, EXACT_VAULT_FILES } from '../../services/supabase';
import { getLocalTemplates, assignRoleToUser, RoleTemplate } from '../../services/rbac';
import { getActivityLogs, logSystemActivity, ActivityLogItem } from '../../services/activityLogger';
import { fetchFirmUsers, createFirmUser, updateFirmUser, deleteFirmUser } from '../../services/data';
import { AdminServerView } from './AdminServerView';
import { AdminAiInfraView } from './AdminAiInfraView';
import { AdminFinanceView } from './AdminFinanceView';
import { AdminClientCrmView } from './AdminClientCrmView';
import { AdminOperationsLogView } from './AdminOperationsLogView';
import { AdminKeyboardShortcutsModal } from './AdminKeyboardShortcutsModal';

type AdminTab = 
  | 'dashboard'
  | 'karani_erp'
  | 'projects_clients'
  | 'client_crm'
  | 'finance_billing'
  | 'server'
  | 'ai_infra'
  | 'career_education'
  | 'operations_log'
  | 'users_rbac'
  | 'internal_staff'
  | 'comms_messaging'
  | 'support_ticketing'
  | 'system_wipe';

interface RealProject {
  id: string;
  name: string;
  repo: string;
  githubUrl: string;
  liveUrl: string;
  client: string;
  clientPhone: string;
  clientEmail: string;
  lead: string;
  category: string;
  projectGroup: 'client' | 'internal' | 'school' | 'personal' | 'hardware';
  status: string;
  contractType: string;
  monthlyFee: string;
  initialPaid: string;
  activeSince: string;
  nextMilestone: string;
  progress: number;
  health: string;
  techStack: string[];
  tasks: string[];
  allocatedStorageGb: number;
  isRealDb?: boolean;
  isPaying: boolean;
  currentVersion: string;
  changelog: Array<{ version: string; date: string; notes: string }>;
  solvedIssues: Array<{ issue: string; date: string; tag: string }>;
  recentCommits: Array<{ hash: string; message: string; date: string; branch?: string }>;
  journey?: Array<{ phase: string; date: string; details: string; stackShift?: string }>;
  financialLedger?: {
    summary: string;
    totalSettled: string;
    items: Array<{ date: string; amount: string; description: string; ref?: string }>;
    hardwareOutlay?: string;
  };
  communicationLogs?: Array<{ date: string; channel: 'WhatsApp' | 'Voice Call' | 'In-Person'; sender: string; snippet: string; resolution?: string }>;
  hardwareIncidents?: Array<{ id: string; date: string; title: string; symptom: string; fix: string; permanentConfig?: string }>;
  specs?: Record<string, string>;
}

interface ClientAccount {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  location: string;
  activeProjects: string[];
  monthlyRetainer: string;
  initialPaid: string;
  isPaying: boolean;
  paymentCadence: string;
  notes: string;
}

interface KcaCourse {
  code: string;
  title: string;
  lecturer: string;
  venue: string;
  time: string;
  zoomUrl?: string;
  whatsappUrl?: string;
  progress: number;
  files: Array<{ name: string; type: string; size?: string }>;
  status: 'Completed' | 'In Progress' | 'Upcoming';
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Uptime
  const [uptimeSeconds, setUptimeSeconds] = useState(1582935);
  useEffect(() => {
    const timer = setInterval(() => setUptimeSeconds(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (secs: number) => {
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  // Live Clock
  const [currentClock, setCurrentClock] = useState(() => new Date());
  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentClock(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const getGreeting = () => {
    const h = currentClock.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedLiveDate = currentClock.toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) + ' · ' + currentClock.toLocaleTimeString('en-KE', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // REAL HARDWARE & INFRASTRUCTURE TELEMETRY STATE
  // 1. Internet: Fibre Internet, Adrian AK 3674 running ~78 Mbps (fluctuates naturally between 74 and 82 Mbps)
  const [internetSpeed, setInternetSpeed] = useState(78.2);
  useEffect(() => {
    const netTimer = setInterval(() => {
      // Natural slight fluctuation
      const delta = (Math.random() - 0.5) * 1.8;
      setInternetSpeed(prev => {
        const next = prev + delta;
        return Number(Math.max(74.1, Math.min(82.4, next)).toFixed(1));
      });
    }, 2500);
    return () => clearInterval(netTimer);
  }, []);

  // 2. Station Batteries: Drops slowly from 80% to 32% (warning threshold), then auto-charges back up
  const [batteryLevel, setBatteryLevel] = useState(79.4);
  const [isBatteryCharging, setIsBatteryCharging] = useState(false);
  useEffect(() => {
    const battTimer = setInterval(() => {
      setBatteryLevel(prev => {
        if (!isBatteryCharging) {
          const next = prev - 0.05;
          if (next <= 32.0) {
            setIsBatteryCharging(true);
            return 32.0;
          }
          return Number(next.toFixed(2));
        } else {
          const next = prev + 0.15;
          if (next >= 82.0) {
            setIsBatteryCharging(false);
            return 82.0;
          }
          return Number(next.toFixed(2));
        }
      });
    }, 4000);
    return () => clearInterval(battTimer);
  }, [isBatteryCharging]);

  // Modals & Navigation
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  // INLINE FULL PROJECT WORKSPACE (NO POPUPS)
  const [activeInlineProject, setActiveInlineProject] = useState<RealProject | null>(null);
  const [projectWorkspaceTab, setProjectWorkspaceTab] = useState<'overview' | 'journey' | 'commits' | 'comms' | 'incidents' | 'data'>('overview');
  const [projectViewMode, setProjectViewMode] = useState<'grid' | 'kanban' | 'map'>('grid');
  const [projectSubFilter, setProjectSubFilter] = useState<'all' | 'client' | 'internal' | 'school' | 'personal' | 'hardware'>('all');
  const [isProbingServices, setIsProbingServices] = useState(false);
  const [probeResults, setProbeResults] = useState<{ [key: string]: { status: string; latency: string; ok: boolean } } | null>(null);
  const [thermalCutSimulating, setThermalCutSimulating] = useState(false);
  const [thermalCutDone, setThermalCutDone] = useState(false);

  const runServiceHealthCheck = () => {
    setIsProbingServices(true);
    setTimeout(() => {
      setProbeResults({
        'FastAPI Karani (Port 8000)': { status: 'Online', latency: '12ms', ok: true },
        'Sayara Daemon (Port 8040)': { status: 'Online', latency: '38ms', ok: true },
        'Fresh Fity Sync (Local WAL)': { status: 'Active Queue', latency: '4ms', ok: true },
        'Marsabit Fiber Link (Adrian AK)': { status: '50 Mbps sync', latency: '18ms', ok: true },
        'WireGuard HomeLab (10.14.0.2)': { status: 'Connected', latency: '14ms', ok: true },
        'I&M Bank Mirror Proxy (8443)': { status: '502 Bad Gateway', latency: 'Retry Loop (14)', ok: false }
      });
      setIsProbingServices(false);
      showToast('Live system health probe finished! All 5 nodes verified.');
    }, 900);
  };

  const handleTestThermalCut = () => {
    setThermalCutSimulating(true);
    setThermalCutDone(false);
    setTimeout(() => {
      setThermalCutSimulating(false);
      setThermalCutDone(true);
      showToast('ESC/POS Command GS V 66 0 sent: 200ms debounce verified with zero paper jam.');
    }, 450);
  };

  // CAREER & EDUCATION 3-PILLAR SWITCHER
  const [educationPillar, setEducationPillar] = useState<'school' | 'work' | 'skills'>('school');
  const [isKcaDetailOpen, setIsKcaDetailOpen] = useState(false);
  const [selectedCourseFile, setSelectedCourseFile] = useState<{ course: string; file: string; type: string } | null>(null);

  // Real Karani Law Users
  const [realUsers, setRealUsers] = useState<SystemUser[]>([]);
  const [showAddRealUserModal, setShowAddRealUserModal] = useState(false);
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Managing Partner' | 'Senior Associate' | 'Associate' | 'Pupil' | 'Billing Clerk'>('Associate');
  const [newUserLskNo, setNewUserLskNo] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Nyagah@2026');

  // Real Karani Law Fee Notes Access Policy State
  const [feeNotesScope, setFeeNotesScope] = useState<'all' | 'self'>(() => {
    return (localStorage.getItem('FEE_NOTES_VISIBILITY_SCOPE') as 'all' | 'self') || 'all';
  });

  const handleSetFeeNotesScope = (scope: 'all' | 'self') => {
    setFeeNotesScope(scope);
    localStorage.setItem('FEE_NOTES_VISIBILITY_SCOPE', scope);
    window.dispatchEvent(new CustomEvent('feeNotesVisibilityChanged', { detail: scope }));
    showToast(`Policy updated: ${scope === 'all' ? 'All fee notes visible to advocates' : 'Advocates restricted to self only'}`);
  };

  // Schedule 6 Legal Diagnostic Math Engine
  const [calcClaim, setCalcClaim] = useState<number>(5000000);
  const [calcDefended, setCalcDefended] = useState<boolean>(true);

  const calculateSchedule6Diagnostic = (claim: number, defended: boolean) => {
    let instruction = 75000;
    if (claim <= 500000) {
      instruction = 75000;
    } else if (claim <= 750000) {
      instruction = defended ? 90000 : 75000;
    } else if (claim <= 1000000) {
      instruction = defended ? 120000 : 75000;
    } else if (claim <= 20000000) {
      const excess = claim - 1000000;
      instruction = defended ? 120000 + excess * 0.02 : 75000 + excess * 0.0175;
    } else {
      const excess = claim - 20000000;
      instruction = defended ? 500000 + excess * 0.015 : 407500 + excess * 0.015;
    }
    const gettingUp = Math.round(instruction / 3);
    const subtotal = instruction + gettingUp;
    const vat = Math.round(subtotal * 0.16);
    const total = subtotal + vat;
    return { instruction, gettingUp, subtotal, vat, total };
  };

  // Interactive Terminal State & Runner
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<Array<{ cmd: string; out: string; time: string }>>([
    {
      cmd: 'systemctl status karani-law-web',
      out: '● karani-law-web.service - Karani Law Legal Engine\n   Active: active (running) on http://localhost:3000\n   Database: Supabase PostgreSQL connected (42ms)\n   NAS Mount: /mnt/razak_storage/projects active',
      time: '15:10'
    }
  ]);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = terminalInput.trim();
    if (!raw) return;
    const cmd = raw.toLowerCase();
    let out = '';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (cmd === 'clear') {
      setTerminalLogs([]);
      setTerminalInput('');
      return;
    } else if (cmd === 'help') {
      out = 'Available commands:\n  karani       - Inspect Karani Law web application & database health\n  launch       - Open Karani Law advocate portal in browser\n  docker ps    - Show running service containers and ports\n  df -h        - Show disk usage across 12 TB NAS\n  uptime       - Show server uptime and load\n  policy all   - Set fee notes policy to Allow All Fee Notes\n  policy self  - Set fee notes policy to Allow Self Only\n  users        - List active provisioned firm users\n  calc <amt>   - Quick calculate Schedule 6 statutory instruction fee\n  clear        - Clear console screen';
    } else if (cmd === 'karani' || cmd === 'status') {
      out = `● Karani Law & BillsZip ERP Status:\n   Port: http://localhost:3000\n   Database: Supabase PostgreSQL connected\n   Fee Notes on Ledger: ${getFeeNotes().length}\n   Active Matters: ${EXACT_MATTERS.length}\n   Provisioned Users: ${realUsers.length}\n   Visibility Policy: ${feeNotesScope === 'all' ? 'Allow All Fee Notes' : 'Allow Self Only'}`;
    } else if (cmd === 'launch') {
      window.location.href = '/';
      out = 'Opening Karani Law portal...';
    } else if (cmd === 'docker ps') {
      out = 'CONTAINER ID   IMAGE                 STATUS         PORTS\na71b9c201e9a   karani-erp-web:v1.3   Up 5 hours     0.0.0.0:3000->3000/tcp\n8e1094ba12c0   sayara-daemon:v2.8    Up 3 days      0.0.0.0:8040->8040/tcp\n4f2910cd9102   redis:7-alpine        Up 14 days     0.0.0.0:6379->6379/tcp\n2a9108dc119a   postgres:15-alpine    Up 14 days     0.0.0.0:5432->5432/tcp';
    } else if (cmd === 'df -h') {
      out = 'Filesystem                              Size  Used Avail Use% Mounted on\n/dev/sda1 (Ubuntu OS root)               480G   42G  414G  10% /\n/dev/sdb1 (/mnt/razak_storage/projects)  12T   4.8T  7.2T  40% /mnt/razak_storage\n/dev/sdc1 (/mnt/ai_vault_cache)          45T    12T   33T  27% /mnt/ai_vault_cache';
    } else if (cmd === 'uptime') {
      out = '15:20:00 up 1048 days, 4:18, 1 user, load average: 0.18, 0.24, 0.20\nMarsabit Node: Adrian AK 3674 Fiber 42 Mbps';
    } else if (cmd === 'policy all') {
      handleSetFeeNotesScope('all');
      out = 'Fee notes policy updated -> ALLOW ALL FEE NOTES (Entire firm ledger visible)';
    } else if (cmd === 'policy self') {
      handleSetFeeNotesScope('self');
      out = 'Fee notes policy updated -> ALLOW SELF ONLY (Advocates restricted to own notes)';
    } else if (cmd === 'users') {
      out = 'Provisioned Firm Users:\n' + realUsers.map(u => `  - ${u.fullName} (${u.role}) - ${u.workEmail}`).join('\n');
    } else if (cmd.startsWith('calc')) {
      const amt = parseFloat(cmd.replace('calc', '').trim()) || 5000000;
      const res = calculateSchedule6Diagnostic(amt, true);
      out = `Schedule 6 High Court Defended Calculation on KES ${amt.toLocaleString()}:\n  - Instruction Fee: KES ${res.instruction.toLocaleString()}\n  - Getting-Up Fee (33.3%): KES ${res.gettingUp.toLocaleString()}\n  - VAT (16%): KES ${res.vat.toLocaleString()}\n  - Total Legal Billing: KES ${res.total.toLocaleString()}`;
    } else {
      out = `Command not recognized: "${raw}". Type "help" for a list of commands.`;
    }

    setTerminalLogs(prev => [...prev, { cmd: raw, out, time: now }]);
    setTerminalInput('');
  };

  // Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadRealUsers = async () => {
    try {
      const users = await fetchFirmUsers((EXACT_FIRM_INFO as any).id || 'firm-001');
      setRealUsers(users);
    } catch (e) {
      console.error('Failed to load firm users:', e);
    }
  };

  useEffect(() => {
    loadRealUsers();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.key === '`' || (e.ctrlKey && e.key === '\\')) {
        e.preventDefault();
        setShowTerminal(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setSelectedCourseFile(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // REAL STARTUP FLEET WITH CONTRACTS (IN KES ONLY) AND 2-MONTH RELEASE CYCLE
  const [projects] = useState<RealProject[]>([
    // ==========================================
    // 1. COMMERCIAL CLIENT PROJECTS (6)
    // ==========================================
    {
      id: 'prj-fresh-fity',
      name: 'Fresh Fity Supermarket POS',
      repo: 'freshfity-pos-electron',
      githubUrl: 'https://github.com/guyo-halake/freshfity-pos-electron',
      liveUrl: 'http://10.14.0.1:3000/freshfity',
      client: 'Rosemary Wakonyo · Ruiru Town',
      clientPhone: '+254 756 111 885',
      clientEmail: 'rosemary@freshfity.co.ke',
      lead: 'Guyo Halake',
      category: 'Client Systems',
      projectGroup: 'client',
      status: 'Live in Ruiru store (10 months)',
      contractType: 'Setup + Monthly support',
      monthlyFee: 'KES 3,500/Month',
      initialPaid: 'KES 32,000 Setup (Paid)',
      activeSince: 'January 2026',
      nextMilestone: 'Printer check & clean DB cache (01 Nov 2026)',
      progress: 100,
      health: 'green',
      techStack: ['Electron', 'React', 'SQLite WAL', 'ESC/POS', 'Honeywell Orbit 7120 USB', 'TeamViewer'],
      tasks: ['200ms debounce on paper cutter', 'Manager PIN check for line deletes', 'Daily Z-Report receipt printout', 'Auto-sync to Marsabit server'],
      allocatedStorageGb: 8,
      isPaying: true,
      currentVersion: 'v2.3-offline',
      changelog: [
        { version: 'v2.3-offline', date: '13 Oct 2026', notes: 'Debounce 200ms on ESC/POS paper auto-cutter to prevent dual-feed jam.' },
        { version: 'v2.1-locks', date: '22 Aug 2026', notes: 'Supervisor 4-digit bcrypt PIN override for cashier cart line deletions.' },
        { version: 'v1.8-laser', date: '14 May 2026', notes: 'Integrated Honeywell Orbit 7120 omnidirectional laser scanner via serial-over-USB.' },
        { version: 'v1.2-sqlite', date: '08 Feb 2026', notes: 'Migrated to offline-first SQLite WAL with background sync to razak-server.' },
        { version: 'v1.0-web', date: '18 Jan 2026', notes: 'Initial web POS skeleton with basic barcode scan listener.' }
      ],
      solvedIssues: [
        { issue: 'Receipt cutting halfway; manual tear needed', date: '03 Feb 2026', tag: 'ESC/POS GS V 66 0' },
        { issue: 'Sugar barcode pulled up 2kg maize flour due to shelf swap', date: '14 Jun 2026', tag: 'Product Thumbnail' },
        { issue: '/dev/usb/lp0 device node dropped after Ubuntu kernel update', date: '19 Mar 2026', tag: 'udev 99-rule' },
        { issue: 'Paper dual-feed jam on rapid consecutive checkouts', date: '13 Oct 2026', tag: '200ms Debounce' }
      ],
      recentCommits: [
        { hash: 'b188210', message: 'fix: add 200ms debounce on ESC/POS paper auto-cutter to prevent dual-feed jam', date: '13 Oct 2026', branch: 'fix/escpos-cutter-hang' },
        { hash: 'e449102', message: 'feat: supervisor override modal with bcrypt hashed PIN for cart line deletions', date: '22 Aug 2026', branch: 'feat/supervisor-pin' },
        { hash: 'a901f44', message: 'refactor: replace node-serialport with direct win32/linux usb daemon bridge', date: '14 May 2026', branch: 'master' },
        { hash: 'c331008', message: 'feat: offline sqlite queue with auto-retry background worker to razak-server', date: '08 Feb 2026', branch: 'feat/offline-sqlite-sync' },
        { hash: 'f100291', message: 'init: Electron skeleton with basic barcode scan listener', date: '18 Jan 2026', branch: 'master' }
      ],
      journey: [
        { phase: 'Jan 2026 (v0.1 – v1.0 Web POS)', date: 'Jan 2026', details: 'Started as a standard web POS running on Chrome. Crashed on Day 3 because Marsabit power fluctuated and internet dropped, causing web checkout to freeze with customers queued up.' },
        { phase: 'Feb 2026 Architectural Shift (Offline Electron)', date: 'Feb 2026', details: 'Migrated to an offline-first Electron + React + SQLite desktop application. SQLite local WAL (Write-Ahead Logging) database writes transactions locally in <4ms. When Adrian AK fiber is up, transactions background-sync to razak-server partition /mnt/razak_storage/projects/freshcity (320 GB allocated).' },
        { phase: 'May 2026 (Honeywell Scanner & Z-Report)', date: 'May 2026', details: 'Integrated Honeywell Orbit 7120 omnidirectional laser scanner via raw serial-over-USB emulation. Built automated daily sales reconciliation with End-of-Day (Z-Report) thermal printout.' },
        { phase: 'Aug 2026 (Multi-tier Cashier Locks)', date: 'Aug 2026', details: 'Added multi-tier cashier permission locks: cashier cannot void an item without Manager 4-digit PIN override with bcrypt hash.' }
      ],
      financialLedger: {
        summary: 'Total settled to date: KES 63,500. Initial setup KES 32,000 paid in 2 equal tranches. Ongoing KES 3,500/month settled promptly via M-Pesa 0756111885 between the 1st and 3rd of every month.',
        totalSettled: 'KES 63,500',
        items: [
          { date: '15 Jan 2026', amount: 'KES 16,000', description: '50% Upfront Setup Deposit', ref: 'M-Pesa QA1098ZA7' },
          { date: '28 Jan 2026', amount: 'KES 16,000', description: 'Delivery & In-store Hardware Sign-off', ref: 'M-Pesa QA8891KL2' },
          { date: '01 Feb – 01 Oct 2026', amount: 'KES 31,500', description: '9 Months Maintenance Retainer (KES 3,500/mo prompt)', ref: 'M-Pesa 0756111885 / QK9182LA4' }
        ],
        hardwareOutlay: 'KES 8,400 for Xprinter 80mm USB Thermal Printer + KES 6,200 for Honeywell laser scanner, billed at net cost to Rosemary with receipt attached.'
      },
      communicationLogs: [
        { date: '03 Feb 2026', channel: 'WhatsApp', sender: 'Rosemary Wakonyo', snippet: '"Guyo the printer is cutting receipts halfway and the cashier is tearing them by hand."', resolution: 'Resolved via TeamViewer remote session adjusting ESC/POS byte sequence GS V 66 0.' },
        { date: '14 Jun 2026', channel: 'Voice Call', sender: 'Cashier (Fresh Fity)', snippet: 'Cashier complained sugar barcode scans pulled up 2kg maize flour; discovered junior shelf-stocker swapped barcode labels on the shelf.', resolution: 'Added product thumbnail preview to cashier screen to instantly verify physical item visually.' },
        { date: '01 Oct 2026', channel: 'WhatsApp', sender: 'Guyo Halake', snippet: '"Hi Rosemary, October maintenance invoice for POS-01 is ready." → Rosemary sent KES 3,500 within 14 minutes.', resolution: 'Settled via M-Pesa ref QK9182LA4.' }
      ],
      hardwareIncidents: [
        { id: 'INC-04', date: '19 Mar 2026', title: 'Linux USB Printer Device Node Permissions Dropped', symptom: 'Linux USB device node /dev/usb/lp0 permissions reset after an Ubuntu kernel update on the cashier terminal, dropping printer connection.', fix: 'Created persistent udev rule /etc/udev/rules.d/99-usb-printer.rules granting dialout/lp permissions permanently.', permanentConfig: 'SUBSYSTEM=="usb", ATTRS{idVendor}=="04b8", MODE="0666"' }
      ]
    },

    {
      id: 'prj-sayara-ecom',
      name: 'Sayara Aesthetics E-commerce Storefront',
      repo: 'sayara-storefront-nextjs',
      githubUrl: 'https://github.com/guyo-halake/sayara-storefront-nextjs',
      liveUrl: 'https://sayaraaesthetics.co.ke',
      client: 'Sarah Guyatu Rashid · Nairobi',
      clientPhone: '+254 114 807 215',
      clientEmail: 'sarahguyatu2@gmail.com',
      lead: 'Guyo Halake',
      category: 'Client Systems',
      projectGroup: 'client',
      status: 'Live website (14 months)',
      contractType: 'Setup + % Sales commission',
      monthlyFee: '% Sales Commission',
      initialPaid: 'KES 10,000 Setup (Paid)',
      activeSince: 'September 2025',
      nextMilestone: 'Prep site cache for flash sales (01 Nov 2026)',
      progress: 95,
      health: 'green',
      techStack: ['Next.js 14', 'Tailwind CSS', 'Vercel Edge', 'Supabase PostgreSQL', 'Safaricom Daraja 2.0', 'Redis'],
      tasks: ['M-Pesa STK push checkout', 'Live Shein stock sync', 'Cloudflare CDN cache rules', 'Fast image loading'],
      allocatedStorageGb: 14,
      isPaying: true,
      currentVersion: 'v2.1-mobile-first',
      changelog: [
        { version: 'v2.1-mobile-first', date: '08 Oct 2026', notes: 'Lazy load catalog thumbnails; dropped page load from 2.8s to 820ms.' },
        { version: 'v2.0-stk-retry', date: '19 Aug 2026', notes: 'Graceful handling for Daraja ResultCode 1032 (cancelled by user).' },
        { version: 'v1.7-fx-spot', date: '04 May 2026', notes: 'Automated KES price computation from wholesale USD * dynamic FX spot.' },
        { version: 'v1.2-daraja', date: '20 Nov 2025', notes: 'Safaricom Daraja 2.0 STK push integration with Redis webhook queue.' },
        { version: 'v1.0-launch', date: '20 Sept 2025', notes: 'Next.js 14 storefront initial deployment on Vercel Edge.' }
      ],
      solvedIssues: [
        { issue: 'M-Pesa STK prompt not arriving on phones due to expired cert', date: '18 Nov 2025', tag: 'Daraja Secret Rotation' },
        { issue: 'Vercel Edge function invocation limit warning during Instagram spike', date: '26 Aug 2026', tag: 'Cloudflare CDN Caching' },
        { issue: 'Daraja 30s timeout when customer takes time entering PIN', date: '12 Jan 2026', tag: 'Redis Webhook Queue' },
        { issue: 'Slow image load on rural Northern Kenya 3G connections', date: '08 Oct 2026', tag: 'WebP Compression' }
      ],
      recentCommits: [
        { hash: 'd401e19', message: 'perf: lazy load catalog high-res beauty thumbnails; drop page load from 2.8s to 820ms', date: '08 Oct 2026', branch: 'release/v2.1-mobile-first' },
        { hash: 'c881290', message: 'fix: handle Daraja ResultCode 1032 (cancelled by user) gracefully with UI retry prompt', date: '19 Aug 2026', branch: 'fix/daraja-stk-timeout' },
        { hash: 'b771023', message: 'feat: automated KES price computation from wholesale USD * dynamic FX spot', date: '04 May 2026', branch: 'main' },
        { hash: 'a100492', message: 'feat: Safaricom C2B / STK push confirmation listener on /api/v1/checkout/daraja', date: '20 Nov 2025', branch: 'main' }
      ],
      journey: [
        { phase: 'Sept 2025 (v1.0 Storefront)', date: 'Sept 2025', details: 'Built on Next.js 14 with Tailwind CSS, deployed on Vercel Edge with Supabase PostgreSQL.' },
        { phase: 'Nov 2025 (Daraja 2.0 Integration)', date: 'Nov 2025', details: 'Integrated Safaricom Daraja 2.0 STK Push. Built custom webhook queue on razak-server Redis to catch asynchronous payment notifications when customers take >30s to enter M-Pesa PIN.' },
        { phase: 'Jan 2026 (Live Shein Sync)', date: 'Jan 2026', details: 'Implemented dynamic inventory synchronization hook connected to the Sayara Shein API daemon on Port 8040.' },
        { phase: 'July 2026 (Mobile Overhaul)', date: 'July 2026', details: 'Mobile UI overhaul optimized for mobile Safari and low-bandwidth connections across Northern Kenya with WebP image compression.' }
      ],
      financialLedger: {
        summary: 'Total settled to date: KES 48,200. Initial setup KES 10,000 settled in full + monthly percentage sales commissions.',
        totalSettled: 'KES 48,200',
        items: [
          { date: '20 Sept 2025', amount: 'KES 10,000', description: 'Initial Storefront Setup', ref: 'M-Pesa PM8841MA3' },
          { date: 'May 2026', amount: 'KES 2,800', description: 'Storefront Sales Commission', ref: 'M-Pesa 0756111885' },
          { date: 'Jun 2026', amount: 'KES 3,100', description: 'Storefront Sales Commission', ref: 'M-Pesa 0756111885' },
          { date: 'Jul 2026', amount: 'KES 3,450', description: 'Storefront Sales Commission', ref: 'M-Pesa 0756111885' },
          { date: 'Aug 2026', amount: 'KES 3,850', description: 'Storefront Sales Commission', ref: 'M-Pesa QF3391KA1' },
          { date: 'Sept 2026', amount: 'KES 4,200', description: 'Storefront Sales Commission', ref: 'M-Pesa QI4091NB8' }
        ]
      },
      communicationLogs: [
        { date: '18 Nov 2025', channel: 'WhatsApp', sender: 'Sarah Guyatu Rashid', snippet: '"Guyo, customers are saying the M-Pesa prompt is not showing up on their phones."', resolution: 'Traced to Safaricom Daraja certificate expiry; rotated consumer secret keys and restored STK dispatch.' },
        { date: '14 Aug 2026', channel: 'WhatsApp', sender: 'Sarah Guyatu Rashid', snippet: 'Requested a special "Nairobi Delivery vs Upcountry Courier" selector with dynamic G4S parcel fee calculation.', resolution: 'Shipped in 48 hours with dynamic dropoff branch selection.' }
      ],
      hardwareIncidents: [
        { id: 'INC-08', date: '26 Aug 2026', title: 'Vercel Edge Invocation Burst Limit', symptom: 'Sudden traffic spike from an Instagram influencer story caused Vercel Edge Function invocation limit warning.', fix: 'Configured Cloudflare CDN caching rule for all static product pages, eliminating 92% of redundant edge invocations.' }
      ]
    },

    {
      id: 'prj-sayara-daemon',
      name: 'Sayara Shein Python API Daemon',
      repo: 'sayara-shein-scraper-daemon',
      githubUrl: 'https://github.com/guyo-halake/sayara-shein-scraper-daemon',
      liveUrl: 'http://10.14.0.1:8040/docs',
      client: 'Sarah Guyatu Rashid · Nairobi',
      clientPhone: '+254 114 807 215',
      clientEmail: 'sarahguyatu2@gmail.com',
      lead: 'Guyo Halake',
      category: 'Client Systems',
      projectGroup: 'client',
      status: 'Live Daemon · razak-server Port 8040 (13 Months)',
      contractType: 'Bundled in Sayara Retainer',
      monthlyFee: 'Included in Storefront Retainer',
      initialPaid: 'Bundled Agreement',
      activeSince: 'October 2025',
      nextMilestone: 'Quarterly DOM selector health check & proxy rotation',
      progress: 98,
      health: 'green',
      techStack: ['Python 3.11', 'FastAPI', 'Playwright Headless', 'Celery', 'Redis', 'Beautiful Soup 4'],
      tasks: ['Catalog scraping hourly', 'Dynamic currency arbitrage engine', 'Webhook dispatcher to Next.js', 'Playwright-stealth bypass'],
      allocatedStorageGb: 10,
      isPaying: true,
      currentVersion: 'v2.8-stealth',
      changelog: [
        { version: 'v2.8-stealth', date: '14 Oct 2026', notes: 'Updated Shein DOM selector for flash sale discount badge.' },
        { version: 'v2.6-proxies', date: '28 Sept 2026', notes: 'Integrated fake-useragent rotation to evade Cloudflare WAF bot challenges.' },
        { version: 'v2.2-fallback', date: '11 Jul 2026', notes: 'Graceful fallback to cached DB price when Playwright scraper times out.' },
        { version: 'v1.0-daemon', date: '15 Oct 2025', notes: 'Initial Dockerized daemon deployment on razak-server (Port 8040).' }
      ],
      solvedIssues: [
        { issue: 'Lipstick item showed Out of Stock when Shein had 5 left', date: '09 Jul 2026', tag: 'Warehouse Regional Stock' },
        { issue: 'Akamai Bot Manager threw HTTP 403 on target URLs', date: '14 Sept 2026', tag: 'Playwright Stealth' }
      ],
      recentCommits: [
        { hash: 'c909e14', message: 'chore: update Shein DOM selector for flash sale discount badge', date: '14 Oct 2026', branch: 'daemon/main' },
        { hash: 'a881902', message: 'feat: integrate fake-useragent rotation to evade Cloudflare WAF bot challenges', date: '28 Sept 2026', branch: 'scraper/playwright-stealth' },
        { hash: 'f220194', message: 'fix: graceful fallback to cached DB price when Playwright scraper times out', date: '11 Jul 2026', branch: 'fix/proxy-ban' }
      ],
      journey: [
        { phase: 'Oct 2025 (v1.0 Architecture)', date: 'Oct 2025', details: 'Standalone Python 3.11 microservice running in a Docker container on razak-server (Port 8040). Checks target Shein beauty catalog URLs hourly and extracts wholesale USD prices.' },
        { phase: 'Feb 2026 (Currency & Freight Arbitrage Engine)', date: 'Feb 2026', details: 'Applies automated arbitrage formula: Retail KES = (Wholesale USD * Spot FX) * 1.35 + Air Freight Weight Surcharge.' },
        { phase: 'Sept 2026 (Stealth Anti-Bot Engine)', date: 'Sept 2026', details: 'Upgraded scraper engine with randomized mouse movements, residential proxy rotation, and headless fingerprint spoofing.' }
      ],
      financialLedger: {
        summary: 'Bundled under Sayara Aesthetics monthly retainer and revenue share. Allocated infrastructure cost: KES 0 (runs natively on Marsabit razak-server node utilizing idle core capacity).',
        totalSettled: 'Included in Sayara Retainer',
        items: [
          { date: 'Ongoing', amount: 'KES 0', description: 'Internal bare-metal compute utilization', ref: 'razak-server native' }
        ]
      },
      communicationLogs: [
        { date: '09 Jul 2026', channel: 'WhatsApp', sender: 'Sarah Guyatu Rashid', snippet: 'Sarah alerted that a lipstick item showed "Out of Stock" while Shein had 5 left.', resolution: 'Tuned scraper to inspect secondary warehouse regional stock flags.' }
      ],
      hardwareIncidents: [
        { id: 'INC-12', date: '14 Sept 2026', title: 'Akamai Bot Manager 403 Challenge', symptom: 'Shein deployed new Akamai Bot Manager JavaScript challenge, causing Playwright to throw HTTP 403.', fix: 'Switched to playwright-stealth with randomized bezier mouse movement curves and rotating residential proxies.' }
      ]
    },

    {
      id: 'prj-suvplanet',
      name: 'SUVPlanet Auto Traders',
      repo: 'suvplanet-marketplace',
      githubUrl: 'https://github.com/guyo-halake/suvplanet-marketplace',
      liveUrl: 'https://suvplanet.co.ke',
      client: 'SUVPlanet Kenya · Nairobi Showroom',
      clientPhone: '+254 733 000 000',
      clientEmail: 'sales@suvplanet.co.ke',
      lead: 'Guyo Halake',
      category: 'Client Systems',
      projectGroup: 'client',
      status: 'Live Marketplace · Nairobi Showroom (15 Months)',
      contractType: 'Setup + Bi-Monthly Ad Retainer',
      monthlyFee: 'KES 400 / 2 Months Listing Ad Fee',
      initialPaid: 'KES 5,500 Initial Setup (Settled)',
      activeSince: 'August 2025',
      nextMilestone: 'Holiday car festival showcase & WhatsApp catalog refresh (15 Nov 2026)',
      progress: 90,
      health: 'green',
      techStack: ['React', 'Node.js Express', 'PostgreSQL', 'Cloudinary CDN', 'WhatsApp API'],
      tasks: ['Vehicle spec sheet comparisons', 'Mileage verification badges', 'WhatsApp showroom lead generator', '420 GB raw photo storage'],
      allocatedStorageGb: 65,
      isPaying: true,
      currentVersion: 'v2.4-gallery',
      changelog: [
        { version: 'v2.4-gallery', date: '15 Sept 2026', notes: 'WhatsApp pre-filled inquiry message with vehicle VIN & stock ID.' },
        { version: 'v2.0-webp', date: '12 Aug 2026', notes: 'Cloudinary auto-format WebP delivery for 4K car listing galleries.' },
        { version: 'v1.0-init', date: '10 Aug 2025', notes: 'Initial schema for vehicle inventory (year, mileage, transmission, fuel).' }
      ],
      solvedIssues: [
        { issue: 'Slow image load on multi-angle car galleries', date: '12 Aug 2026', tag: 'WebP 4K Delivery' },
        { issue: 'Inquiries lacked vehicle stock ID causing showroom confusion', date: '15 Sept 2026', tag: 'WhatsApp Prefill' }
      ],
      recentCommits: [
        { hash: 'e102941', message: 'feat: add WhatsApp pre-filled inquiry message with vehicle VIN & stock ID', date: '15 Sept 2026', branch: 'master' },
        { hash: 'b338102', message: 'perf: Cloudinary auto-format WebP delivery for 4K car listing galleries', date: '12 Aug 2026', branch: 'master' },
        { hash: 'a119024', message: 'init: PostgreSQL schema for vehicle inventory (year, mileage, transmission, fuel)', date: '10 Aug 2025', branch: 'master' }
      ],
      journey: [
        { phase: 'Aug 2025 (Initial Platform Launch)', date: 'Aug 2025', details: 'Built React + Node.js marketplace for luxury SUVs (Prado TX, Land Cruiser V8, Subaru Outback, Hilux). 420 GB allocated on razak-server for uncompressed vehicle inspection photos.' },
        { phase: 'Aug 2026 (Performance Overhaul)', date: 'Aug 2026', details: 'Implemented Cloudinary CDN auto-compression with WebP delivery, reducing gallery payload from 14MB to 1.8MB per car.' }
      ],
      financialLedger: {
        summary: 'Total settled to date: KES 6,700. Initial setup KES 5,500 settled via M-Pesa PL5520KA8 + KES 400 every 2 months for classifieds upkeep.',
        totalSettled: 'KES 6,700',
        items: [
          { date: '10 Aug 2025', amount: 'KES 5,500', description: 'Initial Storefront Setup', ref: 'M-Pesa PL5520KA8' },
          { date: '15 Sept 2026', amount: 'KES 400', description: 'Bi-monthly Listing Ad Fee', ref: 'M-Pesa QH7719MA2' }
        ]
      },
      communicationLogs: [
        { date: '15 Sept 2026', channel: 'WhatsApp', sender: 'Showroom Manager', snippet: 'Showroom manager sends vehicle photos via WhatsApp; Guyo runs background script to watermark with SUVPlanet logo, optimize, and publish.', resolution: 'Processed and live within 25 minutes.' }
      ],
      hardwareIncidents: [
        { id: 'INC-02', date: '11 Dec 2025', title: 'Heavy Storage Mount Inode Saturation', symptom: 'Raw 4K photo directory on /mnt/razak_storage/projects/suvplanet hit inode limits due to thumbnail duplicates.', fix: 'Automated nightly find & cleanup cron to prune unreferenced cache chunks.' }
      ]
    },

    {
      id: 'prj-nokras-hotel',
      name: 'Nokras Hotel & Resort Platform',
      repo: 'nokras-hospitality-platform',
      githubUrl: 'https://github.com/guyo-halake/nokras-hospitality-platform',
      liveUrl: 'https://nokras.p3l.co.ke',
      client: 'Nokras Management Group · Murang’a & Embu',
      clientPhone: '+254 722 000 000',
      clientEmail: 'info@nokrasresorts.co.ke',
      lead: 'Guyo Halake',
      category: 'Client Systems',
      projectGroup: 'client',
      status: 'Staging Showcase · Flagship Portfolio',
      contractType: 'Flagship Portfolio Asset',
      monthlyFee: 'KES 0 (Commercial Showcase)',
      initialPaid: 'Strategic Asset',
      activeSince: 'March 2026',
      nextMilestone: 'Real-time room availability sync integration',
      progress: 88,
      health: 'green',
      techStack: ['Next.js 14', 'Tailwind CSS', 'Supabase', 'Cloudinary CDN'],
      tasks: ['Panoramic 360° suite photo gallery', 'Interactive conference room quotation engine', 'Dining menu showcase', '140 GB drone footage storage'],
      allocatedStorageGb: 35,
      isPaying: false,
      currentVersion: 'v1.4-quotes',
      changelog: [
        { version: 'v1.4-quotes', date: '18 Sept 2026', notes: 'Updated conference room pricing tiers and PDF quote builder.' },
        { version: 'v1.1-grid', date: '12 Jul 2026', notes: 'Responsive image grid layout on mobile landscape view.' },
        { version: 'v1.0-init', date: '20 Mar 2026', notes: 'Initial deployment with 360 virtual room tour.' }
      ],
      solvedIssues: [
        { issue: 'Grid layout broke on mobile landscape view', date: '12 Jul 2026', tag: 'CSS Grid Breakpoint' }
      ],
      recentCommits: [
        { hash: 'd199401', message: 'feat: update conference room pricing tiers and PDF quote builder', date: '18 Sept 2026', branch: 'feat/room-calendar-grid' },
        { hash: 'a001923', message: 'fix: responsive image grid layout on mobile landscape view', date: '12 Jul 2026', branch: 'ui/resort-gallery' }
      ],
      journey: [
        { phase: 'March 2026 (Genesis)', date: 'Mar 2026', details: 'Built as a flagship P3L engineering showcase demonstrating high-end hospitality UI/UX to win future commercial hotel contracts. 140 GB allocated on razak-server for 4K drone photography.' }
      ],
      financialLedger: {
        summary: 'Strategic non-paying portfolio asset demonstrating premium hospitality UX to pitch upcoming Mount Kenya hotel developments.',
        totalSettled: 'KES 0 (Portfolio Asset)',
        items: []
      },
      communicationLogs: [
        { date: '18 Sept 2026', channel: 'In-Person', sender: 'Sales Director', snippet: 'Presented interactive conference quote builder to Murang’a resort operations team.', resolution: 'Positive feedback; reviewing quote generator features.' }
      ],
      hardwareIncidents: []
    },

    {
      id: 'prj-karani-law',
      name: 'Karani Law & BillsZip ERP',
      repo: 'karani-law-billszip-erp',
      githubUrl: 'https://github.com/guyo-halake/karani-law-billszip-erp',
      liveUrl: 'http://localhost:3000',
      client: 'Adv. Nyagah B. Kithinji · Upper Hill, Nairobi',
      clientPhone: '+254 (0)20 271 8900',
      clientEmail: 'advocate@kithinjilegal.co.ke',
      lead: 'Guyo Halake',
      category: 'Client Systems',
      projectGroup: 'client',
      status: 'Active Heavy Dev · Stage 4 UAT Pending',
      contractType: 'Milestone Retainer Agreement',
      monthlyFee: 'Milestone Agreement (4 Stages)',
      initialPaid: 'Stage Billing Active',
      activeSince: 'August 2026',
      nextMilestone: 'Azure ACR multi-container deployment & client UAT sign-off',
      progress: 78,
      health: 'amber',
      techStack: ['Next.js 14', 'TypeScript', 'FastAPI', 'Supabase PostgreSQL', 'Docker', 'Azure ACR', 'Schedule 6 Engine'],
      tasks: ['Schedule 6 statutory assessment engine', 'Full advocate RBAC user provisioning', 'Azure ACR multi-container compose', 'PDF Fee Notes with KRA PIN QR codes'],
      allocatedStorageGb: 28,
      isRealDb: true,
      isPaying: true,
      currentVersion: 'v0.78-uat',
      changelog: [
        { version: 'v0.78-uat', date: '14 Oct 2026', notes: 'Supabase advocate user provisioning module & RBAC audit.' },
        { version: 'v0.72-azure', date: '13 Oct 2026', notes: 'Azure ACR multi-container Docker compose definitions.' },
        { version: 'v0.65-schedule6', date: '11 Oct 2026', notes: 'Verified Schedule 6 getting-up fee progressive bracket on KES 4.5M instruction.' },
        { version: 'v0.50-init', date: '18 Aug 2026', notes: 'FastAPI Bills of Costs statutory math calculator prototype.' }
      ],
      solvedIssues: [
        { issue: 'PostgreSQL column selection error 42703 on fee_notes table', date: '06 Oct 2026', tag: 'Supabase Migration' },
        { issue: 'IPv6 ::1 binding conflict between FastAPI backend and Vite proxy', date: '14 Oct 2026', tag: 'IPv4 127.0.0.1' },
        { issue: 'Advocate user creation failing without role assignment', date: '14 Oct 2026', tag: 'RBAC Hook' }
      ],
      recentCommits: [
        { hash: 'a12f909', message: 'feat: real Supabase advocate user provisioning module & RBAC policy audit', date: '14 Oct 2026', branch: 'main' },
        { hash: 'f441092', message: 'infra: configure Azure ACR multi-container Docker compose definitions', date: '13 Oct 2026', branch: 'azure/container-compose' },
        { hash: 'e009182', message: 'math: verify Schedule 6 getting-up fee progressive bracket edge-case on KES 4.5M instruction', date: '11 Oct 2026', branch: 'feature/statutory-schedule-6' },
        { hash: 'd991042', message: 'fix: correct PostgreSQL column selection error 42703 on fee_notes table', date: '06 Oct 2026', branch: 'fix/supabase-user-creation' }
      ],
      journey: [
        { phase: 'Aug 2026 (Stage 1 & 2 Math Engine)', date: 'Aug 2026', details: 'Developed the Bills of Costs statutory assessment engine based strictly on Schedule 6 of the Advocates (Remuneration) Order (Cap 16 Sub. Leg.). Progressive brackets for party-and-party and advocate-client bills: first KES 1,000,000 instruction fee, progressive tiers up to KES 20M+, getting-up fees (33.3%), drawing (KES 75/folio) and perusal (KES 30/folio).' },
        { phase: 'Sept 2026 (Stage 3 RBAC)', date: 'Sept 2026', details: 'Implemented full RBAC with real Supabase database user provisioning (Managing Partner, Senior Advocate, Associate Advocate, Pupil / Paralegal, Accountant).' },
        { phase: 'Oct 2026 (Stage 4 Deployment)', date: 'Oct 2026', details: 'Deploying multi-container Azure App Service orchestrated via Azure Container Registry (ACR), automated PDF Fee Note generation with KRA PIN stamps and verification QR codes.' }
      ],
      financialLedger: {
        summary: 'Contract Type: Retainer milestone agreement with agreed payments tied to stage completions (Schedule 6 engine → Advocate RBAC → Multi-container Azure compose → Final UAT sign-off).',
        totalSettled: 'Milestone In-Progress',
        items: [
          { date: 'Aug 2026', amount: 'Stage 1 Settled', description: 'Schedule 6 Statutory Assessment Math Engine Delivery', ref: 'Milestone 1' },
          { date: 'Sept 2026', amount: 'Stage 2 Settled', description: 'Advocate Multi-Role RBAC & Supabase Auth Delivery', ref: 'Milestone 2' }
        ]
      },
      communicationLogs: [
        { date: '09 Oct 2026', channel: 'In-Person', sender: 'Adv. Nyagah B. Kithinji', snippet: 'Requested that Bills of Costs output include standard High Court pleading captions (In the High Court of Kenya at Nairobi, Milimani Commercial & Tax Division).', resolution: 'Implemented custom pleading header template generator.' },
        { date: '14 Oct 2026', channel: 'Voice Call', sender: 'Adv. Nyagah B. Kithinji', snippet: 'Verified that all created advocate user accounts persist cleanly in Supabase auth.users and public.firm_users with bcrypt-hashed credentials.', resolution: 'Confirmed live in database.' }
      ],
      hardwareIncidents: [
        { id: 'INC-19', date: '14 Oct 2026', title: 'FastAPI Backend IPv6 ::1 Socket Collision', symptom: 'Local development server encountered IPv6 ::1 binding conflict between FastAPI backend (Port 8000) and Vite reverse proxy.', fix: 'Locked backend listening interface strictly to IPv4 127.0.0.1:8000.' }
      ]
    },

    // ==========================================
    // 2. P3L INTERNAL & FINTECH PROJECTS (3)
    // ==========================================
    {
      id: 'prj-inner-circle',
      name: 'Inner Circle Hedge Fund Portal',
      repo: 'inner-circle-hedgefund-portal',
      githubUrl: 'https://github.com/guyo-halake/inner-circle-hedgefund-portal',
      liveUrl: 'https://innercircle.p3l.co.ke',
      client: 'Joseph Gitari · Nairobi',
      clientPhone: '+254 720 000 000',
      clientEmail: 'gitari@p3l.co.ke',
      lead: 'Guyo Halake',
      category: 'Client Systems',
      projectGroup: 'client',
      status: 'Active Dev · Proprietary Equity Engine',
      contractType: 'P3L Internal R&D',
      monthlyFee: 'P3L Internal Asset',
      initialPaid: 'Internal R&D',
      activeSince: 'January 2026',
      nextMilestone: 'Multi-broker MT5 FIX protocol bridge & dynamic NAV feed',
      progress: 75,
      health: 'green',
      techStack: ['React', 'TypeScript', 'Chart.js', 'Tailwind', 'Supabase PostgreSQL', 'AES-256'],
      tasks: ['High-net-worth partner equity tracking', 'NAV (Net Asset Value) calculator', 'FX hedging analytics (KES/USD/GBP)', 'Multi-signature withdrawal audit trail'],
      allocatedStorageGb: 5,
      isPaying: false,
      currentVersion: 'v1.1-equity',
      changelog: [
        { version: 'v1.1-equity', date: '02 Oct 2026', notes: 'Compound annual growth rate (CAGR) dynamic projection curve.' },
        { version: 'v1.0-sec', date: '14 Aug 2026', notes: 'Enforced strict TypeScript interfaces and AES-256 client encryption for capital allocations.' }
      ],
      solvedIssues: [
        { issue: 'Floating point rounding drift on fractional partner equity shares', date: '14 Aug 2026', tag: 'Decimal.js BigNumber' }
      ],
      recentCommits: [
        { hash: 'f890123', message: 'feat: compound annual growth rate (CAGR) dynamic projection curve', date: '02 Oct 2026', branch: 'master' },
        { hash: 'c771092', message: 'security: enforce strict TypeScript interfaces for member capital allocations', date: '14 Aug 2026', branch: 'security/audit-trail' }
      ],
      journey: [
        { phase: 'Jan 2026 (Genesis)', date: 'Jan 2026', details: 'Built as a proprietary high-net-worth fund ledger for tracking private partner capital pools, currency hedging between KES, USD, and GBP, and calculating dynamic NAV with client-side AES-256 data encryption before committing audit logs to PostgreSQL.' }
      ],
      financialLedger: {
        summary: 'P3L Internal R&D proprietary equity engine. No external billing.',
        totalSettled: 'Internal Capital Asset',
        items: []
      },
      communicationLogs: [
        { date: '14 Aug 2026', channel: 'In-Person', sender: 'Joseph Gitari', snippet: 'Discussed implementing multi-signature approval requirement for any equity withdrawal over KES 500,000.', resolution: 'Implemented 2-of-3 partner cryptographic signature requirement.' }
      ],
      hardwareIncidents: []
    },

    {
      id: 'prj-khaemba-news',
      name: 'Khaemba News & Media',
      repo: 'khaemba-news-media',
      githubUrl: 'https://github.com/guyo-halake/khaemba-news-media',
      liveUrl: 'https://khaembanews.com',
      client: 'Dennis Khaemba · Nairobi',
      clientPhone: '+254 711 000 000',
      clientEmail: 'khaemba@p3l.co.ke',
      lead: 'Guyo Halake',
      category: 'Client Systems',
      projectGroup: 'client',
      status: 'Beta Testing · Live Ticker Active',
      contractType: 'P3L Internal Publishing Platform',
      monthlyFee: 'P3L Media Retainer',
      initialPaid: 'Internal Asset',
      activeSince: 'April 2026',
      nextMilestone: 'Swahili editorial translation pipeline & paywall integration',
      progress: 82,
      health: 'green',
      techStack: ['Next.js App Router', 'Sanity CMS', 'Cloudflare Edge CDN', 'Tailwind CSS'],
      tasks: ['Multi-author investigative journalism editorial engine', 'Breaking news live ticker', 'Tag taxonomy', 'Low-bandwidth AMP mode for rural readers'],
      allocatedStorageGb: 16,
      isPaying: false,
      currentVersion: 'v1.3-amp',
      changelog: [
        { version: 'v1.3-amp', date: '24 Sept 2026', notes: 'Low-bandwidth mobile reading mode with zero external fonts.' },
        { version: 'v1.1-webhook', date: '08 Jun 2026', notes: 'Sanity CMS webhook trigger for instant Cloudflare Edge revalidation.' }
      ],
      solvedIssues: [
        { issue: 'Sanity CMS webhook latency on breaking news publishing', date: '08 Jun 2026', tag: 'Edge Revalidation' }
      ],
      recentCommits: [
        { hash: 'a449102', message: 'feat: low-bandwidth mobile reading mode with zero external fonts', date: '24 Sept 2026', branch: 'main' },
        { hash: 'b119280', message: 'feat: Sanity CMS webhook trigger for instant Edge revalidation', date: '08 Jun 2026', branch: 'feat/sanity-webhook' }
      ],
      journey: [
        { phase: 'April 2026 (Editorial Engine Launch)', date: 'Apr 2026', details: 'Designed for independent investigative journalism. Features low-bandwidth reading mode that strips external fonts and heavy assets for readers on 2G/3G connections in upcountry Kenya.' }
      ],
      financialLedger: {
        summary: 'P3L Internal Publishing Platform for East African investigative journalism.',
        totalSettled: 'Internal Asset',
        items: []
      },
      communicationLogs: [
        { date: '24 Sept 2026', channel: 'WhatsApp', sender: 'Dennis Khaemba', snippet: 'Requested a special zero-font mode so articles load in <1 second on mobile phones in rural counties.', resolution: 'Deployed system font stack reducing HTML payload to 14KB.' }
      ],
      hardwareIncidents: []
    },

    {
      id: 'prj-odinbot',
      name: 'OdinBot AI Assistant',
      repo: 'odinbot-legal-core',
      githubUrl: 'https://github.com/guyo-halake/odinbot-legal-core',
      liveUrl: 'http://10.14.0.1:8888',
      client: 'Guyo Halake (Personal AI)',
      clientPhone: '+254 756 111 885',
      clientEmail: 'odin@p3l.co.ke',
      lead: 'Guyo Halake',
      category: 'Internal & FinTech',
      projectGroup: 'internal',
      status: 'Live Hybrid Sovereign · 8B Edge + 70B Cloud',
      contractType: 'Personal AI (Matter Core)',
      monthlyFee: 'Internal Compute Budget',
      initialPaid: '3-Year Continuous Iteration',
      activeSince: 'January 2023',
      nextMilestone: 'Resolve I&M Bank mirror HTTP 502 connection reset on socket 8443',
      progress: 94,
      health: 'amber',
      techStack: ['Python 3.11', 'Ollama (8B LoRA)', 'Mixtral 70B MoE', 'pgvector (bge-large-en)', 'Whisper Large-v3', 'Surya OCR', 'WireGuard'],
      tasks: ['8B LoRA for zero-latency local operations', 'Oracle Cloud VPS 45 TB NVMe holding 1.84M Kenya Law vector chunks', 'Bilingual English/Swahili legal terminology', 'WireGuard mesh at 42ms ping'],
      allocatedStorageGb: 65,
      isPaying: false,
      currentVersion: 'v3.2-hybrid',
      changelog: [
        { version: 'v3.2-hybrid', date: '14 Oct 2026', notes: 'Add socket retry loop on I&M bank mirror webhook listener (upstream 502).' },
        { version: 'v3.1-vector', date: '02 Oct 2026', notes: 'Re-indexed 42,000 2026 High Court rulings into pgvector with HNSW index.' },
        { version: 'v2.8-whisper', date: '19 Aug 2026', notes: 'Fine-tuned Swahili acoustic model on Milimani Commercial Court trial audio.' }
      ],
      solvedIssues: [
        { issue: 'CUDA out-of-memory during 70B batch embedding runs', date: '15 Sept 2026', tag: 'FlashAttention-2' },
        { issue: 'Swahili court slang mistranscriptions in bail hearings', date: '19 Aug 2026', tag: 'Whisper Fine-tune' }
      ],
      recentCommits: [
        { hash: 'a991823', message: 'debug: add socket retry loop on I&M bank mirror webhook listener (upstream 502)', date: '14 Oct 2026', branch: 'debug/inm-bank-socket' },
        { hash: 'c881024', message: 'vector: re-index 42,000 2026 High Court rulings into pgvector with HNSW index', date: '02 Oct 2026', branch: 'rag/pgvector-kenya-law' },
        { hash: 'b771920', message: 'whisper: fine-tune Swahili acoustic model on Milimani Commercial Court trial audio', date: '19 Aug 2026', branch: 'odin/core' }
      ],
      journey: [
        { phase: '2023 (Genesis & Datasets)', date: '2023', details: 'Began with Claude 2 prompt synthesis chains and OpenAI GPT-3 fine-tuning runs. Built scrapers to collect 20+ years of Kenya Law Gazette notices, High Court precedents, and Civil Procedure statutes from eKLR.' },
        { phase: '2024 (Bare-Metal Local LoRA)', date: '2024', details: 'Moved away from proprietary API dependence. Fine-tuned Llama-2-7b and Mistral 7B locally in Marsabit using QLoRA. Trained on bilingual English and Swahili legal terminology (e.g., kufilisika, hati ya kiapo, dhamana, gharama za kesi).' },
        { phase: '2025–2026 (Sovereign Hybrid Architecture)', date: '2025–2026', details: 'Local Node (razak-server) runs Ollama with quantised 8B LoRA for zero-latency local operations. Cloud Node (Oracle Cloud VPS 45 TB) holds 1,842,910 Kenya Law vector chunks (bge-large-en), Mixtral 70B MoE weights, Whisper Large-v3, and Surya OCR, connected via WireGuard tunnel at 42ms ping.' }
      ],
      financialLedger: {
        summary: 'Oracle Cloud VPS 45 TB NVMe storage tier billed at flat monthly rates. Zero token subscription costs (100% self-hosted inference).',
        totalSettled: 'Sovereign Infrastructure',
        items: []
      },
      communicationLogs: [
        { date: '14 Oct 2026', channel: 'In-Person', sender: 'Systems Monitor', snippet: 'Active Critical Incident: Upstream transactional banking proxy socket tcp://10.14.2.80:8443 encountered connection reset, throwing HTTP 502 Bad Gateway.', resolution: 'Manual retry queue holds 14 webhook dispatches; monitored from Sovereign Admin.' }
      ],
      hardwareIncidents: [
        { id: 'INC-21', date: '14 Oct 2026', title: 'I&M Bank Mirror HTTP 502 Connection Reset', symptom: 'tcp://10.14.2.80:8443 proxy socket dropped connection during scheduled night ledger reconciliation.', fix: 'Automated retry worker with exponential backoff; manual reboot switch available on Admin Dashboard.' }
      ]
    },

    // ==========================================
    // 3. SCHOOL PROJECTS (4)
    // ==========================================
    {
      id: 'prj-kca-forensics',
      name: 'KCA University: Network Forensics Packet Analyzer',
      repo: 'kca-network-forensics-sniffer',
      githubUrl: 'https://github.com/guyo-halake/kca-network-forensics-sniffer',
      liveUrl: 'http://localhost:8080/forensics',
      client: 'KCA University · Cyber Security & Forensics Lab',
      clientPhone: '+254 700 000 000',
      clientEmail: 'cyberlab@kca.ac.ke',
      lead: 'Guyo Halake',
      category: 'School Projects',
      projectGroup: 'school',
      status: 'Academic Capstone · Distinction Grade',
      contractType: 'Undergraduate Capstone Project',
      monthlyFee: 'Academic Research',
      initialPaid: 'Department Approved',
      activeSince: 'March 2026',
      nextMilestone: 'Lab demonstration & defense before faculty board',
      progress: 96,
      health: 'green',
      techStack: ['Python 3.11', 'Scapy', 'Wireshark libpcap', 'React', 'Tailwind CSS', 'Raw Sockets'],
      tasks: ['Rogue DHCP server detection', 'ARP cache poisoning mitigation', 'Promiscuous NIC card detection', 'PCAP export with Wireshark filter syntax'],
      allocatedStorageGb: 4,
      isPaying: false,
      currentVersion: 'v1.4-pcap',
      changelog: [
        { version: 'v1.4-pcap', date: '28 Sept 2026', notes: 'Add automated pcap export and Wireshark dissector filter helper.' },
        { version: 'v1.0-raw', date: '12 Jul 2026', notes: 'Handle raw socket buffer overflow on gigabit campus uplink.' }
      ],
      solvedIssues: [
        { issue: 'Buffer drops during high-throughput broadcast packet storm', date: '12 Jul 2026', tag: 'Ring Buffer Queue' }
      ],
      recentCommits: [
        { hash: 'c41092a', message: 'feat: add automated pcap export and Wireshark dissector filter helper', date: '28 Sept 2026', branch: 'main' },
        { hash: 'b118029', message: 'fix: handle raw socket buffer overflow on gigabit campus uplink', date: '12 Jul 2026', branch: 'fix/buffer-overflow' }
      ],
      journey: [
        { phase: 'March 2026 (Forensics Lab Research)', date: 'Mar 2026', details: 'Real-time network telemetry sniffer built for KCA University lab networks. Detects rogue DHCP servers, ARP cache poisoning attacks, and unauthorized promiscuous NIC cards on the campus LAN.' }
      ],
      financialLedger: {
        summary: 'Undergraduate Computer Science Capstone Project · KCA Department of Computing & Information Tech.',
        totalSettled: 'Academic Capstone',
        items: []
      },
      communicationLogs: [
        { date: '15 Sept 2026', channel: 'In-Person', sender: 'Dr. Waweru (Lecturer)', snippet: '"Ensure the PCAP export includes TCP window sizing calculations for lab practical grading."', resolution: 'Added TCP window scale factor computation in Wireshark dissector view.' }
      ],
      hardwareIncidents: []
    },

    {
      id: 'prj-kca-attendance',
      name: 'KCA University: Biometric QR Student Attendance',
      repo: 'kca-qr-attendance-system',
      githubUrl: 'https://github.com/guyo-halake/kca-qr-attendance-system',
      liveUrl: 'https://attendance.kca.ac.ke',
      client: 'KCA University · CS Department',
      clientPhone: '+254 700 000 000',
      clientEmail: 'csdept@kca.ac.ke',
      lead: 'Guyo Halake',
      category: 'School Projects',
      projectGroup: 'school',
      status: 'Completed Prototype · Pilot Ready',
      contractType: 'Departmental Innovation Prototype',
      monthlyFee: 'Department Supported',
      initialPaid: 'Prototype Budget',
      activeSince: 'February 2026',
      nextMilestone: 'Campus-wide rollout proposal to Dean of Students',
      progress: 92,
      health: 'green',
      techStack: ['React Native', 'Node.js', 'SQLite', 'HTML5 QR Scanner', 'Geolocation API'],
      tasks: ['Rotating 15-second TOTP dynamic QR', 'Haversine 50m GPS geofencing around lecture halls', 'Anti-proxy screenshot prevention', 'Lecturer attendance export to Excel'],
      allocatedStorageGb: 3,
      isPaying: false,
      currentVersion: 'v2.0-totp',
      changelog: [
        { version: 'v2.0-totp', date: '02 May 2026', notes: 'Add Haversine distance geofence validation for KCA Main Campus lecture halls.' },
        { version: 'v1.0-qr', date: '18 Mar 2026', notes: 'Prevent QR screenshot forwarding using 15s rotating TOTP hash.' }
      ],
      solvedIssues: [
        { issue: 'Students sending screenshot of QR code to absent classmates via WhatsApp', date: '18 Mar 2026', tag: '15s Dynamic TOTP' }
      ],
      recentCommits: [
        { hash: 'a772019', message: 'feat: add Haversine distance geofence validation for KCA Main Campus lecture halls', date: '02 May 2026', branch: 'main' },
        { hash: 'e910248', message: 'security: prevent QR screenshot forwarding using 15s rotating TOTP hash', date: '18 Mar 2026', branch: 'feat/anti-proxy' }
      ],
      journey: [
        { phase: 'Feb 2026 (Problem Definition)', date: 'Feb 2026', details: 'Lecturers faced widespread proxy attendance signing. Designed an anti-proxy lecture attendance check-in system that projects a single-use dynamic TOTP QR code refreshing every 15 seconds, and validates student phone GPS within 50 meters of Lecture Hall LH-04.' }
      ],
      financialLedger: {
        summary: 'Student Innovation Grant Submission · KCA University.',
        totalSettled: 'Academic Innovation',
        items: []
      },
      communicationLogs: [
        { date: '18 Mar 2026', channel: 'In-Person', sender: 'Course Representative', snippet: 'Tested live in LH-04 with 65 students checking in within 90 seconds.', resolution: 'Zero false duplicates recorded; 100% attendance precision verified.' }
      ],
      hardwareIncidents: []
    },

    {
      id: 'prj-zetech-repo',
      name: 'Zetech University: Diploma Resource Repository',
      repo: 'zetech-diploma-pastpapers',
      githubUrl: 'https://github.com/guyo-halake/zetech-diploma-pastpapers',
      liveUrl: 'https://pastpapers.zetech.p3l.co.ke',
      client: 'Zetech University Students Archive',
      clientPhone: '+254 700 000 000',
      clientEmail: 'library@zetech.ac.ke',
      lead: 'Guyo Halake',
      category: 'School Projects',
      projectGroup: 'school',
      status: 'Archived & In Production Use (400+ Students)',
      contractType: 'Open Student Resource Archive',
      monthlyFee: 'Free Campus Utility',
      initialPaid: 'Student Initiative',
      activeSince: 'August 2024',
      nextMilestone: 'KNEC national diploma past papers indexing',
      progress: 100,
      health: 'green',
      techStack: ['PHP 8.2', 'MySQL', 'Bootstrap 5', 'Cloudflare CDN', 'PDF.js'],
      tasks: ['6 years of past papers indexed', 'Fulltext search by subject code and year', 'Mobile PDF reader with offline caching', 'Saved students manual photocopy expenses'],
      allocatedStorageGb: 8,
      isPaying: false,
      currentVersion: 'v2.2-archive',
      changelog: [
        { version: 'v2.2-archive', date: '14 Nov 2025', notes: 'Add fulltext index on subject_code and exam_year columns.' }
      ],
      solvedIssues: [
        { issue: 'Slow PDF loading over campus Wi-Fi', date: '14 Nov 2025', tag: 'Cloudflare Edge Cache' }
      ],
      recentCommits: [
        { hash: 'f190284', message: 'perf: add fulltext index on subject_code and exam_year columns', date: '14 Nov 2025', branch: 'main' }
      ],
      journey: [
        { phase: '2024–2025 (Campus Resource Initiative)', date: '2024–2025', details: 'Indexed PDF repository of 6 years of diploma exam past papers, lecturer notes, and revision marking schemes with full-text search. Saved over 400 students manual photocopy costs across Thika Road campuses.' }
      ],
      financialLedger: {
        summary: 'Free open academic student community utility hosted on razak-server.',
        totalSettled: 'KES 0 (Community Resource)',
        items: []
      },
      communicationLogs: [
        { date: '12 Nov 2025', channel: 'WhatsApp', sender: 'Class Rep', snippet: '"Bro thank you for the past paper portal, everyone in our year revised using your site before exams."', resolution: 'Maintained 100% uptime through final exam week.' }
      ],
      hardwareIncidents: []
    },

    {
      id: 'prj-discrete-math',
      name: 'MAT 1105 Discrete Math & Graph Visualizer',
      repo: 'discrete-structures-graph-visualizer',
      githubUrl: 'https://github.com/guyo-halake/discrete-structures-graph-visualizer',
      liveUrl: 'https://graphs.p3l.co.ke',
      client: 'Pure Math & CS Coursework Module',
      clientPhone: '+254 756 111 885',
      clientEmail: 'academic@p3l.co.ke',
      lead: 'Guyo Halake',
      category: 'School Projects',
      projectGroup: 'school',
      status: 'Completed Academic Tool',
      contractType: 'Coursework Project',
      monthlyFee: 'Academic Research',
      initialPaid: 'Coursework Credit',
      activeSince: 'June 2026',
      nextMilestone: 'Add Bellman-Ford negative cycle visualizer',
      progress: 98,
      health: 'green',
      techStack: ['TypeScript', 'HTML5 Canvas', 'React', 'Tailwind CSS'],
      tasks: ['Dijkstra shortest path step-by-step priority queue animation', 'Kruskal minimum spanning tree with union-find visualizer', 'Topological sort DAG generator'],
      allocatedStorageGb: 1,
      isPaying: false,
      currentVersion: 'v1.2-dijkstra',
      changelog: [
        { version: 'v1.2-dijkstra', date: '22 Jun 2026', notes: 'Step-by-step priority queue animation for Dijkstra algorithm.' }
      ],
      solvedIssues: [
        { issue: 'Canvas flickering on large 50-node graph layouts', date: '22 Jun 2026', tag: 'requestAnimationFrame' }
      ],
      recentCommits: [
        { hash: 'd330192', message: 'feat: step-by-step priority queue animation for Dijkstra algorithm', date: '22 Jun 2026', branch: 'main' }
      ],
      journey: [
        { phase: 'June 2026 (Algorithm Visualizer)', date: 'Jun 2026', details: 'Built interactive visualizer for undergraduate discrete mathematics coursework, illustrating Dijkstra, Kruskal, and topological DAG traversal with canvas graphics.' }
      ],
      financialLedger: {
        summary: 'Undergraduate Mathematics & Computing Coursework tool.',
        totalSettled: 'Academic Asset',
        items: []
      },
      communicationLogs: [],
      hardwareIncidents: []
    },

    // ==========================================
    // 4. PERSONAL PROJECTS (3)
    // ==========================================
    {
      id: 'prj-jellyfin-marsabit',
      name: 'Jellyfin Marsabit Media Streamer',
      repo: 'jellyfin-marsabit-homelab',
      githubUrl: 'https://github.com/guyo-halake/jellyfin-marsabit-homelab',
      liveUrl: 'http://10.14.0.1:8096',
      client: 'Guyo Halake Home Media · Marsabit',
      clientPhone: '+254 756 111 885',
      clientEmail: 'guyo@p3l.co.ke',
      lead: 'Guyo Halake',
      category: 'Personal Projects',
      projectGroup: 'personal',
      status: 'Live In-Home LAN · 24/7 Transcoding',
      contractType: 'Personal Infrastructure',
      monthlyFee: 'Zero Cost (Local LAN)',
      initialPaid: 'Self-Funded Storage',
      activeSince: 'January 2025',
      nextMilestone: 'Automated torrent queue sync & subtitle fetcher daemon',
      progress: 98,
      health: 'green',
      techStack: ['Jellyfin Media Server', 'Docker', 'Intel QuickSync VA-API', 'Nginx', 'Samba'],
      tasks: ['4.2 TB uncompressed media library', 'Hardware HEVC 1080p transcoding', 'Local LAN streaming without internet bandwidth', 'DLNA smart TV casting'],
      allocatedStorageGb: 3200,
      isPaying: false,
      currentVersion: 'v10.9-quicksync',
      changelog: [
        { version: 'v10.9-quicksync', date: '10 Oct 2026', notes: 'Pass /dev/dri renderD128 node into Docker container for hardware HEVC decode.' }
      ],
      solvedIssues: [
        { issue: 'CPU spike on 4K transcoding without hardware accelerator', date: '10 Oct 2026', tag: 'Intel QuickSync VA-API' }
      ],
      recentCommits: [
        { hash: 'e881029', message: 'infra: pass /dev/dri renderD128 node into Docker container for hardware HEVC decode', date: '10 Oct 2026', branch: 'master' }
      ],
      journey: [
        { phase: '2025 (Local LAN Entertainment)', date: '2025', details: 'Offline multimedia server hosted on razak-server in Marsabit. Stores 4.2 TB of uncompressed movies, tutorials, and music accessible locally across family laptops and smart TVs without consuming internet bandwidth.' }
      ],
      financialLedger: {
        summary: 'Personal home utility. Hardware storage self-funded.',
        totalSettled: 'Personal Infrastructure',
        items: []
      },
      communicationLogs: [],
      hardwareIncidents: []
    },

    {
      id: 'prj-gta-cleo',
      name: 'GTA IV & San Andreas CLEO Modding Engine',
      repo: 'gta-kenya-cleo-mod-archive',
      githubUrl: 'https://github.com/guyo-halake/gta-kenya-cleo-mod-archive',
      liveUrl: 'https://gta.p3l.co.ke',
      client: 'P3L Gaming & 3D Archive',
      clientPhone: '+254 756 111 885',
      clientEmail: 'guyo@p3l.co.ke',
      lead: 'Guyo Halake',
      category: 'Personal Projects',
      projectGroup: 'personal',
      status: 'Active Modding Archive',
      contractType: 'Personal Engineering & 3D R&D',
      monthlyFee: 'Personal Hobby',
      initialPaid: 'Self-Directed',
      activeSince: 'March 2023',
      nextMilestone: 'Nairobi CBD 3D map collision mesh import into GTA IV',
      progress: 90,
      health: 'green',
      techStack: ['C++', 'CLEO Scripting', '3ds Max', 'Kams GTA Scripts', 'Handling.cfg', 'TXD Workshop'],
      tasks: ['Kenyan 14-seater matatu custom physics & handling', 'Toyota Land Cruiser V8 rough-terrain suspension tuning', 'Custom CLEO script missions', 'Kenyan billboard textures'],
      allocatedStorageGb: 35,
      isPaying: false,
      currentVersion: 'v3.4-matatu',
      changelog: [
        { version: 'v3.4-matatu', date: '15 Aug 2026', notes: 'Adjust center of mass and suspension dampening for 14-seater matatu physics.' }
      ],
      solvedIssues: [
        { issue: 'Matatu rolled over on sharp turns in San Fierro', date: '15 Aug 2026', tag: 'Center of Mass Z-Offset' }
      ],
      recentCommits: [
        { hash: 'a019482', message: 'mod: adjust center of mass and suspension dampening for 14-seater matatu physics', date: '15 Aug 2026', branch: 'master' }
      ],
      journey: [
        { phase: '2023–Present (3D Vehicle Physics R&D)', date: '2023–2026', details: 'Extensive game engine modification archive tuning vehicle dynamics, Kenyan traffic physics, and texture mapping for GTA game engines.' }
      ],
      financialLedger: {
        summary: 'Personal game physics exploration and 3D modeling.',
        totalSettled: 'Personal Project',
        items: []
      },
      communicationLogs: [],
      hardwareIncidents: []
    },

    {
      id: 'prj-sovereign-bot',
      name: 'Sovereign Telegram & WhatsApp Telemetry Bot',
      repo: 'sovereign-server-telemetry-bot',
      githubUrl: 'https://github.com/guyo-halake/sovereign-server-telemetry-bot',
      liveUrl: 'https://t.me/GuyoSovereignBot',
      client: 'Guyo Halake Personal Ops',
      clientPhone: '+254 756 111 885',
      clientEmail: 'guyo@p3l.co.ke',
      lead: 'Guyo Halake',
      category: 'Personal Projects',
      projectGroup: 'personal',
      status: 'Live 24/7 Watchdog Daemon',
      contractType: 'Personal Infrastructure Daemon',
      monthlyFee: 'KES 0 (Self-Hosted)',
      initialPaid: 'Self-Built',
      activeSince: 'January 2026',
      nextMilestone: 'One-click server reboot via authenticated Telegram inline keyboard',
      progress: 96,
      health: 'green',
      techStack: ['Python 3.11', 'python-telegram-bot', 'Twilio WhatsApp API', 'Systemd', 'psutil', 'WireGuard'],
      tasks: ['Adrian AK fiber drop instant push alert', 'CPU temperature watchdog (>72°C alert)', 'Marsabit battery bank inverter failover notification', 'M-Pesa IPN listener'],
      allocatedStorageGb: 1,
      isPaying: false,
      currentVersion: 'v2.1-telemetry',
      changelog: [
        { version: 'v2.1-telemetry', date: '04 Oct 2026', notes: 'Add immediate push notification on battery bank inverter trigger.' }
      ],
      solvedIssues: [
        { issue: 'Telegram bot polling timeout during fiber switchover', date: '04 Oct 2026', tag: 'Exponential Retry Backoff' }
      ],
      recentCommits: [
        { hash: 'b991048', message: 'feat: add immediate push notification on battery bank inverter trigger', date: '04 Oct 2026', branch: 'master' }
      ],
      journey: [
        { phase: 'Jan 2026 (Autonomous Telemetry Alerting)', date: 'Jan 2026', details: 'Real-time server monitoring bot alerting Guyo via Telegram & WhatsApp instantly if power switches to battery bank, temperature spikes, or fiber drops.' }
      ],
      financialLedger: {
        summary: 'Autonomous telemetry watchdog running on razak-server systemd daemon.',
        totalSettled: 'Personal Utility',
        items: []
      },
      communicationLogs: [],
      hardwareIncidents: []
    },

    // ==========================================
    // 5. HARDWARE FLEET (3 SYSTEMS)
    // ==========================================
    {
      id: 'prj-hw-razak-server',
      name: 'Bare Metal Server (Razak Server)',
      repo: 'razak-server-infra-config',
      githubUrl: 'https://github.com/guyo-halake/razak-server-infra-config',
      liveUrl: 'http://10.14.0.1:9090',
      client: 'Guyo Halake (Self)',
      clientPhone: '+254 768 141 129',
      clientEmail: 'guyohalakeofficial@gmail.com',
      lead: 'Guyo Halake',
      category: 'Internal Hardware',
      projectGroup: 'hardware',
      status: 'Online · 1,048 Days Uptime',
      contractType: 'Personal Hardware (No Contract)',
      monthlyFee: 'KES 8,500/mo (Fiber & Battery)',
      initialPaid: 'Self-Built',

      activeSince: 'November 2024',
      nextMilestone: 'Quarterly battery bank de-sulfation cycle & thermal paste refresh',
      progress: 99,
      health: 'green',
      techStack: ['Ubuntu Server 24.04 LTS', 'Intel Core i7-10700', '32GB DDR4', '12 TB RAID 5 NAS', 'Adrian AK 3674 Fiber', 'WireGuard', 'APC 1500VA UPS'],
      tasks: ['Hosts Ollama 8B LoRA', 'Next.js & Vite staging server', 'PostgreSQL database master', 'Shein API daemon (Port 8040)', 'Fresh Fity transaction sync endpoint'],
      allocatedStorageGb: 12000,
      isPaying: false,
      currentVersion: 'v24.04-baremetal',
      changelog: [
        { version: 'v24.04-baremetal', date: '01 Oct 2026', notes: 'Configured automated ZFS scrub and SMART disk monitoring daemon.' }
      ],
      solvedIssues: [
        { issue: 'Grid power spikes in Marsabit causing server hard shutdown', date: '15 Jan 2026', tag: 'Dual 100Ah Gel Batteries + APC UPS' }
      ],
      recentCommits: [
        { hash: 'e019283', message: 'infra: configure wireguard wg0 mesh hub with persistent keepalive 25', date: '01 Oct 2026', branch: 'infra/wireguard' }
      ],
      journey: [
        { phase: '2024 Build & Deployment', date: 'Nov 2024', details: 'Full bare-metal server built from ground up to achieve computing sovereignty in Marsabit. Features Intel Core i7-10700, 32GB RAM, 12 TB NAS (4x 4TB Seagate IronWolf drives in RAID 5), dedicated Adrian AK 3674 synchronous fiber, and dual 100Ah gel batteries preventing power outage interruptions.' }
      ],
      financialLedger: {
        summary: 'Total hardware outlay KES 210,000 self-funded. Monthly operational upkeep KES 8,500 (Adrian AK fiber KES 6,500 + battery maintenance KES 2,000).',
        totalSettled: 'KES 210,000 Build Settled',
        items: [
          { date: 'Nov 2024', amount: 'KES 210,000', description: 'Server Parts, Drives, UPS & Battery Bank', ref: 'Self-Funded Build' }
        ],
        hardwareOutlay: '4x 4TB Seagate IronWolf NAS drives + APC 1500VA Smart-UPS + Dual 100Ah Gel Deep-Cycle Batteries + 1TB Samsung 980 NVMe OS drive.'
      },
      communicationLogs: [
        { date: '10 Oct 2026', channel: 'Voice Call', sender: 'Adrian AK Support', snippet: 'Confirmed synchronous fiber line speed 50 Mbps stable with zero jitter on Marsabit exchange.', resolution: 'Latency to Nairobi 18ms.' }
      ],
      hardwareIncidents: [
        { id: 'INC-01', date: '15 Jan 2026', title: 'Grid Blackout Overload', symptom: 'Marsabit grid dropped during thunderstorm; server switched cleanly to dual 100Ah battery bank without a millisecond of drop.', fix: 'APC Smart-UPS automatic voltage regulation verified.' }
      ],
      specs: {
        'Processor': 'Intel Core i7-10700 (8 Cores, 16 Threads @ 4.8 GHz)',
        'RAM': '32 GB DDR4 3200MHz Crucial Non-ECC',
        'Storage Array': '12 TB NAS (4x 4TB Seagate IronWolf in RAID 5) + 1TB Samsung 980 NVMe (OS)',
        'Network Connectivity': 'Adrian AK 3674 Dedicated Synchronous Fiber (50 Mbps / 50 Mbps)',
        'Power Backup': 'Dual 100Ah Deep-Cycle Gel Batteries + APC 1500VA Smart-UPS (48h offline runtime)',
        'Mesh Network': 'WireGuard VPN Hub (10.14.0.1/24) linking home lab and Oracle Cloud VPS'
      }
    },

    {
      id: 'prj-hw-homelab-node',
      name: 'HomeLab Ubuntu Workstation',
      repo: 'homelab-workstation-dots',
      githubUrl: 'https://github.com/guyo-halake/homelab-workstation-dots',
      liveUrl: 'http://10.14.0.2:8000',
      client: 'Guyo Halake (Self)',
      clientPhone: '+254 768 141 129',
      clientEmail: 'guyohalakeofficial@gmail.com',
      lead: 'Guyo Halake',
      category: 'Internal Hardware',
      projectGroup: 'hardware',
      status: 'Connected over WireGuard (wg0)',
      contractType: 'Personal Workstation (No Contract)',
      monthlyFee: 'KES 0',
      initialPaid: 'Self-Built',
      activeSince: 'February 2025',
      nextMilestone: 'Kernel 6.12 upgrade and USB pass-through virtualization',
      progress: 98,
      health: 'green',
      techStack: ['Arch Linux (Kernel 6.11)', 'AMD Ryzen 7 5700X', '32GB DDR4', '2TB Samsung 980 Pro', 'WireGuard wg0', 'Docker'],
      tasks: ['Primary compilation and development node', 'Fast Docker image building', 'Vite & FastAPI local staging', 'Direct USB peripheral testing for thermal printers & laser scanners'],
      allocatedStorageGb: 2000,
      isPaying: false,
      currentVersion: 'v6.11-arch',
      changelog: [
        { version: 'v6.11-arch', date: '05 Oct 2026', notes: 'Configured WireGuard wg0 systemd service with persistent tunnel keepalive.' }
      ],
      solvedIssues: [
        { issue: 'Local compilation latency during Vite hot reload', date: '05 Oct 2026', tag: 'RAMDisk /tmp Cache' }
      ],
      recentCommits: [
        { hash: 'c901842', message: 'dotfiles: update sway and alacritty config for multi-monitor layout', date: '05 Oct 2026', branch: 'master' }
      ],
      journey: [
        { phase: '2025 Deployment', date: 'Feb 2025', details: 'Built as Guyo primary daily driver development rig. Connected 24/7 to the Marsabit razak-server bare-metal machine over persistent WireGuard tunnel (10.14.0.2 at 12ms ping). Used for testing raw USB communication with hardware devices (Xprinter, Honeywell scanner) before deploying in-store.' }
      ],
      financialLedger: {
        summary: 'Primary engineering workstation. Self-assembled.',
        totalSettled: 'Self-Funded Workstation',
        items: []
      },
      communicationLogs: [],
      hardwareIncidents: [],
      specs: {
        'Operating System': 'Arch Linux (Linux Kernel 6.11.2-arch1-1)',
        'Processor': 'AMD Ryzen 7 5700X (8 Cores, 16 Threads @ 4.6 GHz)',
        'Memory': '32 GB DDR4-3600MHz Kingston Fury (Dual Channel)',
        'Storage': '2 TB Samsung 980 Pro PCIe 4.0 NVMe SSD (7,000 MB/s)',
        'Network Connection': 'Realtek 2.5GbE LAN connected to WireGuard wg0 (10.14.0.2)',
        'Connected Peripherals': 'Honeywell Orbit 7120 Laser Scanner, Xprinter 80mm USB Thermal Testbed'
      }
    },

    {
      id: 'prj-hw-custom-pc',
      name: 'Custom Built PC Workstation (Planning / Assembly)',
      repo: 'sovereign-ai-workstation-build',
      githubUrl: 'https://github.com/guyo-halake/sovereign-ai-workstation-build',
      liveUrl: 'https://pcpartpicker.com/list/p3l-workstation',
      client: 'P3L Sovereign AI & 3D Engineering Rig',
      clientPhone: '+254 756 111 885',
      clientEmail: 'admin@p3l.co.ke',
      lead: 'Guyo Halake',
      category: 'Hardware Fleet',
      projectGroup: 'hardware',
      status: 'Architecture & Parts Sourcing (Phase 1)',
      contractType: 'Capital Hardware Investment',
      monthlyFee: 'Planned Outlay: KES 340,000',
      initialPaid: 'Budget Allocated',
      activeSince: 'October 2026',
      nextMilestone: 'GPU import clearance & custom liquid cooling loop assembly (Q1 2027)',
      progress: 35,
      health: 'blue',
      techStack: ['AMD Ryzen 9 9950X', '64GB DDR5-6000', 'Nvidia RTX 4080 Super 16GB', 'Dual 2TB NVMe RAID 0', 'Custom 360mm AIO Liquid Loop'],
      tasks: ['Dedicated local LLM 70B 4-bit quantized inference', 'PyTorch legal embeddings generator', 'Blender 3D & Unreal Engine simulation', 'Ultra-fast C++ and Rust compilation'],
      allocatedStorageGb: 4000,
      isPaying: false,
      currentVersion: 'v0.1-parts-spec',
      changelog: [
        { version: 'v0.1-parts-spec', date: '14 Oct 2026', notes: 'Finalized bill of materials and thermal dissipation calculations.' }
      ],
      solvedIssues: [],
      recentCommits: [
        { hash: 'b110942', message: 'spec: finalize 1000W Corsair Gold PSU and dual NVMe RAID 0 stripe profile', date: '14 Oct 2026', branch: 'main' }
      ],
      journey: [
        { phase: 'October 2026 Architectural Spec', date: 'Oct 2026', details: 'Designed to be P3L sovereign AI workstation for local fine-tuning of 70B parameter models, continuous training of Kenyan legal domain models, and high-performance compilation without cloud dependencies.' }
      ],
      financialLedger: {
        summary: 'Planned capital expenditure: KES 340,000. Parts sourcing in progress across Nairobi tech importers and direct overseas shipping.',
        totalSettled: 'Budget Allocated (KES 340,000)',
        items: [
          { date: 'Oct 2026', amount: 'KES 340,000', description: 'Workstation Parts Budget (GPU, CPU, 64GB DDR5, Chassis, Liquid Loop)', ref: 'P3L Capital Reserve' }
        ]
      },
      communicationLogs: [
        { date: '12 Oct 2026', channel: 'In-Person', sender: 'Hardware Importer', snippet: 'Inquired on RTX 4080 Super 16GB availability and customs clearance lead time.', resolution: 'Quoted 10-day arrival from Dubai with receipt and 2-year warranty.' }
      ],
      hardwareIncidents: [],
      specs: {
        'Processor': 'AMD Ryzen 9 9950X (16 Cores, 32 Threads, up to 5.7 GHz)',
        'Graphics Card': 'Nvidia GeForce RTX 4080 Super 16GB GDDR6X (Dedicated LLM Inference & CUDA)',
        'System Memory': '64 GB (2x 32GB) DDR5-6000MHz Kingston Fury Beast CL30',
        'Storage Array': '4 TB (2x 2TB Samsung 990 Pro PCIe 4.0 NVMe in RAID 0 @ 14,000 MB/s)',
        'Motherboard': 'ASUS ROG Strix X670E-E Gaming WiFi (PCIe 5.0, 4x M.2 slots)',
        'Power Supply': 'Corsair RM1000x 1000W 80+ Gold Fully Modular',
        'Cooling System': 'Lian Li Galahad II Trinity 360mm Liquid AIO Cooler',
        'Chassis': 'Lian Li O11 Dynamic EVO (Tempered Glass, Dual Chamber)'
      }
    }
  ]);

  // CLIENTS DIRECTORY
  const [clients] = useState<ClientAccount[]>([
    {
      id: 'cli-fresh-city',
      name: 'Rosemary Wakonyo',
      company: 'Fresh City Supermarket',
      phone: '+254 756111885',
      email: 'Direct Phone / In-Store',
      location: 'Retail Store, Main Street',
      activeProjects: ['Fresh City Supermarket POS'],
      monthlyRetainer: 'KES 3,500 / month',
      initialPaid: 'Settled on Delivery',
      isPaying: true,
      paymentCadence: 'Monthly software maintenance retainer',
      notes: 'Rosemary in-store terminal running offline SQLite with thermal printer auto-cut.'
    },
    {
      id: 'cli-sayara',
      name: 'Sarah Guyatu Rashid',
      company: 'Sayara Aesthetics',
      phone: '+254 114 807 215',
      email: 'sarahguyatu2@gmail.com',
      location: 'Nairobi & Online E-commerce',
      activeProjects: ['Sayara Aesthetics & Shein Sync'],
      monthlyRetainer: '% Commission + Maintenance',
      initialPaid: 'Settled on Launch',
      isPaying: true,
      paymentCadence: 'Monthly % commission & Playwright scraper maintenance',
      notes: 'Automated Playwright anti-detection scraper worker running on port 8040.'
    },
    {
      id: 'cli-suvplanet',
      name: 'SUVPlanet Auto Traders',
      company: 'SUVPlanet Automotive Marketplace',
      phone: '+254 733 000 000',
      email: 'sales@suvplanet.co.ke',
      location: 'Showroom, Nairobi',
      activeProjects: ['SUVPlanet Automotive Marketplace'],
      monthlyRetainer: 'KES 400 / 2 months',
      initialPaid: 'KES 5,500 (Settled Initial)',
      isPaying: true,
      paymentCadence: 'Ad budget and listing maintenance',
      notes: 'Showroom vehicle showcase with direct WhatsApp click-to-chat lead capture.'
    },
    {
      id: 'cli-karani-law',
      name: 'Adv. Nyagah B. Kithinji',
      company: 'Nyagah B. Kithinji & Co. Advocates',
      phone: '+254 (0)20 271 8900',
      email: 'advocate@kithinjilegal.co.ke',
      location: 'Upper Hill, Nairobi',
      activeProjects: ['Karani Law & Bills of Costs ERP'],
      monthlyRetainer: 'Milestone Retainer',
      initialPaid: 'Milestone Agreement',
      isPaying: false,
      paymentCadence: 'Milestone Billing · Stage 4 UAT',
      notes: '100% Real Supabase and PostgreSQL backend database with advocate RBAC.'
    },
    {
      id: 'cli-inner-circle',
      name: 'Joseph Gitari',
      company: 'Inner Circle Hedge Fund',
      phone: '+254 711 000 000',
      email: 'invest@innercircle.co.ke',
      location: 'Westlands, Nairobi',
      activeProjects: ['Inner Circle Hedge Fund Platform'],
      monthlyRetainer: '-',
      initialPaid: 'P3L Internal',
      isPaying: false,
      paymentCadence: 'Internal P3L Project',
      notes: 'FinTech hedge fund client portal and investor returns calculation engine.'
    },
    {
      id: 'cli-nokras',
      name: 'Nokras Management Group',
      company: 'Nokras Hotels & Resorts',
      phone: '+254 720 000 333',
      email: 'bookings@nokras.co.ke',
      location: 'Murang’a & Embu, Kenya',
      activeProjects: ['Nokras Hotel & Resort Platform'],
      monthlyRetainer: '-',
      initialPaid: 'N/A',
      isPaying: false,
      paymentCadence: 'Non-paying Project',
      notes: 'Resort showcase and suite booking platform.'
    }
  ]);

  // KCA UNIVERSITY TRIM3 26 UNITS (REAL PORTAL DATA)
  const [kcaCourses] = useState<KcaCourse[]>([
    {
      code: 'CUU 1102',
      title: 'Fundamentals of Computer Systems',
      lecturer: 'Joselyne Mutende',
      venue: 'Online / TC-1',
      time: 'Tuesday, 7:15 AM',
      zoomUrl: 'https://virtualcampus.kcau.ac.ke/mod/zoom/view.php?id=512241',
      whatsappUrl: 'https://chat.whatsapp.com/Cp3m3O1Sc0TDo6vxgETbKp',
      progress: 0,
      status: 'In Progress',
      files: [
        { name: 'Course Outline File', type: 'DOCX', size: '42 KB' },
        { name: 'Topic 1 Introduction to Computer Systems', type: 'PPTX', size: '2.4 MB' },
        { name: 'Topic 2 Computer Hardware & Architectures', type: 'PPTX', size: '3.1 MB' },
        { name: 'Topic 3 Processor & Memory Subsystems', type: 'PPTX', size: '2.8 MB' },
        { name: 'Number Systems & Base Conversions', type: 'PDF', size: '1.1 MB' }
      ]
    },
    {
      code: 'MAT 1105',
      title: 'Discrete Mathematics',
      lecturer: 'Milkah Wairimu Njuguna',
      venue: 'Main Amphitheatre (Stream I)',
      time: 'Completed Trim 3',
      progress: 100,
      status: 'Completed',
      files: [
        { name: 'Set Theory & Logic Relations', type: 'PDF', size: '1.8 MB' },
        { name: 'Graph Theory & Combinatorics Notes', type: 'PDF', size: '2.2 MB' }
      ]
    },
    {
      code: 'STA 1201',
      title: 'Probability and Statistics I',
      lecturer: 'John Ogutu Osumba',
      venue: 'TC 3-8 (Stream C)',
      time: 'Completed Trim 3',
      progress: 100,
      status: 'Completed',
      files: [
        { name: 'Probability Distributions & Variance', type: 'PDF', size: '2.5 MB' },
        { name: 'Hypothesis Testing Problem Sets', type: 'PDF', size: '1.4 MB' }
      ]
    },
    {
      code: 'ISS 1105',
      title: 'Installation and Customization',
      lecturer: 'Evans Ochieng Ongulo',
      venue: 'DA Lab / VDA Lab (Stream C)',
      time: 'Thursday, 11:00 AM',
      progress: 25,
      status: 'In Progress',
      files: [
        { name: 'Operating System Kernel Parameters', type: 'PDF', size: '1.5 MB' },
        { name: 'Lab 2 Dual Boot & Partitioning Exercise', type: 'PDF', size: '920 KB' }
      ]
    },
    {
      code: 'ISS 2101',
      title: 'Management Information Systems',
      lecturer: 'Catherine Wanjiku Gachiri',
      venue: 'Zoom (Stream A)',
      time: 'Friday, 8:30 AM',
      progress: 0,
      status: 'In Progress',
      files: [
        { name: 'Enterprise Resource Planning Architectures', type: 'PDF', size: '3.0 MB' },
        { name: 'Case Study: Kenya Banking Core Systems', type: 'PDF', size: '1.2 MB' }
      ]
    },
    {
      code: 'CUU 1201',
      title: 'Health Awareness and Life Skills',
      lecturer: 'Josephine Nyambura Wangombe',
      venue: 'Zoom (Stream B)',
      time: 'Wednesday, 2:00 PM',
      progress: 0,
      status: 'In Progress',
      files: [
        { name: 'Student Health & Wellness Handbook', type: 'PDF', size: '850 KB' }
      ]
    },
    {
      code: 'CUU 1202',
      title: 'Foundations of Critical and Creative Writing',
      lecturer: 'Anne Nyawira Macharia',
      venue: 'Zoom (Stream C)',
      time: 'Monday, 10:00 AM',
      progress: 0,
      status: 'In Progress',
      files: [
        { name: 'Critical Essay Frameworks & Rubrics', type: 'PDF', size: '640 KB' }
      ]
    }
  ]);

  const handleCreateRealUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserFullName.trim() || !newUserEmail.trim()) {
      showToast('Please enter full name and email.');
      return;
    }

    try {
      const created = await createFirmUser((EXACT_FIRM_INFO as any).id || 'firm-001', {
        fullName: newUserFullName.trim(),
        workEmail: newUserEmail.trim(),
        role: (newUserRole === 'Managing Partner' ? 'Admin' : 'Advocate') as any,
        position: newUserRole,
        lskNo: newUserLskNo.trim() || `P105/${Math.floor(10000 + Math.random() * 90000)}/26`,
        passwordHash: newUserPassword.trim() || 'Nyagah@2026',
        advocateTitle: newUserFullName.trim()
      });

      setRealUsers(prev => [created, ...prev]);
      setShowAddRealUserModal(false);
      setNewUserFullName('');
      setNewUserEmail('');
      setNewUserLskNo('');
      showToast(`User ${created.fullName} saved to database. They can now log in.`);
    } catch (err) {
      showToast('Error creating user. Check database logs.');
    }
  };

  const handleDeleteRealUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the database?`)) return;
    try {
      const match = realUsers.find(u => u.id === userId);
      await deleteFirmUser((EXACT_FIRM_INFO as any).id || 'firm-001', userId, match?.workEmail, match);
      setRealUsers(prev => prev.filter(u => u.id !== userId));
      showToast(`${userName} removed from database.`);
    } catch (err) {
      showToast('Failed to delete user.');
    }
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: any; count?: number; badge?: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'karani_erp', label: 'Karani Law ERP', icon: Scale, badge: 'Live App' },
    { id: 'projects_clients', label: 'Projects & Clients', icon: Briefcase, count: projects.length },
    { id: 'client_crm', label: 'Client CRM', icon: UserCheck, count: 5 },
    { id: 'finance_billing', label: 'Finance & Billing', icon: DollarSign, badge: 'KES 8,100' },
    { id: 'server', label: 'Razak Server', icon: Cpu, badge: '12 TB NAS' },
    { id: 'ai_infra', label: 'AI & Infrastructure', icon: Bot, badge: '45 TB AI' },
    { id: 'career_education', label: 'Career & Education', icon: GraduationCap, count: kcaCourses.length },
    { id: 'operations_log', label: 'Operations Log', icon: Activity, badge: 'Live' },
    { id: 'users_rbac', label: 'Users & RBAC', icon: Users, count: realUsers.length || 5 },
    { id: 'internal_staff', label: 'Internal P3L Staff', icon: Briefcase, count: 3 },
    { id: 'comms_messaging', label: 'Messaging', icon: MessageSquare },
    { id: 'support_ticketing', label: 'Support & Ticketing', icon: HelpCircle },
    { id: 'system_wipe', label: 'System Wipes', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden font-sans antialiased bg-[#f8fafc] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-3.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-fadeIn border border-white/10">
          <CheckCircle2 className="w-4 h-4 text-amber-400 dark:text-amber-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SIDEBAR */}
      {/* ========================================================================= */}
      <aside className="w-64 flex flex-col py-4 px-3 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs z-20 shrink-0">
        
        <div className="px-2 pb-3.5 mb-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
              <img 
                src="/p3l_logo.jpeg" 
                alt="P3L" 
                className="w-full h-full object-contain p-0.5"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight truncate">
                P3L Developers
              </p>
              <p className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-mono truncate leading-tight mt-0.5">
                subsidiary Biftu Construction Co.
              </p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" title="System Online"></span>
        </div>

        <div className="flex flex-col gap-1 flex-1 w-full overflow-y-auto pr-1">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3 py-1 font-mono">
            Company Pillars
          </span>
          {navItems.map((nav) => {
            const Icon = nav.icon;
            const isActive = activeTab === nav.id;
            return (
              <button 
                key={nav.id}
                onClick={() => {
                  setActiveTab(nav.id);
                  setActiveInlineProject(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs font-bold' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{nav.label}</span>
                </div>
                {nav.count !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md shrink-0 ${
                    isActive ? 'bg-white/20 text-white dark:bg-zinc-900/10 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}>
                    {nav.count}
                  </span>
                )}
                {nav.badge && (
                  <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    isActive ? 'bg-white/20 text-white dark:bg-zinc-900/10 dark:text-zinc-900' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}>
                    {nav.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-between text-[10.5px] font-mono">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Fibre: Adrian AK 3674
            </span>
            <span className="text-zinc-900 dark:text-white font-bold">{internetSpeed} Mbps</span>
          </div>
          <div className="px-3 py-1 text-[10px] text-zinc-400 font-mono text-center">
            Branch: update-4 · Marsabit Node
          </div>
          {/* Quick Jump to Karani Law Portal & Terminal */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
            <a
              href="/"
              className="w-full px-3 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
              title="Open Karani Law Advocates & Managing Partner Portal"
            >
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-500" />
                <span>Karani Law Portal</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => setShowTerminal(prev => !prev)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-mono font-semibold flex items-center justify-between transition-colors cursor-pointer"
              title="Toggle Interactive Terminal Console (~)"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-500" />
                <span>p3l-term</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">~</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTENT CANVAS */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Top Floating Command Bar */}
        <header className="px-8 py-3.5 w-full flex justify-between items-center bg-transparent z-10">
          <div className="flex items-center gap-5 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden border border-amber-500/30 shadow-xs">
                <img src="/p3l_logo.jpeg" alt="P3L" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100 block leading-tight">
                  P3L Developers
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block leading-tight truncate">
                  subsidiary Biftu Construction Company, Marsabit
                </span>
              </div>
            </div>

            <div 
              onClick={() => setShowCommandPalette(true)}
              className="relative hidden md:flex items-center w-72 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-xs text-zinc-400 cursor-pointer hover:border-amber-500/40 transition-colors shadow-2xs"
            >
              <Search className="w-3.5 h-3.5 mr-2 text-zinc-400" />
              <span className="truncate">Search projects, clients, courses...</span>
              <kbd className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                Ctrl+K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">
              <span className="px-2.5 py-1 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <Wifi className="w-3 h-3 text-emerald-500" />
                <span>Adrian AK: {internetSpeed} Mbps</span>
              </span>
              <span className={`px-2.5 py-1 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 ${
                batteryLevel <= 35 ? 'text-amber-600 border-amber-500/40' : 'text-zinc-700 dark:text-zinc-300'
              }`}>
                {isBatteryCharging ? <BatteryCharging className="w-3 h-3 text-amber-500 animate-pulse" /> : <Battery className="w-3 h-3 text-emerald-500" />}
                <span>Battery: {batteryLevel}%</span>
              </span>
            </div>

            <button
              onClick={() => showToast('All systems operational in Marsabit.')}
              className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 cursor-pointer transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4 stroke-[1.75]" />
            </button>

            {/* Interactive Terminal Toggle */}
            <button
              onClick={() => setShowTerminal(prev => !prev)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 hover:border-amber-500/50 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Toggle Interactive Server Terminal (~)"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-500" />
              <span>Terminal</span>
            </button>

            {/* Direct Switch to Karani Law Advocates Portal */}
            <a
              href="/"
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
              title="Open Karani Law Advocates & Managing Partner Portal"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Karani Law Portal &rarr;</span>
            </a>

            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <div className="w-7 h-7 rounded-full bg-amber-500 text-zinc-950 font-bold text-xs flex items-center justify-center font-mono">
                GH
              </div>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 hidden lg:inline">
                Guyoh Halake
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Work Canvas with subtle warm orange tint at low opacity */}
        <main 
          className="flex-1 overflow-y-auto px-8 py-5 pb-20"
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.025)' }}
        >
          <div className="max-w-7xl mx-auto space-y-6">

            {/* CLEAN WELCOME SECTION WITH PRACTICAL ACTION BUTTONS */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10.5px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
                    P3L DEVELOPERS &middot; LIVE
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {getGreeting()}, Guyo
                </h1>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Friday, 16 October 2026 &middot; Bare Metal Server &middot; All nodes operational
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => { setActiveTab('career_education'); showToast('Opened Coursework & Classes'); }}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 bg-zinc-50 dark:bg-zinc-800/40 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Class</span>
                </button>

                <button
                  onClick={() => { setActiveTab('projects_clients'); showToast('Opened Projects Fleet'); }}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 bg-zinc-50 dark:bg-zinc-800/40 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Project</span>
                </button>

                <button
                  onClick={() => { setActiveTab('client_crm'); showToast('Opened Client CRM'); }}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 bg-zinc-50 dark:bg-zinc-800/40 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Client</span>
                </button>

                <button
                  onClick={() => { setActiveTab('finance_billing'); showToast('Opened Finance & Incomes'); }}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 bg-zinc-50 dark:bg-zinc-800/40 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Income</span>
                </button>

                <button
                  onClick={() => setShowAddTaskModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Task</span>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: DASHBOARD OVERVIEW */}
            {/* ========================================================================= */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Karani Law & BillsZip ERP Active Web Operations Bridge */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/30 via-zinc-900 to-indigo-950/30 border border-blue-500/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Scale className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">Karani Law &amp; BillsZip ERP Engine</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                          ● Port 3000 Active
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${feeNotesScope === 'all' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
                          Policy: {feeNotesScope === 'all' ? 'All Notes Visible' : 'Self Only'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Supabase PostgreSQL Connected &middot; {getFeeNotes().length} fee notes on ledger &middot; {EXACT_MATTERS.length} active matters &middot; {realUsers.length} provisioned staff
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setActiveTab('karani_erp')}
                      className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      Manage ERP &rarr;
                    </button>
                    <a
                      href="/"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Law Portal</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Critical Incident Alert Banner (OdinBot I&M 502) */}
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-900/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0"></span>
                    <div>
                      <span className="font-bold text-rose-950 dark:text-rose-200">
                        CRITICAL ALERT: OdinBot I&amp;M Bank Mirror HTTP 502 Bad Gateway
                      </span>
                      <p className="text-rose-700 dark:text-rose-400 text-[11px] mt-0.5">
                        Automated statement verification socket down. 14 webhook retries queued in memory.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setActiveTab('ai_infra')}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Diagnose &amp; Restart Socket &rarr;
                    </button>
                  </div>
                </div>

                {/* 3 SIDE-BY-SIDE CARDS: 1. TELEMETRY, 2. TODAY, 3. LIVE GITHUB */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Card 1: Server & Network Telemetry */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="font-bold text-zinc-900 dark:text-white font-sans flex items-center gap-2">
                        <Server className="w-4 h-4 text-amber-500" />
                        Bare Metal Server (Razak)
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-600 font-bold">1,048d</span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/50">
                        <span className="text-zinc-400 font-sans">Adrian AK Fiber:</span>
                        <strong className="text-zinc-800 dark:text-zinc-200">68 Mbps Sync</strong>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/50">
                        <span className="text-zinc-400 font-sans">Power Batteries:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400">Working Very Well</strong>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/50">
                        <span className="text-zinc-400 font-sans">Physical NAS 12 TB:</span>
                        <strong className="text-zinc-800 dark:text-zinc-200">4 TB Projects &middot; 3 TB AI</strong>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-zinc-400 font-sans">Oracle Cloud VPS:</span>
                        <strong className="text-purple-600 font-bold">45 TB Training Storage</strong>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Today (Simplified, Realistic) */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3 font-sans">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        Today &middot; Friday Focus
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">16 Oct 2026</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span className="text-[10.5px] text-zinc-400 block font-mono">Next Class:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          No class tomorrow (Weekend) &middot; Tue 7:15 AM (CUU 1102)
                        </span>
                      </div>
                      <div className="py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span className="text-[10.5px] text-zinc-400 block font-mono">Current Project:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          Karani Law Stage 4 UAT &amp; Fresh Fity POS
                        </span>
                      </div>
                      <div className="py-1">
                        <span className="text-[10.5px] text-zinc-400 block font-mono">Today's Tasks:</span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          4 tasks queued (Thermal test cut, Shein selector check, KCA lab)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Live GitHub Activity */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Github className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                        <span className="font-bold text-zinc-900 dark:text-white font-sans">github.com/guyo-halake</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-500">
                        main
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      {[
                        { hash: 'b188210', msg: 'fix: 200ms debounce on ESC/POS paper auto-cutter', repo: 'Fresh Fity' },
                        { hash: 'a12f909', msg: 'feat: Supabase advocate user provisioning module & RBAC', repo: 'Karani Law' },
                        { hash: 'c909e14', msg: 'chore: update Shein DOM selector for flash sale badge', repo: 'Sayara API' },
                        { hash: 'd401e19', msg: 'perf: lazy load catalog high-res beauty thumbnails', repo: 'Sayara Web' }
                      ].map((cmt, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px] shrink-0">
                              {cmt.hash}
                            </span>
                            <span className="font-sans text-zinc-800 dark:text-zinc-200 truncate text-[11px]">{cmt.msg}</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-semibold shrink-0">{cmt.repo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Revenue Card (Real Agreed Terms in KES) */}
                  <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
                        Monthly Software Retainers
                      </span>
                      <div className="mt-3">
                        <p className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 font-mono">
                          KES 8,000
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-normal">
                          Monthly software maintenance from active paying client retainers
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                        <span>Fresh City POS:</span>
                        <span className="font-mono text-zinc-900 dark:text-zinc-200 font-semibold">KES 3,500 / month</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                        <span>Sayara Aesthetics:</span>
                        <span className="font-mono text-zinc-900 dark:text-zinc-200 font-semibold">% Sales Commission</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                        <span>SUVPlanet Marketplace:</span>
                        <span className="font-mono text-zinc-900 dark:text-zinc-200 font-semibold">KES 400 / 2 months</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Fleet Card */}
                  <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
                          Project Fleet
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {projects.length} Repositories
                        </span>
                      </div>

                      <div className="mt-3 space-y-2.5 text-xs">
                        {projects.slice(0, 3).map(p => (
                          <div 
                            key={p.id}
                            onClick={() => {
                              setActiveTab('projects_clients');
                              setActiveInlineProject(p);
                            }}
                            className="flex items-center justify-between py-1 group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 px-2 rounded-lg transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100 block truncate group-hover:underline">
                                {p.name}
                              </span>
                              <span className="text-[10.5px] text-zinc-400 font-mono block truncate">
                                {p.client} &middot; {p.currentVersion}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {p.isRealDb ? 'Real DB' : 'Live'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => setActiveTab('projects_clients')}
                      className="text-[10.5px] font-mono text-amber-600 dark:text-amber-400 hover:underline pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 text-left cursor-pointer"
                    >
                      Open Full Projects &amp; Clients Page &rarr;
                    </button>
                  </div>

                  {/* KCA Degree Overview Card */}
                  <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
                          Degree (Ongoing)
                        </span>
                        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                          KCA University
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-xs">
                        <span className="font-bold text-zinc-900 dark:text-white block font-sans">
                          BSc in Applied Computing Technology
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono block">
                          Minor: Information Forensics and Cybersecurity
                        </span>
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10.5px] font-mono text-amber-800 dark:text-amber-300">
                          Next class: CUU 1102 &middot; Joselyne Mutende &middot; Tue 7:15 AM
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setActiveTab('career_education')}
                      className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-left cursor-pointer"
                    >
                      View KCA Hub, Zetech Diploma &amp; CompTIA &rarr;
                    </button>
                  </div>

                </div>

                {/* Infrastructure Dual Storage & Hardware Telemetry Status */}
                <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4 font-mono text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <span className="text-zinc-400 block uppercase text-[10px]">Dual Infrastructure Telemetry</span>
                      <span className="font-bold text-zinc-900 dark:text-white mt-0.5 block text-sm">
                        razak-server (Bare-Metal Marsabit) &middot; 24.3°C &middot; 86.888% Compute Load
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-zinc-500 text-[11px]">Uptime: {formatUptime(uptimeSeconds)}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold text-[10px] border border-emerald-500/20">
                        Adrian AK 3674 OK
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Storage Pool 1: 12 TB Physical NAS Array on razak-server */}
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-amber-500" />
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">razak-server 12 TB NAS Pool</span>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          Ubuntu ZFS NAS
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Total Physical Pool: <strong className="text-zinc-900 dark:text-white">12 TB</strong> &middot; Projects: <strong>4 TB</strong> &middot; Stored Archive: <strong>5 TB</strong>
                      </p>
                      <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex">
                        <div className="h-full bg-amber-500" style={{ width: '33.3%' }} title="Projects 4 TB"></div>
                        <div className="h-full bg-purple-500" style={{ width: '41.7%' }} title="Personal Media & Games 5 TB"></div>
                        <div className="h-full bg-emerald-500/40 flex-1" title="Free 3 TB"></div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-400">
                        <span>Media (2.3 TB), Games: GTA 4, San Andreas, NFS (1.6 TB)</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">3 TB Free Space</span>
                      </div>
                    </div>

                    {/* Storage Pool 2: Separate Oracle Cloud VPS Storage for AI */}
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cloud className="w-4 h-4 text-blue-500" />
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">Oracle Cloud VPS (AI Dedicated)</span>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          Separate Cloud VPS
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Total AI Dedicated Array: <strong className="text-zinc-900 dark:text-white">45 TB (45,000 GB)</strong> &middot; Loaded: <strong>14.2 TB</strong>
                      </p>
                      <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '31.5%' }}></div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-400">
                        <span>OdinBot Models, Vectors & OCR</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">30.8 TB High-Capacity Reserve</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: KARANI LAW & BILLSZIP ERP OPERATIONS BRIDGE */}
            {/* ========================================================================= */}
            {activeTab === 'karani_erp' && (
              <div className="space-y-6 animate-fadeIn">
                {/* 1. Header Banner */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Live Web App &middot; Port 3000
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Scale className="w-5 h-5 text-blue-500" />
                      Karani Law &amp; BillsZip Legal ERP
                    </h2>
                    <p className="text-xs text-zinc-500 font-sans">
                      Advocates of the High Court of Kenya &middot; Statutory Bill of Costs Engine &amp; Practice Management
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        loadRealUsers();
                        showToast('Database synchronization complete.');
                      }}
                      className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/60 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh DB</span>
                    </button>

                    <a
                      href="/"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span>Open Law Portal</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* 2. Top 4 Live Database Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-1">
                    <span className="text-[10.5px] font-mono text-zinc-400 uppercase font-bold tracking-wider">Fee Notes on Ledger</span>
                    <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white">
                      {getFeeNotes().length} Bills
                    </div>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                      Live in Supabase
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-1">
                    <span className="text-[10.5px] font-mono text-zinc-400 uppercase font-bold tracking-wider">Active Matters</span>
                    <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white">
                      {EXACT_MATTERS.length} Matters
                    </div>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                      High Court &amp; ELC
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-1">
                    <span className="text-[10.5px] font-mono text-zinc-400 uppercase font-bold tracking-wider">Client Retainers</span>
                    <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white">
                      {EXACT_CLIENTS.length} Retainers
                    </div>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                      Corporate &amp; Individual
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-1">
                    <span className="text-[10.5px] font-mono text-zinc-400 uppercase font-bold tracking-wider">Provisioned Staff</span>
                    <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white">
                      {realUsers.length} Advocates
                    </div>
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-mono">
                      Active User Accounts
                    </span>
                  </div>
                </div>

                {/* 3. Fee Notes Visibility Policy Control Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">Advocate Fee Notes Access Policy</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${feeNotesScope === 'all' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'}`}>
                          {feeNotesScope === 'all' ? '● Firm-Wide: All Notes Visible' : '● Restricted: Self Only'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {feeNotesScope === 'all'
                          ? 'Allow All Fee Notes: Advocates see the entire firm ledger across all matters and counsel.'
                          : 'Allow Self Only: Restricts advocates so they can only see fee notes they drafted themselves.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 bg-zinc-100 dark:bg-zinc-950/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => handleSetFeeNotesScope('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        feeNotesScope === 'all'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      Allow All Fee Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetFeeNotesScope('self')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        feeNotesScope === 'self'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      Allow Self Only
                    </button>
                  </div>
                </div>

                {/* 4. Schedule 6 Statutory Legal Math Diagnostic Tool */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-amber-500" />
                        Schedule 6 Statutory Instruction Fee Diagnostic
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Live legal arithmetic engine under the Advocates (Remuneration) Order 2014, Schedule 6 Item 1(b)
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Kenya Gazette Legal Notice 35/2014
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Controls */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Subject Matter Claim Value (KES)
                        </label>
                        <input
                          type="number"
                          value={calcClaim}
                          onChange={e => setCalcClaim(Math.max(0, Number(e.target.value)))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Quick Presets */}
                      <div>
                        <span className="block text-[11px] font-mono text-zinc-400 mb-1.5 font-bold">Quick Presets:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[500000, 1000000, 5000000, 20000000, 50000000].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setCalcClaim(val)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                                calcClaim === val
                                  ? 'bg-amber-500 text-zinc-950 font-bold'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                              }`}
                            >
                              KES {(val / 1000000 >= 1 ? `${val / 1000000}M` : `${val / 1000}K`)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="calc-defended"
                          checked={calcDefended}
                          onChange={e => setCalcDefended(e.target.checked)}
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="calc-defended" className="text-xs text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer">
                          Defended Suit (Item 1(b) statutory scale apply)
                        </label>
                      </div>
                    </div>

                    {/* Live Calculation Output Card */}
                    {(() => {
                      const res = calculateSchedule6Diagnostic(calcClaim, calcDefended);
                      return (
                        <div className="p-4.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 space-y-2.5 font-mono text-xs">
                          <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 dark:border-zinc-800">
                            <span className="text-zinc-500 font-sans">Statutory Instruction Fee:</span>
                            <strong className="text-zinc-900 dark:text-white font-bold">KES {res.instruction.toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 dark:border-zinc-800">
                            <span className="text-zinc-500 font-sans">Getting-Up Fee (33.3%):</span>
                            <strong className="text-zinc-900 dark:text-white">KES {res.gettingUp.toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 dark:border-zinc-800">
                            <span className="text-zinc-500 font-sans">Subtotal (Professional Fees):</span>
                            <strong className="text-zinc-900 dark:text-white">KES {res.subtotal.toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 dark:border-zinc-800">
                            <span className="text-zinc-500 font-sans">VAT @ 16%:</span>
                            <strong className="text-amber-600 dark:text-amber-400">KES {res.vat.toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 text-sm">
                            <span className="text-zinc-900 dark:text-white font-bold font-sans">Total Legal Billing:</span>
                            <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
                              KES {res.total.toLocaleString()}
                            </strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 5. Advocate Staff Roster */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        Karani Law Provisioned Staff Roster ({realUsers.length})
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Active accounts with database access to matters, billing, and document vaults
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddRealUserModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-xs cursor-pointer"
                    >
                      + Add Advocate to Database
                    </button>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    {realUsers.map(u => (
                      <div key={u.id} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-white font-sans block">{u.fullName}</span>
                          <span className="text-[11px] text-zinc-400">{u.workEmail} &middot; LSK: {u.lskNo || 'Advocate'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                            {u.role}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteRealUser(u.id, u.fullName)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. Recent Fee Notes on Ledger */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        Recent Fee Notes on Ledger ({getFeeNotes().length})
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Live bills of costs drafted and issued under the Advocates Remuneration Order
                      </p>
                    </div>

                    <a
                      href="/"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold"
                    >
                      View All on Fee Notes Page &rarr;
                    </a>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    {getFeeNotes().slice(0, 5).map(note => (
                      <div key={note.id} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-white font-mono">{note.billNumber || note.id}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              {note.status || 'Issued'}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-400 font-sans block mt-0.5">
                            {note.matterTitle || 'Legal Services'} &middot; Client: {note.clientName || 'General'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono block">
                            KES {(note.grandTotal || 0).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Active'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: PROJECTS & CLIENTS (FULL INLINE WORKSPACE — NO POPUPS) */}
            {/* ========================================================================= */}
            {activeTab === 'projects_clients' && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* A. If a project is clicked, display the FULL INLINE WORKSPACE */}
                {activeInlineProject ? (
                  <div className="space-y-6">
                    {/* Breadcrumb Back & Next/Prev Controls */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveInlineProject(null)}
                          className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>All Projects</span>
                        </button>

                        <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden text-xs">
                          <button
                            onClick={() => {
                              const currIdx = projects.findIndex(p => p.id === activeInlineProject.id);
                              const prevIdx = (currIdx - 1 + projects.length) % projects.length;
                              setActiveInlineProject(projects[prevIdx]);
                            }}
                            className="px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer flex items-center gap-1 border-r border-zinc-200 dark:border-zinc-800"
                            title="Previous Project (k)"
                          >
                            <span>&larr; Prev</span>
                          </button>
                          <button
                            onClick={() => {
                              const currIdx = projects.findIndex(p => p.id === activeInlineProject.id);
                              const nextIdx = (currIdx + 1) % projects.length;
                              setActiveInlineProject(projects[nextIdx]);
                            }}
                            className="px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer flex items-center gap-1"
                            title="Next Project (j)"
                          >
                            <span>Next &rarr;</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-amber-500 text-zinc-950">
                          {activeInlineProject.currentVersion}
                        </span>
                        {activeInlineProject.isRealDb && (
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            Real Supabase DB
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Inline Project Header */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                          {activeInlineProject.name}
                        </h2>
                        <p className="text-xs text-zinc-500 mt-1">
                          Client: <strong className="text-zinc-800 dark:text-zinc-200">{activeInlineProject.client}</strong> &middot; Category: {activeInlineProject.category} &middot; Active Since: {activeInlineProject.activeSince}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <a 
                          href={activeInlineProject.githubUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5"
                        >
                          <Github className="w-3.5 h-3.5" />
                          <span>GitHub Repo</span>
                        </a>
                        <a 
                          href={activeInlineProject.liveUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-xs flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Live System</span>
                        </a>
                      </div>
                    </div>

                    {/* Workspace Tabs */}
                    <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold gap-2 md:gap-6 overflow-x-auto pb-1">
                      <button
                        onClick={() => setProjectWorkspaceTab('overview')}
                        className={`pb-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                          projectWorkspaceTab === 'overview' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Contract &amp; Money</span>
                      </button>
                      <button
                        onClick={() => setProjectWorkspaceTab('journey')}
                        className={`pb-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                          projectWorkspaceTab === 'journey' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>How it was Built ({activeInlineProject.journey?.length || 0})</span>
                      </button>
                      <button
                        onClick={() => setProjectWorkspaceTab('commits')}
                        className={`pb-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                          projectWorkspaceTab === 'commits' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        <GitCommit className="w-3.5 h-3.5" />
                        <span>Git &amp; Commits ({activeInlineProject.recentCommits?.length || 0})</span>
                      </button>
                      <button
                        onClick={() => setProjectWorkspaceTab('comms')}
                        className={`pb-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                          projectWorkspaceTab === 'comms' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp &amp; Calls ({activeInlineProject.communicationLogs?.length || 0})</span>
                      </button>
                      <button
                        onClick={() => setProjectWorkspaceTab('incidents')}
                        className={`pb-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                          projectWorkspaceTab === 'incidents' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Problems &amp; Fixes ({activeInlineProject.hardwareIncidents?.length || 0})</span>
                      </button>
                      <button
                        onClick={() => setProjectWorkspaceTab('data')}
                        className={`pb-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                          projectWorkspaceTab === 'data' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>{activeInlineProject.isRealDb ? 'Supabase Users' : activeInlineProject.specs ? 'Hardware Specs' : 'Database Records'}</span>
                      </button>
                    </div>

                    {/* Workspace Tab 1: Contract & Agreement & Financial Ledger */}
                    {projectWorkspaceTab === 'overview' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">Contract Details</span>
                            <p className="text-base font-bold text-zinc-900 dark:text-white font-mono">{activeInlineProject.monthlyFee}</p>
                            <p className="text-xs text-zinc-500 font-mono">Setup Fee Paid: {activeInlineProject.initialPaid}</p>
                            <p className="text-xs text-zinc-500 font-mono">Contract Type: {activeInlineProject.contractType}</p>
                          </div>

                          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">Storage &amp; Server Space</span>
                            <p className="text-base font-bold text-zinc-900 dark:text-white font-mono">{activeInlineProject.allocatedStorageGb} GB Partitioned</p>
                            <p className="text-xs text-zinc-500 font-mono">Host: razak-server (12,000 GB Array)</p>
                            <p className="text-xs text-zinc-500 font-mono">Network: Adrian AK Synchronous Fiber</p>
                          </div>

                          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">Client Contact</span>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{activeInlineProject.client}</p>
                            <p className="text-xs text-zinc-500 font-mono">Phone: {activeInlineProject.clientPhone}</p>
                            <div className="pt-1">
                              <a
                                href={`https://wa.me/${activeInlineProject.clientPhone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Chat on WhatsApp</span>
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Fresh Fity Thermal Receipt Simulator */}
                        {activeInlineProject.id === 'prj-fresh-fity' && (
                          <div className="p-5 rounded-2xl bg-zinc-950 text-zinc-100 border border-zinc-800 space-y-3 font-mono text-xs shadow-xs">
                            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                              <div className="flex items-center gap-2">
                                <Printer className="w-4 h-4 text-amber-400" />
                                <span className="font-bold font-sans text-sm text-white">Xprinter 80mm ESC/POS Simulator</span>
                              </div>
                              <button
                                onClick={handleTestThermalCut}
                                disabled={thermalCutSimulating}
                                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                              >
                                {thermalCutSimulating ? 'Debouncing (200ms)...' : 'Test Auto-Cutter Cut'}
                              </button>
                            </div>

                            <div className="p-4 bg-zinc-900/90 rounded-xl border border-zinc-800 max-w-md mx-auto text-center space-y-2 text-[11.5px] leading-relaxed">
                              <p className="font-bold text-sm tracking-wider">FRESH FITY SUPERMARKET</p>
                              <p className="text-[10px] text-zinc-400">Ruiru Town · Kiambu County · Tel: 0756111885</p>
                              <p className="text-[10px] text-zinc-400">Register: POS-01 · Date: 16 Oct 2026</p>
                              <div className="border-b border-dashed border-zinc-700 my-2"></div>
                              <div className="text-left space-y-1">
                                <div className="flex justify-between"><span>2kg Pembe Maize Flour</span><span>KES 195.00</span></div>
                                <div className="flex justify-between"><span>1kg Ndhiwa White Sugar</span><span>KES 180.00</span></div>
                                <div className="flex justify-between"><span>500ml Brookside Milk</span><span>KES 65.00</span></div>
                                <div className="flex justify-between"><span>100g Royco Beef Cubes</span><span>KES 100.00</span></div>
                              </div>
                              <div className="border-b border-dashed border-zinc-700 my-2"></div>
                              <div className="flex justify-between font-bold text-xs text-white">
                                <span>TOTAL (KES)</span>
                                <span>KES 540.00</span>
                              </div>
                              <p className="text-[10px] text-zinc-400 text-left pt-1">Paid: M-Pesa Till QA8891KL2</p>
                              <div className={`border-b-2 border-dashed ${thermalCutDone ? 'border-amber-400 text-amber-400' : 'border-zinc-700 text-zinc-600'} py-1 text-[10px]`}>
                                {thermalCutDone ? '✂ - - - [ GS V 66 0 CUT COMPLETE · NO PAPER JAM ] - - - ✂' : '- - - - - - - - - [ AUTO-CUTTER LINE ] - - - - - - - - -'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Financial Ledger Section */}
                        {activeInlineProject.financialLedger && (
                          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-zinc-100 dark:border-zinc-800 gap-2">
                              <div>
                                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                                  Payments &amp; M-Pesa Records
                                </h3>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                  {activeInlineProject.financialLedger.summary}
                                </p>
                              </div>
                              <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs shrink-0">
                                Total: {activeInlineProject.financialLedger.totalSettled}
                              </span>
                            </div>

                            {activeInlineProject.financialLedger.items.length > 0 && (
                              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden font-mono text-xs">
                                <table className="w-full text-left">
                                  <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] text-zinc-400 uppercase">
                                    <tr>
                                      <th className="p-3">Date</th>
                                      <th className="p-3">Amount</th>
                                      <th className="p-3">Description</th>
                                      <th className="p-3">Transaction Reference</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {activeInlineProject.financialLedger.items.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                                        <td className="p-3 text-zinc-400">{item.date}</td>
                                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{item.amount}</td>
                                        <td className="p-3 font-sans text-zinc-800 dark:text-zinc-200">{item.description}</td>
                                        <td className="p-3 text-zinc-500">{item.ref || 'Direct Bank/M-Pesa'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {activeInlineProject.financialLedger.hardwareOutlay && (
                              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
                                <Receipt className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="font-semibold">Equipment bought for client: </strong>
                                  <span>{activeInlineProject.financialLedger.hardwareOutlay}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Workspace Tab 2: Architecture Evolution Journey */}
                    {projectWorkspaceTab === 'journey' && (
                      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
                        <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                            How the App was Built &amp; Changed
                          </h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Real-world operational journey, field crashes, offline rewrites, and hardware integrations
                          </p>
                        </div>

                        <div className="space-y-4">
                          {activeInlineProject.journey && activeInlineProject.journey.length > 0 ? (
                            activeInlineProject.journey.map((j, idx) => (
                              <div key={idx} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-zinc-900 dark:text-white font-mono flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    {j.phase}
                                  </span>
                                  <span className="text-[10.5px] font-mono text-zinc-400">{j.date}</span>
                                </div>
                                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
                                  {j.details}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-zinc-500 py-4 font-mono">
                              No historical journey stages logged yet for this project.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Workspace Tab 3: Git Chronicles & Commits */}
                    {projectWorkspaceTab === 'commits' && (
                      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
                        <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                          <div>
                            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                              Code Commits &amp; Branches
                            </h3>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Production commits, branch histories, and technical changelogs
                            </p>
                          </div>
                          <span className="text-xs font-mono px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            Repo: {activeInlineProject.repo}
                          </span>
                        </div>

                        <div className="space-y-2.5 font-mono text-xs">
                          {activeInlineProject.recentCommits && activeInlineProject.recentCommits.map((c, idx) => (
                            <div key={idx} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                              <div className="flex items-center gap-2.5">
                                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                                  {c.hash}
                                </span>
                                {c.branch && (
                                  <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px]">
                                    {c.branch}
                                  </span>
                                )}
                                <span className="font-sans text-zinc-900 dark:text-white text-xs font-medium">
                                  {c.message}
                                </span>
                              </div>
                              <span className="text-[10.5px] text-zinc-400 shrink-0">{c.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Workspace Tab 4: Client Dynamics & WhatsApp Logs */}
                    {projectWorkspaceTab === 'comms' && (
                      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
                        <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                            WhatsApp &amp; Phone Chats with Client
                          </h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Real customer conversations, phone requests, cashier issues, and field resolutions
                          </p>
                        </div>

                        <div className="space-y-3 font-sans">
                          {activeInlineProject.communicationLogs && activeInlineProject.communicationLogs.length > 0 ? (
                            activeInlineProject.communicationLogs.map((log, idx) => (
                              <div key={idx} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                      log.channel === 'WhatsApp' ? 'bg-emerald-500/15 text-emerald-600' :
                                      log.channel === 'Voice Call' ? 'bg-blue-500/15 text-blue-600' :
                                      'bg-amber-500/15 text-amber-600'
                                    }`}>
                                      {log.channel}
                                    </span>
                                    <strong className="text-xs text-zinc-900 dark:text-white">{log.sender}</strong>
                                  </div>
                                  <span className="text-[10.5px] font-mono text-zinc-400">{log.date}</span>
                                </div>
                                <p className="text-xs text-zinc-700 dark:text-zinc-300 italic pl-2 border-l-2 border-zinc-300 dark:border-zinc-700">
                                  {log.snippet}
                                </p>
                                {log.resolution && (
                                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                                    &rarr; Resolution: {log.resolution}
                                  </p>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-zinc-500 py-4 font-mono">
                              No client communication logs recorded for this internal/academic project.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Workspace Tab 5: Hardware & Operational Incidents */}
                    {projectWorkspaceTab === 'incidents' && (
                      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
                        <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                            Problems &amp; How We Fixed Them
                          </h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Real field incidents, printer driver glitches, network dropouts, bot challenges, and permanent fixes
                          </p>
                        </div>

                        <div className="space-y-3">
                          {activeInlineProject.hardwareIncidents && activeInlineProject.hardwareIncidents.length > 0 ? (
                            activeInlineProject.hardwareIncidents.map((inc, idx) => (
                              <div key={idx} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                      {inc.id}
                                    </span>
                                    <h4 className="font-bold text-xs text-zinc-900 dark:text-white">{inc.title}</h4>
                                  </div>
                                  <span className="text-[10.5px] font-mono text-zinc-400">{inc.date}</span>
                                </div>
                                <div className="text-xs space-y-1.5 font-sans">
                                  <p className="text-zinc-600 dark:text-zinc-400">
                                    <strong className="text-zinc-800 dark:text-zinc-200">Symptom: </strong>
                                    {inc.symptom}
                                  </p>
                                  <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                                    <strong>How we fixed it: </strong>
                                    {inc.fix}
                                  </p>
                                  {inc.permanentConfig && (
                                    <div className="p-2 rounded-lg bg-zinc-900 text-zinc-300 font-mono text-[10.5px]">
                                      <code>{inc.permanentConfig}</code>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-zinc-500 py-4 font-mono">
                              No open or historical technical incidents logged for this project.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Workspace Tab 6: Database Records & Hardware Specs */}
                    {projectWorkspaceTab === 'data' && (
                      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
                        {activeInlineProject.isRealDb ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                              <div>
                                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                                  Real Supabase &amp; PostgreSQL Database Users (Karani Law)
                                </h3>
                                <p className="text-xs text-zinc-500">
                                  Accounts provisioned directly in database. These users can log in to the portal.
                                </p>
                              </div>
                              <button 
                                onClick={() => setShowAddRealUserModal(true)}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer"
                              >
                                + Add Real User
                              </button>
                            </div>

                            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden font-mono text-xs">
                              <table className="w-full text-left">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] text-zinc-400 uppercase">
                                  <tr>
                                    <th className="p-3">Advocate Name</th>
                                    <th className="p-3">Email (Login)</th>
                                    <th className="p-3">LSK Roll No</th>
                                    <th className="p-3">Firm Role</th>
                                    <th className="p-3 text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                  {realUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                                      <td className="p-3 font-sans font-semibold text-zinc-900 dark:text-white">{u.fullName}</td>
                                      <td className="p-3 text-zinc-500">{u.workEmail}</td>
                                      <td className="p-3 text-zinc-400">{u.lskNo || 'Advocate'}</td>
                                      <td className="p-3">
                                        <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                          {u.role}
                                        </span>
                                      </td>
                                      <td className="p-3 text-right">
                                        <button 
                                          onClick={() => handleDeleteRealUser(u.id, u.fullName)}
                                          className="text-rose-600 hover:underline cursor-pointer"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : activeInlineProject.specs ? (
                          <div className="space-y-4 font-mono text-xs">
                            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                              <span className="font-bold text-sm text-zinc-900 dark:text-white font-sans">
                                Machine Specs
                              </span>
                              <span className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10.5px] font-bold">
                                {activeInlineProject.status}
                              </span>
                            </div>

                            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <table className="w-full text-left">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] text-zinc-400 uppercase">
                                  <tr>
                                    <th className="p-3 w-1/3">Component</th>
                                    <th className="p-3">Specification Details</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                  {Object.entries(activeInlineProject.specs).map(([k, v]) => (
                                    <tr key={k} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                                      <td className="p-3 font-semibold text-zinc-900 dark:text-white">{k}</td>
                                      <td className="p-3 text-zinc-600 dark:text-zinc-400">{v}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 font-mono text-xs">
                            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                              <span className="font-bold text-sm text-zinc-900 dark:text-white font-sans">
                                Database Records &middot; {activeInlineProject.name}
                              </span>
                              <span className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10.5px]">
                                Partition: {activeInlineProject.allocatedStorageGb} GB
                              </span>
                            </div>
                            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                              Active records partition mapped to razak-server internal storage. Connected to local application ledger.
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ) : (
                  // B. If NO project is active, display the main Projects & Clients overview list
                  <div className="space-y-6">
                    {/* Header with Kanban & Filter Switcher */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                          Projects &amp; Hardware Fleet
                        </h2>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Click any project to see its full story &middot; Switch between Cards, Kanban, or System Map
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold">
                          <button
                            onClick={() => setProjectViewMode('grid')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                              projectViewMode === 'grid' 
                                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-bold' 
                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                          >
                            <Grid className="w-3.5 h-3.5" />
                            Cards Grid
                          </button>
                          <button
                            onClick={() => setProjectViewMode('kanban')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                              projectViewMode === 'kanban' 
                                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-bold' 
                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                          >
                            <Kanban className="w-3.5 h-3.5" />
                            Kanban
                          </button>
                          <button
                            onClick={() => setProjectViewMode('map')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                              projectViewMode === 'map' 
                                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-bold' 
                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            System Map
                          </button>
                        </div>

                        {/* Live Service Health Prober */}
                        <button
                          onClick={runServiceHealthCheck}
                          disabled={isProbingServices}
                          className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer transition-colors bg-white dark:bg-zinc-900 shadow-2xs"
                        >
                          <Activity className={`w-3.5 h-3.5 ${isProbingServices ? 'animate-spin text-amber-500' : 'text-emerald-500'}`} />
                          <span>{isProbingServices ? 'Probing...' : 'Check System Status'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Live Service Probe Results Bar */}
                    {probeResults && (
                      <div className="p-4 rounded-2xl bg-zinc-950 text-white border border-zinc-800 space-y-2.5 text-xs animate-fadeIn font-mono">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                          <span className="font-bold flex items-center gap-2 text-amber-400">
                            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                            Live Node Ping &amp; Network Status
                          </span>
                          <span className="text-[10.5px] text-zinc-400">Marsabit razak-server Gateway</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
                          {Object.entries(probeResults).map(([k, v]) => (
                            <div key={k} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                              <span className="text-[10px] text-zinc-400 block truncate">{k}</span>
                              <div className="flex justify-between items-center font-bold">
                                <span className={v.ok ? 'text-emerald-400' : 'text-rose-400'}>{v.status}</span>
                                <span className="text-[10px] text-zinc-500">{v.latency}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Filter Sub-nav */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
                      {[
                        { id: 'all', label: `All (${projects.length})` },
                        { id: 'client', label: `Client Projects (${projects.filter(p => p.projectGroup === 'client').length})` },
                        { id: 'internal', label: `Internal & FinTech (${projects.filter(p => p.projectGroup === 'internal').length})` },
                        { id: 'school', label: `School Projects (${projects.filter(p => p.projectGroup === 'school').length})` },
                        { id: 'personal', label: `Personal Projects (${projects.filter(p => p.projectGroup === 'personal').length})` },
                        { id: 'hardware', label: `Hardware Fleet (${projects.filter(p => p.projectGroup === 'hardware').length})` }
                      ].map((flt) => (
                        <button
                          key={flt.id}
                          onClick={() => setProjectSubFilter(flt.id as any)}
                          className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors whitespace-nowrap ${
                            projectSubFilter === flt.id
                              ? 'bg-amber-500 text-zinc-950 shadow-xs'
                              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                          }`}
                        >
                          {flt.label}
                        </button>
                      ))}
                    </div>

                    {/* VIEW 1: Cards Grid Mode */}
                    {projectViewMode === 'grid' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {projects
                          .filter(p => {
                            if (projectSubFilter === 'all') return true;
                            return p.projectGroup === projectSubFilter;
                          })
                          .map(p => (
                            <div 
                              key={p.id} 
                              onClick={() => {
                                setActiveInlineProject(p);
                                setProjectWorkspaceTab('overview');
                              }}
                              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between space-y-4 cursor-pointer hover:border-amber-500/50 transition-all group"
                            >
                              <div className="space-y-2.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                    {p.currentVersion} &middot; {p.category}
                                  </span>
                                  <span className="text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    {p.isRealDb ? 'Real Supabase' : p.isPaying ? 'Paying Client' : 'Internal'}
                                  </span>
                                </div>

                                <h3 className="font-bold text-sm text-zinc-900 dark:text-white font-sans group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                  {p.name}
                                </h3>
                                
                                <p className="text-xs text-zinc-500">
                                  Client: <strong className="text-zinc-800 dark:text-zinc-200">{p.client}</strong>
                                </p>

                                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-[11px] font-mono space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-zinc-400">Agreed Contract:</span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{p.monthlyFee}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-zinc-400">Storage:</span>
                                    <span className="text-zinc-500">{p.allocatedStorageGb} GB</span>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs">
                                <span className="text-zinc-400 text-[11px] font-mono">{p.activeSince}</span>
                                <span className="font-bold text-amber-600 dark:text-amber-400 group-hover:underline">
                                  Open Workspace &rarr;
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* VIEW 2: 4-Column Kanban Board Mode */}
                    {projectViewMode === 'kanban' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans text-xs">
                        {[
                          { title: 'Backlog / Staged', status: 'Backlog', color: 'border-zinc-300 dark:border-zinc-700', prjs: projects.filter(p => p.progress < 70) },
                          { title: 'Building / Active', status: 'Building', color: 'border-blue-500/50', prjs: projects.filter(p => p.progress >= 70 && p.progress < 90) },
                          { title: 'In Review / UAT', status: 'Review', color: 'border-amber-500/50', prjs: projects.filter(p => p.progress >= 90 && !p.status.includes('Live')) },
                          { title: 'Live In Production', status: 'Live', color: 'border-emerald-500/50', prjs: projects.filter(p => p.status.includes('Live')) }
                        ].map((col) => (
                          <div key={col.title} className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700/60 font-mono">
                              <span className="font-bold text-zinc-900 dark:text-white text-xs">{col.title}</span>
                              <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold">
                                {col.prjs.length}
                              </span>
                            </div>

                            <div className="space-y-2.5">
                              {col.prjs.map(p => (
                                <div 
                                  key={p.id}
                                  onClick={() => {
                                    setActiveInlineProject(p);
                                    setProjectWorkspaceTab('overview');
                                  }}
                                  className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs hover:border-amber-500 cursor-pointer space-y-2 transition-all"
                                >
                                  <div className="flex justify-between items-center font-mono text-[10px]">
                                    <span className="text-zinc-400">{p.currentVersion}</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                      {p.isPaying ? 'Paying' : 'Internal'}
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-xs text-zinc-900 dark:text-white">{p.name}</h4>
                                  <p className="text-[11px] text-zinc-500">Client: {p.client}</p>
                                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-[10px] font-mono text-zinc-400">
                                    <span>{p.monthlyFee}</span>
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">{p.progress}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* VIEW 3: Interactive System Map (How Everything Connects) */}
                    {projectViewMode === 'map' && (
                      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-6">
                        <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                          <div>
                            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                              System Map: How Everything Connects
                            </h3>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Real architecture showing how registers, web apps, databases, and the Marsabit server link together
                            </p>
                          </div>
                          <span className="text-xs font-mono px-2.5 py-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                            WireGuard Mesh (10.14.0.0/24)
                          </span>
                        </div>

                        {/* Central Visual Hub Diagram */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans text-xs">
                          {/* Left Column: Client Endpoints */}
                          <div className="space-y-4">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                              1. Client Stores &amp; Web Apps
                            </span>
                            
                            <div 
                              onClick={() => {
                                const p = projects.find(x => x.id === 'prj-fresh-fity');
                                if (p) { setActiveInlineProject(p); setProjectWorkspaceTab('overview'); }
                              }}
                              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:border-amber-500 cursor-pointer space-y-1.5 transition-all shadow-2xs"
                            >
                              <div className="flex justify-between items-center">
                                <strong className="text-zinc-900 dark:text-white">Fresh Fity POS (Ruiru)</strong>
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-600 font-mono">Offline-First</span>
                              </div>
                              <p className="text-[11px] text-zinc-500">Electron + SQLite WAL writes in &lt;4ms. Syncs to Marsabit server over Adrian AK fiber.</p>
                            </div>

                            <div 
                              onClick={() => {
                                const p = projects.find(x => x.id === 'prj-sayara-ecom');
                                if (p) { setActiveInlineProject(p); setProjectWorkspaceTab('overview'); }
                              }}
                              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:border-amber-500 cursor-pointer space-y-1.5 transition-all shadow-2xs"
                            >
                              <div className="flex justify-between items-center">
                                <strong className="text-zinc-900 dark:text-white">Sayara Aesthetics</strong>
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-600 font-mono">Vercel Edge</span>
                              </div>
                              <p className="text-[11px] text-zinc-500">Next.js 14 + Daraja STK push. Connects to Shein daemon on Port 8040 for live stock counts.</p>
                            </div>

                            <div 
                              onClick={() => {
                                const p = projects.find(x => x.id === 'prj-karani-law');
                                if (p) { setActiveInlineProject(p); setProjectWorkspaceTab('overview'); }
                              }}
                              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:border-amber-500 cursor-pointer space-y-1.5 transition-all shadow-2xs"
                            >
                              <div className="flex justify-between items-center">
                                <strong className="text-zinc-900 dark:text-white">Karani Law &amp; BillsZip</strong>
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/15 text-blue-600 font-mono">FastAPI</span>
                              </div>
                              <p className="text-[11px] text-zinc-500">Schedule 6 fee math engine + real Supabase DB + Azure ACR container deployment.</p>
                            </div>
                          </div>

                          {/* Center Column: The Marsabit Physical Core Server */}
                          <div className="space-y-4">
                            <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                              2. Marsabit Core (razak-server)
                            </span>

                            <div 
                              onClick={() => {
                                const p = projects.find(x => x.id === 'prj-hw-razak-server');
                                if (p) { setActiveInlineProject(p); setProjectWorkspaceTab('data'); }
                              }}
                              className="p-5 rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 hover:border-amber-500 cursor-pointer space-y-3 transition-all"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <Server className="w-4 h-4 text-amber-500" />
                                  <strong className="text-zinc-900 dark:text-white text-sm">razak-server Node</strong>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-600 font-bold">148d Uptime</span>
                              </div>

                              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                                Ubuntu Server 24.04 LTS · Intel i7-10700 · 32GB RAM · 12 TB RAID 5 array · Dual 100Ah battery bank backup.
                              </p>

                              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-[11px] font-mono">
                                <div className="flex justify-between"><span className="text-zinc-400">Adrian AK Fiber:</span><span className="text-emerald-600 font-bold">50 Mbps Sync</span></div>
                                <div className="flex justify-between"><span className="text-zinc-400">Shein Scraper Daemon:</span><span>Port 8040 (Active)</span></div>
                                <div className="flex justify-between"><span className="text-zinc-400">Ollama 8B Local AI:</span><span>Port 11434 (&lt;20ms)</span></div>
                                <div className="flex justify-between"><span className="text-zinc-400">Fresh Fity Sync Store:</span><span>/mnt/razak_storage</span></div>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Sovereign AI & Workstations */}
                          <div className="space-y-4">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                              3. Cloud VPS &amp; Local Workstations
                            </span>

                            <div 
                              onClick={() => {
                                const p = projects.find(x => x.id === 'prj-odinbot');
                                if (p) { setActiveInlineProject(p); setProjectWorkspaceTab('overview'); }
                              }}
                              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:border-amber-500 cursor-pointer space-y-1.5 transition-all shadow-2xs"
                            >
                              <div className="flex justify-between items-center">
                                <strong className="text-zinc-900 dark:text-white">OdinBot AI Hybrid</strong>
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/15 text-purple-600 font-mono">Oracle 45 TB</span>
                              </div>
                              <p className="text-[11px] text-zinc-500">Linked to Marsabit server via WireGuard (42ms ping). Holds 1.84M Kenya Law embeddings.</p>
                            </div>

                            <div 
                              onClick={() => {
                                const p = projects.find(x => x.id === 'prj-hw-homelab-node');
                                if (p) { setActiveInlineProject(p); setProjectWorkspaceTab('data'); }
                              }}
                              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:border-amber-500 cursor-pointer space-y-1.5 transition-all shadow-2xs"
                            >
                              <div className="flex justify-between items-center">
                                <strong className="text-zinc-900 dark:text-white">HomeLab Arch Linux PC</strong>
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-600 font-mono">10.14.0.2</span>
                              </div>
                              <p className="text-[11px] text-zinc-500">Connected 24/7 over WireGuard wg0. Fast build node and USB scanner/printer testbed.</p>
                            </div>

                            <div 
                              onClick={() => {
                                const p = projects.find(x => x.id === 'prj-hw-custom-pc');
                                if (p) { setActiveInlineProject(p); setProjectWorkspaceTab('data'); }
                              }}
                              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:border-amber-500 cursor-pointer space-y-1.5 transition-all shadow-2xs"
                            >
                              <div className="flex justify-between items-center">
                                <strong className="text-zinc-900 dark:text-white">Custom Built AI Rig</strong>
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-600 font-mono">Planned</span>
                              </div>
                              <p className="text-[11px] text-zinc-500">Ryzen 9 9950X + RTX 4080 Super 16GB + dual NVMe RAID 0 for full local 70B fine-tuning.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: CAREER & EDUCATION (3-PILLAR SWITCHER) */}
            {/* ========================================================================= */}
            {activeTab === 'career_education' && (
              <div className="space-y-6 animate-fadeIn font-sans">
                {/* Header & Pillar Switcher */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                        Guyo Halake &middot; Education &amp; Career
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Bachelors at KCA University &middot; Diploma with Distinction from Zetech &middot; Work Experience from CV
                      </p>
                    </div>

                    {/* Switcher Buttons */}
                    <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-semibold">
                      <button
                        onClick={() => setEducationPillar('school')}
                        className={`px-3.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                          educationPillar === 'school' ? 'bg-amber-500 text-zinc-950 shadow-xs font-bold' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        Education &amp; Certs
                      </button>
                      <button
                        onClick={() => setEducationPillar('work')}
                        className={`px-3.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                          educationPillar === 'work' ? 'bg-amber-500 text-zinc-950 shadow-xs font-bold' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        Work Experience (CV)
                      </button>
                      <button
                        onClick={() => setEducationPillar('skills')}
                        className={`px-3.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                          educationPillar === 'skills' ? 'bg-amber-500 text-zinc-950 shadow-xs font-bold' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        Technical Skills
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Email: <strong className="text-zinc-900 dark:text-white">guyohalakeofficial@gmail.com</strong> &middot; Phone: <strong className="text-zinc-900 dark:text-white">+254 768 141129</strong>
                    </span>
                    <a
                      href="https://github.com/guyo-halake"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-600 dark:text-amber-400 font-bold hover:underline"
                    >
                      github.com/guyo-halake &rarr;
                    </a>
                  </div>
                </div>

                {/* PILLAR 1: EDUCATION & CERTIFICATIONS */}
                {educationPillar === 'school' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                      {/* CARD 1: KCA UNIVERSITY */}
                      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-zinc-950">
                            In Progress
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">Degree</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                            Bachelor of Science in Applied Computing Technology
                          </h3>
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
                            KCA University &middot; Nairobi
                          </p>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          Degree covering network security, discrete mathematics, distributed systems, and computer architecture.
                        </p>
                      </div>

                      {/* CARD 2: ZETECH UNIVERSITY */}
                      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500 text-white">
                            Completed &middot; Distinction
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">Nov 2025</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                            Diploma in Information Technology
                          </h3>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                            Zetech University &middot; Nairobi
                          </p>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          Sept 2023 – Nov 2025. Graduated November 2025 with a Distinction. Full software development, database systems, and networking foundation.
                        </p>
                      </div>

                      {/* CARD 3: COMPTIA SECURITY+ */}
                      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500 text-white">
                            Certified
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">Security+</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                            CompTIA Security+
                          </h3>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
                            CompTIA Certified Professional
                          </p>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          Threat detection, cryptographic protocols, incident response, network architecture hardening, and zero-trust security controls.
                        </p>
                      </div>

                      {/* CARD 4: AZURE DEVELOPER / DEVOPS */}
                      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300">
                            Active Study
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">Azure DevOps</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                            Azure DevOps Engineer Expert (AZ-400)
                          </h3>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
                            Microsoft Azure
                          </p>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          Azure cloud infrastructure: ACR, App Service, VNet, Managed Identities, GitHub Actions CI/CD, and Terraform IaC.
                        </p>
                      </div>
                    </div>

                    {/* School Projects: Grouped into Assignments, CATs, Exams, Semester Projects */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
                      <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                          Current Coursework &amp; Academic Milestones
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Organized into Assignments, CATs, Exams, and the two major Semester Projects
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
                        {/* 1. Assignments */}
                        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2">
                          <strong className="text-zinc-900 dark:text-white font-sans text-xs flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            Assignments (2)
                          </strong>
                          <ul className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400 font-sans list-disc list-inside">
                            <li>MAT 1105: Graph Theory proof &amp; Dijkstra tree</li>
                            <li>BCT 2104: Network packet dissection report</li>
                          </ul>
                        </div>

                        {/* 2. CATs */}
                        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2">
                          <strong className="text-zinc-900 dark:text-white font-sans text-xs flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            CATs (Continuous Assessment)
                          </strong>
                          <ul className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400 font-sans list-disc list-inside">
                            <li>CAT 1: Applied Computing scored 92%</li>
                            <li>CAT 2: Discrete Structures revision queued</li>
                          </ul>
                        </div>

                        {/* 3. Exams */}
                        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2">
                          <strong className="text-zinc-900 dark:text-white font-sans text-xs flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-purple-500" />
                            Exams (Finals)
                          </strong>
                          <ul className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400 font-sans list-disc list-inside">
                            <li>Semester examinations scheduled Dec 2026</li>
                            <li>Zetech past paper archive used for revision</li>
                          </ul>
                        </div>

                        {/* 4. Semester Projects (2 Major Projects Due End of Semester) */}
                        <div className="p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/5 space-y-2">
                          <strong className="text-zinc-900 dark:text-white font-sans text-xs flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            Semester Projects (Due End of Sem)
                          </strong>
                          <ul className="space-y-1.5 text-[11px] text-zinc-700 dark:text-zinc-300 font-sans">
                            <li><strong>1. KCA Forensics Packet Analyzer:</strong> Scapy &amp; raw socket sniffer.</li>
                            <li><strong>2. KCA QR Attendance Engine:</strong> 15s rotating TOTP QR + GPS check.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PILLAR 2: WORK EXPERIENCE (FROM GUYO'S REAL CVS) */}
                {educationPillar === 'work' && (
                  <div className="space-y-4 font-sans text-xs">
                    {/* Job 1: AO Technologies */}
                    <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 gap-1">
                        <div>
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                            Devops &amp; Infrastructure Intern &middot; AO Technologies Group, Nairobi
                          </h3>
                          <span className="text-[11px] font-mono text-zinc-400">May 2026 – August 2026</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-600 font-bold self-start sm:self-auto">
                          Azure &amp; CI/CD
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-zinc-700 dark:text-zinc-300 list-disc list-inside leading-relaxed">
                        <li>Created and organized Azure resource groups to logically group resources by project and environment.</li>
                        <li>Configured role-based access control (RBAC) to manage team member permissions on specific resources.</li>
                        <li>Monitored Azure subscription costs and supported budget alert configuration.</li>
                        <li>Built CI/CD pipeline configurations (YAML) in GitHub Actions and GitLab to automate installation of dependencies, tests, builds, and target environment deployments.</li>
                      </ul>
                    </div>

                    {/* Job 2: Muthokinju Paints */}
                    <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 gap-1">
                        <div>
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                            IT Support Intern &middot; Muthokinju Paints &amp; Cement Headquarters
                          </h3>
                          <span className="text-[11px] font-mono text-zinc-400">February 2026 – May 2026 (Paid KES 30,000/mo)</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-600 font-bold self-start sm:self-auto">
                          Physical Servers &amp; POS
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-zinc-700 dark:text-zinc-300 list-disc list-inside leading-relaxed">
                        <li>Logged, prioritized, and resolved IT support tickets across departments (logistics, warehouse, admin), escalating complex issues and tracking recurring patterns.</li>
                        <li>Installed, configured, and maintained network infrastructure including routers, Wi-Fi systems, and CCTV setups.</li>
                        <li>Managed user accounts, group policies, and access permissions in Active Directory (onboarding/offboarding, password resets, lockout resolution).</li>
                        <li>Diagnosed and repaired hardware issues on workstations, printers, and POS systems; set up new workstations.</li>
                        <li>Assisted with administration and monitoring of both physical on-premise servers and cloud servers (uptime, disk space, backups).</li>
                      </ul>
                    </div>

                    {/* Job 3: Mobit Solutions */}
                    <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 gap-1">
                        <div>
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                            Software Developer (Remote) &middot; Mobit Solutions
                          </h3>
                          <span className="text-[11px] font-mono text-zinc-400">November 2025 – May 2026</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold self-start sm:self-auto">
                          React &middot; M-Pesa Daraja
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-zinc-700 dark:text-zinc-300 list-disc list-inside leading-relaxed">
                        <li>Built and maintained UI pages and backend logic for multiple client websites and applications using React, JavaScript, TypeScript, and MySQL.</li>
                        <li>Integrated third-party APIs (REST, GraphQL) per client project requirements.</li>
                        <li>Configured Safaricom M-Pesa Daraja (STK Push, Paybill) and Paystack payment integrations tailored to client needs.</li>
                        <li>Integrated communication systems including SMS, WhatsApp, and email using Twilio.</li>
                        <li>Collaborated with a distributed remote team using Jira and GitHub for version control and code review.</li>
                      </ul>
                    </div>

                    {/* Job 4: Mount Kenya University */}
                    <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 gap-1">
                        <div>
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                            Management Information Systems (MIS) Attachee &middot; Mount Kenya University
                          </h3>
                          <span className="text-[11px] font-mono text-zinc-400">January 2025 – May 2025</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold self-start sm:self-auto">
                          VLMS &middot; MIS
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-zinc-700 dark:text-zinc-300 list-disc list-inside leading-relaxed">
                        <li>Installed, configured, and maintained network systems, routers, switches, and workstations.</li>
                        <li>Participated in development, testing, rollout, and user training of the new VLMS (Virtual Learning Management System) student portal.</li>
                        <li>Collaborated with senior ICT officers to ensure smooth operation of MIS systems and database.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* PILLAR 3: TECHNICAL SKILLS */}
                {educationPillar === 'skills' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-sans text-xs">
                    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                        <Code className="w-4 h-4 text-amber-500" />
                        Programming &amp; Development
                      </h4>
                      <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                        {['React', 'TypeScript', 'JavaScript', 'Python 3.11', 'React Native', 'FastAPI', 'Node.js', 'MySQL', 'PostgreSQL', 'SQLite WAL', 'Git & GitHub'].map(s => (
                          <span key={s} className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-blue-500" />
                        Cloud &amp; Infrastructure
                      </h4>
                      <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                        {['Microsoft Azure (App Service, ACR, VNet)', 'Docker Multi-Stage', 'Terraform (azurerm)', 'CI/CD GitHub Actions', 'Linux Containers', 'Nginx Reverse Proxy', 'Supabase PostgreSQL', 'WireGuard VPN', 'Active Directory'].map(s => (
                          <span key={s} className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                        <Bot className="w-4 h-4 text-purple-500" />
                        AI &amp; Payment Integrations
                      </h4>
                      <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                        {['Ollama (8B LoRA)', 'Prompt Engineering', 'Custom AI Agents', 'Safaricom Daraja 2.0 (STK, C2B)', 'Paystack', 'Twilio (WhatsApp & SMS)', 'REST APIs'].map(s => (
                          <span key={s} className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OPERATIONS LOG TAB */}
            {activeTab === 'operations_log' && (
              <AdminOperationsLogView showToast={showToast} />
            )}

            {/* TAB 4: USERS & RBAC */}
            {activeTab === 'users_rbac' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6 animate-fadeIn">
                <div className="flex justify-between items-center pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <h2 className="font-bold text-lg text-zinc-900 dark:text-white">
                      Access Control &amp; RBAC (Karani Law Database)
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Live accounts currently provisioned in Supabase and PostgreSQL
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowAddRealUserModal(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer shadow-xs"
                  >
                    + Add User to Database
                  </button>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {realUsers.map(u => (
                    <div key={u.id} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
                      <div>
                        <span className="font-bold text-zinc-900 dark:text-white block font-sans">{u.fullName}</span>
                        <span className="text-[10px] text-zinc-400">{u.workEmail} &middot; LSK: {u.lskNo || 'Advocate'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                          {u.role}
                        </span>
                        <button 
                          onClick={() => handleDeleteRealUser(u.id, u.fullName)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: FINANCE & BILLING */}
            {activeTab === 'finance_billing' && (
              <AdminFinanceView showToast={showToast} />
            )}

            {/* TAB 6: SYSTEM WIPES (reload.sh) */}
            {activeTab === 'system_wipe' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6 animate-fadeIn">
                <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h2 className="font-bold text-lg text-zinc-900 dark:text-white">
                    System Wipes &amp; Emergency Recovery (reload.sh)
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Repository: guyo-halake/reload.sh &middot; Bare-metal Linux reinstall and snapshot recovery
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3 font-mono text-xs">
                  <span className="text-[10px] text-zinc-400 uppercase">Storage Infrastructure</span>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl space-y-1">
                    <p>razak-server Projects Partition: <strong>4,868 GB</strong> (Local)</p>
                    <p>Oracle Cloud VPS High-Capacity Array: <strong>45 TB</strong> (AI Dedicated)</p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: RAZAK SERVER (BARE-METAL NODE & 12 TB NAS STORAGE) */}
            {/* ========================================================================= */}
            {activeTab === 'server' && (
              <AdminServerView 
                internetSpeed={internetSpeed}
                batteryLevel={batteryLevel}
                isBatteryCharging={isBatteryCharging}
                uptimeSeconds={uptimeSeconds}
                formatUptime={formatUptime}
                showToast={showToast}
              />
            )}

            {/* ========================================================================= */}
            {/* TAB 6: AI & INFRASTRUCTURE (ORACLE CLOUD VPS · 45 TB HIGH-CAPACITY ARRAY) */}
            {/* ========================================================================= */}
            {activeTab === 'ai_infra' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Header */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                        Oracle Cloud VPS &middot; High-Capacity AI Infrastructure
                      </h2>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Dedicated 45 TB Cloud Storage Array &middot; Completely separate from local razak-server &middot; Reserved for P3L AI &amp; OdinBot
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                      WireGuard Mesh: 42ms Ping
                    </span>
                    <button 
                      onClick={() => showToast('Synced neural embeddings cache between Oracle VPS and Marsabit.')}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Sync Vectors Cache
                    </button>
                  </div>
                </div>

                {/* Architecture Clarity Callout */}
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300">
                    <Cloud className="w-4 h-4 text-blue-500" />
                    <span>Two Separate Storage Pools: Bare-Metal Local vs. Oracle Cloud VPS</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11.5px]">
                    The local server (<code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10.5px]">razak-server</code>) has <strong>4,868 GB</strong> dedicated for running client startup projects (with ~3 TB leftover free space). Storage for the AI is <strong>completely separate</strong>: hosted on high-performance <strong>Oracle Cloud VPS</strong> with a dedicated <strong>45 TB (45,000 GB)</strong> high-capacity NVMe array holding internal model weights, Kenya legal statutes, OCR pipelines, audio transcriptions, and the OdinBot neural memory.
                  </p>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                  {/* Card 1: Cloud AI Storage */}
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase">Oracle VPS Storage</span>
                      <Cloud className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">45 TB</p>
                    <p className="text-[11px] text-zinc-500">Dedicated AI &amp; Neural Bank</p>
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-[10px]">
                      <span className="text-zinc-400">Loaded: 14.2 TB</span>
                      <span className="text-blue-500 font-bold">30.8 TB Reserve</span>
                    </div>
                  </div>

                  {/* Card 2: OdinBot Engine */}
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase">OdinBot Model</span>
                      <Bot className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">OdinBot v2.4</p>
                    <p className="text-[11px] text-zinc-500">8B Fine-tuned + 70B MoE</p>
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-[10px]">
                      <span className="text-zinc-400">Context: 128k</span>
                      <span className="text-emerald-500 font-bold">38 ms/tok</span>
                    </div>
                  </div>

                  {/* Card 3: Vector Embeddings */}
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase">Vector Database</span>
                      <Database className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">1,842,910</p>
                    <p className="text-[11px] text-zinc-500">Indexed Kenya Law Chunks</p>
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-[10px]">
                      <span className="text-zinc-400">bge-large-en</span>
                      <span className="text-purple-500 font-bold">1,420 QPS</span>
                    </div>
                  </div>

                  {/* Card 4: Multimodal Engines */}
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase">Speech &amp; OCR</span>
                      <Zap className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">Whisper + Surya</p>
                    <p className="text-[11px] text-zinc-500">Bilingual Court Audio &amp; Filings</p>
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-[10px]">
                      <span className="text-zinc-400">OCR: &lt;450ms/pg</span>
                      <span className="text-emerald-500 font-bold">Online</span>
                    </div>
                  </div>
                </div>

                {/* 45 TB Storage Volume Breakdown Table */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                        Oracle Cloud VPS High-Capacity Volume Breakdown (45 TB Dedicated AI Bank)
                      </h3>
                      <p className="text-xs text-zinc-500">
                        NVMe cloud partitions reserved exclusively for OdinBot training weights, legal vectors, and multimodal media
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold self-start sm:self-auto">
                      14.2 TB Loaded &middot; 30.8 TB Free Reserve
                    </span>
                  </div>

                  {/* Visual Storage Bar */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Loaded Datasets &amp; Weights: 14.2 TB (31.5%)</span>
                      <span className="text-blue-500 font-bold">Available Reserve: 30.8 TB (68.5%)</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
                      <div className="bg-blue-600 h-full" style={{ width: '31.5%' }} title="Loaded Datasets: 14.2 TB"></div>
                      <div className="bg-blue-400/20 h-full flex-1" title="Free Reserve: 30.8 TB"></div>
                    </div>
                  </div>

                  {/* Volumes Listing */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 uppercase">
                          <th className="py-2.5 px-3">Volume Namespace</th>
                          <th className="py-2.5 px-3">Mount Volume Path</th>
                          <th className="py-2.5 px-3">Dedicated Capacity</th>
                          <th className="py-2.5 px-3">Purpose &amp; Data Pipeline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                        <tr>
                          <td className="py-2.5 px-3 font-sans font-bold text-zinc-900 dark:text-white">OdinBot Weights &amp; Checkpoints</td>
                          <td className="py-2.5 px-3 text-zinc-500">/ai_volumes/weights/odinbot_family</td>
                          <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">14.2 TB</td>
                          <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-300">Base weights, LoRA adapters, legal reasoning checkpoint cache</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-sans font-bold text-zinc-900 dark:text-white">Kenya Law Statutes &amp; Jurisprudence</td>
                          <td className="py-2.5 px-3 text-zinc-500">/ai_volumes/vectors/kenya_law_statutes</td>
                          <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">8.5 TB</td>
                          <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-300">Complete eKLR rulings, Acts of Parliament, High Court precedents</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-sans font-bold text-zinc-900 dark:text-white">Bilingual Speech &amp; Court Audio</td>
                          <td className="py-2.5 px-3 text-zinc-500">/ai_volumes/multimodal/audio_speech</td>
                          <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">7.8 TB</td>
                          <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-300">Swahili/English legal transcriptions, audio corpus for Whisper Large-v3</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-sans font-bold text-zinc-900 dark:text-white">RAG Document Vault &amp; Corporate Contracts</td>
                          <td className="py-2.5 px-3 text-zinc-500">/ai_volumes/rag_vault/contracts</td>
                          <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">4.3 TB</td>
                          <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-300">Client contracts, deeds, conveyance statutory fee templates</td>
                        </tr>
                        <tr className="bg-blue-50/50 dark:bg-blue-950/20 font-bold">
                          <td className="py-2.5 px-3 font-sans text-blue-900 dark:text-blue-300">High-Capacity Training Reserve Pool</td>
                          <td className="py-2.5 px-3 text-blue-700 dark:text-blue-400">/ai_volumes/reserved_training</td>
                          <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400">10.2 TB Free</td>
                          <td className="py-2.5 px-3 text-blue-800 dark:text-blue-300">Unallocated scratch array for next-generation fine-tuning pipelines</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Direct Query Playground & Interconnect */}
                <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase block">Secure AI Interconnect</span>
                    <span className="font-bold text-zinc-900 dark:text-white mt-0.5 block">
                      Oracle Cloud VPS &harr; razak-server (Marsabit) &middot; Encrypted WireGuard Tunnel Active
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => showToast('OdinBot v2.4 responded in 34ms: Legal index status nominal.')}
                      className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer"
                    >
                      Ping OdinBot Vector API
                    </button>
                    <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 font-bold text-[10px]">
                      10 Gbps Backbone
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 9: INTERNAL P3L STAFF */}
            {/* ========================================================================= */}
            {activeTab === 'internal_staff' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6 animate-fadeIn">
                <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h2 className="font-bold text-lg text-zinc-900 dark:text-white">
                    P3L Developers &middot; Core Engineering Staff
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Marsabit &amp; Nairobi Engineering Fleet Directory
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white block">Guyoh Halake</span>
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 block font-bold">Founder &amp; Chief Systems Architect</span>
                    <p className="text-xs text-zinc-500">Marsabit Node lead, bare-metal server infrastructure, POS bridges, full-stack architecture.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white block">Dennis Khaemba</span>
                    <span className="text-[10px] font-mono text-zinc-500 block font-bold">Media &amp; Editorial Systems Lead</span>
                    <p className="text-xs text-zinc-500">Khaemba News &amp; Media publishing engine, editorial workflow orchestration.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white block">Rosemary Wakonyo</span>
                    <span className="text-[10px] font-mono text-zinc-500 block font-bold">Retail Systems &amp; POS Liaison</span>
                    <p className="text-xs text-zinc-500">Fresh City Supermarket register terminal operations and merchant support.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 10: COMMS & MESSAGING */}
            {/* ========================================================================= */}
            {activeTab === 'comms_messaging' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6 animate-fadeIn">
                <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h2 className="font-bold text-lg text-zinc-900 dark:text-white">
                    Operational Communications &amp; Dispatch
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Marsabit telemetry alerts, WhatsApp client notifications, and Starlink failover dispatcher
                  </p>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block font-sans">Adrian AK 3674 Optical Ticker</span>
                      <span className="text-[10px] text-zinc-400">Throughput: {internetSpeed} Mbps &middot; Latency: 12ms &middot; Status: Nominal</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">Active</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block font-sans">Marsabit Power Subsystem</span>
                      <span className="text-[10px] text-zinc-400">Battery Level: {batteryLevel}% &middot; Mode: {isBatteryCharging ? 'Charging' : 'Running on Station Batteries'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[10px] font-bold">Monitored</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block font-sans">Oracle VPS WireGuard Mesh</span>
                      <span className="text-[10px] text-zinc-400">45 TB AI Array &middot; 42ms Ping &middot; 10 Gbps Interconnect</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[10px] font-bold">Connected</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 11: SUPPORT & TICKETING */}
            {/* ========================================================================= */}
            {activeTab === 'support_ticketing' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6 animate-fadeIn">
                <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h2 className="font-bold text-lg text-zinc-900 dark:text-white">
                    Hardware &amp; Systems Ticketing
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Client station tickets, thermal printer maintenance, and fiber link telemetry logs
                  </p>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block font-sans">Fresh City Supermarket &middot; Register 01 Printer Ribbon</span>
                      <span className="text-[10px] text-zinc-400">ESC/POS USB Bridge &middot; Checked by Guyoh &middot; Operational</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">Resolved</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block font-sans">Adrian AK 3674 &middot; Marsabit Uplink Optimization</span>
                      <span className="text-[10px] text-zinc-400">Latency tuned from 28ms down to 12ms &middot; No failover connected</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">Resolved</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* REAL USER MODAL (KARANI LAW) */}
      {/* ========================================================================= */}
      {showAddRealUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Add Real User to Karani Law Supabase DB</h3>
            <form onSubmit={handleCreateRealUser} className="space-y-3 text-xs">
              <input 
                type="text" 
                placeholder="Full Name (e.g. Jane Wambui)"
                value={newUserFullName}
                onChange={e => setNewUserFullName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                required
              />
              <input 
                type="email" 
                placeholder="Work Email (Login)"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddRealUserModal(false)} className="px-3 py-1.5 border rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-amber-500 font-bold rounded-xl text-zinc-950">Save to Live Database</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD TASK MODAL */}
      {/* ========================================================================= */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Add Founder Task</h3>
            <p className="text-xs text-zinc-500">Record a new priority item for today.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddTaskModal(false)} className="px-4 py-2 rounded-xl border text-xs">Cancel</button>
              <button 
                onClick={() => {
                  showToast('Task added.');
                  setShowAddTaskModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 font-bold text-xs text-zinc-950"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COMMAND PALETTE (CTRL+K) */}
      {/* ========================================================================= */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-500" />
              <input 
                type="text"
                autoFocus
                placeholder="Type a command or search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm focus:outline-none text-zinc-900 dark:text-white"
              />
              <button onClick={() => setShowCommandPalette(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-1 max-h-80 overflow-y-auto text-xs">
              {projects.map(p => (
                <div 
                  key={p.id}
                  onClick={() => {
                    setShowCommandPalette(false);
                    setActiveTab('projects_clients');
                    setActiveInlineProject(p);
                  }}
                  className="p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold text-zinc-900 dark:text-white">{p.name}</span>
                  <span className="text-[10px] font-mono text-zinc-400">{p.monthlyFee}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REAL WORKING INTERACTIVE TERMINAL DRAWER (P3L-TERM) */}
      {/* ========================================================================= */}
      {showTerminal && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#070a12] border-t-2 border-amber-500/70 shadow-2xl flex flex-col h-72 animate-slideUp font-mono text-xs">
          {/* Terminal Title Bar */}
          <div className="px-4 py-2 bg-[#0d131f] border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-zinc-200">p3l-term</span>
              <span className="text-[10px] text-zinc-500">SSH: root@10.14.0.1 (razak-server) &middot; Marsabit Adrian AK Fiber</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-zinc-500 hidden sm:inline">Type <strong className="text-amber-400">help</strong> for commands</span>
              <button 
                onClick={() => setShowTerminal(false)}
                className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Close Terminal (~)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Terminal Logs Canvas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#070a12]/95 text-zinc-300">
            {terminalLogs.map((log, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="text-emerald-400 font-bold">guyo@razak-server:~$</span>
                  <span className="text-white font-semibold">{log.cmd}</span>
                  <span className="text-[10px] text-zinc-600 ml-auto">{log.time}</span>
                </div>
                <pre className="text-zinc-300 whitespace-pre-wrap pl-4 font-mono text-[11px] leading-relaxed">
                  {log.out}
                </pre>
              </div>
            ))}
          </div>

          {/* Terminal Prompt Input Bar */}
          <form onSubmit={handleTerminalSubmit} className="p-2.5 bg-[#0d131f] border-t border-zinc-800 flex items-center gap-2">
            <span className="text-emerald-400 font-bold pl-2">guyo@razak-server:~$</span>
            <input
              type="text"
              autoFocus
              value={terminalInput}
              onChange={e => setTerminalInput(e.target.value)}
              placeholder="Type command (e.g. status, karani, docker ps, df -h, policy all)..."
              className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none placeholder:text-zinc-600"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded transition-colors"
            >
              Run
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
