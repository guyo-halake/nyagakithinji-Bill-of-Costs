import React, { useState } from 'react';
import { ServerStorageConsole } from './ServerStorageConsole';

interface AdminServerViewProps {
  internetSpeed?: number;
  uptimeSeconds?: number;
  formatUptime?: (secs: number) => string;
}

export const AdminServerView: React.FC<AdminServerViewProps> = ({
  internetSpeed = 78.2,
  uptimeSeconds,
  formatUptime
}) => {
  const [activeTab, setActiveTab] = useState<'services' | 'network' | 'disks'>('services');

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      <ServerStorageConsole
        uptimeSeconds={uptimeSeconds}
        formatUptime={formatUptime}
        internetSpeed={internetSpeed}
      />

      <div className="flex flex-wrap gap-1 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('services')}
          className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'services' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Services
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'network' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Network
        </button>
        <button
          onClick={() => setActiveTab('disks')}
          className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'disks' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Disk health
        </button>
      </div>

      {/* Services and Docker fleet */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          {/* Systemctl Daemons */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h4 className="font-bold font-sans text-sm text-zinc-900 dark:text-white">Active Systemctl Services</h4>
            <div className="space-y-2">
              {[
                { name: 'docker.service', desc: 'Container engine runtime', status: 'active (running)' },
                { name: 'p3l-api-auth.service', desc: 'P3L Developers authentication gate', status: 'active (running)' },
                { name: 'wg-quick@wg0.service', desc: 'WireGuard VPN mesh hub', status: 'active (running)' },
                { name: 'adguard-home.service', desc: 'DNS ad-blocking & local domain resolution', status: 'active (running)' },
                { name: 'uvicorn-fastapi.service', desc: 'FastAPI BillsZip backend server', status: 'active (running)' },
                { name: 'redis-server.service', desc: 'In-memory cache & STK webhook queue', status: 'active (running)' },
                { name: 'supabase-db.service', desc: 'PostgreSQL database container', status: 'active (running)' },
              ].map((s) => (
                <div key={s.name} className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                  <div>
                    <strong className="text-zinc-800 dark:text-zinc-200">{s.name}</strong>
                    <span className="text-[10px] text-zinc-400 block font-sans">{s.desc}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-bold text-[10px]">
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Docker Container Fleet */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h4 className="font-bold font-sans text-sm text-zinc-900 dark:text-white">Docker Container Fleet</h4>
            <div className="space-y-2">
              {[
                { name: 'odinbot-core', port: 'Port 11434', uptime: 'Up 148 days', status: 'healthy' },
                { name: 'freshfity-pos-bridge', port: 'Port 3000', uptime: 'Up 42 days', status: 'healthy' },
                { name: 'sayara-shein-scraper', port: 'Port 8040', uptime: 'Up 64 days', status: 'healthy' },
                { name: 'karani-billszip-backend', port: 'Port 8000', uptime: 'Up 12 days', status: 'healthy' },
                { name: 'suvplanet-api', port: 'Port 4000', uptime: 'Up 89 days', status: 'healthy' },
                { name: 'innercircle-engine', port: 'Port 5050', uptime: 'Up 22 days', status: 'healthy' },
                { name: 'jellyfin-media', port: 'Port 8096', uptime: 'Up 104 days', status: 'healthy' },
              ].map((c) => (
                <div key={c.name} className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                  <div>
                    <strong className="text-zinc-800 dark:text-zinc-200">{c.name}</strong>
                    <span className="text-[10px] text-zinc-400 block">{c.port} &middot; {c.uptime}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-bold text-[10px]">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Network interfaces */}
      {activeTab === 'network' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 font-mono text-xs">
          <h4 className="font-bold font-sans text-sm text-zinc-900 dark:text-white">Network Interfaces &amp; Routing</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-1">
              <span className="text-[10px] text-zinc-400 block font-bold">eth4 (Adrian AK Fiber)</span>
              <strong className="text-emerald-600 font-bold">68 Mbps Sync</strong>
              <p className="text-[10px] text-zinc-500 font-sans">Primary Adrian AK fiber uplink</p>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-1">
              <span className="text-[10px] text-zinc-400 block font-bold">eth1 (HomeLab Local LAN)</span>
              <strong className="text-zinc-800 dark:text-zinc-200">192.168.1.100</strong>
              <p className="text-[10px] text-zinc-500 font-sans">2.5 GbE local link to HomeLab workstation</p>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-1">
              <span className="text-[10px] text-zinc-400 block font-bold">eth2 (Backup Switch)</span>
              <strong className="text-zinc-800 dark:text-zinc-200">Gigabit standby</strong>
              <p className="text-[10px] text-zinc-500 font-sans">Local management bridge</p>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-1">
              <span className="text-[10px] text-zinc-400 block font-bold">wg0 (WireGuard Tunnel)</span>
              <strong className="text-purple-600 font-bold">10.14.0.1/24</strong>
              <p className="text-[10px] text-zinc-500 font-sans">VPN link to Oracle VPS (42ms) and HomeLab (12ms)</p>
            </div>
          </div>
        </div>
      )}

      {/* Disk health and maintenance */}
      {activeTab === 'disks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h4 className="font-bold font-sans text-sm text-zinc-900 dark:text-white">Drive inventory</h4>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {[
                { name: 'Samsung 980 NVMe', detail: '1 TB · OS and system volume' },
                { name: 'Seagate IronWolf SATA × 4', detail: '4 TB each · RAIDZ1 storage pool' }
              ].map(drive => (
                <div key={drive.name} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <strong className="text-zinc-800 dark:text-zinc-200">{drive.name}</strong>
                    <span className="text-[10px] text-zinc-500 block font-sans">{drive.detail}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">SMART status: query required</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h4 className="font-bold font-sans text-sm text-zinc-900 dark:text-white">Active Maintenance Cron Jobs</h4>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-amber-600 font-bold block">0 4 * * 0 /usr/sbin/zpool scrub zpool-main</span>
                <p className="text-zinc-500 font-sans text-[10.5px]">Weekly automated ZFS pool data integrity verification</p>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-amber-600 font-bold block">0 2 * * * /opt/scripts/backup-db-postgres.sh</span>
                <p className="text-zinc-500 font-sans text-[10.5px]">Nightly automated dump of PostgreSQL databases to local archive</p>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-amber-600 font-bold block">*/30 * * * * /opt/scripts/odinbot-vector-clean.py</span>
                <p className="text-zinc-500 font-sans text-[10.5px]">AI RAG cache and memory vector index maintenance</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
