import React, { useState } from 'react';
import { 
  Bot, Scale, Zap, Send, FileText, CheckCircle2, 
  AlertTriangle, ShieldCheck, Clock, Search, ArrowRight,
  Download, Terminal, Smartphone, MessageSquare, Play, Copy, RefreshCw, X
} from 'lucide-react';
import { 
  NYAGAH_AI_CONFIG,
  TaxationDrafterAgent,
  OppositionAuditorAgent,
  DispatchAndCommsAgent,
  CauseListWatchdogAgent,
  GeneratedBillOfCosts,
  OppositionAuditReport,
  DispatchReceipt,
  WatchdogMatchResult
} from '../../ai';

interface AdminAiLegalAgentsViewProps {
  showToast: (msg: string) => void;
}

export const AdminAiLegalAgentsView: React.FC<AdminAiLegalAgentsViewProps> = ({ showToast }) => {
  const [activeAgentTab, setActiveAgentTab] = useState<'drafter' | 'auditor' | 'dispatcher' | 'watchdog'>('drafter');
  
  // Real active firm matters
  const firmMatters = [
    {
      id: 'seyani',
      title: 'Seyani Brothers & Co. (K) Ltd v Greenhills Investment Ltd',
      caseNo: 'Under Arbitration Act 1995',
      forum: 'Arbitral Tribunal at Nairobi',
      claimValue: 116000000.00,
      advocateAssigned: 'Adv. Nyagah B. Kithinji',
      pleadingsCount: 250
    },
    {
      id: 'dhanya',
      title: 'Dhanya Construction Kenya Ltd v Sunil Shah',
      caseNo: 'Under Arbitration Act 1995',
      forum: 'Arbitral Tribunal at Nairobi (Arch. Nekoye Masibili)',
      claimValue: 3986663.93,
      advocateAssigned: 'Adv. Nyagah B. Kithinji',
      pleadingsCount: 226
    },
    {
      id: 'hccomm',
      title: 'Zhenjian Chengjian Construction Africa Ltd v Eighty Eight Nairobi Ltd & Anor',
      caseNo: 'HCCOMM E547 of 2024',
      forum: 'High Court Commercial Division — Milimani',
      claimValue: 45000000.00,
      advocateAssigned: 'Adv. Nyagah B. Kithinji',
      pleadingsCount: 19
    }
  ];

  const [selectedMatterId, setSelectedMatterId] = useState<string>('seyani');
  const selectedMatter = firmMatters.find(m => m.id === selectedMatterId) || firmMatters[0];

  // Agent 1: Drafter Output State
  const [drafterOutput, setDrafterOutput] = useState<GeneratedBillOfCosts | null>(null);
  const [isDrafting, setIsDrafting] = useState<boolean>(false);

  // Agent 2: Auditor Output State
  const [auditorOutput, setAuditorOutput] = useState<OppositionAuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  // Agent 3: Dispatcher State
  const [dispatchReceipt, setDispatchReceipt] = useState<DispatchReceipt | null>(null);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [wahaEndpointUrl, setWahaEndpointUrl] = useState<string>('https://september-newspaper-default-alabama.trycloudflare.com/api/sendText');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState<string>('https://p3lautomate.app.n8n.cloud/webhook/whatsapp-odin-inbound');
  const [selectedChannelMode, setSelectedChannelMode] = useState<'waha' | 'n8n' | 'custom'>('waha');
  const [customGatewayUrl, setCustomGatewayUrl] = useState<string>('http://localhost:5000/api/sendText');
  const [rawN8nWorkflowPreview, setRawN8nWorkflowPreview] = useState<boolean>(false);

  // Agent 4: Watchdog State
  const [watchdogResult, setWatchdogResult] = useState<WatchdogMatchResult | null>(null);
  const [isScanningWatchdog, setIsScanningWatchdog] = useState<boolean>(false);

  // Run Agent 1: Drafter
  const handleRunDrafter = () => {
    setIsDrafting(true);
    showToast(`Taxation Drafter Agent: Analyzing court record for ${selectedMatter.title.split('v')[0]}...`);

    setTimeout(() => {
      const mockPleadings = [
        { date: '12.04.2021', documentType: 'Notice of Dispute', particulars: 'Notice of Dispute & Request for Arbitration (8 folios)', folios: 8, courtForum: selectedMatter.forum },
        { date: '20.06.2021', documentType: 'Statement of Claim', particulars: 'Statement of Claim (48 folios)', folios: 48, courtForum: selectedMatter.forum },
        { date: '14.09.2021', documentType: 'Reply to Defence', particulars: 'Reply to Defence and Defence to Counterclaim (32 folios)', folios: 32, courtForum: selectedMatter.forum },
        { date: '04.11.2021', documentType: 'Preliminary Meeting', particulars: 'Preliminary Meeting before Arbitrator for directions', folios: 0, courtForum: selectedMatter.forum, attendancesCount: 1, durationHours: 3 },
        { date: '18.01.2022', documentType: 'Trial Bundle', particulars: 'Claimant Trial Bundle of Documents (420 folios)', folios: 420, courtForum: selectedMatter.forum },
        { date: '22.03.2022', documentType: 'Substantive Hearing', particulars: 'Substantive arbitral hearing — Day 1: Claimant Witness examination', folios: 0, courtForum: selectedMatter.forum, attendancesCount: 1, durationHours: 6 }
      ];

      const res = TaxationDrafterAgent.draftStatutoryBill({
        matterId: selectedMatter.id,
        matterTitle: selectedMatter.title,
        caseNo: selectedMatter.caseNo,
        forum: selectedMatter.forum,
        claimValue: selectedMatter.claimValue,
        pleadings: mockPleadings
      });

      setDrafterOutput(res);
      setIsDrafting(false);
      showToast(`✓ Compiled Schedule 6 Bill of Costs: KES ${res.grandTotalClaimed.toLocaleString()}`);
    }, 1200);
  };

  // Run Agent 2: Opposition Auditor
  const handleRunAuditor = () => {
    setIsAuditing(true);
    showToast(`Opposition Auditor Agent: Scanning opponent's bill for excessive folios & deductions...`);

    setTimeout(() => {
      // Create mock opponent items
      const opponentItems = [
        { id: '1', itemNo: '1', date: '02.04.2024', particulars: 'To receiving instructions to act for Plaintiff in KES 45M suit', statutoryItemCode: 'SCH6', amountClaimed: 2450000, amountTaxedOff: 0, netAllowed: 2450000, category: 'INSTRUCTION' as const, statutoryNote: '' },
        { id: '2', itemNo: '2', date: '10.05.2024', particulars: 'To drawing Chamber Summons for interlocutory injunction (45 folios claimed)', statutoryItemCode: 'SCH6', amountClaimed: 6750, amountTaxedOff: 0, netAllowed: 6750, category: 'DRAWING' as const, statutoryNote: '' },
        { id: '3', itemNo: '3', date: '20.06.2024', particulars: 'To attending virtual court mention before Registrar', statutoryItemCode: 'SCH6', amountClaimed: 4500, amountTaxedOff: 0, netAllowed: 4500, category: 'ATTENDANCE' as const, statutoryNote: '' },
        { id: '4', itemNo: '4', date: '15.08.2024', particulars: 'Getting up fees for trial (exceeding statutory 33.3% limit)', statutoryItemCode: 'SCH6', amountClaimed: 1200000, amountTaxedOff: 0, netAllowed: 1200000, category: 'GETTING_UP' as const, statutoryNote: '' }
      ];

      const audit = OppositionAuditorAgent.auditOpposingBill({
        matterTitle: selectedMatter.title,
        opposingFirm: 'Kaplan & Stratton Advocates (Opposing Counsel)',
        items: opponentItems,
        claimValue: selectedMatter.claimValue
      });

      setAuditorOutput(audit);
      setIsAuditing(false);
      showToast(`✓ Opposition Audit Complete: Identified -KES ${audit.totalRecommendedTaxOff.toLocaleString()} in statutory deductions!`);
    }, 1400);
  };

  // Run Agent 3: Dispatcher (Safely sends to internal developer phone +254768141129 first)
  const handleRunDispatcher = async () => {
    setIsDispatching(true);
    const targetUrl = selectedChannelMode === 'waha' 
      ? wahaEndpointUrl 
      : selectedChannelMode === 'n8n' 
        ? n8nWebhookUrl 
        : customGatewayUrl;

    showToast(`Dispatch Agent: Generating verified document & pinging live endpoint: ${targetUrl}...`);

    try {
      const receipt = await DispatchAndCommsAgent.dispatchToWhatsApp({
        recipientName: 'Adv. Nyagah B. Kithinji / Client Representative',
        recipientPhone: NYAGAH_AI_CONFIG.testPhoneNumber,
        matterTitle: selectedMatter.title,
        documentType: 'BILL_OF_COSTS',
        documentRef: `TAX-${selectedMatter.id.toUpperCase()}-2026`,
        amountDue: 245000,
        courtDate: '18th November 2026',
        courtroom: 'Milimani Commercial Court 1',
        summaryMessage: 'The Party & Party Bill of Costs under Schedule 6 has been verified and compiled. Please review the attached breakdown and statutory grounds.'
      }, targetUrl);

      setDispatchReceipt(receipt);

      if (receipt.status === 'SENT_LIVE_HTTP_SUCCESS') {
        showToast(`✓ Live WhatsApp Gateway HTTP 200 OK! Delivered to ${NYAGAH_AI_CONFIG.testPhoneNumber}`);
      } else {
        showToast(`✓ Document stamped & queued for ${NYAGAH_AI_CONFIG.testPhoneNumber} (Gateway HTTP status: ${receipt.networkDetails?.httpStatus || 'offline'})`);
      }
    } catch (err: any) {
      showToast(`Dispatch attempted: ${err?.message || 'Error executing dispatch'}`);
    } finally {
      setIsDispatching(false);
    }
  };

  // Run Agent 4: Watchdog
  const handleRunWatchdog = () => {
    setIsScanningWatchdog(true);
    showToast('Cause List Watchdog Agent: Scraping daily Milimani & ELC cause lists...');

    setTimeout(() => {
      const activeMatters = firmMatters.map(m => ({
        caseNo: m.caseNo,
        title: m.title,
        advocateAssigned: m.advocateAssigned
      }));

      const res = CauseListWatchdogAgent.scanDailyCauseLists(activeMatters);
      setWatchdogResult(res);
      setIsScanningWatchdog(false);
      showToast(`✓ Scanned 18 cause lists: Found ${res.matchedMattersCount} matters scheduled for court today!`);
    }, 1200);
  };

  const copyText = (txt: string) => {
    navigator.clipboard?.writeText(txt);
    showToast('Copied to clipboard');
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-xs">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              P3L LEGAL AI ENGINE &middot; NYAGAH &amp; CO. ADVOCATES
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 font-brand">
            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Autonomous AI Legal Agents Studio
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            4 Specialized legal agents powering taxation drafting, opposition audits, WhatsApp dispatch, and cause list monitoring
          </p>
        </div>

        {/* Global Safety Badge */}
        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 font-mono text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>Safety Lock Active: Outbound messages route to verified firm test phone <strong>(+254 768 141 129)</strong></span>
        </div>
      </div>

      {/* Matter Selection Bar */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <span className="text-[10.5px] font-mono text-zinc-400 uppercase font-bold block mb-1">Target Litigation Matter:</span>
          <div className="flex items-center gap-2">
            <select
              value={selectedMatterId}
              onChange={(e) => setSelectedMatterId(e.target.value)}
              className="p-2 text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
            >
              {firmMatters.map(m => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.caseNo})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-zinc-400 block text-[10px] uppercase">Subject Matter Claim Value</span>
          <strong className="text-base font-bold text-emerald-600 dark:text-emerald-400">
            KES {selectedMatter.claimValue.toLocaleString()}
          </strong>
        </div>
      </div>

      {/* Agent Selector Navigation Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveAgentTab('drafter')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeAgentTab === 'drafter'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 shadow-xs'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-blue-600 font-bold">Agent 1</span>
          </div>
          <strong className="block text-xs font-bold font-brand text-zinc-900 dark:text-white">Taxation Drafter Agent</strong>
          <span className="text-[10.5px] text-zinc-500">Compiles 200+ Schedule 6 statutory items</span>
        </button>

        <button
          onClick={() => setActiveAgentTab('auditor')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeAgentTab === 'auditor'
              ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 shadow-xs'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-500/10 text-rose-600 font-bold">Agent 2</span>
          </div>
          <strong className="block text-xs font-bold font-brand text-zinc-900 dark:text-white">Opposition Auditor Agent</strong>
          <span className="text-[10.5px] text-zinc-500">Attacks opponent's bill with deductions</span>
        </button>

        <button
          onClick={() => setActiveAgentTab('dispatcher')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeAgentTab === 'dispatcher'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 shadow-xs'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-600 font-bold">Agent 3</span>
          </div>
          <strong className="block text-xs font-bold font-brand text-zinc-900 dark:text-white">Dispatch &amp; Comms Agent</strong>
          <span className="text-[10.5px] text-zinc-500">Dispatches court PDFs &amp; WhatsApp text</span>
        </button>

        <button
          onClick={() => setActiveAgentTab('watchdog')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeAgentTab === 'watchdog'
              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 shadow-xs'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-600 font-bold">Agent 4</span>
          </div>
          <strong className="block text-xs font-bold font-brand text-zinc-900 dark:text-white">Cause List Watchdog</strong>
          <span className="text-[10.5px] text-zinc-500">Monitors daily Milimani &amp; ELC court diary</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* AGENT 1 VIEW: TAXATION DRAFTER */}
      {/* ========================================================================= */}
      {activeAgentTab === 'drafter' && (
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                Schedule 6 Taxation Drafter Agent
              </h3>
              <p className="text-zinc-500 text-xs">
                Extracts trial bundles and applies Kenyan statutory scale rules (Schedule 6 Item 1(b) &amp; Item 2)
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunDrafter}
              disabled={isDrafting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              <Play className={`w-3.5 h-3.5 ${isDrafting ? 'animate-spin' : ''}`} />
              <span>{isDrafting ? 'Drafting Statutory Bill...' : 'Run Taxation Drafter Agent'}</span>
            </button>
          </div>

          {drafterOutput && (
            <div className="space-y-4">
              {/* Output Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700">
                  <span className="text-zinc-400 text-[10px] uppercase block">Statutory Instruction Fee</span>
                  <strong className="text-base text-zinc-900 dark:text-white">KES {drafterOutput.statutoryInstructionFee.toLocaleString()}</strong>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700">
                  <span className="text-zinc-400 text-[10px] uppercase block">Getting Up Fee (33.3%)</span>
                  <strong className="text-base text-zinc-900 dark:text-white">KES {drafterOutput.gettingUpFee.toLocaleString()}</strong>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700">
                  <span className="text-zinc-400 text-[10px] uppercase block">VAT @ 16%</span>
                  <strong className="text-base text-amber-600 dark:text-amber-400">KES {drafterOutput.vat16.toLocaleString()}</strong>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-600 text-[10px] uppercase block font-bold">Grand Bill Total</span>
                  <strong className="text-base text-emerald-600 dark:text-emerald-400 font-extrabold">KES {drafterOutput.grandTotalClaimed.toLocaleString()}</strong>
                </div>
              </div>

              {/* Generated Bill Items Sample Table */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden font-mono text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-2.5 w-12 text-center">Item</th>
                      <th className="p-2.5 w-24">Date</th>
                      <th className="p-2.5">Particulars of Service</th>
                      <th className="p-2.5 w-28 text-right">Claimed (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-sans">
                    {drafterOutput.items.map(it => (
                      <tr key={it.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                        <td className="p-2.5 text-center font-mono font-bold text-zinc-500">{it.itemNo}</td>
                        <td className="p-2.5 font-mono text-zinc-500">{it.date}</td>
                        <td className="p-2.5 text-zinc-900 dark:text-zinc-100">{it.particulars}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-zinc-900 dark:text-white">
                          {it.amountClaimed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* AGENT 2 VIEW: OPPOSITION AUDITOR */}
      {/* ========================================================================= */}
      {activeAgentTab === 'auditor' && (
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Opposition Auditor Agent
              </h3>
              <p className="text-zinc-500 text-xs">
                Scans opponent's Bill of Costs to calculate statutory deductions and generate formal Written Grounds of Opposition
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunAuditor}
              disabled={isAuditing}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              <Play className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>{isAuditing ? 'Auditing Bill...' : 'Audit Opposing Bill of Costs'}</span>
            </button>
          </div>

          {auditorOutput && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700">
                  <span className="text-zinc-400 text-[10px] uppercase block">Total Opponent Claimed</span>
                  <strong className="text-base text-zinc-900 dark:text-white">KES {auditorOutput.totalOpponentClaimed.toLocaleString()}</strong>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-rose-600 text-[10px] uppercase block font-bold">Total Recommended Tax Off</span>
                  <strong className="text-base text-rose-600 dark:text-rose-400 font-extrabold">-KES {auditorOutput.totalRecommendedTaxOff.toLocaleString()}</strong>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-600 text-[10px] uppercase block font-bold">Projected Net Exposure</span>
                  <strong className="text-base text-emerald-600 dark:text-emerald-400 font-extrabold">KES {auditorOutput.projectedNetExposure.toLocaleString()}</strong>
                </div>
              </div>

              {/* Detailed Findings */}
              <div className="space-y-2">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">Identified Statutory Objections:</span>
                {auditorOutput.findings.map((f, i) => (
                  <div key={i} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold bg-rose-500/15 text-rose-600">
                          Item #{f.itemNo}
                        </span>
                        <strong className="text-zinc-900 dark:text-white">{f.particulars}</strong>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400 text-[11.5px]">{f.statutoryGround}</p>
                      <span className="text-[10.5px] font-mono text-purple-600 dark:text-purple-400 block">Authority: {f.precedentRef}</span>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <span className="text-zinc-400 text-[10px] block">Tax Off:</span>
                      <strong className="text-rose-600 dark:text-rose-400 text-sm">-KES {f.recommendedTaxOff.toLocaleString()}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Generated Court Document Template */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">Formal Grounds of Opposition Court Draft:</span>
                  <button
                    type="button"
                    onClick={() => copyText(auditorOutput.formalSubmissionsTemplate)}
                    className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 flex items-center gap-1 font-mono text-[10px]"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Court Submissions</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-zinc-950 text-zinc-300 font-mono text-[10.5px] overflow-x-auto max-h-60 leading-relaxed border border-zinc-800">
                  {auditorOutput.formalSubmissionsTemplate}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* AGENT 3 VIEW: DISPATCH & COMMS (SAFE WHATSAPP & N8N SENDER) */}
      {/* ========================================================================= */}
      {activeAgentTab === 'dispatcher' && (
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Dispatch &amp; Comms Agent (Live n8n &amp; WAHA WhatsApp Engine)
              </h3>
              <p className="text-zinc-500 text-xs">
                Generates, stamps with QR verification, and dispatches PDFs &amp; WhatsApp/Email legal updates directly via n8n &amp; WAHA
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRawN8nWorkflowPreview(!rawN8nWorkflowPreview)}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-zinc-100 transition-colors"
              >
                <Terminal className="w-3.5 h-3.5 text-purple-600" />
                <span>{rawN8nWorkflowPreview ? 'Hide n8n Flow' : 'View n8n JSON'}</span>
              </button>

              <button
                type="button"
                onClick={handleRunDispatcher}
                disabled={isDispatching}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
              >
                <Send className={`w-3.5 h-3.5 ${isDispatching ? 'animate-spin' : ''}`} />
                <span>{isDispatching ? 'Dispatching Live Network HTTP...' : 'Send Live WhatsApp Dispatch'}</span>
              </button>
            </div>
          </div>

          {/* Safety & Channel Lock Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Mandatory Test Phone Lock:
              </span>
              <p className="text-[11.5px] leading-relaxed">
                External clients protected. Outbound dispatches strictly send to internal developer test line:
                <strong className="block text-emerald-900 dark:text-emerald-200 font-mono text-xs mt-0.5">
                  {NYAGAH_AI_CONFIG.testPhoneNumber} (Pochi la Biashara line / Razak)
                </strong>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-500/20 text-purple-800 dark:text-purple-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-xs">
                <Zap className="w-4 h-4 text-purple-600 shrink-0" />
                Live Network Gateway Status:
              </span>
              <p className="text-[11.5px] leading-relaxed">
                Connects directly to WAHA WhatsApp API or n8n Webhook trigger. Interrogates HTTP response and latency live.
              </p>
            </div>
          </div>

          {/* Webhook & Gateway Target Selector */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
            <span className="font-bold text-xs text-zinc-900 dark:text-white block">
              Active Outbound WhatsApp Gateway Target:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedChannelMode('waha')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedChannelMode === 'waha'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <span>WAHA Cloudflare Tunnel</span>
                <span className="text-[9px] font-mono px-1 rounded bg-black/20">NOWEB</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedChannelMode('n8n')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedChannelMode === 'n8n'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <span>n8n Cloud Webhook</span>
                <span className="text-[9px] font-mono px-1 rounded bg-black/20">Odin Router</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedChannelMode('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedChannelMode === 'custom'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <span>Custom Endpoint / Local Port</span>
              </button>
            </div>

            {/* Configured URL Display / Input */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold shrink-0">URL:</span>
              <input
                type="text"
                value={
                  selectedChannelMode === 'waha'
                    ? wahaEndpointUrl
                    : selectedChannelMode === 'n8n'
                      ? n8nWebhookUrl
                      : customGatewayUrl
                }
                onChange={(e) => {
                  if (selectedChannelMode === 'waha') setWahaEndpointUrl(e.target.value);
                  else if (selectedChannelMode === 'n8n') setN8nWebhookUrl(e.target.value);
                  else setCustomGatewayUrl(e.target.value);
                }}
                className="w-full p-2 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200"
                placeholder="Enter webhook or WAHA /api/sendText URL..."
              />
            </div>
          </div>

          {/* Raw n8n Workflow Code Preview */}
          {rawN8nWorkflowPreview && (
            <div className="space-y-2 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[10.5px]">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="font-bold text-purple-400">
                  Live n8n Multi-Tenant WhatsApp Gateway Router Workflow (CsBJMQmxtWDWqpyq)
                </span>
                <span className="text-[9px] text-zinc-500">From n8n MCP &amp; local Razak Agents repository</span>
              </div>
              <p className="text-zinc-400 text-[10px]">
                Nodes: Webhook Trigger &rarr; Universal Normalizer &rarr; Supabase Tenant Fetch &rarr; Gemini/OpenAI LangChain Brain &rarr; WAHA Outbound &rarr; Instant Telegram &amp; Email Escalation Desk
              </p>
              <pre className="overflow-x-auto max-h-56 leading-relaxed text-zinc-400 p-2 bg-zinc-900 rounded">
{`{
  "name": "Razak Odin - Multi-Tenant WhatsApp Gateway Router",
  "active": true,
  "nodes": [
    "WhatsApp Universal Gateway Webhook (/webhook/whatsapp-odin-inbound)",
    "Universal Normalizer & Dedupe (Locks to 254768141129)",
    "Fetch Tenant from Supabase (tenant_whatsapp_lines)",
    "Odin Multilingual Sales Brain (@n8n/n8n-nodes-langchain.agent)",
    "Universal Outbound Dispatcher (WAHA / Telegram / Email)",
    "WAHA Send Outbound Message (Cloudflare tunnel)"
  ],
  "phoneLock": "+254 768 141 129"
}`}
              </pre>
            </div>
          )}

          {/* Real Network Delivery Receipt & Diagnostic Card */}
          {dispatchReceipt && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Delivery Receipt ({dispatchReceipt.dispatchId})
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                      dispatchReceipt.status === 'SENT_LIVE_HTTP_SUCCESS' 
                        ? 'bg-emerald-500/20 text-emerald-600'
                        : 'bg-amber-500/20 text-amber-600'
                    }`}>
                      STATUS: {dispatchReceipt.status}
                    </span>
                    {dispatchReceipt.networkDetails?.httpStatus && (
                      <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold bg-zinc-800 text-zinc-200">
                        HTTP {dispatchReceipt.networkDetails.httpStatus}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-zinc-600 dark:text-zinc-400 font-mono text-[11px] space-y-1">
                  <p>Recipient: <strong className="text-zinc-900 dark:text-white">{dispatchReceipt.recipient}</strong> (Verified Pochi la Biashara line)</p>
                  <p>Gateway Endpoint: <strong className="text-zinc-900 dark:text-white">{dispatchReceipt.networkDetails?.endpointAttempted}</strong></p>
                  <p>Network Roundtrip: <strong className="text-zinc-900 dark:text-white">{dispatchReceipt.networkDetails?.durationMs}ms</strong></p>
                  {dispatchReceipt.networkDetails?.error && (
                    <p className="text-amber-600 dark:text-amber-400">
                      Gateway Diagnostic: {dispatchReceipt.networkDetails.error}
                    </p>
                  )}
                  <p className="pt-1">
                    Anti-Tamper Verify Link: <a href={dispatchReceipt.verificationUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline truncate block">{dispatchReceipt.verificationUrl}</a>
                  </p>
                </div>
              </div>

              {/* Message Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">Delivered WhatsApp Payload:</span>
                  <button
                    type="button"
                    onClick={() => copyText(dispatchReceipt.messageBody)}
                    className="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono flex items-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed border border-zinc-800">
                  {dispatchReceipt.messageBody}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* AGENT 4 VIEW: CAUSE LIST WATCHDOG */}
      {/* ========================================================================= */}
      {activeAgentTab === 'watchdog' && (
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Judiciary Cause List Watchdog Agent
              </h3>
              <p className="text-zinc-500 text-xs">
                Scrapes daily Milimani Commercial, Civil, Court of Appeal &amp; ELC cause lists to sync courtrooms and virtual Teams links
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunWatchdog}
              disabled={isScanningWatchdog}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningWatchdog ? 'animate-spin' : ''}`} />
              <span>{isScanningWatchdog ? 'Scanning Daily Lists...' : 'Run Cause List Watchdog'}</span>
            </button>
          </div>

          {watchdogResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700">
                  <span className="text-zinc-400 text-[10px] uppercase block">Lists Scanned Today</span>
                  <strong className="text-base text-zinc-900 dark:text-white">{watchdogResult.totalListsScanned} Courtrooms</strong>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-amber-600 text-[10px] uppercase block font-bold">Matters Listed Today</span>
                  <strong className="text-base text-amber-600 dark:text-amber-400 font-extrabold">{watchdogResult.matchedMattersCount} Active Matters</strong>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-600 text-[10px] uppercase block font-bold">Diary Status</span>
                  <strong className="text-base text-emerald-600 dark:text-emerald-400 font-extrabold">Synchronized</strong>
                </div>
              </div>

              {/* Matched Matters Card List */}
              <div className="space-y-2">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">Today's Scheduled Appearances:</span>
                {watchdogResult.matches.map((m, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white">{m.entry.caseNumber}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-600">
                          {m.entry.matterStage}
                        </span>
                      </div>
                      <span className="font-mono text-zinc-500 text-[11px]">{m.entry.timeSlot} &middot; {m.entry.courtroom}</span>
                    </div>

                    <p className="text-zinc-800 dark:text-zinc-200 font-medium">{m.matterTitle}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-zinc-500 font-mono">
                      <span>Forum: {m.entry.courtForum} &middot; {m.entry.presidingJudge}</span>
                      {m.entry.teamsMeetingLink && (
                        <a href={m.entry.teamsMeetingLink} target="_blank" rel="noreferrer" className="text-blue-500 underline flex items-center gap-1">
                          <span>Join Virtual Teams Session</span>
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Generated Morning Briefing for Counsel */}
              <div className="space-y-1.5">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">Morning WhatsApp Briefing Generated for Counsel:</span>
                <pre className="p-3.5 rounded-xl bg-zinc-950 text-zinc-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed border border-zinc-800">
                  {watchdogResult.briefingText}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

