import React, { useState } from 'react';
import { 
  Server, HardDrive, Cpu, Terminal, Activity, 
  Wifi, Power, BatteryCharging, Clock, ShieldCheck, 
  RefreshCw, CheckCircle2, AlertTriangle, Layers, Film, Gamepad2, FolderArchive
} from 'lucide-react';

interface AdminServerViewProps {
  showToast: (msg: string) => void;
  internetSpeed?: number;
  uptimeSeconds?: number;
  formatUptime?: (secs: number) => string;
}

export const AdminServerView: React.FC<AdminServerViewProps> = ({ showToast }) => {
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    'ubuntu@razak-server:~$ uptime',
    ' 11:42:04 up 1048 days, 14:18,  2 users,  load average: 0.88, 0.92, 0.86',
    'ubuntu@razak-server:~$ zpool status zpool-main',
    '  pool: zpool-main',
    ' state: ONLINE',
    '  scan: scrub repaired 0B in 04:12:30 with 0 errors on Sun Oct 11 04:12:30 2026',
    'config:',
    '	NAME                        STATE     READ WRITE CKSUM',
    '	zpool-main                  ONLINE       0     0     0',
    '	  raidz1-0                  ONLINE       0     0     0',
    '	    sda                     ONLINE       0     0     0',
    '	    sdb                     ONLINE       0     0     0',
    '	    sdc                     ONLINE       0     0     0',
    '	    sdd                     ONLINE       0     0     0',
    'errors: No known data errors',
    'ubuntu@razak-server:~$ docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"',
    'NAMES                    STATUS          PORTS',
    'odinbot-core             Up 148 days     0.0.0.0:11434->11434/tcp',
    'freshfity-pos-bridge     Up 42 days      0.0.0.0:3000->3000/tcp',
    'sayara-shein-scraper     Up 64 days      0.0.0.0:8040->8040/tcp',
    'karani-billszip-backend  Up 12 days      127.0.0.1:8000->8000/tcp',
    'suvplanet-api            Up 89 days      0.0.0.0:4000->4000/tcp',
    'innercircle-engine       Up 22 days      0.0.0.0:5050->5050/tcp',
    'jellyfin-media           Up 104 days     0.0.0.0:8096->8096/tcp'
  ]);

  const [activeTab, setActiveTab] = useState<'storage' | 'services' | 'network' | 'disks'>('storage');

  // Realistic Project Storage inside the 4 TB Pool
  const activeProjectsStorage = [
    { name: 'Nokras Hotel & Resort Platform', path: '/zpool/projects/nokras_files', size: '580 GB', percent: 14.5, client: 'Nokras Management Group' },
    { name: 'SUVPlanet Auto Traders', path: '/zpool/projects/suvplanet', size: '120 GB', percent: 3.0, client: 'SUVPlanet Kenya' },
    { name: 'Inner Circle Hedge Fund', path: '/zpool/projects/innercircle', size: '45 GB', percent: 1.1, client: 'Joseph Gitari' },
    { name: 'Karani Law & BillsZip', path: '/zpool/projects/karanilaw', size: '35 GB', percent: 0.9, client: 'Adv. Nyagah B. Kithinji' },
    { name: 'Sayara Aesthetics & Shein Daemon', path: '/zpool/projects/sayara', size: '25 GB', percent: 0.6, client: 'Sarah Guyatu Rashid' },
    { name: 'Khaemba News & Media', path: '/zpool/projects/khaemba', size: '16 GB', percent: 0.4, client: 'Dennis Khaemba' },
    { name: 'Fresh Fity Supermarket POS', path: '/zpool/projects/freshcity', size: '8 GB', percent: 0.2, client: 'Rosemary Wakonyo (Ruiru)' },
    { name: 'Other Active Projects Pool', path: '/zpool/projects/general', size: '172 GB', percent: 4.3, client: 'School & Personal staging' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Top Banner: Bare Metal Server (Razak Server) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase">PHYSICAL MACHINE &middot; GUYO'S SERVER</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Bare Metal Server (Razak Server)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Ubuntu Server 24.04 LTS &middot; Intel Core i7-10700 &middot; 32GB RAM &middot; 12 TB NAS Storage
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
            <span className="text-[10px] text-zinc-400 block">Uptime (Since 03 Dec 2023)</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">1,048 Days, 14 Hours</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
            <span className="text-[10px] text-zinc-400 block">Adrian AK Fiber</span>
            <strong className="text-zinc-800 dark:text-zinc-200 font-bold">68 Mbps Sync</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
            <span className="text-[10px] text-zinc-400 block">Power Batteries</span>
            <strong className="text-zinc-500 dark:text-zinc-400 font-bold">78% estimate</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
            <span className="text-[10px] text-zinc-400 block">Temperature</span>
            <strong className="text-zinc-800 dark:text-zinc-200 font-bold">24.2°C</strong>
          </div>
        </div>
      </div>

      {/* 12 TB NAS Physical Allocation Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-zinc-100 dark:border-zinc-800 gap-2">
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-500" />
              <span>Physical NAS: 12 TB Total Array (12 TB NVMe/SATA Pool)</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              4x 4TB Seagate IronWolf drives in RAID 5 + 1TB Samsung 980 NVMe OS drive
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            Total Used: 9.34 TB / 12 TB (2.66 TB Free)
          </span>
        </div>

        {/* 12 TB Allocation Visual Bar */}
        <div className="space-y-2 font-mono text-xs">
          <div className="h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
            <div style={{ width: '33.3%' }} className="bg-amber-500" title="Projects & Clients (4 TB)"></div>
            <div style={{ width: '25%' }} className="bg-purple-500" title="OdinBot AI Core (3 TB)"></div>
            <div style={{ width: '41.7%' }} className="bg-blue-500" title="Personal Archive & BIF2 (5 TB)"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
              <span className="text-zinc-600 dark:text-zinc-400">Projects &amp; Clients: <strong>4 TB</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500"></span>
              <span className="text-zinc-600 dark:text-zinc-400">OdinBot Local AI: <strong>3 TB</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
              <span className="text-zinc-600 dark:text-zinc-400">Personal Archive &amp; BIF2: <strong>5 TB</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher for Server Views */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold gap-6">
        <button
          onClick={() => setActiveTab('storage')}
          className={`pb-3 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'storage' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Storage Pools &amp; Folders
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'services' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Services &amp; Docker Fleet (7)
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`pb-3 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'network' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Network Interfaces &amp; WireGuard
        </button>
        <button
          onClick={() => setActiveTab('disks')}
          className={`pb-3 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'disks' ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Disk Health &amp; Maintenance Cron
        </button>
      </div>

      {/* Tab 1: Storage Breakdown (4 TB Projects + 5 TB Personal + 3 TB OdinBot) */}
      {activeTab === 'storage' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Projects Partition (4 TB Pool) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Active Projects (4 TB Pool)</h4>
                <p className="text-xs text-zinc-500">Allocated to client systems &amp; web apps</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                /zpool/projects
              </span>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              {activeProjectsStorage.map((p, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-between items-center">
                  <div>
                    <strong className="font-sans text-xs text-zinc-900 dark:text-white block">{p.name}</strong>
                    <span className="text-[10px] text-zinc-400 font-mono">{p.path} &middot; {p.client}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{p.size}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Archive Partition (5 TB Pool) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Personal Archive &amp; BIF2 (5 TB Pool)</h4>
                <p className="text-xs text-zinc-500">Personal media, games, construction files, and system ROMs</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold">
                /zpool/personal
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Media & Movies */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-blue-500" />
                    Document / Movies (Jellyfin Media)
                  </span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">2.34 TB</span>
                </div>
                <p className="text-[10.5px] text-zinc-400 font-sans">
                  Offline movies, family documentaries, legal trials, and video tutorials streamed across home TVs.
                </p>
              </div>

              {/* BIF2 Construction Files */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <FolderArchive className="w-3.5 h-3.5 text-amber-500" />
                    BIF2 Construction Company Files
                  </span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">1.00 TB</span>
                </div>
                <p className="text-[10.5px] text-zinc-400 font-sans">
                  CAD architectural blueprints, structural engineering drawings, project bills of quantities (BQ).
                </p>
              </div>

              {/* Game Repositories */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5 text-emerald-500" />
                    Game Repositories &amp; Mods
                  </span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">1.60 TB</span>
                </div>
                <p className="text-[10.5px] text-zinc-400 font-sans">
                  GTA 4, GTA 5, GTA San Andreas, Need for Speed Most Wanted, Watch Dogs 2, COD Mobile Emulator.
                </p>
              </div>

              {/* System Images & Emulation */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-sans font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-500" />
                    System Images &amp; ROMs
                  </span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">0.06 TB (60 GB)</span>
                </div>
                <p className="text-[10.5px] text-zinc-400 font-sans">
                  Oppo A16 Android emulation ROMs, Windows emulators, recovery nandroid dumps.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Systemctl Services & Docker Fleet */}
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

      {/* Tab 3: Network Interfaces */}
      {activeTab === 'network' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 font-mono text-xs">
          <h4 className="font-bold font-sans text-sm text-zinc-900 dark:text-white">Network Interfaces &amp; Routing</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-1">
              <span className="text-[10px] text-zinc-400 block font-bold">eth4 (Adrian AK Fiber)</span>
              <strong className="text-emerald-600 font-bold">50 Mbps Sync</strong>
              <p className="text-[10px] text-zinc-500 font-sans">Primary gateway line (60 - 73 Mbps live speed)</p>
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

      {/* Tab 4: Disk Health & Maintenance Cron */}
      {activeTab === 'disks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h4 className="font-bold font-sans text-sm text-zinc-900 dark:text-white">SMART Disk Diagnostics</h4>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <div>
                  <strong className="text-zinc-800 dark:text-zinc-200">Samsung 980 NVMe (OS Root 1.5 TB)</strong>
                  <span className="text-[10px] text-zinc-400 block font-sans">500 GB used / 1.0 TB available</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-bold text-[10px]">90% Health</span>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <div>
                  <strong className="text-zinc-800 dark:text-zinc-200">SDA - Seagate IronWolf 4TB</strong>
                  <span className="text-[10px] text-zinc-400 block font-sans">0 reallocated sectors &middot; Temp 29°C</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-bold text-[10px]">100% Health</span>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <div>
                  <strong className="text-zinc-800 dark:text-zinc-200">SDB - Seagate IronWolf 4TB</strong>
                  <span className="text-[10px] text-zinc-400 block font-sans">0 reallocated sectors &middot; Temp 30°C</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-bold text-[10px]">100% Health</span>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <div>
                  <strong className="text-zinc-800 dark:text-zinc-200">SDC - Seagate IronWolf 4TB</strong>
                  <span className="text-[10px] text-zinc-400 block font-sans">0 reallocated sectors &middot; Temp 28°C</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-bold text-[10px]">100% Health</span>
              </div>
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

      {/* Embedded Terminal Output Log */}
      <div className="p-5 rounded-2xl bg-zinc-950 text-zinc-100 border border-zinc-800 font-mono text-xs space-y-2">
        <div className="flex justify-between items-center pb-2 border-b border-zinc-800 text-[10.5px] text-zinc-400">
          <span>Razak Server Live Terminal Session (/dev/pts/1)</span>
          <span className="text-emerald-400">Connected</span>
        </div>
        <div className="space-y-1 text-zinc-300">
          {terminalOutput.map((l, i) => (
            <div key={i} className={l.startsWith('ubuntu@') ? 'text-amber-400 font-bold' : ''}>
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
