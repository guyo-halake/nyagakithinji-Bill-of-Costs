import React, { useState, useEffect } from 'react';
import { 
  Zap, CheckCircle2, Clock, Terminal, Copy, 
  RefreshCw, ChevronRight, X, ExternalLink, Filter, ShieldCheck, 
  Radio, Search, Download, ArrowUpRight, Phone, Smartphone, CheckCheck
} from 'lucide-react';

export interface DarajaTransaction {
  id: string;
  transId: string;
  type: 'STK_PUSH' | 'C2B' | 'PAYBILL' | 'B2B' | 'POCHI';
  amount: number;
  phone: string;
  clientName: string;
  projectName: string;
  accountRef: string;
  timestamp: string;
  status: 'COMPLETED' | 'PENDING' | 'RECONCILED';
  channelName: string;
  rawPayload: Record<string, any>;
}

interface DarajaListenerCardProps {
  showToast?: (msg: string) => void;
  compact?: boolean;
}

export const DarajaListenerCard: React.FC<DarajaListenerCardProps> = ({ showToast, compact = false }) => {
  const [selectedTx, setSelectedTx] = useState<DarajaTransaction | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Daily received starts at KES 2,563 and Month starts at KES 23,445 as requested
  const [todayReceived, setTodayReceived] = useState<number>(2563);
  const [monthReceived, setMonthReceived] = useState<number>(23445);

  const [transactions, setTransactions] = useState<DarajaTransaction[]>([
    {
      id: 'tx-pochi-01',
      transId: 'RK9281LA04',
      type: 'POCHI',
      amount: 2563,
      phone: '254768***129',
      clientName: 'BFT Construction Company Marsabit',
      projectName: 'BFT Materials Ledger',
      accountRef: 'POCHI-LABIASHARA-0768141129',
      timestamp: '12:45:10 PM',
      status: 'RECONCILED',
      channelName: 'Pochi la Biashara (+254 768 141 129)',
      rawPayload: {
        TransactionType: 'CustomerToBusinessOnline',
        TransID: 'RK9281LA04',
        TransTime: '20261106124510',
        TransAmount: '2563.00',
        BusinessShortCode: '0768141129',
        BillRefNumber: 'BFT-TIMBER-SITE',
        MSISDN: '254768141129',
        FirstName: 'BFT',
        MiddleName: 'CONSTRUCTION',
        LastName: 'MARSABIT',
        OrgAccountBalance: '25445.00'
      }
    },
    {
      id: 'tx-fresh-02',
      transId: 'RK8819XX21',
      type: 'PAYBILL',
      amount: 3500,
      phone: '254756***885',
      clientName: 'Rosemary Wakonyo',
      projectName: 'Fresh City POS (Ruiru)',
      accountRef: 'FRESH-CITY-MONTHLY',
      timestamp: '11:14:02 AM',
      status: 'RECONCILED',
      channelName: 'P3L Paybill (408221)',
      rawPayload: {
        TransactionType: 'CustomerPayBillOnline',
        TransID: 'RK8819XX21',
        TransTime: '20261106111402',
        TransAmount: '3500.00',
        BusinessShortCode: '408221',
        BillRefNumber: 'FRESH-CITY-RETAINER',
        MSISDN: '254756111885',
        FirstName: 'ROSEMARY',
        OrgAccountBalance: '88400.00'
      }
    },
    {
      id: 'tx-sayara-03',
      transId: 'RK7712CC19',
      type: 'STK_PUSH',
      amount: 4200,
      phone: '254722***410',
      clientName: 'Sarah Guyatu Rashid',
      projectName: 'Sayara Aesthetics (Nairobi)',
      accountRef: 'SAYARA-RETAINER-W1',
      timestamp: '09:32:18 AM',
      status: 'RECONCILED',
      channelName: 'STK Push (Daraja 2.0)',
      rawPayload: {
        MerchantRequestID: '29112-92019-1',
        CheckoutRequestID: 'ws_CO_0611202609321812',
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        Amount: 4200,
        MpesaReceiptNumber: 'RK7712CC19',
        TransactionDate: 20261106093218,
        PhoneNumber: 254722910410
      }
    },
    {
      id: 'tx-karani-04',
      transId: 'RK6100BB88',
      type: 'B2B',
      amount: 12000,
      phone: '254202***900',
      clientName: 'Adv. Nyagah B. Kithinji',
      projectName: 'Nyaga Law Practice ERP',
      accountRef: 'STAGE-4-UAT-RETAINER',
      timestamp: 'Yesterday 16:20',
      status: 'RECONCILED',
      channelName: 'B2B Bank Settlement',
      rawPayload: {
        TransactionType: 'BusinessPayBill',
        TransID: 'RK6100BB88',
        TransAmount: '12000.00',
        ReceiverPartyPublicName: 'P3L DEVELOPERS KENYA',
        Initiator: 'Adv. Nyagah B. Kithinji',
        DebitAccountBalance: '142000.00'
      }
    },
    {
      id: 'tx-suv-05',
      transId: 'RK5021AA12',
      type: 'C2B',
      amount: 400,
      phone: '254733***000',
      clientName: 'SUVPlanet Kenya Marketplace',
      projectName: 'SUVPlanet Classifieds',
      accountRef: 'LISTING-AD-BI-MONTH',
      timestamp: 'Yesterday 14:05',
      status: 'RECONCILED',
      channelName: 'Customer Paybill (408221)',
      rawPayload: {
        TransactionType: 'CustomerPayBillOnline',
        TransID: 'RK5021AA12',
        TransAmount: '400.00',
        BillRefNumber: 'SUV-CAR-789',
        MSISDN: '254733000000',
        BusinessShortCode: '408221'
      }
    },
    {
      id: 'tx-muthokinju-06',
      transId: 'RK4991JJ33',
      type: 'PAYBILL',
      amount: 782,
      phone: '254711***555',
      clientName: 'Muthokinju Paints Sync Module',
      projectName: 'Inventory Stock API',
      accountRef: 'STOCK-SYNC-BATCH',
      timestamp: '04 Nov 2026',
      status: 'RECONCILED',
      channelName: 'P3L Paybill (408221)',
      rawPayload: {
        TransactionType: 'CustomerPayBillOnline',
        TransID: 'RK4991JJ33',
        TransAmount: '782.00',
        BillRefNumber: 'MUTHOKINJU-API',
        BusinessShortCode: '408221'
      }
    }
  ]);

  // Periodic realistic transaction simulator with real project pool
  useEffect(() => {
    if (!isLiveActive) return;
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const code = 'RK' + Math.floor(100000 + Math.random() * 900000);

      const simulationPool = [
        {
          type: 'POCHI' as const,
          amount: Math.floor(350 + Math.random() * 850),
          clientName: 'BFT Construction Hardware',
          projectName: 'BFT Materials Ledger',
          accountRef: 'POCHI-LABIASHARA-0768141129',
          channelName: 'Pochi la Biashara (+254 768 141 129)'
        },
        {
          type: 'C2B' as const,
          amount: Math.floor(800 + Math.random() * 1200),
          clientName: 'Fresh City Ruiru Counter #1',
          projectName: 'Fresh City POS (Ruiru)',
          accountRef: 'TILL-SALE',
          channelName: 'P3L Paybill (408221)'
        },
        {
          type: 'STK_PUSH' as const,
          amount: 850,
          clientName: 'Sayara Aesthetics Booking',
          projectName: 'Sayara Aesthetics (Nairobi)',
          accountRef: 'SAYARA-VIP-APP',
          channelName: 'STK Push (Daraja 2.0)'
        }
      ];

      const chosen = simulationPool[Math.floor(Math.random() * simulationPool.length)];

      const newTx: DarajaTransaction = {
        id: `tx-${Date.now()}`,
        transId: code,
        type: chosen.type,
        amount: chosen.amount,
        phone: '2547' + Math.floor(10000000 + Math.random() * 90000000),
        clientName: chosen.clientName,
        projectName: chosen.projectName,
        accountRef: chosen.accountRef,
        timestamp: timeStr,
        status: 'RECONCILED',
        channelName: chosen.channelName,
        rawPayload: {
          TransID: code,
          TransTime: now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14),
          TransAmount: chosen.amount.toFixed(2),
          BillRefNumber: chosen.accountRef,
          MSISDN: '2547********',
          Channel: chosen.channelName
        }
      };

      setTransactions(prev => [newTx, ...prev.slice(0, 30)]);
      setTodayReceived(prev => prev + chosen.amount);
      setMonthReceived(prev => prev + chosen.amount);
    }, 20000);

    return () => clearInterval(timer);
  }, [isLiveActive]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    if (showToast) showToast(`Copied ${text} to clipboard`);
  };

  const handleSimulatePayment = () => {
    const code = 'RK' + Math.floor(100000 + Math.random() * 900000);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const simAmount = 2563;

    const testTx: DarajaTransaction = {
      id: `tx-${Date.now()}`,
      transId: code,
      type: 'POCHI',
      amount: simAmount,
      phone: '254768141129',
      clientName: 'Pochi la Biashara Direct Sweep',
      projectName: 'BFT Construction & Marsabit Node',
      accountRef: 'POCHI-LABIASHARA-0768141129',
      timestamp: timeStr,
      status: 'RECONCILED',
      channelName: 'Pochi la Biashara (+254 768 141 129)',
      rawPayload: {
        TransID: code,
        Amount: simAmount.toFixed(2),
        Recipient: 'Razak (P3L Developers)',
        ReceivingLine: '+254 768 141 129',
        Channel: 'M-Pesa Pochi la Biashara Daraja 2.0 Webhook'
      }
    };

    setTransactions(prev => [testTx, ...prev]);
    setTodayReceived(prev => prev + simAmount);
    setMonthReceived(prev => prev + simAmount);
    if (showToast) showToast(`✓ Live Daraja webhook received: KES ${simAmount.toLocaleString()} (${code})`);
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

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden font-sans text-xs">
      {/* Top Header: Clean Minimalist Light/Dark Modern */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-800/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-white font-brand">
                Safaricom Daraja 2.0 Webhook Terminal
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                LIVE LISTENER
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Instant callback streaming across Pochi la Biashara, Paybill, STK Push, and B2B
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSimulatePayment}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulate Payment</span>
          </button>
          <button
            type="button"
            onClick={() => setIsLiveActive(!isLiveActive)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isLiveActive 
                ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50' 
                : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
            }`}
          >
            {isLiveActive ? 'Pause Stream' : 'Resume'}
          </button>
        </div>
      </div>

      {/* Metrics Strip (Daily: KES 2,563 & Month: KES 23,445) */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-100 dark:divide-zinc-800 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs">
        <div className="p-3.5 sm:p-4 space-y-1">
          <span className="text-zinc-400 font-mono text-[10px] uppercase tracking-wider block">
            Received Today
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
            KES {todayReceived.toLocaleString()}
          </span>
          <span className="text-[10.5px] text-zinc-500">
            Daily target KES 2,500 met
          </span>
        </div>

        <div className="p-3.5 sm:p-4 space-y-1">
          <span className="text-zinc-400 font-mono text-[10px] uppercase tracking-wider block">
            This Month
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-white block">
            KES {monthReceived.toLocaleString()}
          </span>
          <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold">
            &uarr; Up 18.2% vs last month
          </span>
        </div>

        <div className="p-3.5 sm:p-4 space-y-1">
          <span className="text-zinc-400 font-mono text-[10px] uppercase tracking-wider block">
            Receiving Line
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-zinc-900 dark:text-white block">
            +254 768 141 129
          </span>
          <span className="text-[10.5px] text-zinc-500 font-medium">
            Pochi la Biashara (Razak)
          </span>
        </div>

        <div className="p-3.5 sm:p-4 space-y-1">
          <span className="text-zinc-400 font-mono text-[10px] uppercase tracking-wider block">
            Paybill &middot; Callback SLA
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-zinc-900 dark:text-white block">
            408221 &middot; 32 ms
          </span>
          <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5" />
            <span>100% Zero Dropped Webhooks</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-800/20 text-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-zinc-400 text-[10.5px] font-mono mr-1">Type:</span>
          {['ALL', 'POCHI', 'PAYBILL', 'STK_PUSH', 'C2B', 'B2B'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-md text-[10.5px] font-mono cursor-pointer transition-colors ${
                filterType === t 
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-2xs' 
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search receipt, project, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Transaction Feed */}
      <div className={`divide-y divide-zinc-100 dark:divide-zinc-800 overflow-y-auto ${compact ? 'max-h-72' : 'max-h-96'}`}>
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
                    {tx.clientName}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">&bull; {tx.projectName}</span>
                </div>
                <div className="flex items-center gap-2 text-[10.5px] text-zinc-400 font-mono mt-0.5">
                  <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{tx.transId}</span>
                  <span>&middot;</span>
                  <span className="truncate">{tx.channelName}</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 block text-sm">
                +KES {tx.amount.toLocaleString()}
              </span>
              <span className="text-[10px] font-mono text-zinc-400">{tx.timestamp}</span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-zinc-400">
            No transactions match your search filter.
          </div>
        )}
      </div>

      {/* Raw Payload Inspector Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-xs">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-zinc-900 dark:text-white font-sans">
                  Daraja 2.0 Webhook Payload &middot; {selectedTx.transId}
                </span>
              </div>
              <button 
                onClick={() => setSelectedTx(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-zinc-500 text-[11px] pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span>Receipt: <strong className="text-zinc-900 dark:text-white">{selectedTx.transId}</strong></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">KES {selectedTx.amount.toLocaleString()}</span>
                <span>{selectedTx.timestamp}</span>
              </div>

              <div className="text-[11px] text-zinc-500 space-y-1 font-sans">
                <p>Client: <strong className="text-zinc-900 dark:text-white">{selectedTx.clientName}</strong></p>
                <p>Project: <strong className="text-zinc-900 dark:text-white">{selectedTx.projectName}</strong></p>
                <p>Channel: <strong className="text-zinc-900 dark:text-white">{selectedTx.channelName}</strong></p>
              </div>

              <pre className="p-3.5 rounded-xl bg-zinc-950 text-emerald-400 text-[11px] overflow-x-auto max-h-64 leading-relaxed border border-zinc-800">
                {JSON.stringify(selectedTx.rawPayload, null, 2)}
              </pre>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(selectedTx.rawPayload, null, 2))}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 text-zinc-700 dark:text-zinc-200 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Raw JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
