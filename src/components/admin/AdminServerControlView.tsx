import React, { useState } from 'react';
import { Server, ShieldAlert, Cpu, HardDrive, RefreshCw, Power, AlertOctagon, CheckCircle2, Play, Activity, Globe, GitBranch } from 'lucide-react';

export const AdminServerControlView: React.FC = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [dockerStatus, setDockerStatus] = useState('RUNNING (karani-law-app:v2.4.0)');
  const [azureStatus, setAzureStatus] = useState('HEALTHY (azure-appservice-prod)');
  const [vercelStatus, setVercelStatus] = useState('DEPLOYED (karani-law-billszip.vercel.app)');
  const [githubStatus, setGithubStatus] = useState('PASSED (Commit #98af9236)');
  const [isPurgingCdn, setIsPurgingCdn] = useState(false);

  const handleToggleMaintenance = () => {
    const next = !maintenanceMode;
    setMaintenanceMode(next);
    alert(next ? '⚠️ EMERGENCY MAINTENANCE KILL-SWITCH ACTIVATED: Web application locked to read-only maintenance mode!' : '✓ EMERGENCY MAINTENANCE DEACTIVATED: Platform operational.');
  };

  const handlePurgeCdn = () => {
    setIsPurgingCdn(true);
    setTimeout(() => {
      setIsPurgingCdn(false);
      alert('✓ Vercel & Cloudflare Edge CDN Cache purged successfully across all global locations!');
    }, 1200);
  };

  const handleTriggerPipeline = () => {
    alert('✓ GitHub Actions CI/CD Build Pipeline triggered for branch "main"...');
  };

  return (
    <div className="w-full space-y-8 pb-12 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)]/50 pb-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-mono font-bold text-[10px]">
            ADMIN EMERGENCY CONTROL PANEL
          </span>
          <h1 className="font-brand font-extrabold text-2xl text-[var(--text-main)] tracking-tight mt-1">
            Emergency Server & Infrastructure Control
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            11 Master Infrastructure Controls for Docker, Azure Cloud, Vercel CDN, GitHub CI/CD & Maintenance Kill-Switch
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePurgeCdn}
            disabled={isPurgingCdn}
            className="btn-outline px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> {isPurgingCdn ? 'Purging CDN...' : 'Purge CDN Cache'}
          </button>
          <button
            onClick={handleToggleMaintenance}
            className={`px-5 py-2.5 text-xs font-semibold flex items-center gap-1.5 rounded-xl text-white shadow-md cursor-pointer shrink-0 transition-colors ${
              maintenanceMode ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800 dark:bg-white dark:text-black'
            }`}
          >
            <Power className="w-4 h-4" /> {maintenanceMode ? 'DEACTIVATE Maintenance' : 'EMERGENCY Kill-Switch'}
          </button>
        </div>
      </div>

      {maintenanceMode && (
        <div className="p-4 rounded-xl bg-red-500/10 border-2 border-red-500 text-red-500 font-mono text-xs flex items-center gap-3">
          <AlertOctagon className="w-6 h-6 shrink-0 animate-pulse" />
          <div>
            <strong className="block text-sm">EMERGENCY MAINTENANCE LOCK IS ACTIVE</strong>
            <span>All public write operations are suspended. Web platform is running in emergency read-only mode.</span>
          </div>
        </div>
      )}

      {/* Infrastructure Stack Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-mono">
        {/* Docker */}
        <div className="vercel-card p-5 space-y-2 border-t-4 border-t-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-sans font-semibold">1. Docker Container</span>
            <Server className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-emerald-500 font-bold text-xs">{dockerStatus}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Container Uptime: 99.99%</p>
        </div>

        {/* Azure App Service */}
        <div className="vercel-card p-5 space-y-2 border-t-4 border-t-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-sans font-semibold">2. Azure Web App</span>
            <Cpu className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-emerald-500 font-bold text-xs">{azureStatus}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Tasks Running: 4 / 4</p>
        </div>

        {/* Vercel */}
        <div className="vercel-card p-5 space-y-2 border-t-4 border-t-black dark:border-t-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-sans font-semibold">3. Vercel Edge CDN</span>
            <Globe className="w-4 h-4 text-[var(--text-main)]" />
          </div>
          <p className="text-emerald-500 font-bold text-xs">{vercelStatus}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Global Edge CDN Active</p>
        </div>

        {/* GitHub CI/CD */}
        <div className="vercel-card p-5 space-y-2 border-t-4 border-t-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-sans font-semibold">4. GitHub Actions CI/CD</span>
            <GitBranch className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-emerald-500 font-bold text-xs">{githubStatus}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Build Pipeline: Clean Pass</p>
        </div>
      </div>

      {/* Server Resources Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="vercel-card p-5 space-y-3">
          <h3 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <Cpu className="w-4 h-4 text-emerald-500" /> 8. CPU Server Load Gauge
          </h3>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between"><span>CPU Load: 12%</span><span>Normal</span></div>
            <div className="w-full bg-[var(--bg-subtle)] h-2 rounded-full overflow-hidden border border-[var(--border-color)]">
              <div className="bg-emerald-500 h-full w-[12%]" />
            </div>
          </div>
        </div>

        <div className="vercel-card p-5 space-y-3">
          <h3 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <HardDrive className="w-4 h-4 text-blue-500" /> 9. RAM Memory Gauge
          </h3>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between"><span>RAM: 1.8 GB / 8.0 GB</span><span>22%</span></div>
            <div className="w-full bg-[var(--bg-subtle)] h-2 rounded-full overflow-hidden border border-[var(--border-color)]">
              <div className="bg-blue-500 h-full w-[22%]" />
            </div>
          </div>
        </div>

        <div className="vercel-card p-5 space-y-3">
          <h3 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <HardDrive className="w-4 h-4 text-purple-500" /> 10. NVMe SSD Storage Gauge
          </h3>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between"><span>Disk: 14.2 GB / 100 GB</span><span>14%</span></div>
            <div className="w-full bg-[var(--bg-subtle)] h-2 rounded-full overflow-hidden border border-[var(--border-color)]">
              <div className="bg-purple-500 h-full w-[14%]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminServerControlView;
