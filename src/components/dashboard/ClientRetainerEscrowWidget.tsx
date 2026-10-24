import React from 'react';
import { Wallet, ArrowUpRight, ChevronRight } from 'lucide-react';
import { ExactClientRecord, ExactMatterRecord } from '../../services/supabase';

interface ClientRetainerEscrowWidgetProps {
  clients: ExactClientRecord[];
  matters: ExactMatterRecord[];
  onNavigateTab: (tab: string, targetId?: string) => void;
}

export const ClientRetainerEscrowWidget: React.FC<ClientRetainerEscrowWidgetProps> = ({
  clients,
  onNavigateTab
}) => {
  // Take the primary active clients
  const activeClients = clients.slice(0, 4);

  return (
    <div className="modulix-card p-5 border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-brand font-bold text-sm text-slate-900 dark:text-white">
                Client Accounts & Retainers
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Active client briefs, files and total billed to date
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('clients')}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>All Clients</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Minimalist Client Ledger List */}
        <div className="divide-y divide-[var(--border-color)]/50 mt-1">
          {activeClients.map(client => {
            const billed = client.totalBilledAmount ?? 0;
            const activeMatters = client.activeMattersCount ?? client.matters ?? 1;

            return (
              <div
                key={client.id}
                onClick={() => onNavigateTab('clients')}
                role="button"
                tabIndex={0}
                className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-[var(--bg-subtle)]/70 hover:shadow-2xs rounded-xl transition-all cursor-pointer group"
                title={`Open dossier & instructions for ${client.name}`}
              >
                {/* Client Info */}
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={client.name}>
                    {client.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block truncate">
                    {client.code} &middot; {client.category}
                  </span>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-3.5 text-right shrink-0">
                  <div className="min-w-[65px]">
                    <span className="text-[10px] font-mono text-slate-400 block">Active Files</span>
                    <span className="font-mono font-bold text-xs text-slate-800 dark:text-zinc-200">
                      {activeMatters} {activeMatters === 1 ? 'file' : 'files'}
                    </span>
                  </div>

                  <div className="min-w-[90px]">
                    <span className="text-[10px] font-mono text-slate-400 block">Total Billed</span>
                    <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      KES {billed > 0 ? (billed / 1000000).toFixed(2) + 'M' : '0.00'}
                    </span>
                  </div>

                  <div className="min-w-[55px] flex justify-end">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
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
