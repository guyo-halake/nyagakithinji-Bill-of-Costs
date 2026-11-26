import React from 'react';
import {
  Activity,
  Database,
  HardDrive,
  LockKeyhole,
  Network,
  Server,
  Shield,
  Cpu
} from 'lucide-react';

interface ServerStorageConsoleProps {
  uptimeSeconds?: number;
  formatUptime?: (seconds: number) => string;
  internetSpeed?: number;
}

const volumes = [
  { letter: 'D:', name: 'Guyesa-agent', used: 3.08, total: 4 },
  { letter: 'H:', name: 'Najma AI 2', used: 3.62, total: 4 },
  { letter: 'C:', name: 'Backups', used: 1.42, total: 2 },
  { letter: 'I:', name: 'T&B (cryptobot)', used: 1.22, total: 2 }
];

const restrictedSections = ['Secure Erase', 'Firmware', 'M.A.T.T.A (AI)'];

export const ServerStorageConsole: React.FC<ServerStorageConsoleProps> = ({
  uptimeSeconds,
  formatUptime,
  internetSpeed = 79.5
}) => (
  <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-[#101216] dark:text-zinc-100">
    <header className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
          <Server className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold tracking-tight">Razak Server</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">Bare metal · Marsabit · Ubuntu Server 24.04 LTS</p>
        </div>
      </div>
      <span className="self-start rounded border border-zinc-200 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
        Server profile
      </span>
    </header>

    <div className="grid gap-px border-b border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-2 xl:grid-cols-5">
      {[
        { label: 'Server name', value: 'razak-server' },
        { label: 'Host / LAN IP', value: '192.168.1.100' },
        { label: 'Asset tag', value: 'RZK-MSB-NAS-01' },
        { label: 'Disk health', value: 'SMART not queried' },
        { label: 'Drive type', value: '4 × IronWolf 4 TB · RAIDZ1' }
      ].map(item => (
        <div key={item.label} className="bg-white px-4 py-3 dark:bg-[#101216]">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">{item.label}</p>
          <p className="mt-1 truncate font-mono text-xs font-medium">{item.value}</p>
        </div>
      ))}
    </div>

    <div className="p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Storage pool · RAIDZ1</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            9.34 <span className="text-sm font-medium text-zinc-500">TB used</span>
            <span className="px-1.5 text-zinc-400">/</span>
            <span className="text-base font-medium text-zinc-600 dark:text-zinc-300">12 TB</span>
          </p>
        </div>
        <p className="font-mono text-xs text-zinc-500">2.66 TB free · 77.8% used</p>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800"
        role="img"
        aria-label="Storage pool is 77.8 percent used"
      >
        <div className="h-full rounded-sm bg-sky-600 dark:bg-sky-500" style={{ width: '77.8%' }} />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-[10px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <th className="pb-2 pr-4 font-medium">Drive / mount</th>
              <th className="pb-2 pr-4 font-medium">Volume label</th>
              <th className="pb-2 pr-4 font-medium">Usage</th>
              <th className="w-36 pb-2 font-medium">Capacity used</th>
            </tr>
          </thead>
          <tbody>
            {volumes.map(volume => (
              <tr key={volume.letter} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/70">
                <td className="py-3 pr-4 font-mono font-semibold text-zinc-500">{volume.letter}</td>
                <td className="py-3 pr-4 font-medium">{volume.name}</td>
                <td className="py-3 pr-4 font-mono text-zinc-600 dark:text-zinc-300">
                  {volume.used.toFixed(2)} / {volume.total.toFixed(2)} TB
                </td>
                <td className="py-3">
                  <div className="h-1.5 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-sm bg-sky-600 dark:bg-sky-500"
                      style={{ width: `${(volume.used / volume.total) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-zinc-500">Logical volume labels mapped to the 12 TB storage pool.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800 sm:grid-cols-3 xl:grid-cols-7">
        {[
          { label: 'Latest ping', value: '39 ms', detail: 'WireGuard', icon: Network },
          { label: 'Average ping', value: '42 ms', detail: '24-hour average', icon: Network },
          { label: 'Total written', value: '86.4 TB', detail: 'Lifetime I/O', icon: Database },
          { label: 'Total read', value: '214.8 TB', detail: 'Lifetime I/O', icon: HardDrive },
          { label: 'Uptime', value: uptimeSeconds !== undefined && formatUptime ? formatUptime(uptimeSeconds) : 'Not reported', detail: 'Since boot', icon: Activity },
          { label: 'CPU load', value: '0.42 · 0.55 · 0.49', detail: '1 / 5 / 15 min', icon: Cpu },
          { label: 'Memory', value: '18.6 / 32 GB', detail: '58% in use', icon: Shield }
        ].map(metric => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <Icon className="h-3 w-3 shrink-0" />
                {metric.label}
              </p>
              <p className="mt-1 truncate font-mono text-xs font-semibold">{metric.value}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{metric.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-200 pt-3 text-[10px] text-zinc-500 dark:border-zinc-800">
        <span>Adrian AK Fiber</span>
        <span className="font-mono">{internetSpeed.toFixed(1)} Mbps</span>
        <span>Intel Core i7-10700 · 32 GB RAM</span>
        <span>Samsung 980 1 TB NVMe · OS volume</span>
      </div>
    </div>

    <nav aria-label="Restricted server controls" className="flex flex-wrap items-center gap-1 border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <span className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Server controls</span>
      {restrictedSections.map(label => (
        <button
          key={label}
          type="button"
          disabled
          title="You don't have permission to view this. Log in as Razakk."
          aria-label={`${label}: restricted; log in as Razakk`}
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded px-2.5 py-1.5 text-xs text-zinc-400 opacity-60"
        >
          <LockKeyhole className="h-3 w-3" />
          {label}
        </button>
      ))}
      <p className="ml-auto flex basis-full items-center gap-1.5 px-2 pt-1 text-[10px] text-zinc-500 sm:basis-auto sm:pt-0">
        <LockKeyhole className="h-3 w-3 shrink-0" />
        Restricted: log in as Razakk to view these controls.
      </p>
    </nav>
  </section>
);
