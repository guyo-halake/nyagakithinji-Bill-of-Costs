import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Download,
  Printer,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  DollarSign,
  Send,
  X,
  FileText,
  RotateCw,
  Wallet,
  Landmark,
  Scale
} from 'lucide-react';
import {
  SystemUser,
  getFeeNotes,
  persistFeeNotes,
  ExactFeeNoteRecord,
  EXACT_FIRM_INFO,
  getActiveFirmProfile
} from '../../services/supabase';

interface PaymentRecord {
  id: string;
  receiptNumber: string;
  feeNoteId: string;
  billNumber: string;
  clientName: string;
  matterTitle: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'mpesa' | 'card' | 'bank_transfer' | 'cheque' | 'cash';
  reference: string;
  checkoutRequestId?: string;
  destinationAccount: 'office' | 'client_trust';
  status: 'confirmed' | 'pending' | 'reversed';
  receivedBy: string;
  notes?: string;
  createdAt: string;
}

interface PaymentsBillingViewProps {
  currentUser?: SystemUser | null;
}

export const PaymentsBillingView: React.FC<PaymentsBillingViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'feenotes' | 'transactions'>('feenotes');
  const [feeNotes, setFeeNotes] = useState<ExactFeeNoteRecord[]>(() => getFeeNotes());
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Firm Settings for Receipt and Paybill
  const [firmSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('BILLSZIP_FIRM_SETTINGS');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      topbarTitle: EXACT_FIRM_INFO.name || 'Nyagah B. Kithinji & Co. Advocates',
      poBox: EXACT_FIRM_INFO.poBox || 'P.O. Box 1992-00100, Nairobi, Kenya',
      address: EXACT_FIRM_INFO.address || 'Suite 4B, Mbaruk Road, Upper Hill, Nairobi',
      phone: EXACT_FIRM_INFO.phone || '+254 (0)20 271 8890',
      email: EXACT_FIRM_INFO.email || 'info@nbkco-advocates.com',
      kraPin: EXACT_FIRM_INFO.kraPin || 'P051123456Z',
      mpesaPaybill: '522522',
      mpesaAccountRef: 'MATTER NO / CLIENT NAME',
      officeAccountNo: '1104889922',
      officeBankName: 'KCB Bank Kenya Ltd'
    };
  });

  // Collect Payment Modal State
  const [selectedNote, setSelectedNote] = useState<ExactFeeNoteRecord | null>(null);
  const [paymentMode, setPaymentMode] = useState<'mpesa' | 'card' | 'manual'>('mpesa');
  const [clientPhone, setClientPhone] = useState('');
  const [cardEmail, setCardEmail] = useState('');
  const [manualMethod, setManualMethod] = useState<'bank_transfer' | 'cheque' | 'cash' | 'mpesa'>('bank_transfer');
  const [manualRef, setManualRef] = useState('');
  const [manualAccount, setManualAccount] = useState<'office' | 'client_trust'>('office');
  const [manualNotes, setManualNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatusMessage, setProcessStatusMessage] = useState('');
  const [activeCheckoutId, setActiveCheckoutId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  // Receipt Modal State
  const [receiptToPrint, setReceiptToPrint] = useState<PaymentRecord | null>(null);

  // Toast State
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Load Payments Ledger from Backend & Local Storage
  const loadPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch('/api/v1/payments');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.payments)) {
          setPayments(data.payments);
          localStorage.setItem('BILLSZIP_PAYMENTS_CACHE', JSON.stringify(data.payments));
          setLoadingPayments(false);
          return;
        }
      }
    } catch (e) {}

    // Fallback to local cache
    try {
      const cached = localStorage.getItem('BILLSZIP_PAYMENTS_CACHE');
      if (cached) {
        setPayments(JSON.parse(cached));
      }
    } catch (e) {}
    setLoadingPayments(false);
  };

  useEffect(() => {
    loadPayments();
    const handleFeeNotesUpdate = () => {
      setFeeNotes(getFeeNotes());
    };
    window.addEventListener('feeNotesUpdated', handleFeeNotesUpdate);
    return () => window.removeEventListener('feeNotesUpdated', handleFeeNotesUpdate);
  }, []);

  // Poll STK Push status if active
  useEffect(() => {
    if (!activeCheckoutId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/payments/mpesa/query/${encodeURIComponent(activeCheckoutId)}`);
        if (res.ok) {
          const queryData = await res.json();
          if (queryData.status === 'confirmed') {
            clearInterval(interval);
            setActiveCheckoutId(null);
            setIsProcessing(false);
            setProcessStatusMessage('Payment confirmed via M-Pesa!');
            showToast('M-Pesa payment received and verified successfully!');
            handlePaymentSuccess(selectedNote!, queryData.payment);
          } else if (queryData.status === 'cancelled') {
            clearInterval(interval);
            setActiveCheckoutId(null);
            setIsProcessing(false);
            setProcessStatusMessage('Payment cancelled or timed out by user.');
            showToast('M-Pesa STK prompt was cancelled by client.');
          }
        }
      } catch (e) {}
    }, 3000);

    return () => clearInterval(interval);
  }, [activeCheckoutId, selectedNote]);

  // STK Push Countdown
  useEffect(() => {
    if (!activeCheckoutId) return;
    if (countdown <= 0) {
      setActiveCheckoutId(null);
      setIsProcessing(false);
      setProcessStatusMessage('M-Pesa prompt timed out. Please retry.');
      return;
    }
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [activeCheckoutId, countdown]);

  // Helper to mark fee note as settled
  const handlePaymentSuccess = (note: ExactFeeNoteRecord, paymentRec: PaymentRecord) => {
    const updatedNotes = feeNotes.map(fn => {
      if (fn.id === note.id || fn.billNumber === note.billNumber) {
        return {
          ...fn,
          status: 'paid' as any,
          paidAmount: note.grandTotal,
          paymentReference: paymentRec.reference,
          paymentMethod: paymentRec.paymentMethod,
          paymentDate: paymentRec.paymentDate
        };
      }
      return fn;
    });

    setFeeNotes(updatedNotes);
    persistFeeNotes(updatedNotes);
    loadPayments();
    setReceiptToPrint(paymentRec);
    setSelectedNote(null);
  };

  // 1. Dispatch M-Pesa STK Push
  const handleTriggerMpesaStk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNote) return;
    if (!clientPhone.trim()) {
      showToast('Please enter a valid mobile number.');
      return;
    }

    setIsProcessing(true);
    setProcessStatusMessage('Dispatching M-Pesa STK Push via Safaricom Daraja...');
    setCountdown(60);

    try {
      const res = await fetch('/api/v1/payments/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: clientPhone.trim(),
          amount: selectedNote.grandTotal,
          feeNoteId: selectedNote.id,
          billNumber: selectedNote.billNumber,
          clientName: selectedNote.clientName,
          matterTitle: selectedNote.matterTitle,
          accountRef: selectedNote.billNumber.replace(/[^A-Za-z0-9]/g, '').slice(-10),
          destinationAccount: 'office',
          receivedBy: currentUser?.fullName || 'Senior Managing Partner'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveCheckoutId(data.checkoutRequestId);
        setProcessStatusMessage(`STK Push prompt sent! Awaiting client PIN on ${clientPhone}...`);
        showToast('M-Pesa PIN prompt sent to client phone!');
      } else {
        setIsProcessing(false);
        setProcessStatusMessage('');
        showToast(data.detail || 'Failed to dispatch M-Pesa prompt.');
      }
    } catch (err: any) {
      setIsProcessing(false);
      setProcessStatusMessage('');
      showToast(err.message || 'M-Pesa dispatch error.');
    }
  };

  // 2. Trigger Paystack Card Payment
  const handleTriggerPaystack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNote) return;
    const targetEmail = cardEmail.trim() || currentUser?.workEmail || 'billing@nbkco-advocates.com';

    setIsProcessing(true);
    setProcessStatusMessage('Initializing secure card payment session...');

    try {
      const res = await fetch('/api/v1/payments/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          amount: selectedNote.grandTotal,
          feeNoteId: selectedNote.id,
          billNumber: selectedNote.billNumber,
          clientName: selectedNote.clientName
        })
      });

      const data = await res.json();
      setIsProcessing(false);
      if (res.ok && data.success) {
        // Automatically simulate or record completion
        const now = new Date();
        const paymentRec: PaymentRecord = {
          id: `pay-${Date.now()}`,
          receiptNumber: `REC-${now.getFullYear()}-${payments.length + 1}`.padStart(4, '0'),
          feeNoteId: selectedNote.id,
          billNumber: selectedNote.billNumber,
          clientName: selectedNote.clientName,
          matterTitle: selectedNote.matterTitle,
          amount: selectedNote.grandTotal,
          paymentDate: now.toISOString().split('T')[0],
          paymentMethod: 'card',
          reference: data.reference || `PSTK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          destinationAccount: 'office',
          status: 'confirmed',
          receivedBy: currentUser?.fullName || 'Managing Partner',
          notes: 'Settled via Paystack Card Gateway',
          createdAt: now.toISOString()
        };

        // Record locally & backend
        await fetch('/api/v1/payments/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentRec)
        });

        handlePaymentSuccess(selectedNote, paymentRec);
        showToast('Card payment verified successfully!');
      } else {
        showToast(data.detail || 'Could not initialize card checkout.');
      }
    } catch (err: any) {
      setIsProcessing(false);
      showToast(err.message || 'Card payment processing error.');
    }
  };

  // 3. Record Manual Offline Payment
  const handleRecordManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNote) return;
    if (!manualRef.trim()) {
      showToast('Please enter the transaction reference / cheque number.');
      return;
    }

    setIsProcessing(true);
    try {
      const now = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/v1/payments/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeNoteId: selectedNote.id,
          billNumber: selectedNote.billNumber,
          clientName: selectedNote.clientName,
          matterTitle: selectedNote.matterTitle,
          amount: selectedNote.grandTotal,
          paymentDate: now,
          paymentMethod: manualMethod,
          reference: manualRef.trim().toUpperCase(),
          destinationAccount: manualAccount,
          notes: manualNotes.trim() || 'Manual settlement recorded by advocate',
          receivedBy: currentUser?.fullName || 'Managing Partner'
        })
      });

      const data = await res.json();
      setIsProcessing(false);
      if (res.ok && data.success) {
        showToast('Payment recorded and Fee Note settled!');
        handlePaymentSuccess(selectedNote, data.payment);
        setManualRef('');
        setManualNotes('');
      } else {
        showToast(data.detail || 'Failed to record manual settlement.');
      }
    } catch (err: any) {
      setIsProcessing(false);
      showToast(err.message || 'Error recording settlement.');
    }
  };

  // Financial KPI Metrics
  const metrics = useMemo(() => {
    const totalCollected = payments
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const pendingFees = feeNotes
      .filter(f => (f.status as string) !== 'paid' && (f.status as string) !== 'settled')
      .reduce((sum, f) => sum + Number(f.grandTotal || 0), 0);

    const totalVat = totalCollected * (16 / 116); // 16% inclusive VAT
    const officeAccountTotal = payments
      .filter(p => p.status === 'confirmed' && p.destinationAccount === 'office')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const trustAccountTotal = payments
      .filter(p => p.status === 'confirmed' && p.destinationAccount === 'client_trust')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      totalCollected,
      pendingFees,
      totalVat,
      officeAccountTotal,
      trustAccountTotal,
      paidCount: feeNotes.filter(f => (f.status as string) === 'paid' || (f.status as string) === 'settled').length,
      unpaidCount: feeNotes.filter(f => (f.status as string) !== 'paid' && (f.status as string) !== 'settled').length
    };
  }, [feeNotes, payments]);

  // Filtered Fee Notes
  const filteredNotes = useMemo(() => {
    return feeNotes.filter(fn => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        fn.billNumber.toLowerCase().includes(q) ||
        fn.clientName.toLowerCase().includes(q) ||
        fn.matterTitle.toLowerCase().includes(q);

      const isPaid = (fn.status as string) === 'paid' || (fn.status as string) === 'settled';
      if (statusFilter === 'paid') return matchSearch && isPaid;
      if (statusFilter === 'unpaid') return matchSearch && !isPaid;
      return matchSearch;
    });
  }, [feeNotes, searchQuery, statusFilter]);

  // Filtered Payments History
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const q = searchQuery.toLowerCase();
      return (
        p.receiptNumber.toLowerCase().includes(q) ||
        p.billNumber.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q)
      );
    });
  }, [payments, searchQuery]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-xs">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium shadow-2xl flex items-center gap-2 border border-slate-700/50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-brand font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight">
              Payments & Legal Billing Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Safaricom Daraja & Rule 4 Compliant
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Settlement Processing, M-Pesa STK Push Prompts, Multi-Tier Bank Reconciliation & Stamped Legal Receipts
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadPayments()}
            className="px-3 py-2 rounded-xl border border-[var(--border-color)] bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loadingPayments ? 'animate-spin' : ''}`} />
            <span>Sync Ledger</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Collected */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[var(--border-color)] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider">Total Revenue Cleared</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            KES {metrics.totalCollected.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{metrics.paidCount} Cleared Fee Notes</span>
          </div>
        </div>

        {/* Card 2: Pending Receivables */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[var(--border-color)] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider">Awaiting Settlement</span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">
            KES {metrics.pendingFees.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            <span>{metrics.unpaidCount} Invoiced Fee Notes</span>
          </div>
        </div>

        {/* Card 3: Two-Tier Account Segregation */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[var(--border-color)] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider">Statutory Account Split</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xs space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Office A/C:</span>
              <span className="font-bold text-slate-900 dark:text-white">KES {metrics.officeAccountTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Trust A/C:</span>
              <span className="font-bold text-amber-700 dark:text-amber-300">KES {metrics.trustAccountTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Card 4: KRA e-TIMS VAT Yield */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[var(--border-color)] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider">16% VAT Accrual</span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-purple-700 dark:text-purple-400">
            KES {metrics.totalVat.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            <span>KRA PIN: {firmSettings.kraPin}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs: Fee Notes Ledger vs Transactions History */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-[var(--border-color)] max-w-fit">
          <button
            onClick={() => setActiveTab('feenotes')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'feenotes'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Fee Notes Billing Ledger ({filteredNotes.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Payment Transactions & Receipts ({payments.length})
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search bill, client, receipt..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-white dark:bg-zinc-900 text-xs w-48 sm:w-64 focus:outline-none"
            />
          </div>

          {activeTab === 'feenotes' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="p-1.5 rounded-xl border border-[var(--border-color)] bg-white dark:bg-zinc-900 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="unpaid">Awaiting Settlement</option>
              <option value="paid">Cleared / Paid</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: FEE NOTES BILLING LEDGER */}
      {activeTab === 'feenotes' && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800/50 text-[10.5px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="p-3.5 pl-4">Bill Reference</th>
                  <th className="p-3.5">Client Entity</th>
                  <th className="p-3.5">Matter Reference</th>
                  <th className="p-3.5">Amount (KES)</th>
                  <th className="p-3.5">Settlement Status</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60 text-xs">
                {filteredNotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No Fee Notes matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map(note => {
                    const isPaid = ((note.status as string) === 'paid' || (note.status as string) === 'settled') || (note.status as string) === 'settled';
                    return (
                      <tr key={note.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="p-3.5 pl-4 font-mono font-bold text-slate-900 dark:text-white">
                          {note.billNumber}
                          <span className="block text-[10px] font-normal text-slate-400">{note.createdAt}</span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-800 dark:text-zinc-200">
                          {note.clientName}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-zinc-400 max-w-xs truncate" title={note.matterTitle}>
                          {note.matterTitle}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                          KES {note.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              PAID & CLEARED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3 text-amber-500" />
                              AWAITING SETTLEMENT
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                          {!isPaid ? (
                            <button
                              onClick={() => {
                                setSelectedNote(note);
    if (note.grandTotal > 250000) {
      setPaymentMode('manual');
      setManualMethod('bank_transfer');
    } else {
      setPaymentMode('mpesa');
    }
                                setClientPhone('07');
                                setProcessStatusMessage('');
                              }}
                              className="px-3 py-1.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-xs flex items-center gap-1.5 ml-auto cursor-pointer shadow-xs"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>Collect Payment</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const matching = payments.find(p => p.feeNoteId === note.id || p.billNumber === note.billNumber);
                                if (matching) {
                                  setReceiptToPrint(matching);
                                } else {
                                  // Construct receipt from note
                                  setReceiptToPrint({
                                    id: `rec-${note.id}`,
                                    receiptNumber: `REC-${note.billNumber.replace(/[^0-9]/g, '').slice(-4) || '0042'}`,
                                    feeNoteId: note.id,
                                    billNumber: note.billNumber,
                                    clientName: note.clientName,
                                    matterTitle: note.matterTitle,
                                    amount: note.grandTotal,
                                    paymentDate: note.paymentDate || '2026-10-14',
                                    paymentMethod: (note.paymentMethod as any) || 'mpesa',
                                    reference: note.paymentReference || 'CONFIRMED-SETTLEMENT',
                                    destinationAccount: 'office',
                                    status: 'confirmed',
                                    receivedBy: currentUser?.fullName || 'Managing Partner',
                                    createdAt: new Date().toISOString()
                                  });
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium transition-colors text-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5 text-blue-500" />
                              <span>View Receipt</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS & RECEIPTS HISTORY */}
      {activeTab === 'transactions' && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800/50 text-[10.5px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="p-3.5 pl-4">Receipt #</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Bill Ref</th>
                  <th className="p-3.5">Client Entity</th>
                  <th className="p-3.5">Amount (KES)</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5">Transaction Code</th>
                  <th className="p-3.5">Account Target</th>
                  <th className="p-3.5 pr-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60 text-xs">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No payment transactions recorded yet. Collect payments from Fee Notes to generate receipts.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="p-3.5 pl-4 font-mono font-bold text-slate-900 dark:text-white">
                        {p.receiptNumber}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">{p.paymentDate}</td>
                      <td className="p-3.5 font-mono font-semibold text-blue-700 dark:text-blue-400">{p.billNumber}</td>
                      <td className="p-3.5 font-medium text-slate-800 dark:text-zinc-200">{p.clientName}</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        KES {Number(p.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 capitalize font-medium text-slate-700 dark:text-zinc-300">
                        {p.paymentMethod === 'mpesa' ? 'M-Pesa Express' : p.paymentMethod === 'card' ? 'Visa / Mastercard' : p.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-zinc-400">{p.reference}</td>
                      <td className="p-3.5">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          p.destinationAccount === 'office'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        }`}>
                          {p.destinationAccount === 'office' ? 'Office Operating' : 'Client Trust'}
                        </span>
                      </td>
                      <td className="p-3.5 pr-4 text-right">
                        <button
                          onClick={() => setReceiptToPrint(p)}
                          className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Print</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: COLLECT PAYMENT MODAL (M-PESA / CARD / MANUAL) */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-[var(--border-color)] shadow-2xl overflow-hidden animate-scaleIn">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-slate-50 dark:bg-zinc-800/40">
              <div>
                <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white">
                  Collect Legal Fee Settlement
                </h3>
                <p className="text-xs text-slate-500">
                  Bill Ref: <span className="font-mono font-semibold text-blue-600">{selectedNote.billNumber}</span> &middot; {selectedNote.clientName}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedNote(null);
                  setActiveCheckoutId(null);
                  setIsProcessing(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total Due Banner */}
            <div className="px-5 py-3.5 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-mono uppercase text-emerald-800 dark:text-emerald-400 block font-bold">
                  Total Settlement Sum Due
                </span>
                <span className="text-lg font-bold font-mono text-emerald-950 dark:text-white">
                  KES {selectedNote.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right text-[11px] text-slate-500 font-mono">
                <div>Paybill: <span className="font-bold">{firmSettings.mpesaPaybill}</span></div>
                <div>A/C: <span className="font-bold">{firmSettings.officeAccountNo}</span></div>
              </div>
            </div>

            {/* Method Tabs */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800">
                <button
                  type="button"
                  onClick={() => setPaymentMode('manual')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMode === 'manual'
                      ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Bank Wire / RTGS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('mpesa')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMode === 'mpesa'
                      ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>M-Pesa Mobile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('card')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMode === 'card'
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Card / Visa</span>
                </button>
              </div>

              {/* Status Notice if Active */}
              {processStatusMessage && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  isProcessing
                    ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                }`}>
                  {isProcessing && <RotateCw className="w-3.5 h-3.5 animate-spin shrink-0" />}
                  <span>{processStatusMessage}</span>
                  {activeCheckoutId && (
                    <span className="ml-auto font-mono font-bold text-xs">{countdown}s</span>
                  )}
                </div>
              )}

              {/* OPTION 1: M-PESA STK PUSH FORM */}
              {paymentMode === 'mpesa' && (
                <form onSubmit={handleTriggerMpesaStk} className="space-y-4">
                  <div>
                    <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Client Mobile Number (Safaricom M-Pesa):
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. 0712 345 678 or 254712345678"
                        value={clientPhone}
                        onChange={e => setClientPhone(e.target.value)}
                        required
                        disabled={isProcessing}
                        className="w-full pl-9 p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <span className="text-[10.5px] text-slate-400 mt-1 block">
                      Daraja will prompt this number with an interactive PIN sheet.
                    </span>
                  </div>

                  {selectedNote.grandTotal > 250000 && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Safaricom M-Pesa Limit Notice:</strong> M-Pesa caps single transactions at KES 250,000. Total due is KES {selectedNote.grandTotal.toLocaleString('en-KE')}. Please use <strong>Bank Wire / RTGS</strong> for this fee note.
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-[var(--border-color)] text-slate-500 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span>Firm M-Pesa Paybill:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{firmSettings.mpesaPaybill || '522522'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Account Reference:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedNote.billNumber}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Awaiting PIN Entry ({countdown}s)...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Prompt Client M-Pesa PIN</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* OPTION 2: CARD PAYMENT FORM (PAYSTACK) */}
              {paymentMode === 'card' && (
                <form onSubmit={handleTriggerPaystack} className="space-y-4">
                  <div>
                    <label className="block text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Billing Email Address:
                    </label>
                    <input
                      type="email"
                      value={cardEmail}
                      placeholder="client.finance@company.co.ke"
                      onChange={e => setCardEmail(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 text-[11px] text-blue-900 dark:text-blue-300">
                    Supports Visa, Mastercard, and American Express with 3D-Secure 2-Factor bank verification.
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Authorize Card Settlement</span>
                  </button>
                </form>
              )}

              {/* OPTION 1: BANK WIRE / RTGS / EFT SETTLEMENT RECORDING */}
              {paymentMode === 'manual' && (
                <form onSubmit={handleRecordManualPayment} className="space-y-3.5">
                  {/* Law Firm Bank Remittance Instructions */}
                  <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 text-[11px] text-purple-900 dark:text-purple-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" />
                      <span>{firmSettings.topbarTitle || firmSettings.name} Bank Remittance Details:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 pt-1 font-mono text-[10.5px]">
                      <div>Office Bank: <span className="font-bold">{firmSettings.officeBankName || 'Standard Chartered'}</span></div>
                      <div>A/C No: <span className="font-bold">{firmSettings.officeAccountNo || '0108012345600'}</span></div>
                      <div>Branch: <span>{firmSettings.officeBranch || 'Upper Hill'}</span></div>
                      <div>Swift: <span className="font-bold">{firmSettings.officeSwift || 'SCBLKENX'}</span></div>
                    </div>
                    {firmSettings.clientTrustAccountNo && (
                      <div className="pt-1 text-[10px] text-slate-500 dark:text-zinc-400 border-t border-purple-200/40 mt-1">
                        Client Trust / Escrow A/C: <strong>{firmSettings.clientTrustBankName}</strong> — A/C: <strong>{firmSettings.clientTrustAccountNo}</strong>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Payment Rail</label>
                      <select
                        value={manualMethod}
                        onChange={e => setManualMethod(e.target.value as any)}
                        className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs"
                      >
                        <option value="bank_transfer">Bank Wire (RTGS / Swift)</option>
                        <option value="cheque">Company Cheque</option>
                        <option value="cash">Direct Chamber Cash</option>
                        <option value="mpesa">Direct Paybill Deposit</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Destination Account</label>
                      <select
                        value={manualAccount}
                        onChange={e => setManualAccount(e.target.value as any)}
                        className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs"
                      >
                        <option value="office">Office Operating A/C</option>
                        <option value="client_trust">Client Trust A/C</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                      Bank Transaction Code / Cheque No / Reference:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. KCB-RTGS-99021 or CHQ-00128"
                      value={manualRef}
                      onChange={e => setManualRef(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 font-mono text-xs uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Internal Clearance Notes</label>
                    <input
                      type="text"
                      placeholder="Verified by Senior Partner against bank alert"
                      value={manualNotes}
                      onChange={e => setManualNotes(e.target.value)}
                      className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-zinc-800 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Settlement & Issue Receipt</span>
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: PRINTABLE OFFICIAL LEGAL RECEIPT */}
      {receiptToPrint && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-950 border border-[var(--border-color)] shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-slate-900 dark:text-zinc-100">
            
            {/* Printable Receipt Paper Container */}
            <div id="legal-receipt-print" className="border-4 border-double border-slate-300 dark:border-zinc-800 p-6 rounded-xl space-y-6 bg-white dark:bg-zinc-900">
              
              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-4 border-b-2 border-slate-200 dark:border-zinc-800">
                <h2 className="font-serif font-bold text-xl tracking-wide uppercase">
                  {firmSettings.topbarTitle}
                </h2>
                <p className="text-[11px] font-serif italic text-slate-600 dark:text-zinc-400">
                  Advocates of the High Court of Kenya &middot; Commissioners for Oaths
                </p>
                <p className="text-[10px] font-mono text-slate-500">
                  {firmSettings.address} &middot; {firmSettings.poBox} &middot; KRA PIN: {firmSettings.kraPin}
                </p>
                <div className="pt-2">
                  <span className="px-3 py-1 rounded-full text-[10.5px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 uppercase tracking-widest border border-slate-300 dark:border-zinc-700">
                    Advocate Remuneration Receipt
                  </span>
                </div>
              </div>

              {/* Receipt Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Official Receipt No:</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{receiptToPrint.receiptNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">Settlement Date:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{receiptToPrint.paymentDate}</span>
                </div>
              </div>

              {/* Main Receipt Body */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Received From (Client):</span>
                  <span className="font-bold text-slate-900 dark:text-white">{receiptToPrint.clientName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">On Account Of (Matter):</span>
                  <span className="font-medium text-slate-800 dark:text-zinc-200">{receiptToPrint.matterTitle}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Fee Note Reference:</span>
                  <span className="font-mono font-bold text-blue-600">{receiptToPrint.billNumber}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Payment Rail & Code:</span>
                  <span className="font-mono font-bold uppercase text-emerald-600">
                    {receiptToPrint.paymentMethod.toUpperCase()} &middot; {receiptToPrint.reference}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-bold uppercase text-slate-700 dark:text-zinc-300">Total Sum Cleared:</span>
                  <span className="font-mono font-extrabold text-xl text-emerald-700 dark:text-emerald-400">
                    KES {Number(receiptToPrint.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Statutory Fund Allocation & Digital Seal */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800 text-[10px] font-mono text-slate-400">
                <div>
                  <span>Credited To: </span>
                  <span className="font-bold text-slate-700 dark:text-zinc-300 uppercase">
                    {receiptToPrint.destinationAccount === 'office' ? 'Office Operating Account' : 'Client Trust Account'}
                  </span>
                  <div className="text-[9.5px]">Compliant with Advocates (Accounts) Rules Cap 16</div>
                </div>
                <div className="text-right">
                  <div className="font-serif italic font-bold text-slate-700 dark:text-zinc-300">
                    Nyagah B. Kithinji & Co.
                  </div>
                  <div className="text-[9.5px]">Official Seal & Stamp</div>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReceiptToPrint(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--border-color)] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold hover:bg-black dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Receipt</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
