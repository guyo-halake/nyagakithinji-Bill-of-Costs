import React, { useState, useEffect } from 'react';
import { 
  Users, Phone, Mail, MapPin, Search,
  MessageCircle, FileText, Plus, 
  ExternalLink, X
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
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'active' | 'progress' | 'portfolio'>('all');
  const [expandedActivityClient, setExpandedActivityClient] = useState<string | null>(null);

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

  const getClientCategory = (client: typeof clients[number]) => {
    const status = client.status.toLowerCase();
    if (status.includes('active paying')) return 'active';
    if (status.includes('progress')) return 'progress';
    return 'portfolio';
  };
  const normalizedClientSearch = clientSearchQuery.trim().toLowerCase();
  const visibleClients = clients.filter(client => {
    const matchesStatus = clientStatusFilter === 'all' || getClientCategory(client) === clientStatusFilter;
    const searchable = `${client.name} ${client.company} ${client.phone} ${client.email} ${client.location} ${client.status} ${client.projectName}`.toLowerCase();
    return matchesStatus && (!normalizedClientSearch || searchable.includes(normalizedClientSearch));
  });

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
    let phone = client.phone.replace(/\D/g, '');
    if (phone.startsWith('2540')) phone = `254${phone.slice(4)}`;
    else if (phone.startsWith('0')) phone = `254${phone.slice(1)}`;
    if (!/^254[17]\d{8}$/.test(phone)) {
      showToast(`WhatsApp is unavailable because ${client.name} does not have a valid Kenyan mobile number.`);
      return;
    }
    const text = encodeURIComponent(`Hi ${client.name.split(' ')[0]}, this is Guyo Halake from P3L Developers regarding ${client.projectName}. Hope everything is running smoothly!`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
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
              {clients.length} Accounts
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Client contacts, agreements, payment summaries, and recent activity
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { key: 'all', label: 'All accounts', count: clients.length },
          { key: 'active', label: 'Active', count: clients.filter(client => getClientCategory(client) === 'active').length },
          { key: 'progress', label: 'In progress', count: clients.filter(client => getClientCategory(client) === 'progress').length },
          { key: 'portfolio', label: 'Portfolio', count: clients.filter(client => getClientCategory(client) === 'portfolio').length },
        ].map(metric => (
          <button
            key={metric.key}
            type="button"
            onClick={() => setClientStatusFilter(metric.key as typeof clientStatusFilter)}
            className={`rounded-xl border px-4 py-3 text-left transition-colors ${
              clientStatusFilter === metric.key
                ? 'border-emerald-500/60 bg-emerald-500/5'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600'
            }`}
          >
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{metric.label}</span>
            <span className="mt-1 block text-lg font-bold text-zinc-900 dark:text-white">{metric.count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="flex max-w-lg flex-1 items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-400 focus-within:border-emerald-500">
          <Search className="h-4 w-4 shrink-0" />
          <input
            type="search"
            value={clientSearchQuery}
            onChange={event => setClientSearchQuery(event.target.value)}
            placeholder="Search clients, companies, contacts"
            aria-label="Search clients"
            className="w-full bg-transparent text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none"
          />
          {clientSearchQuery && (
            <button type="button" onClick={() => setClientSearchQuery('')} aria-label="Clear client search">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
        <p className="text-[11px] text-zinc-500">
          Showing <strong className="text-zinc-700 dark:text-zinc-300">{visibleClients.length}</strong> of {clients.length} accounts
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/70 text-[10px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Client</th>
                <th scope="col" className="px-4 py-3 font-semibold">Contact</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Agreement</th>
                <th scope="col" className="px-4 py-3 font-semibold">Paid to date</th>
                <th scope="col" className="px-4 py-3 font-semibold">Recent activity</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {visibleClients.map(client => (
                <React.Fragment key={client.id}>
                  <tr className="align-top hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-zinc-900 dark:text-white">{client.name}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">{client.company}</p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-400">
                        <MapPin className="h-3 w-3" />{client.location}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600">
                        <Phone className="h-3 w-3 text-zinc-400" />{client.phone}
                      </a>
                      <a href={`mailto:${client.email}`} className="mt-1 flex max-w-[190px] items-center gap-1.5 truncate text-[11px] text-zinc-500 hover:text-emerald-600">
                        <Mail className="h-3 w-3 shrink-0 text-zinc-400" />{client.email}
                      </a>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex max-w-[180px] rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        getClientCategory(client) === 'active'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : getClientCategory(client) === 'progress'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {client.status.replace(/&middot;/g, '·')}
                      </span>
                    </td>
                    <td className="max-w-[240px] px-4 py-3.5 text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {client.contract.replace(/&middot;/g, '·')}
                    </td>
                    <td className="px-4 py-3.5">
                      {/^\s*KES\s[\d,]+(?:\.\d{1,2})?\s*$/i.test(client.totalPaid) ? (
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{client.totalPaid}</span>
                      ) : (
                        <span className="text-[11px] text-zinc-500" title={client.totalPaid}>Not recorded as a cash total</span>
                      )}
                    </td>
                    <td className="max-w-[230px] px-4 py-3.5">
                      <p className="text-[10px] font-medium text-zinc-400">{client.lastContact}</p>
                      <p className="mt-1 truncate text-[11px] text-zinc-600 dark:text-zinc-400" title={client.activity[0]}>
                        {client.activity[0]}
                      </p>
                      <button
                        type="button"
                        onClick={() => setExpandedActivityClient(value => value === client.id ? null : client.id)}
                        className="mt-1 text-[10px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                        aria-expanded={expandedActivityClient === client.id}
                      >
                        {expandedActivityClient === client.id ? 'Hide history' : `View history (${client.activity.length})`}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(client)}
                          title={`Message ${client.name} on WhatsApp`}
                          aria-label={`WhatsApp ${client.name}`}
                          className="rounded-lg border border-emerald-200 dark:border-emerald-900/70 p-2 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenNote(client.id)}
                          title={`Notes for ${client.name}`}
                          aria-label={`Open notes for ${client.name}`}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-2 text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDossier(client.projectId)}
                          title={`Open ${client.name} dossier`}
                          aria-label={`Open dossier for ${client.name}`}
                          className="rounded-lg bg-zinc-900 p-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedActivityClient === client.id && (
                    <tr className="bg-zinc-50/70 dark:bg-zinc-800/20">
                      <td colSpan={7} className="px-5 py-3">
                        <ul className="grid gap-2 md:grid-cols-2">
                          {client.activity.map((activity, index) => (
                            <li key={`${client.id}-activity-${index}`} className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                              <span className="mr-2 text-emerald-600 dark:text-emerald-400">•</span>{activity}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {visibleClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Search className="mx-auto h-6 w-6 text-zinc-400" />
                    <p className="mt-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">No clients match these filters</p>
                    <button
                      type="button"
                      onClick={() => { setClientSearchQuery(''); setClientStatusFilter('all'); }}
                      className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
