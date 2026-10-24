import React, { useState } from 'react';
import { HelpCircle, Bot, Mail, Phone, Globe, Save, CheckCircle2, Sliders, Bell, Zap, MessageSquare } from 'lucide-react';

export const AdminSupportSettingsView: React.FC = () => {
  const [slaTarget, setSlaTarget] = useState('1');
  const [mattaPrompt, setMattaPrompt] = useState("Hello, welcome to Nyagah B. Kithinji & Co. Advocates Helpdesk, how may I assist you?");
  const [autoReplyEmail, setAutoReplyEmail] = useState(true);
  const [adminEmail1, setAdminEmail1] = useState('alexkaranivic@gmail.com');
  const [adminEmail2, setAdminEmail2] = useState('guyohalakeofficial@gmail.com');
  const [adminPhone, setAdminPhone] = useState('+254 768 141 129');
  const [webhookUrl, setWebhookUrl] = useState('https://p3ldevelopers.vercel.app/api/webhooks/tickets');
  const [escalationHours, setEscalationHours] = useState('2');
  const [collectFeedback, setCollectFeedback] = useState(true);
  const [aiModel, setAiModel] = useState('matta-v2-turbo');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="w-full space-y-8 pb-12 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)]/50 pb-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold text-[10px]">
            ADMIN CONTROL PANEL
          </span>
          <h1 className="font-brand font-extrabold text-2xl text-[var(--text-main)] tracking-tight mt-1">
            Tech Support & Helpdesk Admin Controls
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            11 Master Configuration Features for P3L Helpdesk SLAs, Matta AI Tuning & Webhooks
          </p>
        </div>

        <button
          onClick={handleSave}
          className="btn-black px-5 py-2.5 text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
        >
          {isSaved ? <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Support Saved!</> : <><Save className="w-4 h-4" /> Save Helpdesk Config</>}
        </button>
      </div>

      {/* 11 Packed Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* 1. SLA Target */}
        <div className="vercel-card p-5 space-y-3">
          <h3 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <HelpCircle className="w-4 h-4 text-blue-500" /> 1. P3L SLA Response Target
          </h3>
          <select
            value={slaTarget}
            onChange={(e) => setSlaTarget(e.target.value)}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 font-mono text-xs text-[var(--text-main)] focus:outline-none"
          >
            <option value="1">1 Hour Response SLA (Critical Tickets)</option>
            <option value="4">4 Hours Response SLA (Standard Tickets)</option>
            <option value="24">24 Hours Response SLA (General Inquiry)</option>
          </select>
        </div>

        {/* 2. Matta AI Prompt */}
        <div className="vercel-card p-5 space-y-3">
          <h3 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <Bot className="w-4 h-4 text-emerald-500" /> 2. Matta AI Greeting System Prompt
          </h3>
          <textarea
            rows={2}
            value={mattaPrompt}
            onChange={(e) => setMattaPrompt(e.target.value)}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl p-2.5 font-sans text-xs text-[var(--text-main)] focus:outline-none"
          />
        </div>

        {/* 3. Auto-Reply Email */}
        <div className="vercel-card p-5 space-y-3">
          <h3 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <Mail className="w-4 h-4 text-purple-500" /> 3. Email Auto-Responder Toggle
          </h3>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[var(--text-muted)]">Auto-reply to ticket submissions:</span>
            <input
              type="checkbox"
              checked={autoReplyEmail}
              onChange={(e) => setAutoReplyEmail(e.target.checked)}
              className="w-4 h-4 accent-black dark:accent-white cursor-pointer"
            />
          </div>
        </div>

        {/* 4. Admin Email 1 */}
        <div className="vercel-card p-5 space-y-3">
          <h3 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <Mail className="w-4 h-4 text-indigo-500" /> 4. P3L Admin Primary Email
          </h3>
          <input
            type="email"
            value={adminEmail1}
            onChange={(e) => setAdminEmail1(e.target.value)}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 font-mono text-xs text-[var(--text-main)] focus:outline-none"
          />
        </div>

        {/* 5. Admin Email 2 */}
        <div className="vercel-card p-5 space-y-3">
          <h3 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <Mail className="w-4 h-4 text-rose-500" /> 5. P3L Admin Secondary Email
          </h3>
          <input
            type="email"
            value={adminEmail2}
            onChange={(e) => setAdminEmail2(e.target.value)}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 font-mono text-xs text-[var(--text-main)] focus:outline-none"
          />
        </div>

        {/* 6. Admin Phone */}
        <div className="vercel-card p-5 space-y-3">
          <h3 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <Phone className="w-4 h-4 text-teal-500" /> 6. P3L Direct Hotline Phone Number
          </h3>
          <input
            type="text"
            value={adminPhone}
            onChange={(e) => setAdminPhone(e.target.value)}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 font-mono text-xs text-[var(--text-main)] focus:outline-none"
          />
        </div>

        {/* 7. Webhook URL */}
        <div className="vercel-card p-5 space-y-3">
          <h3 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <Zap className="w-4 h-4 text-amber-500" /> 7. Support Webhook Dispatch URL
          </h3>
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 font-mono text-xs text-[var(--text-main)] focus:outline-none"
          />
        </div>

        {/* 8. Escalation Timer */}
        <div className="vercel-card p-5 space-y-3">
          <h3 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <Bell className="w-4 h-4 text-cyan-500" /> 8. Auto-Escalation Unanswered Timer
          </h3>
          <select
            value={escalationHours}
            onChange={(e) => setEscalationHours(e.target.value)}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 font-mono text-xs text-[var(--text-main)] focus:outline-none"
          >
            <option value="2">2 Hours Escalation Timer</option>
            <option value="6">6 Hours Escalation Timer</option>
          </select>
        </div>

        {/* 9. AI Model Selection */}
        <div className="vercel-card p-5 space-y-3">
          <h3 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
            <Bot className="w-4 h-4 text-indigo-500" /> 9. Matta AI LLM Engine Version
          </h3>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 font-mono text-xs text-[var(--text-main)] focus:outline-none"
          >
            <option value="matta-v2-turbo">Matta AI v2.4 Legal Turbo</option>
            <option value="matta-v3-preview">Matta AI v3.0 Preview</option>
          </select>
        </div>

      </div>
    </div>
  );
};

export default AdminSupportSettingsView;
