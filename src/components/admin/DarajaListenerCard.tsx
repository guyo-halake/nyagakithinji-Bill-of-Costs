import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Search, X } from 'lucide-react';

export interface DarajaTransaction {
  id: string;
  transId: string;
  type: string;
  amount: number;
  phone: string;
  clientName: string;
  projectName: string;
  accountRef: string;
  timestamp: string;
  status: string;
  channelName: string;
}

interface DarajaListenerCardProps {
  showToast?: (msg: string) => void;
  compact?: boolean;
}

export const DarajaListenerCard: React.FC<DarajaListenerCardProps> = ({ showToast, compact = false }) => {
  const [selectedTx, setSelectedTx] = useState<DarajaTransaction | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [transactions, setTransactions] = useState<DarajaTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadPayments = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/v1/payments');
      if (!response.ok) throw new Error('The payment service is unavailable.');

      const data = await response.json();
      if (!Array.isArray(data?.payments)) throw new Error('The payment service returned an unexpected response.');

      const rows = data.payments as Record<string, unknown>[];
      const records = rows.flatMap(row => {
        const id = String(row.id || row.reference || row.receiptNumber || '');
        const amount = Number(row.amount);
        if (!id || !Number.isFinite(amount)) return [];

        const paymentMethod = String(row.paymentMethod || row.payment_method || '');
        return [{
          id,
          transId: String(row.receiptNumber || row.reference || row.id),
          type: paymentMethod ? paymentMethod.toUpperCase().replace(/[\s-]+/g, '_') : 'PAYMENT',
          amount,
          phone: String(row.phone || ''),
          clientName: String(row.clientName || row.client_name || ''),
          projectName: String(row.matterTitle || row.matter_title || ''),
          accountRef: String(row.billNumber || row.bill_number || ''),
          timestamp: String(row.paymentDate || row.createdAt || row.created_at || ''),
          status: String(row.status || 'unknown').toUpperCase(),
          channelName: paymentMethod,
        }];
      });

      setTransactions(records);
    } catch {
      setTransactions([]);
      setLoadError('We could not load payment records. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPayments();
    const handlePaymentUpdate = () => void loadPayments();
    window.addEventListener('paymentsUpdated', handlePaymentUpdate);
    return () => window.removeEventListener('paymentsUpdated', handlePaymentUpdate);
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard access is unavailable.');
      await navigator.clipboard.writeText(text);
      showToast?.('Receipt number copied.');
    } catch {
      showToast?.('Could not copy the receipt number.');
    }
  };

  const filtered = transactions.filter(t => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.clientName.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q) ||
        t.transId.toLowerCase().includes(q) ||
        t.accountRef.toLowerCase().includes(q) ||
        t.phone.includes(q)
      );
    }
    return true;
  });
  const paymentTypes = ['ALL', ...new Set(transactions.map(transaction => transaction.type))];
  const formatLabel = (value: string) => value.toLowerCase().split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const today = new Date();
  const confirmedTransactions = transactions.filter(t => t.status === 'CONFIRMED');
  const receivedToday = confirmedTransactions
    .filter(t => {
      const date = new Date(t.timestamp);
      return !Number.isNaN(date.getTime()) && date.toDateString() === today.toDateString();
    })
    .reduce((total, transaction) => total + transaction.amount, 0);
  const receivedThisMonth = confirmedTransactions
    .filter(t => {
      const date = new Date(t.timestamp);
      return !Number.isNaN(date.getTime()) && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    })
    .reduce((total, transaction) => total + transaction.amount, 0);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden font-sans text-xs">
      <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-800/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-white font-brand">
                Payment records
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Payments recorded by your firm.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadPayments()}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-100 dark:divide-zinc-800 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs">
        <div className="p-3.5 sm:p-4 space-y-1">
          <span className="text-zinc-400 text-[10px] uppercase tracking-wider block">Confirmed today</span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
            KES {receivedToday.toLocaleString()}
          </span>
          <span className="text-[10.5px] text-zinc-500">Based on confirmed records</span>
        </div>

        <div className="p-3.5 sm:p-4 space-y-1">
          <span className="text-zinc-400 text-[10px] uppercase tracking-wider block">Confirmed this month</span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-white block">
            KES {receivedThisMonth.toLocaleString()}
          </span>
          <span className="text-[10.5px] text-zinc-500">Based on confirmed records</span>
        </div>

        <div className="p-3.5 sm:p-4 space-y-1">
          <span className="text-zinc-400 text-[10px] uppercase tracking-wider block">Records loaded</span>
          <span className="text-sm sm:text-base font-bold font-mono text-zinc-900 dark:text-white block">
            {transactions.length}
          </span>
          <span className="text-[10.5px] text-zinc-500">From the payment service</span>
        </div>

        <div className="p-3.5 sm:p-4 space-y-1">
          <span className="text-zinc-400 text-[10px] uppercase tracking-wider block">Status</span>
          <span className="text-sm sm:text-base font-bold font-mono text-zinc-900 dark:text-white block">
            {loadError ? 'Unavailable' : isLoading ? 'Loading' : 'Connected'}
          </span>
          <span className="text-[10.5px] text-zinc-500">{loadError ? 'Refresh to try again' : 'Payment service'}</span>
        </div>
      </div>

      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-800/20 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-zinc-400 text-[10.5px] mr-1">Method:</span>
          {paymentTypes.map(t => (
            <button
              type="button"
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-md text-[10.5px] font-mono cursor-pointer transition-colors ${
                filterType === t 
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-2xs' 
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-100'
              }`}
            >
              {t === 'ALL' ? 'All' : formatLabel(t)}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
          <input
            type="text"
            aria-label="Search payments"
            placeholder="Search receipt, client, matter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-64"
          />
        </div>
      </div>

      <div className={`divide-y divide-zinc-100 dark:divide-zinc-800 overflow-y-auto ${compact ? 'max-h-72' : 'max-h-96'}`}>
        {loadError && (
          <div role="alert" className="p-4 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30">
            {loadError}
          </div>
        )}
        {isLoading && transactions.length === 0 && !loadError && (
          <div className="p-8 text-center text-zinc-500">Loading payment records…</div>
        )}
        {filtered.map(tx => (
          <div 
            key={tx.id}
            onClick={() => setSelectedTx(tx)}
            className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                tx.type === 'POCHI' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' :
                tx.type === 'STK_PUSH' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30' :
                tx.type === 'PAYBILL' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30' :
                tx.type === 'B2B' ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30' :
                'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
              }`}>
                {tx.type}
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {tx.clientName || 'Client not listed'}
                  </span>
                  {tx.projectName && <span className="text-[11px] text-zinc-400 hidden sm:inline">&bull; {tx.projectName}</span>}
                </div>
                <div className="flex items-center gap-2 text-[10.5px] text-zinc-400 mt-0.5">
                  <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{tx.transId}</span>
                  <span>&middot;</span>
                  <span className="truncate">{formatLabel(tx.status)}</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 block text-sm">
                KES {tx.amount.toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-400">{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Date not provided'}</span>
            </div>
          </div>
        ))}

        {!loadError && !isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-zinc-400">
            {transactions.length === 0 ? 'No payment records yet.' : 'No records match your search.'}
          </div>
        )}
      </div>

      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-xs">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-900 dark:text-white font-sans">
                  Payment details
                </span>
              </div>
              <button 
                type="button"
                aria-label="Close payment details"
                onClick={() => setSelectedTx(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between items-center text-zinc-500 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span>Receipt: <strong className="text-zinc-900 dark:text-white">{selectedTx.transId}</strong></span>
                <strong className="text-zinc-900 dark:text-white text-sm">KES {selectedTx.amount.toLocaleString()}</strong>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-zinc-500">
                <div><dt>Client</dt><dd className="mt-1 text-zinc-900 dark:text-white">{selectedTx.clientName || 'Not listed'}</dd></div>
                <div><dt>Matter</dt><dd className="mt-1 text-zinc-900 dark:text-white">{selectedTx.projectName || 'Not listed'}</dd></div>
                <div><dt>Payment method</dt><dd className="mt-1 text-zinc-900 dark:text-white">{formatLabel(selectedTx.type)}</dd></div>
                <div><dt>Status</dt><dd className="mt-1 text-zinc-900 dark:text-white">{formatLabel(selectedTx.status)}</dd></div>
                <div><dt>Bill number</dt><dd className="mt-1 text-zinc-900 dark:text-white">{selectedTx.accountRef || 'Not listed'}</dd></div>
                <div><dt>Date</dt><dd className="mt-1 text-zinc-900 dark:text-white">{selectedTx.timestamp ? new Date(selectedTx.timestamp).toLocaleString() : 'Not provided'}</dd></div>
              </dl>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => void copyToClipboard(selectedTx.transId)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 text-zinc-700 dark:text-zinc-200 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy receipt number</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
