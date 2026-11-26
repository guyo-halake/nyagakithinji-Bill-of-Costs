import React, { useState } from 'react';
import { 
  HelpCircle, AlertCircle, CheckCircle2, Clock, Filter, Plus, 
  ChevronRight, X, ExternalLink, Terminal, ShieldAlert, 
  MessageSquare, User, RefreshCw, ArrowUpRight
} from 'lucide-react';

interface Ticket {
  id: string;
  ticketCode: string;
  client: string;
  system: string;
  title: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  responseTime: string;
  assignee: string;
  description: string;
  solutionNotes?: string;
}

interface AdminSupportDeskViewProps {
  showToast: (msg: string) => void;
}

export const AdminSupportDeskView: React.FC<AdminSupportDeskViewProps> = ({ showToast }) => {
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState<boolean>(false);

  // New ticket form state
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('Fresh City Supermarket (Ruiru)');
  const [newPriority, setNewPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'>('HIGH');
  const [newDescription, setNewDescription] = useState('');

  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: 't-101',
      ticketCode: 'TICK-1048',
      client: 'Fresh City Supermarket (Ruiru)',
      system: 'EPOS Thermal Receipt Engine',
      title: 'Auto-cutter debounce delay on cash register #2',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      createdAt: 'Today, 10:20 AM',
      responseTime: '4.2 mins',
      assignee: 'Guyo (P3L Lead)',
      description: 'Thermal receipt printer triggers cut command before the M-Pesa QR code completes rasterization during peak lunch rush.',
      solutionNotes: 'Updated printer serial buffer to 64KB and added 150ms post-render delay before ESC/POS cut opcode.'
    },
    {
      id: 't-102',
      ticketCode: 'TICK-1045',
      client: 'Sayara Aesthetics (Nairobi)',
      system: 'Daraja 2.0 STK Push Gateway',
      title: 'STK push prompt timeout for Safaricom eSIM clients',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      createdAt: 'Today, 08:40 AM',
      responseTime: '2.5 mins',
      assignee: 'Guyo (P3L Lead)',
      description: 'Some clients on newer iOS Safari sessions report M-Pesa prompt takes 18 seconds to appear on handset.',
      solutionNotes: 'Adjusted Daraja timeout parameter from default 15s to 30s and enabled asynchronous polling fallback.'
    },
    {
      id: 't-103',
      ticketCode: 'TICK-1039',
      client: 'Karani Law & BillsZip',
      system: 'Nyaga Law Practice ERP',
      title: 'Advocate fee statement PDF header alignment on Upper Hill court filings',
      priority: 'NORMAL',
      status: 'OPEN',
      createdAt: 'Yesterday, 15:30 PM',
      responseTime: '12 mins',
      assignee: 'Guyo (P3L Lead)',
      description: 'High Court civil suit bill of costs export needs Advocate Practicing Certificate number printed under the firm logo.',
      solutionNotes: 'Template updated in src/components/billszip/BillsZipPdfEngine.tsx to inject Advocate KBR practicing certificate variable.'
    },
    {
      id: 't-104',
      ticketCode: 'TICK-1031',
      client: 'SUVPlanet Kenya',
      system: 'Car Marketplace Ads Queue',
      title: 'Listing photo thumbnail compression artifacting',
      priority: 'LOW',
      status: 'RESOLVED',
      createdAt: '03 Nov 2026',
      responseTime: '8.0 mins',
      assignee: 'Guyo (P3L Lead)',
      description: 'Vehicle upload photos above 12MB had mild artifacting after Sharp canvas resizing.',
      solutionNotes: 'Reconfigured Sharp WebP encoder with quality 85 and lanczos3 resampling kernel.'
    },
    {
      id: 't-105',
      ticketCode: 'TICK-1022',
      client: 'Adrian AK NOC (Marsabit)',
      system: 'Marsabit Fiber Line 3674',
      title: 'Optical fiber scheduled maintenance notification',
      priority: 'LOW',
      status: 'RESOLVED',
      createdAt: '01 Nov 2026',
      responseTime: '1.0 min',
      assignee: 'Guyo (P3L Lead)',
      description: 'Upstream optical splice on Marsabit-Isiolo road completed. Battery bank supported workstation during brief power drop.',
      solutionNotes: 'APC Smart-UPS absorbed the transition seamlessly. Latency returned to 12ms.'
    }
  ]);

  const handleUpdateStatus = (ticketId: string, newStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
    }
    showToast(`Ticket status updated to ${newStatus}`);
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const code = `TICK-${1050 + tickets.length}`;
    const newT: Ticket = {
      id: `t-${Date.now()}`,
      ticketCode: code,
      client: newClient,
      system: 'P3L Production Subsystem',
      title: newTitle.trim(),
      priority: newPriority,
      status: 'OPEN',
      createdAt: 'Just now',
      responseTime: 'Under 1 min',
      assignee: 'Guyo (P3L Lead)',
      description: newDescription.trim() || 'Issue logged via P3L Admin Desk.'
    };

    setTickets(prev => [newT, ...prev]);
    setIsCreatingTicket(false);
    setNewTitle('');
    setNewDescription('');
    showToast(`New support ticket ${code} created`);
  };

  const filteredTickets = tickets.filter(t => {
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Header (Minimalist, no card background) */}
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Support Desk &amp; System Health
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Client tickets, POS hardware maintenance, and rapid response SLAs
          </p>
        </div>

        <button
          onClick={() => setIsCreatingTicket(true)}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Support Ticket</span>
        </button>
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Active Tickets</span>
          <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {tickets.filter(t => t.status !== 'RESOLVED').length}
          </p>
          <p className="text-[11px] text-zinc-500">2 In Progress &middot; 1 Open</p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Avg Response Time</span>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">4.8 min</p>
          <p className="text-[11px] text-zinc-500">Target: &lt; 15 min (Fast)</p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">SLA Compliance</span>
          <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">99.4%</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Tier-1 Priority Guaranteed</p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Lead Support Engineer</span>
          <p className="text-base font-bold text-zinc-900 dark:text-white truncate">Guyo Huka (P3L)</p>
          <p className="text-[11px] text-zinc-500 font-mono">Marsabit / Remote Station</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-[11px] font-mono">Priority:</span>
          {['ALL', 'URGENT', 'HIGH', 'NORMAL'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                filterPriority === p 
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-[11px] font-mono">Status:</span>
          {['ALL', 'IN_PROGRESS', 'OPEN', 'RESOLVED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                filterStatus === s 
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table / List */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] text-zinc-400 font-mono uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-3.5">Ticket</th>
                <th className="p-3.5">Client &amp; Subsystem</th>
                <th className="p-3.5">Issue Summary</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Response Time</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredTickets.map((t) => (
                <tr 
                  key={t.id} 
                  onClick={() => setSelectedTicket(t)}
                  className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                >
                  <td className="p-3.5 font-mono font-bold text-zinc-900 dark:text-white">
                    {t.ticketCode}
                  </td>
                  <td className="p-3.5">
                    <strong className="text-zinc-900 dark:text-white block">{t.client}</strong>
                    <span className="text-[11px] text-zinc-400 font-mono">{t.system}</span>
                  </td>
                  <td className="p-3.5 max-w-xs">
                    <p className="text-zinc-800 dark:text-zinc-200 truncate font-medium">{t.title}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{t.description}</p>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      t.priority === 'URGENT' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                      t.priority === 'HIGH' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                      t.priority === 'NORMAL' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' :
                      'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      t.status === 'RESOLVED' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                      t.status === 'IN_PROGRESS' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400' :
                      'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-zinc-500">
                    {t.responseTime}
                  </td>
                  <td className="p-3.5 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicket(t);
                      }}
                      className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details Drawer / Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-base text-zinc-900 dark:text-white">
                  {selectedTicket.ticketCode}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  selectedTicket.priority === 'URGENT' ? 'bg-red-500/15 text-red-600' : 'bg-amber-500/15 text-amber-600'
                }`}>
                  {selectedTicket.priority}
                </span>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Client &amp; System</span>
                <p className="font-bold text-zinc-900 dark:text-white">{selectedTicket.client}</p>
                <p className="text-zinc-500 font-mono text-[11px]">{selectedTicket.system}</p>
              </div>

              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Issue Summary</span>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedTicket.title}</p>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">{selectedTicket.description}</p>
              </div>

              {selectedTicket.solutionNotes && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  <span className="text-[10px] font-mono uppercase font-bold block mb-1">P3L Technical Solution</span>
                  <p>{selectedTicket.solutionNotes}</p>
                </div>
              )}

              {/* Status Update Actions */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block mb-2">Change Status:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'OPEN')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer transition-colors ${
                      selectedTicket.status === 'OPEN' ? 'bg-amber-500 text-white' : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'IN_PROGRESS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer transition-colors ${
                      selectedTicket.status === 'IN_PROGRESS' ? 'bg-purple-600 text-white' : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'RESOLVED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer transition-colors ${
                      selectedTicket.status === 'RESOLVED' ? 'bg-emerald-600 text-white' : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    Resolved
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {isCreatingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <form onSubmit={handleCreateTicket} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-sans text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Log Support Ticket</h3>
              <button 
                type="button" 
                onClick={() => setIsCreatingTicket(false)} 
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-zinc-500 block mb-1">Client Organization</label>
                <select
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                >
                  <option value="Fresh City Supermarket (Ruiru)">Fresh City Supermarket (Ruiru)</option>
                  <option value="Sayara Aesthetics (Nairobi)">Sayara Aesthetics (Nairobi)</option>
                  <option value="Karani Law &amp; BillsZip (Upper Hill)">Karani Law &amp; BillsZip (Upper Hill)</option>
                  <option value="SUVPlanet Kenya">SUVPlanet Kenya</option>
                  <option value="Adrian AK Fiber Marsabit">Adrian AK Fiber Marsabit</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Printer driver port reconnect error"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white font-mono"
                >
                  <option value="URGENT">URGENT (Client terminal down)</option>
                  <option value="HIGH">HIGH (Degraded feature)</option>
                  <option value="NORMAL">NORMAL (Formatting / minor)</option>
                  <option value="LOW">LOW (Question / optimization)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Description &amp; Hardware Details</label>
                <textarea
                  rows={3}
                  placeholder="Describe what occurred, station terminal ID, or error message..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsCreatingTicket(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold"
              >
                Create Ticket
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

