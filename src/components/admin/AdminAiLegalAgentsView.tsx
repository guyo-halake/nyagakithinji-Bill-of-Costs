import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
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
import { ExtractedLitigationPleading, StatutoryBillLineItem } from '../../ai/TaxationDrafterAgent';
import { CauseListEntry } from '../../ai/CauseListWatchdogAgent';
import { fetchMatters } from '../../services/data';
import { ExactMatterRecord, SystemUser } from '../../services/supabase';

interface AdminAiLegalAgentsViewProps {
  showToast: (msg: string) => void;
  currentUser: SystemUser;
}

export const AdminAiLegalAgentsView: React.FC<AdminAiLegalAgentsViewProps> = ({ showToast, currentUser }) => {
  const [activeAgentTab, setActiveAgentTab] = useState<'drafter' | 'auditor' | 'dispatcher' | 'watchdog'>('drafter');
  const [firmMatters, setFirmMatters] = useState<ExactMatterRecord[]>([]);
  const [mattersLoadError, setMattersLoadError] = useState('');
  const [selectedMatterId, setSelectedMatterId] = useState('');
  const selectedMatter = firmMatters.find(m => m.id === selectedMatterId);
  const [pleadingsText, setPleadingsText] = useState('');
  const [opponentItems, setOpponentItems] = useState<StatutoryBillLineItem[]>([]);
  const [opponentFirm, setOpponentFirm] = useState('');
  const [auditInputError, setAuditInputError] = useState('');
  const [watchdogError, setWatchdogError] = useState('');

  useEffect(() => {
    let active = true;
    if (!currentUser.firmId) {
      setMattersLoadError('Your firm account could not be verified.');
      return;
    }

    fetchMatters(currentUser.firmId)
      .then(records => {
        if (!active) return;
        const openMatters = records.filter(matter => matter.statusClass !== 'closed');
        setFirmMatters(openMatters);
        setSelectedMatterId(openMatters[0]?.id || '');
        setMattersLoadError('');
      })
      .catch(error => {
        if (!active) return;
        setFirmMatters([]);
        setMattersLoadError(error instanceof Error ? error.message : 'Could not load your firm matters.');
      });

    return () => { active = false; };
  }, [currentUser.firmId]);

  // Agent 1: Drafter Output State
  const [drafterOutput, setDrafterOutput] = useState<GeneratedBillOfCosts | null>(null);
  const [isDrafting, setIsDrafting] = useState<boolean>(false);

  // Agent 2: Auditor Output State
  const [auditorOutput, setAuditorOutput] = useState<OppositionAuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  // Agent 3: Dispatcher State
  const [dispatchReceipt, setDispatchReceipt] = useState<DispatchReceipt | null>(null);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [wahaEndpointUrl, setWahaEndpointUrl] = useState<string>(NYAGAH_AI_CONFIG.wahaApiUrl);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState<string>(NYAGAH_AI_CONFIG.n8nWebhookUrl);
  const [selectedChannelMode, setSelectedChannelMode] = useState<'waha' | 'n8n' | 'custom'>('waha');
  const [customGatewayUrl, setCustomGatewayUrl] = useState<string>('');

  // Agent 4: Watchdog State
  const [watchdogResult, setWatchdogResult] = useState<WatchdogMatchResult | null>(null);
  const [isScanningWatchdog, setIsScanningWatchdog] = useState<boolean>(false);

  // Run Agent 1: Drafter
  const handleRunDrafter = () => {
    if (!selectedMatter) {
      showToast('Load a real firm matter before drafting a bill.');
      return;
    }
    if (!Number.isFinite(selectedMatter.amount) || selectedMatter.amount <= 0) {
      showToast('This matter has no recorded claim value. Add one before drafting.');
      return;
    }
    const pleadings: ExtractedLitigationPleading[] = pleadingsText
      .split(/\r?\n/)
      .map(line => line.split('|').map(value => value.trim()))
      .filter(parts => parts.some(Boolean))
      .map(([date = '', particulars = '', folios = '']) => ({
        date,
        documentType: particulars,
        particulars,
        folios: Number(folios),
        courtForum: selectedMatter.forum,
      }));
    if (!pleadings.length || pleadings.some(item => !item.particulars || !Number.isInteger(item.folios) || item.folios < 0)) {
      showToast('Enter actual case activities as date | description | folios, one per line.');
      return;
    }

    setIsDrafting(true);
    try {
      const res = TaxationDrafterAgent.draftStatutoryBill({
        matterId: selectedMatter.id,
        matterTitle: selectedMatter.title,
        caseNo: selectedMatter.caseNo,
        forum: selectedMatter.forum,
        claimValue: selectedMatter.amount,
        pleadings,
      });

      setDrafterOutput(res);
      showToast(`Draft prepared from ${pleadings.length} entered case activities. Check the rates and facts before use.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not prepare this draft.');
    } finally {
      setIsDrafting(false);
    }
  };

  // Run Agent 2: Opposition Auditor
  const handleLoadOpponentBill = async (file?: File) => {
    if (!file) return;
    setAuditInputError('');
    try {
      const workbook = XLSX.read(await file.arrayBuffer());
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error('The selected file has no worksheet.');
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
      const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, '');
      const items = rows.map((row, index) => {
        const values = new Map(Object.entries(row).map(([key, value]) => [normalize(key), value]));
        const particulars = String(values.get('particulars') || values.get('description') || '').trim();
        const amount = Number(values.get('amountclaimed') || values.get('amount') || '');
        const category = String(values.get('category') || '').toUpperCase() as StatutoryBillLineItem['category'];
        const validCategories: StatutoryBillLineItem['category'][] = ['INSTRUCTION', 'GETTING_UP', 'DRAWING', 'PERUSAL', 'ATTENDANCE', 'DISBURSEMENT'];
        if (!particulars || !Number.isFinite(amount) || amount < 0 || !validCategories.includes(category)) {
          throw new Error(`Row ${index + 2} needs particulars, a non-negative amount, and a valid category.`);
        }
        const itemNo = String(values.get('itemno') || index + 1);
        return {
          id: `opponent-${index + 1}`,
          itemNo,
          date: String(values.get('date') || ''),
          particulars,
          statutoryItemCode: String(values.get('statutoryitemcode') || ''),
          amountClaimed: amount,
          amountTaxedOff: 0,
          netAllowed: amount,
          category,
          statutoryNote: '',
        };
      });
      if (!items.length) throw new Error('The selected file contains no bill items.');
      setOpponentItems(items);
      setAuditorOutput(null);
    } catch (error) {
      setOpponentItems([]);
      setAuditInputError(error instanceof Error ? error.message : 'Could not read the selected bill.');
    }
  };

  const handleRunAuditor = () => {
    if (!selectedMatter || opponentItems.length === 0 || !opponentFirm.trim()) {
      setAuditInputError('Choose a firm matter, enter the opposing firm, and upload the actual bill of costs.');
      return;
    }
    setIsAuditing(true);
    setAuditInputError('');
    try {
      const audit = OppositionAuditorAgent.auditOpposingBill({
        matterTitle: selectedMatter.title,
        opposingFirm: opponentFirm,
        items: opponentItems,
      });

      setAuditorOutput(audit);
      showToast('Rule-based review prepared from the uploaded bill. Have counsel verify every finding and citation.');
    } catch (error) {
      setAuditInputError(error instanceof Error ? error.message : 'Could not review this bill.');
    } finally {
      setIsAuditing(false);
    }
  };

  // Run Agent 3: Dispatcher (Safely sends to internal developer phone +254768141129 first)
  const handleRunDispatcher = async () => {
    if (!selectedMatter || drafterOutput?.matterId !== selectedMatter.id) {
      showToast('Prepare a draft from this matter before sending a message.');
      return;
    }
    if (!window.confirm(`Send a WhatsApp message to the configured internal test number ${NYAGAH_AI_CONFIG.testPhoneNumber}?`)) {
      return;
    }

    setIsDispatching(true);
    const targetUrl = selectedChannelMode === 'waha' 
      ? wahaEndpointUrl 
      : selectedChannelMode === 'n8n' 
        ? n8nWebhookUrl 
        : customGatewayUrl;

    showToast(`Sending the message to the internal test number through the selected gateway.`);

    try {
      const receipt = await DispatchAndCommsAgent.dispatchToWhatsApp({
        recipientName: 'Adv. Nyagah B. Kithinji / Client Representative',
        recipientPhone: NYAGAH_AI_CONFIG.testPhoneNumber,
        matterTitle: selectedMatter.title,
        documentType: 'BILL_OF_COSTS',
        documentRef: `TAX-${selectedMatter.caseNo || selectedMatter.id}`,
        amountDue: drafterOutput.grandTotalClaimed,
        summaryMessage: `A draft bill of costs for ${selectedMatter.title} is ready for review. It is not a filed or approved bill.`
      }, targetUrl);

      setDispatchReceipt(receipt);

      if (receipt.status === 'ACCEPTED_BY_GATEWAY') {
        showToast(`The gateway accepted the message for ${NYAGAH_AI_CONFIG.testPhoneNumber}. Delivery is not confirmed.`);
      } else {
        showToast(`The message was not accepted by the gateway. ${receipt.networkDetails?.error || ''}`);
      }
    } catch (err: any) {
      showToast(`Dispatch attempted: ${err?.message || 'Error executing dispatch'}`);
    } finally {
      setIsDispatching(false);
    }
  };

  // Run Agent 4: Watchdog
  const handleRunWatchdog = async () => {
    setIsScanningWatchdog(true);
    setWatchdogResult(null);
    setWatchdogError('');
    try {
      const response = await fetch('/api/v1/cause-lists/today');
      if (!response.ok) throw new Error('A verified court cause-list feed is not connected.');
      const data = await response.json();
      if (!Array.isArray(data?.entries) || !firmMatters.length) {
        throw new Error('The court-list service returned an unexpected response.');
      }
      const entries = data.entries as CauseListEntry[];
      const result = CauseListWatchdogAgent.scanDailyCauseLists(
        firmMatters.map(matter => ({
          caseNo: matter.caseNo,
          title: matter.title,
          advocateAssigned: matter.leadAdvocate || '',
        })),
        entries,
      );
      setWatchdogResult(result);
    } catch (error) {
      setWatchdogError(error instanceof Error ? error.message : 'Could not check court cause lists.');
    } finally {
      setIsScanningWatchdog(false);
    }
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
              Legal workflow tools
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 font-brand">
            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Legal drafting and review
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Uses your saved matters and the documents you provide. Reviews need an advocate's approval.
          </p>
        </div>

        {/* Global Safety Badge */}
        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 font-mono text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>Messages go only to the configured internal test number, and require confirmation.</span>
        </div>
      </div>

      {/* Matter Selection Bar */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <span className="text-[10.5px] font-mono text-zinc-400 uppercase font-bold block mb-1">Target Litigation Matter:</span>
          <div className="flex items-center gap-2">
            <select
              value={selectedMatterId}
              onChange={(e) => {
                setSelectedMatterId(e.target.value);
                setDrafterOutput(null);
                setAuditorOutput(null);
              }}
              className="p-2 text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
            >
              {firmMatters.map(m => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.caseNo})
                </option>
              ))}
            </select>
            {mattersLoadError && <p role="alert" className="mt-2 text-rose-600">{mattersLoadError}</p>}
            {!mattersLoadError && firmMatters.length === 0 && <p className="mt-2 text-zinc-500">No open matters were found for this firm.</p>}
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-zinc-400 block text-[10px] uppercase">Subject Matter Claim Value</span>
          <strong className="text-base font-bold text-emerald-600 dark:text-emerald-400">
            KES {(selectedMatter?.amount || 0).toLocaleString()}
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
                Builds a preliminary bill from the selected matter and the activities you enter. This tool does not read court files automatically.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunDrafter}
              disabled={isDrafting || !selectedMatter}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              <Play className={`w-3.5 h-3.5 ${isDrafting ? 'animate-spin' : ''}`} />
              <span>{isDrafting ? 'Preparing draft…' : 'Prepare draft bill'}</span>
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Case activities and folios</span>
            <span className="block text-zinc-500">Enter only work shown in the file. One activity per line: date | description | folios.</span>
            <textarea
              value={pleadingsText}
              onChange={event => setPleadingsText(event.target.value)}
              rows={5}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-xs"
              placeholder="For example: 12.04.2026 | Drawing of the filed application | 8"
            />
          </label>

          {drafterOutput && (
            <div className="space-y-4">
              <p className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                Preliminary calculation only. Check the applicable scale, dates, disbursements, VAT, and every item before use.
              </p>
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
                Checks the uploaded bill for exact repeated items. It does not assess statutory rates or make legal recommendations.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunAuditor}
              disabled={isAuditing || !selectedMatter || opponentItems.length === 0 || !opponentFirm.trim()}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              <Play className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>{isAuditing ? 'Reviewing bill…' : 'Review uploaded bill'}</span>
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Opposing firm</span>
              <input
                value={opponentFirm}
                onChange={event => setOpponentFirm(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2.5"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Upload the bill (Excel or CSV)</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={event => void handleLoadOpponentBill(event.target.files?.[0])}
                className="block w-full text-xs"
              />
              <span className="block text-zinc-500">Include columns for particulars, amount, and category (INSTRUCTION, GETTING_UP, DRAWING, PERUSAL, ATTENDANCE, or DISBURSEMENT).</span>
            </label>
          </div>
          {opponentItems.length > 0 && <p className="text-zinc-600 dark:text-zinc-300">{opponentItems.length} bill items loaded from your file.</p>}
          {auditInputError && <p role="alert" className="text-rose-600 dark:text-rose-300">{auditInputError}</p>}

          {auditorOutput && (
            <div className="space-y-4">
              <p className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                This check only finds exact repeated line items. It does not decide whether a fee is excessive or legally recoverable.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700">
                  <span className="text-zinc-400 text-[10px] uppercase block">Total Opponent Claimed</span>
                  <strong className="text-base text-zinc-900 dark:text-white">KES {auditorOutput.totalOpponentClaimed.toLocaleString()}</strong>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-rose-600 text-[10px] uppercase block font-bold">Exact repeated items to check</span>
                  <strong className="text-base text-rose-600 dark:text-rose-400 font-extrabold">{auditorOutput.findings.length}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">Items to review:</span>
                {auditorOutput.findings.length === 0 && <p className="text-zinc-600 dark:text-zinc-300">No exact repeated items found.</p>}
                {auditorOutput.findings.map((f, i) => (
                  <div key={i} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold bg-rose-500/15 text-rose-600">
                          Item #{f.itemNo}
                        </span>
                        <strong className="text-zinc-900 dark:text-white">{f.particulars}</strong>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400 text-[11.5px]">{f.observation}</p>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <span className="text-zinc-400 text-[10px] block">Amount:</span>
                      <strong className="text-zinc-900 dark:text-zinc-100 text-sm">KES {f.claimedAmount.toLocaleString()}</strong>
                    </div>
                  </div>
                ))}
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
                WhatsApp message
              </h3>
              <p className="text-zinc-500 text-xs">
                Sends a message about the current preliminary draft to the configured internal test number.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunDispatcher}
                disabled={isDispatching || !selectedMatter || drafterOutput?.matterId !== selectedMatter.id}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
              >
                <Send className={`w-3.5 h-3.5 ${isDispatching ? 'animate-spin' : ''}`} />
                <span>{isDispatching ? 'Sending…' : 'Send to test number'}</span>
              </button>
            </div>
          </div>

          {/* Safety & Channel Lock Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Internal test number:
              </span>
              <p className="text-[11.5px] leading-relaxed">
                Messages from this screen go only to:
                <strong className="block text-emerald-900 dark:text-emerald-200 font-mono text-xs mt-0.5">
                  {NYAGAH_AI_CONFIG.testPhoneNumber}
                </strong>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-500/20 text-purple-800 dark:text-purple-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-xs">
                <Zap className="w-4 h-4 text-purple-600 shrink-0" />
                Gateway:
              </span>
              <p className="text-[11.5px] leading-relaxed">
                An HTTP response means the gateway accepted a request; it does not confirm delivery to WhatsApp.
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

          {dispatchReceipt && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Gateway request ({dispatchReceipt.dispatchId})
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                      dispatchReceipt.status === 'ACCEPTED_BY_GATEWAY'
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
                  <p>Recipient: <strong className="text-zinc-900 dark:text-white">{dispatchReceipt.recipient}</strong></p>
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
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">Message preview:</span>
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
                Checks published cause lists only when a verified court-list service is connected.
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

          {watchdogError && (
            <p role="alert" className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              {watchdogError}
            </p>
          )}

          {watchdogResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700">
                  <span className="text-zinc-400 text-[10px] uppercase block">Lists Scanned Today</span>
                  <strong className="text-base text-zinc-900 dark:text-white">{watchdogResult.totalEntriesScanned} Entries</strong>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-amber-600 text-[10px] uppercase block font-bold">Matters Listed Today</span>
                  <strong className="text-base text-amber-600 dark:text-amber-400 font-extrabold">{watchdogResult.matchedMattersCount} Active Matters</strong>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-600 text-[10px] uppercase block font-bold">Diary Status</span>
                  <strong className="text-base text-emerald-600 dark:text-emerald-400 font-extrabold">Feed checked</strong>
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
                <span className="font-bold text-zinc-800 dark:text-zinc-200">Cause-list results:</span>
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
