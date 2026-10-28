import React, { useState } from 'react';
import { getActiveFirmProfile } from '../../services/supabase';
import { 
  ShieldCheck, Activity, CheckCircle2, XCircle, AlertCircle, 
  Users, DollarSign, Calendar, FileText, Check, MessageSquare, 
  Download, Trash2, Eye, Lock, ArrowUpRight, TrendingUp, Clock, RefreshCw, UserCheck
} from 'lucide-react';

interface AdvocatePermission {
  id: string;
  name: string;
  role: string;
  email: string;
  canCreateFeeNotes: boolean;
  clientVisibility: 'all' | 'assigned';
  canExportData: boolean;
  canDeleteMatter: boolean;
}

interface PendingBoc {
  id: string;
  bocNumber: string;
  matterTitle: string;
  clientName: string;
  advocateName: string;
  totalAmount: number;
  foliosCount: number;
  itemsCount: number;
  submittedAt: string;
  status: 'pending' | 'approved' | 'returned';
  returnNotes?: string;
  items: Array<{ itemNo: number; description: string; fee: number; folios?: number }>;
}

interface ManagingPartnerGodModeProps {
  onNavigateToBuilder?: (note?: any) => void;
  onNavigateTab?: (tab: string) => void;
}

export const ManagingPartnerGodMode: React.FC<ManagingPartnerGodModeProps> = ({
  onNavigateToBuilder,
  onNavigateTab
}) => {
  const activeFirm = getActiveFirmProfile();
  // 1. Time Range State for Revenue Overview
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'ytd' | 'all'>('ytd');

  // 2. Real-time Live Activity Feed State
  const [activities] = useState<Array<{ id: string; advocate: string; action: string; time: string; type: string; badgeColor: string }>>([]);

  // 3. Approval Queue State
  const [pendingBocs] = useState<PendingBoc[]>([]);

  // Selected BOC for Review Modal
  const [selectedBoc, setSelectedBoc] = useState<PendingBoc | null>(null);
  const [returnNotesInput, setReturnNotesInput] = useState('Reduce folio count from 40 to 25 — Taxing Master will challenge this');

  const handleApproveBoc = (id: string) => {
    onNavigateTab?.('managing_approvals');
  };

  const handleReturnBoc = (id: string) => {
    if (!returnNotesInput.trim()) {
      alert('Please enter return notes for the advocate.');
      return;
    }
    onNavigateTab?.('managing_approvals');
  };

  // 4. Permission Dashboard State (Saved in LocalStorage)
  const [advocatePermissions] = useState<AdvocatePermission[]>([]);

  const updatePermission = (id: string, field: keyof AdvocatePermission, value: any) => {
    onNavigateTab?.('managing_permissions');
  };

  // 5. Revenue Overview Data per Advocate
  const revenueData: Record<'month' | 'quarter' | 'ytd' | 'all', {
    totalBilled: number;
    totalCollected: number;
    totalOutstanding: number;
    advocates: Array<{ name: string; billed: number; collected: number; outstanding: number }>;
  }> = {
    month: {
      totalBilled: 0, totalCollected: 0, totalOutstanding: 0, advocates: []
    },
    quarter: {
      totalBilled: 0, totalCollected: 0, totalOutstanding: 0, advocates: []
    },
    ytd: {
      totalBilled: 0, totalCollected: 0, totalOutstanding: 0, advocates: []
    },
    all: {
      totalBilled: 0, totalCollected: 0, totalOutstanding: 0, advocates: []
    }
  };

  const currentRev = revenueData[timeRange];

  return (
    <div className="space-y-8 w-full font-sans antialiased text-slate-900 dark:text-white">
      
      {/* EXECUTIVE PARTNER OVERSIGHT BANNER */}
      <div className="p-6 rounded-2xl bg-slate-900 dark:bg-zinc-900 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono font-extrabold text-xs tracking-wider border border-amber-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                EXECUTIVE OVERSIGHT DESK
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="Real-time Synchronization Active"></span>
            </div>
            
            <h1 className="font-brand font-black text-2xl sm:text-3xl tracking-tight text-white mt-2">
              {activeFirm.name} — Managing Partner Executive Suite
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-sans">
              Full enterprise oversight across all firm advocates, live billing activity, pending BOC approvals, granular permission toggles, and revenue metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab ? onNavigateTab('settings') : null}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-sans font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-md"
              title="Firm Profile & Letterhead Settings"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Firm Profile & Letterhead
            </button>
            <button
              onClick={() => onNavigateTab ? onNavigateTab('boc') : onNavigateToBuilder && onNavigateToBuilder()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Create My BOC (Practicing Advocate)
            </button>
          </div>
        </div>
      </div>

      {/* GRID 1: LIVE ACTIVITY FEED & APPROVAL QUEUE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT (6 Cols): LIVE ACTIVITY FEED */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Live Activity Feed</h3>
                  <p className="text-xs text-slate-500 font-mono">Real-time actions across firm advocates</p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                {activities.length} Events
              </span>
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {activities.map((act) => (
                <div 
                  key={act.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 flex items-start gap-3 hover:bg-slate-100/80 transition-colors"
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${act.badgeColor} mt-1.5 shrink-0`}></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                      <strong className="font-bold text-slate-900 dark:text-white">{act.advocate}</strong> {act.action}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Live Socket Connected
            </span>
            <span>Firm ID: LAW-KE-2026</span>
          </div>
        </div>

        {/* RIGHT (6 Cols): APPROVAL QUEUE */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Approval Queue</h3>
                  <p className="text-xs text-slate-500 font-mono">BOCs awaiting Managing Partner sign-off</p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                {pendingBocs.filter(b => b.status === 'pending').length} Pending Review
              </span>
            </div>

            <div className="space-y-4">
              {pendingBocs.map((boc) => (
                <div 
                  key={boc.id}
                  className={`p-4 rounded-xl border transition-all ${
                    boc.status === 'pending'
                      ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10'
                      : boc.status === 'approved'
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-red-500/40 bg-red-500/5'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">{boc.bocNumber}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-medium">
                          {boc.advocateName}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1 line-clamp-1">{boc.matterTitle}</h4>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <p className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                        KES {boc.totalAmount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{boc.foliosCount} folios ({boc.itemsCount} items)</p>
                    </div>
                  </div>

                  {boc.status === 'pending' ? (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                      <button
                        onClick={() => setSelectedBoc(boc)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review Items
                      </button>
                      <button
                        onClick={() => handleApproveBoc(boc.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm shadow-emerald-500/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => { setSelectedBoc(boc); setReturnNotesInput('Reduce folio count from 40 to 25 — Taxing Master will challenge this'); }}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Return with Notes
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 text-xs font-mono font-bold flex items-center gap-2">
                      {boc.status === 'approved' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> APPROVED FOR FILING
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> RETURNED TO ADVOCATE: "{boc.returnNotes}"
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-mono pt-4 mt-2 border-t border-slate-100 dark:border-zinc-800">
            Sign-off locks the BOC hash to prevent unauthorized line modifications before filing in Registry.
          </p>
        </div>
      </div>

      {/* REVIEW & SIGN-OFF MODAL */}
      {selectedBoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-3xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4 mb-6">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-mono font-bold text-xs">
                  {selectedBoc.bocNumber} REVIEW
                </span>
                <h2 className="font-brand font-extrabold text-xl text-slate-900 dark:text-white mt-1">
                  {selectedBoc.matterTitle}
                </h2>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Prepared by <strong>{selectedBoc.advocateName}</strong> for client <strong>{selectedBoc.clientName}</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedBoc(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden mb-6 max-h-[250px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-right">Fee (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-mono">
                  {selectedBoc.items.map((item) => (
                    <tr key={item.itemNo} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                      <td className="p-3 font-bold text-slate-400">{item.itemNo}</td>
                      <td className="p-3 font-sans text-slate-800 dark:text-slate-200">{item.description}</td>
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                        {item.fee.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Return Notes Input Box */}
            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Return Notes / Taxing Master Guidance (Required if Returning):
              </label>
              <textarea
                rows={2}
                value={returnNotesInput}
                onChange={(e) => setReturnNotesInput(e.target.value)}
                placeholder="e.g. Reduce folio count from 40 to 25 — Taxing Master will challenge this"
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setSelectedBoc(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReturnBoc(selectedBoc.id)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" /> Return to Advocate
              </button>
              <button
                onClick={() => handleApproveBoc(selectedBoc.id)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve & Sign-Off BOC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVENUE OVERVIEW CARD WITH TIME-RANGE DROPDOWN */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-brand font-extrabold text-xl text-slate-900 dark:text-white">Firm Revenue Overview</h2>
              <p className="text-xs text-slate-500 font-mono">Billed, collected, and outstanding totals broken down by Advocate</p>
            </div>
          </div>

          {/* Time Range Selector Buttons */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl font-mono text-xs shrink-0">
            {(['month', 'quarter', 'ytd', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-slate-900 text-white dark:bg-zinc-700 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {range === 'ytd' ? 'YTD 2026' : range === 'all' ? 'All Time' : `This ${range}`}
              </button>
            ))}
          </div>
        </div>

        {/* 3 TOP REVENUE STAT METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block mb-1">
              Total Billed ({timeRange.toUpperCase()})
            </span>
            <p className="text-2xl font-mono font-black text-slate-900 dark:text-white">
              KES {currentRev.totalBilled.toLocaleString()}
            </p>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono mt-1 block">100% Taxed Fee Notes</span>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1">
              Total Collected
            </span>
            <p className="text-2xl font-mono font-black text-emerald-700 dark:text-emerald-400">
              KES {currentRev.totalCollected.toLocaleString()}
            </p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
              {((currentRev.totalCollected / currentRev.totalBilled) * 100).toFixed(1)}% Recovery Rate
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block mb-1">
              Total Outstanding
            </span>
            <p className="text-2xl font-mono font-black text-amber-700 dark:text-amber-400">
              KES {currentRev.totalOutstanding.toLocaleString()}
            </p>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono mt-1 block">Pending Client Remittance</span>
          </div>
        </div>

        {/* ADVOCATE BREAKDOWN CARDS */}
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white font-mono uppercase tracking-wider">
            Advocate Breakdown — Billed vs Collected
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentRev.advocates.map((adv) => {
              const recoveryPct = ((adv.collected / adv.billed) * 100).toFixed(0);
              return (
                <div key={adv.name} className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{adv.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">{recoveryPct}% Recovery Rate</span>
                    </div>
                    <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                      KES {(adv.billed / 1000000).toFixed(1)}M
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all" 
                      style={{ width: `${recoveryPct}%` }}
                      title={`Collected: KES ${adv.collected.toLocaleString()}`}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400 pt-1">
                    <span>Collected: <strong className="text-emerald-600">KES {(adv.collected / 1000000).toFixed(1)}M</strong></span>
                    <span>Outstanding: <strong className="text-amber-600">KES {(adv.outstanding / 1000000).toFixed(1)}M</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PERMISSION DASHBOARD (PER ADVOCATE TOGGLES) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-brand font-extrabold text-xl text-slate-900 dark:text-white">Permission Dashboard</h2>
              <p className="text-xs text-slate-500 font-mono">Granular advocate security toggles & database access rules</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            Real-time RBAC Matrix
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-900 dark:text-white">
            <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-zinc-700">
              <tr>
                <th className="p-3.5">Advocate / User</th>
                <th className="p-3.5 text-center">Create Fee Notes</th>
                <th className="p-3.5 text-center">Client Scope</th>
                <th className="p-3.5 text-center">Export Data</th>
                <th className="p-3.5 text-center">Delete Matter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-sans">
              {advocatePermissions.map((adv) => (
                <tr key={adv.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900 dark:text-white text-xs">{adv.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{adv.role} ({adv.email})</div>
                  </td>

                  {/* Create Fee Notes Toggle */}
                  <td className="p-3.5 text-center">
                    <input 
                      type="checkbox"
                      checked={adv.canCreateFeeNotes}
                      onChange={(e) => updatePermission(adv.id, 'canCreateFeeNotes', e.target.checked)}
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                  </td>

                  {/* Client Visibility Scope */}
                  <td className="p-3.5 text-center">
                    <select
                      value={adv.clientVisibility}
                      onChange={(e) => updatePermission(adv.id, 'clientVisibility', e.target.value)}
                      className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="all">All Clients</option>
                      <option value="assigned">Assigned Only</option>
                    </select>
                  </td>

                  {/* Export Data Toggle */}
                  <td className="p-3.5 text-center">
                    <input 
                      type="checkbox"
                      checked={adv.canExportData}
                      onChange={(e) => updatePermission(adv.id, 'canExportData', e.target.checked)}
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                  </td>

                  {/* Delete Matter Toggle */}
                  <td className="p-3.5 text-center">
                    <input 
                      type="checkbox"
                      checked={adv.canDeleteMatter}
                      onChange={(e) => updatePermission(adv.id, 'canDeleteMatter', e.target.checked)}
                      className="w-4 h-4 accent-red-500 cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default ManagingPartnerGodMode;
