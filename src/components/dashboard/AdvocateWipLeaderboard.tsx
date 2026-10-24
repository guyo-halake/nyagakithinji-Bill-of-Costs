import React from 'react';
import { Briefcase, ArrowUpRight, FileCheck, ChevronRight } from 'lucide-react';
import { SystemUser, ExactFeeNoteRecord, ExactMatterRecord } from '../../services/supabase';

interface AdvocateWipLeaderboardProps {
  users: SystemUser[];
  matters: ExactMatterRecord[];
  feeNotes: ExactFeeNoteRecord[];
  onNavigateTab: (tab: string, targetUserId?: string) => void;
  onNavigateToBuilder?: (arg1?: any, arg2?: any) => void;
}

export const AdvocateWipLeaderboard: React.FC<AdvocateWipLeaderboardProps> = ({
  users,
  matters,
  feeNotes,
  onNavigateTab
}) => {
  // Only practicing advocates and partners (exclude developers like Razak Wako)
  const firmAdvocates = users.filter(u => {
    const name = u.fullName.toLowerCase();
    // Exclude developers / IT staff who are not legal practitioners
    if (name.includes('razak')) return false;
    if (u.role === 'Developer' && !name.includes('karani') && !name.includes('vic')) return false;
    return name.includes('guyo') || name.includes('karani') || name.includes('triple') || name.includes('vic') || name.includes('nyagah') || u.role === 'Advocate' || u.role === 'Admin';
  });

  const todayDateString = new Date().toDateString();

  const advocateStats = firmAdvocates.map(user => {
    const userLower = user.fullName.toLowerCase();

    // Match matters to this advocate
    const assignedMatters = matters.filter(m => {
      const lead = (m.leadAdvocate || '').toLowerCase();
      const filed = (m.filedBy || '').toLowerCase();
      const title = (m.title || '').toLowerCase();

      if (userLower.includes('karani') || userLower.includes('triple') || userLower.includes('vic')) {
        return lead.includes('karani') || lead.includes('vic') || filed.includes('karani') || filed.includes('vic') || title.includes('seyani');
      }
      if (userLower.includes('nyagah')) {
        return lead.includes('nyagah') || filed.includes('nyagah') || title.includes('zhenjian') || title.includes('eighty eight');
      }
      if (userLower.includes('guyo')) {
        return lead.includes('guyo') || filed.includes('guyo') || lead.includes('managing partner');
      }
      return lead.includes(userLower) || filed.includes(userLower);
    });

    // Match fee notes
    const userFeeNotes = feeNotes.filter(fn => {
      const gen = (fn.generatedByUser || '').toLowerCase();
      return gen.includes(userLower) || user.workEmail.toLowerCase().includes(gen);
    });

    // Count fee notes generated today
    const notesToday = userFeeNotes.filter(fn => {
      if (!fn.createdAt) return false;
      try {
        return new Date(fn.createdAt).toDateString() === todayDateString;
      } catch (e) {
        return fn.createdAt.startsWith(new Date().toISOString().split('T')[0]);
      }
    }).length;

    const activeCount = assignedMatters.length;
    const totalClaim = assignedMatters.reduce((acc, m) => acc + (m.amount || 0), 0);
    const approvedBilled = userFeeNotes
      .filter(fn => fn.status === 'processed' || fn.status === 'settled')
      .reduce((acc, fn) => acc + (fn.grandTotal || 0), 0);
    const pendingDrafts = userFeeNotes.filter(fn => fn.status === 'draft').length;

    return {
      user,
      activeCount,
      totalClaim,
      approvedBilled,
      pendingDrafts,
      notesToday
    };
  });

  return (
    <div className="modulix-card p-5 border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-brand font-bold text-sm text-slate-900 dark:text-white">
                Advocate Workload
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Active causes, billed revenue & notes filed today per advocate
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('permissions')}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>Team Roster</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Clean Lawyer Roster List */}
        <div className="divide-y divide-[var(--border-color)]/50 mt-1">
          {advocateStats.map(stat => {
            const initials = stat.user.fullName
              .split(' ')
              .filter(Boolean)
              .map(n => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={stat.user.id}
                onClick={() => onNavigateTab('permissions', stat.user.id)}
                role="button"
                tabIndex={0}
                className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-[var(--bg-subtle)]/70 hover:shadow-2xs rounded-xl transition-all cursor-pointer group"
                title={`Click to open ${stat.user.fullName}'s profile & permissions`}
              >
                {/* Lawyer Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-[11px] flex items-center justify-center shrink-0 border border-[var(--border-color)]/70 group-hover:border-blue-500/40 transition-colors">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {stat.user.fullName}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {stat.user.position || stat.user.role}
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-3.5 text-right shrink-0">
                  {/* Notes Generated Today */}
                  <div className="min-w-[65px]">
                    <span className="text-[10px] font-mono text-slate-400 block">Today</span>
                    {stat.notesToday > 0 ? (
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                        <FileCheck className="w-3 h-3" />
                        {stat.notesToday} note{stat.notesToday > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-slate-400">0 notes</span>
                    )}
                  </div>

                  {/* Active Matters */}
                  <div className="min-w-[68px]">
                    <span className="text-[10px] font-mono text-slate-400 block">Active Causes</span>
                    <span className="font-mono font-bold text-xs text-slate-800 dark:text-zinc-200">
                      {stat.activeCount} {stat.activeCount === 1 ? 'matter' : 'matters'}
                    </span>
                  </div>

                  {/* Billed Amount */}
                  <div className="min-w-[85px]">
                    <span className="text-[10px] font-mono text-slate-400 block">Billed</span>
                    <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      KES {stat.approvedBilled > 0 ? (stat.approvedBilled / 1000000).toFixed(2) + 'M' : '0.00'}
                    </span>
                  </div>

                  {/* Drafts Status */}
                  <div className="min-w-[60px] flex justify-end">
                    {stat.pendingDrafts > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        {stat.pendingDrafts} draft{stat.pendingDrafts > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        Current
                      </span>
                    )}
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
