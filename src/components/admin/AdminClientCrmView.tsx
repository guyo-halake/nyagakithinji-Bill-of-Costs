import React, { useState, useEffect } from 'react';
import { 
  Users, Phone, Mail, MapPin, 
  MessageCircle, FileText, Plus, 
  ExternalLink, Clock, ShieldCheck, X
} from 'lucide-react';

interface AdminClientCrmViewProps {
  onOpenDossier: (projectId: string) => void;
  showToast: (msg: string) => void;
}

export const AdminClientCrmView: React.FC<AdminClientCrmViewProps> = ({
  onOpenDossier,
  showToast
}) => {
  // Local persistent notes state
  const [clientNotes, setClientNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('p3l_client_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeNoteClient, setActiveNoteClient] = useState<string | null>(null);
  const [currentNoteText, setCurrentNoteText] = useState('');
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  // New Client Form
  const [newClientName, setNewClientName] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientContract, setNewClientContract] = useState('');

  const clients = [
    {
      id: 'cli-rosemary',
      name: 'Rosemary Wakonyo',
      company: 'Fresh Fity Supermarket',
      phone: '+254 756 111 885',
      email: 'rosemary@freshfity.co.ke',
      location: 'Ruiru Town · Kiambu County',
      health: 'green',
      healthScore: 98,
      status: 'Active Paying (10 Months Live In-Store)',
      contract: 'KES 32,000 Setup Settled &middot; KES 3,500/Month Maintenance',
      nextDue: '01 Nov 2026',
      totalPaid: 'KES 63,500',
      projectId: 'prj-fresh-fity',
      projectName: 'Fresh Fity Supermarket POS',
      lastContact: '01 Oct 2026',
      activity: [
        '01 Oct 2026: October maintenance KES 3,500 settled via M-Pesa.',
        '14 Sept 2026: Thermal printer USB daemon buffer optimized.',
        '01 Sept 2026: September maintenance KES 3,500 settled.'
      ]
    },
    {
      id: 'cli-sarah',
      name: 'Sarah Guyatu Rashid',
      company: 'Sayara Aesthetics & Beauty',
      phone: '+254 114 807 215',
      email: 'sarahguyatu2@gmail.com',
      location: 'Nairobi & Marsabit Operations',
      health: 'green',
      healthScore: 95,
      status: 'Active Paying (13 Months)',
      contract: 'KES 10,000 Storefront Settled &middot; % Commission on Sales + Daemon Retainer',
      nextDue: '01 Nov 2026',
      totalPaid: 'KES 48,200',
      projectId: 'prj-sayara-aesthetics',
      projectName: 'Sayara E-commerce & Shein API',
      lastContact: '28 Sept 2026',
      activity: [
        '28 Sept 2026: September commission KES 4,200 received.',
        '12 Sept 2026: Shein scraper daemon proxy pool rotated on port 8040.',
        '25 Aug 2026: August commission KES 3,850 settled.'
      ]
    },
    {
      id: 'cli-suvplanet',
      name: 'SUVPlanet Auto Traders',
      company: 'SUVPlanet Kenya Marketplace',
      phone: '+254 733 000 000',
      email: 'sales@suvplanet.co.ke',
      location: 'Showroom, Nairobi',
      health: 'green',
      healthScore: 90,
      status: 'Active Paying',
      contract: 'KES 5,500 Initial Settled &middot; KES 400 / 2 Months Listing Ads',
      nextDue: '15 Nov 2026',
      totalPaid: 'KES 6,700',
      projectId: 'prj-suvplanet',
      projectName: 'SUVPlanet Auto Traders',
      lastContact: '15 Sept 2026',
      activity: [
        '15 Sept 2026: Bi-monthly listing ad fee KES 400 settled.',
        '10 Aug 2026: High-res vehicle spec sheet modal updated.',
        '15 July 2026: Listing ad fee KES 400 settled.'
      ]
    },
    {
      id: 'cli-kithinji',
      name: 'Adv. Nyagah B. Kithinji',
      company: 'Nyagah B. Kithinji & Co. Advocates',
      phone: '+254 (0)20 271 8900',
      email: 'advocate@kithinjilegal.co.ke',
      location: 'Upper Hill, Nairobi',
      health: 'amber',
      healthScore: 82,
      status: 'In Progress (Stage 4 UAT)',
      contract: 'Milestone Retainer &middot; Schedule 6 Calculator & Azure ACR Compose',
      nextDue: 'Stage 4 UAT',
      totalPaid: 'Milestone Retainer',
      projectId: 'prj-karani-law',
      projectName: 'Karani Law & BillsZip ERP',
      lastContact: '14 Oct 2026',
      activity: [
        '14 Oct 2026: Real Supabase user management verified in production.',
        '11 Oct 2026: Schedule 6 getting-up fee progressive formula verified.',
        '04 Oct 2026: Azure multi-container Docker deployment orchestrated.'
      ]
    },
    {
      id: 'cli-nokras',
      name: 'Nokras Management Group',
      company: 'Nokras Hotels & Resorts',
      phone: '+254 720 000 333',
      email: 'bookings@nokras.co.ke',
      location: 'Murang’a & Embu, Kenya',
      health: 'gray',
      healthScore: 75,
      status: 'Non-paying &middot; Portfolio',
      contract: 'P3L Flagship Portfolio Showcase &middot; Non-paying',
      nextDue: 'N/A',
      totalPaid: 'Portfolio Showcase',
      projectId: 'prj-nokras-hotel',
      projectName: 'Nokras Hotel & Resort Platform',
      lastContact: '18 Sept 2026',
      activity: [
        '18 Sept 2026: Conference hall package quotation engine updated.',
        '12 July 2026: Panoramic room gallery lazy-loading optimized.'
      ]
    }
  ];

  const handleSaveNote = (clientId: string) => {
    const updated = { ...clientNotes, [clientId]: currentNoteText };
    setClientNotes(updated);
    try {
      localStorage.setItem('p3l_client_notes', JSON.stringify(updated));
    } catch {}
    setActiveNoteClient(null);
    showToast('Client notes saved to local storage.');
  };

  const handleOpenNote = (clientId: string) => {
    setActiveNoteClient(clientId);
    setCurrentNoteText(clientNotes[clientId] || '');
  };

  const handleSendWhatsApp = (client: typeof clients[0]) => {
    const text = encodeURIComponent(`Hi ${client.name.split(' ')[0]}, this is Guyo Halake from P3L Developers regarding ${client.projectName}. Hope everything is running smoothly!`);
    window.open(`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
    showToast(`Opening WhatsApp Web for ${client.name}...`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Minimalist Header (No Card Background) */}
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Clients
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              5 Accounts
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Client contacts, WhatsApp messages, and monthly retainer details
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setShowAddClientModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Client
          </button>
        </div>
      </div>

      {/* 5 Real Client Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
        {clients.map((c) => (
          <div 
            key={c.id} 
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
          >
            <div className="space-y-3">
              {/* Card Header with Health Score Ring */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{c.name}</h3>
                  <p className="text-xs font-semibold text-zinc-500">{c.company}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${c.health === 'green' ? 'bg-emerald-500' : c.health === 'amber' ? 'bg-amber-500' : 'bg-zinc-400'}`}></span>
                  <span className="font-mono text-[10px] font-bold text-zinc-500">{c.healthScore}%</span>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${c.health === 'green' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : c.health === 'amber' ? 'bg-amber-500/10 text-amber-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                  {c.status}
                </span>
              </div>

              {/* Contact Information */}
              <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{c.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="truncate">{c.location}</span>
                </div>
              </div>

              {/* Contract Terms */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 text-[11px] space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Agreed Contract</span>
                <p className="text-zinc-900 dark:text-white font-medium" dangerouslySetInnerHTML={{ __html: c.contract }} />
                <div className="flex justify-between pt-1 border-t border-zinc-200/50 dark:border-zinc-800 font-mono text-[10px]">
                  <span className="text-zinc-400">Total Settled:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{c.totalPaid}</span>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Recent Touchpoints</span>
                <div className="space-y-1 text-[11px] text-zinc-500">
                  {c.activity.slice(0, 2).map((act, i) => (
                    <p key={i} className="truncate">&bull; {act}</p>
                  ))}
                </div>
              </div>

              {/* Saved Notes Snippet */}
              {clientNotes[c.id] && (
                <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200">
                  <span className="font-bold block text-[10px] uppercase font-mono text-amber-700 dark:text-amber-400">Client Note:</span>
                  <p className="italic">"{clientNotes[c.id]}"</p>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2 font-mono text-xs">
              <button 
                onClick={() => handleSendWhatsApp(c)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>

              <button 
                onClick={() => handleOpenNote(c.id)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-[11px] cursor-pointer"
              >
                Notes
              </button>

              <button 
                onClick={() => onOpenDossier(c.projectId)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                Dossier
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Persistent Note Modal */}
      {activeNoteClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                Client Notes (Stored Locally)
              </h3>
              <button 
                onClick={() => setActiveNoteClient(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea 
              rows={4}
              value={currentNoteText}
              onChange={(e) => setCurrentNoteText(e.target.value)}
              placeholder="Enter private client details, preferences, or technical notes..."
              className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 font-sans"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => setActiveNoteClient(null)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleSaveNote(activeNoteClient)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                Add New Client Account
              </h3>
              <button 
                onClick={() => setShowAddClientModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Contact Name</label>
                <input 
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Company / Organization</label>
                <input 
                  type="text"
                  value={newClientCompany}
                  onChange={(e) => setNewClientCompany(e.target.value)}
                  placeholder="e.g. Apex Holdings Kenya"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Phone</label>
                  <input 
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="+254 7..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Email</label>
                  <input 
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="client@domain.co.ke"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Agreed Terms (KES)</label>
                <input 
                  type="text"
                  value={newClientContract}
                  onChange={(e) => setNewClientContract(e.target.value)}
                  placeholder="e.g. KES 5,000/month maintenance"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => setShowAddClientModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowAddClientModal(false);
                  showToast(`Client account "${newClientCompany || newClientName}" staged in CRM.`);
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Save Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
