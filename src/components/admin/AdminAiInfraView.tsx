import React, { useState } from 'react';
import { 
  Bot, Cpu, HardDrive, Terminal, Zap, Shield, 
  Database, RefreshCw, Send, CheckCircle2, AlertTriangle, 
  Layers, MessageSquare, TrendingUp, Sparkles, Server, Smartphone, Globe
} from 'lucide-react';

interface AdminAiInfraViewProps {
  showToast: (msg: string) => void;
}

export const AdminAiInfraView: React.FC<AdminAiInfraViewProps> = ({ showToast }) => {
  const [selectedAgent, setSelectedAgent] = useState<'odinbot' | 'rtb' | 'nokras'>('odinbot');
  const [testPrompt, setTestPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'guyo' | 'odin'; text: string; time: string }>>([
    { sender: 'odin', text: "Morning Guyo. Matter system is running. OdinBot v17.6 is live on your server. I've tracked today's project tasks, P3L finances, and your KCA coursework. What are we building today?", time: '08:15 AM' },
    { sender: 'guyo', text: "Check server storage and see if Rosemary's Fresh Fity register synced overnight.", time: '08:18 AM' },
    { sender: 'odin', text: "Razak Server storage is healthy (4 TB project pool active). Fresh Fity POS in Ruiru synced 148 transactions over Adrian AK fiber at 03:40 AM with zero drop. Ready for code review.", time: '08:19 AM' }
  ]);
  const [isSending, setIsSending] = useState(false);

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPrompt.trim()) return;

    const userMsg = testPrompt;
    setChatMessages(prev => [...prev, { sender: 'guyo', text: userMsg, time: 'Now' }]);
    setTestPrompt('');
    setIsSending(true);

    setTimeout(() => {
      let reply = "OdinBot v17.6 processed your prompt locally on Razak Server. Memory context is active across P3L codebase, clients, and school notes.";
      if (userMsg.toLowerCase().includes('code') || userMsg.toLowerCase().includes('bug')) {
        reply = "Looking at the codebase now. I've analyzed the function calls and test cases. Ready to write the solution.";
      } else if (userMsg.toLowerCase().includes('money') || userMsg.toLowerCase().includes('finance')) {
        reply = "Finance snapshot: M-Pesa line 0768141129 is clear. Active retainers for Fresh Fity and Sayara are up to date. Personal intern income from Muthokinju settled smoothly.";
      }
      setChatMessages(prev => [...prev, { sender: 'odin', text: reply, time: 'Now' }]);
      setIsSending(false);
      showToast('OdinBot responded locally from Razak Server (18ms inference)');
    }, 600);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Top Banner: Matter - Razak's Personal AI */}
      <div className="p-6 rounded-2xl bg-zinc-950 text-white border border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-zinc-950 tracking-wider">
                MATTER AI CORE
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Razak's Personal AI Architecture (Like Iron Man's Jarvis)
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Matter: Multi-Agent AI System
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Matter is the central brain created by Guyo. Just like Jarvis has specialized agents, Matter runs multiple AI tools. 
              The flagship agent is <strong>OdinBot</strong>, built to run Guyo's company, help with finances, learn with him, and code software.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Active Flagship</span>
              <span className="text-sm font-bold text-amber-400 font-mono">OdinBot v17.6</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* 3 Active Agents Under Matter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Agent 1: OdinBot */}
        <div 
          onClick={() => setSelectedAgent('odinbot')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
            selectedAgent === 'odinbot'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">OdinBot v17.6</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600">
              Live &amp; Coding
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Razak's personal AI companion. Lives in Guyo's server. Knows all of P3L Developers, clients, finances, school coursework, and codes full software projects like a senior engineer.
          </p>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-[11px] font-mono text-zinc-500">
            <span>Lives: Razak Server</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">Web + Telegram</span>
          </div>
        </div>

        {/* Agent 2: Razak Trading Bot (RTB) */}
        <div 
          onClick={() => setSelectedAgent('rtb')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
            selectedAgent === 'rtb'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Razak Trading Bot (RTB)</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-600">
              Building
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Forex and crypto automated algorithmic trading bot. Built to analyze market movements, calculate dynamic risk parameters, and trade autonomously.
          </p>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-[11px] font-mono text-zinc-500">
            <span>Type: FinTech Bot</span>
            <span className="text-blue-600 font-bold">Active Dev</span>
          </div>
        </div>

        {/* Agent 3: Nokras Bot */}
        <div 
          onClick={() => setSelectedAgent('nokras')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
            selectedAgent === 'nokras'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Nokras Concierge Bot</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-600">
              Building
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            WhatsApp guest assistant for Nokras Resorts in Murang’a and Embu. Handles room inquiries, conference quotations, and guest dining requests.
          </p>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-[11px] font-mono text-zinc-500">
            <span>Type: WhatsApp Agent</span>
            <span className="text-purple-600 font-bold">Staging</span>
          </div>
        </div>
      </div>

      {/* OdinBot Deep Specs & Interactive Chat Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: OdinBot Real Specs */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">OdinBot v17.6 Specs</h3>
                <p className="text-xs text-zinc-500">Guyo's 17th iteration (16 previous versions perfected)</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold">
                Local + Cloud Hybrid
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Architecture:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">200K Fine-Tuned + 70B MoE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Context Window:</span>
                  <span className="text-emerald-600 font-bold">542,000 Tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Vector Embeddings:</span>
                  <span>500,250 Vector Chunks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Where it Lives:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">Razak Server (Local Core)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">
                  What OdinBot Does for Guyo:
                </span>
                <ul className="space-y-1.5 text-[11px] font-sans text-zinc-700 dark:text-zinc-300 list-disc list-inside">
                  <li><strong>Runs P3L Developers:</strong> Tracks all client projects, tasks, and system uptime.</li>
                  <li><strong>Codes Full Software:</strong> Writes frontend, backend APIs, Docker, and fixes bugs.</li>
                  <li><strong>Manages Finances:</strong> Tracks M-Pesa receipts, retainers, and personal bank accounts.</li>
                  <li><strong>Learns Together:</strong> Teaches cybersecurity, KCA exam preparation, and DevOps.</li>
                  <li><strong>Mobile on Telegram:</strong> Talk to it anytime on phone or via web interface.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Oracle Cloud's 10 TB allocation is for training, not application hosting. */}
          <div className="p-5 rounded-2xl bg-zinc-950 text-white border border-zinc-800 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <span className="font-bold text-amber-400 font-sans text-sm flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Training &amp; Server Storage Roles
              </span>
              <span className="text-[10px] text-amber-300">Illustrative allocation</span>
            </div>
            
            <div className="space-y-2 text-[11px] font-sans text-zinc-300">
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                <strong className="text-white block font-mono text-xs text-amber-400">1. Local Razak Server (3 TB Allocated):</strong>
                <p className="text-zinc-400">
                  Holds all active runtime documents, APIs, personal database, prompt chains, and local 8B model weights for instant zero-latency responses.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                <strong className="text-white block font-mono text-xs text-blue-400">2. Oracle Cloud VPS (10 TB allocated):</strong>
                <p className="text-zinc-400">
                  This cloud storage is Guyo's <strong>training storage</strong>. It holds massive datasets, large-scale model checkpoints, raw archives, and heavy fine-tuning jobs. The AI itself runs on Guyo's server.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Interactive OdinBot Chat Interface */}
        <div className="lg:col-span-7 flex flex-col h-[560px] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold font-mono text-xs">
                OB
              </div>
              <div>
                <h4 className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <span>OdinBot Chat Console</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </h4>
                <p className="text-[10.5px] text-zinc-400 font-mono">Running on Razak Server &middot; Telegram Sync Active</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                Context: 542K
              </span>
              <button 
                onClick={() => {
                  setChatMessages([
                    { sender: 'odin', text: "Chat session refreshed. All memory vectors loaded from Razak Server.", time: 'Now' }
                  ]);
                  showToast('OdinBot context reset');
                }}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
                title="Reset Chat"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 font-sans text-xs">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.sender === 'guyo' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-zinc-400">
                  <span>{msg.sender === 'guyo' ? 'Guyo Halake' : 'OdinBot v17.6'}</span>
                  <span>&middot;</span>
                  <span>{msg.time}</span>
                </div>
                <div className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                  msg.sender === 'guyo'
                    ? 'bg-amber-500 text-zinc-950 font-medium rounded-tr-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/60 rounded-tl-xs'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono p-2">
                <Bot className="w-3.5 h-3.5 animate-spin text-amber-500" />
                <span>OdinBot is thinking on Razak Server...</span>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendPrompt} className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-zinc-50/50 dark:bg-zinc-800/30">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Talk to OdinBot (Ask about code, projects, KCA notes, money)..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={isSending || !testPrompt.trim()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
