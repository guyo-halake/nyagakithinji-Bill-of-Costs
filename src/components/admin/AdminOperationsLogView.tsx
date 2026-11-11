import React, { useState, useEffect } from 'react';
import { 
  Activity, Search, Filter, Download, 
  Terminal, ShieldAlert, CheckCircle2, 
  AlertTriangle, Info, Play, Pause, X, FileText
} from 'lucide-react';

interface LogItem {
  id: string;
  time: string;
  date: string;
  category: string;
  severity: string;
  title: string;
  actor: string;
  ip: string;
  payload: Record<string, any>;
}

interface AdminOperationsLogViewProps {
  showToast: (msg: string) => void;
}

export const AdminOperationsLogView: React.FC<AdminOperationsLogViewProps> = ({ showToast }) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('today');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);

  const [logs, setLogs] = useState<LogItem[]>([
    {
      id: 'EVT-90412',
      time: '14:48:22',
      date: '14 Oct 2026',
      category: 'AI',
      severity: 'CRITICAL',
      title: 'OdinBot I&M Bank Mirror 502 Bad Gateway',
      actor: 'daemon:odinbot',
      ip: '10.14.2.80',
      payload: { code: 'ERR_GATEWAY_RESET_502', socket: 'tcp://10.14.2.80:8443', buffer_queue: 14 }
    },
    {
      id: 'EVT-90409',
      time: '14:35:10',
      date: '14 Oct 2026',
      category: 'Projects',
      severity: 'SUCCESS',
      title: 'Karani Law: Supabase real user DB schema verified',
      actor: 'guyoh@admin',
      ip: '192.168.1.104',
      payload: { table: 'firm_users', rows: 4, role: 'Advocate' }
    },
    {
      id: 'EVT-90401',
      time: '14:02:18',
      date: '14 Oct 2026',
      category: 'Server',
      severity: 'INFO',
      title: 'Adrian AK 3674 Fibre line speed check: 78.4 Mbps',
      actor: 'systemd:netmonitor',
      ip: '127.0.0.1',
      payload: { ping: '12.4ms', jitter: '1.1ms', gateway: 'optical-adrian' }
    },
    {
      id: 'EVT-90388',
      time: '13:15:00',
      date: '14 Oct 2026',
      category: 'Projects',
      severity: 'SUCCESS',
      title: 'Sayara Shein Python Daemon scraped 14 products',
      actor: 'daemon:sayara-cron',
      ip: '127.0.0.1',
      payload: { port: 8040, updated_prices: 14, fx_rate: 132.50 }
    },
    {
      id: 'EVT-90342',
      time: '11:40:22',
      date: '14 Oct 2026',
      category: 'Payments',
      severity: 'SUCCESS',
      title: 'Fresh City POS October retainer KES 3,500 settled',
      actor: 'mpesa:c2b',
      ip: '196.201.214.12',
      payload: { client: 'Rosemary Wakonyo', ref: 'QK9182LA4', amount_kes: 3500 }
    },
    {
      id: 'EVT-90311',
      time: '10:05:44',
      date: '14 Oct 2026',
      category: 'Education',
      severity: 'INFO',
      title: 'KCA Virtual Campus: Zoom sync for CUU 1102 completed',
      actor: 'portal:kca',
      ip: '197.232.14.88',
      payload: { unit: 'CUU 1102', lecturer: 'Joselyne Mutende', schedule: 'Tue 7:15 AM' }
    },
    {
      id: 'EVT-90290',
      time: '08:30:12',
      date: '14 Oct 2026',
      category: 'Server',
      severity: 'WARNING',
      title: 'Station battery discharge below 35% (32.8% reached)',
      actor: 'systemd:bms',
      ip: '127.0.0.1',
      payload: { battery_pct: 32.8, threshold: 32.0, action: 'Auto-charge triggered' }
    }
  ]);

  // Periodic Live Event Simulator
  useEffect(() => {
    if (!isLiveActive) return;
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newEvt = {
        id: `EVT-${Math.floor(90420 + Math.random() * 500)}`,
        time: timeStr,
        date: '14 Oct 2026',
        category: Math.random() > 0.5 ? 'Server' : 'Projects',
        severity: 'INFO',
        title: Math.random() > 0.5 
          ? `ZFS Pool health check OK &middot; 0 checksum errors` 
          : `FastAPI BillsZip endpoint 200 OK &middot; 8.2ms latency`,
        actor: 'kernel:telemetry',
        ip: '127.0.0.1',
        payload: { status: 'healthy', cpu_load: '86.888%', ambient_temp: '24.3°C' }
      };
      setLogs(prev => [newEvt, ...prev.slice(0, 40)]);
    }, 8000);
    return () => clearInterval(interval);
  }, [isLiveActive]);

  const filteredLogs = logs.filter(l => {
    const matchesCat = filterCategory === 'all' || l.category.toLowerCase() === filterCategory.toLowerCase();
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.actor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `p3l_operations_log_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Operations log downloaded as JSON.');
  };

  const handleExportCsv = () => {
    const header = 'ID,Date,Time,Category,Severity,Title,Actor,IP\n';
    const rows = logs.map(l => `"${l.id}","${l.date}","${l.time}","${l.category}","${l.severity}","${l.title.replace(/"/g, '""')}","${l.actor}","${l.ip}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `p3l_operations_audit_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Audit trail downloaded as CSV.');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Minimalist Header (No Card Background) */}
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Server Audit Logs
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Live
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Recent server, database, and payment activity logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsLiveActive(!isLiveActive)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer"
          >
            {isLiveActive ? <Pause className="w-3.5 h-3.5 text-amber-500" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
            {isLiveActive ? 'Pause Stream' : 'Resume'}
          </button>
          <button 
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button 
            onClick={handleExportJson}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>
        </div>
      </div>

      {/* Incident Summary Card */}
      <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-zinc-800 dark:text-zinc-200">
            <strong>Incident Status:</strong> 1 active critical incident (OdinBot I&amp;M Bank Mirror 502) &middot; 0 unresolved security vulnerabilities.
          </span>
        </div>
        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
          System Integrity: 99.4%
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', 'payments', 'projects', 'server', 'ai', 'education'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-lg uppercase text-[10px] font-bold cursor-pointer transition-colors ${
                filterCategory === cat 
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, IPs, actors..."
            className="w-full pl-8 pr-3 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-sans text-zinc-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-xs font-mono text-xs">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 uppercase">
            <tr>
              <th className="py-2.5 px-3">Event ID</th>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Severity</th>
              <th className="py-2.5 px-3">Action Description</th>
              <th className="py-2.5 px-3">Actor / Principal</th>
              <th className="py-2.5 px-3">Client IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-[11px]">
            {filteredLogs.map((log) => (
              <tr 
                key={log.id} 
                onClick={() => setSelectedLog(log)}
                className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
              >
                <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">{log.id}</td>
                <td className="py-2.5 px-3 text-zinc-500">{log.time}</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                    {log.category}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    log.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-600' :
                    log.severity === 'WARNING' ? 'bg-amber-500/10 text-amber-600' :
                    log.severity === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600' :
                    'bg-blue-500/10 text-blue-600'
                  }`}>
                    {log.severity}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-sans text-zinc-900 dark:text-zinc-100 max-w-xs truncate" dangerouslySetInnerHTML={{ __html: log.title }} />
                <td className="py-2.5 px-3 text-zinc-500">{log.actor}</td>
                <td className="py-2.5 px-3 text-zinc-400">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Event Detail Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Event Detail &middot; {selectedLog.id}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-400">Timestamp:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{selectedLog.date} at {selectedLog.time}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-400">Severity Level:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{selectedLog.severity}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-400">Category:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{selectedLog.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-400">Actor Principal:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{selectedLog.actor}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-400">Origin IP:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{selectedLog.ip}</span>
              </div>
              <div className="pt-2">
                <span className="text-zinc-400 block mb-1">Diagnostic JSON Payload:</span>
                <pre className="p-3 rounded-xl bg-zinc-950 text-zinc-300 font-mono text-[10px] overflow-x-auto">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
