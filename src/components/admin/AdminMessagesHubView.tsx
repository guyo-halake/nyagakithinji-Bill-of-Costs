import React, { useState } from 'react';
import { 
  MessageSquare, Send, Phone, ExternalLink, Search, CheckCheck, 
  Clock, User, Shield, Terminal, Paperclip, MoreVertical, Plus, 
  Sparkles, CheckCircle2, CornerDownRight, ArrowUpRight
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'client' | 'admin' | 'system';
  senderName: string;
  text: string;
  timestamp: string;
  isRead?: boolean;
}

interface Channel {
  id: string;
  name: string;
  role: string;
  organization: string;
  phone: string;
  whatsappUrl?: string;
  avatarColor: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  isOnline: boolean;
  messages: Message[];
}

interface AdminMessagesHubViewProps {
  showToast: (msg: string) => void;
}

export const AdminMessagesHubView: React.FC<AdminMessagesHubViewProps> = ({ showToast }) => {
  const [activeChannelId, setActiveChannelId] = useState<string>('fresh_city');
  const [inputText, setInputText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [channels, setChannels] = useState<Channel[]>([
    {
      id: 'fresh_city',
      name: 'Rosemary Wakonyo',
      role: 'Store Manager & Owner',
      organization: 'Fresh City Supermarket (Ruiru)',
      phone: '+254 756 111 885',
      whatsappUrl: 'https://wa.me/254756111885',
      avatarColor: 'bg-emerald-500',
      unreadCount: 1,
      lastMessage: 'The new thermal receipt formatting looks much cleaner now. M-Pesa confirmation prints in under 2 seconds!',
      lastMessageTime: '11:42 AM',
      isOnline: true,
      messages: [
        {
          id: 'm1',
          sender: 'admin',
          senderName: 'Guyo (P3L)',
          text: 'Hi Rosemary, pushed the v2.4 update to your POS counter terminal. It fixes the debounce on the auto-cutter and speeds up M-Pesa printouts.',
          timestamp: '10:15 AM',
          isRead: true
        },
        {
          id: 'm2',
          sender: 'client',
          senderName: 'Rosemary Wakonyo',
          text: 'The new thermal receipt formatting looks much cleaner now. M-Pesa confirmation prints in under 2 seconds!',
          timestamp: '11:42 AM',
          isRead: false
        }
      ]
    },
    {
      id: 'sayara',
      name: 'Sarah Guyatu Rashid',
      role: 'Founder & Aesthetician',
      organization: 'Sayara Aesthetics (Nairobi)',
      phone: '+254 722 910 410',
      whatsappUrl: 'https://wa.me/254722910410',
      avatarColor: 'bg-amber-500',
      unreadCount: 0,
      lastMessage: 'Received the STK push test. Weekend bookings report showed all 14 clients without any sync delay.',
      lastMessageTime: '09:18 AM',
      isOnline: true,
      messages: [
        {
          id: 's1',
          sender: 'admin',
          senderName: 'Guyo (P3L)',
          text: 'Morning Sarah. I verified the Daraja STK Push credentials for Sayara. Automatic SMS booking confirmation is active.',
          timestamp: '08:45 AM',
          isRead: true
        },
        {
          id: 's2',
          sender: 'client',
          senderName: 'Sarah Guyatu Rashid',
          text: 'Received the STK push test. Weekend bookings report showed all 14 clients without any sync delay.',
          timestamp: '09:18 AM',
          isRead: true
        }
      ]
    },
    {
      id: 'karani_law',
      name: 'Adv. Nyagah B. Kithinji',
      role: 'Managing Partner',
      organization: 'Karani & Associates Advocates (Upper Hill)',
      phone: '+254 722 145 900',
      whatsappUrl: 'https://wa.me/254722145900',
      avatarColor: 'bg-blue-600',
      unreadCount: 0,
      lastMessage: 'Reviewing the fee earner breakdown in the practice ERP today. We can proceed with the client trust account module.',
      lastMessageTime: 'Yesterday',
      isOnline: false,
      messages: [
        {
          id: 'k1',
          sender: 'admin',
          senderName: 'Guyo (P3L)',
          text: 'Adv. Nyagah, Stage 4 UAT build for the practice ERP is deployed on the Razak local mirror with sample cases loaded.',
          timestamp: 'Yesterday 16:30',
          isRead: true
        },
        {
          id: 'k2',
          sender: 'client',
          senderName: 'Adv. Nyagah B. Kithinji',
          text: 'Reviewing the fee earner breakdown in the practice ERP today. We can proceed with the client trust account module.',
          timestamp: 'Yesterday 17:10',
          isRead: true
        }
      ]
    },
    {
      id: 'adrian_ak',
      name: 'Adrian AK NOC Support',
      role: 'Optical Fiber Dispatch',
      organization: 'Adrian Kenya (Marsabit Line 3674)',
      phone: '+254 700 000 000',
      avatarColor: 'bg-purple-600',
      unreadCount: 0,
      lastMessage: 'Loopback benchmark completed. Circuit 3674 latency verified at 12ms to Nairobi IXP.',
      lastMessageTime: 'Yesterday',
      isOnline: true,
      messages: [
        {
          id: 'a1',
          sender: 'client',
          senderName: 'Adrian AK NOC',
          text: 'Loopback benchmark completed. Circuit 3674 latency verified at 12ms to Nairobi IXP.',
          timestamp: 'Yesterday 12:00',
          isRead: true
        }
      ]
    },
    {
      id: 'p3l_ops_bot',
      name: 'P3L Telemetry Bot',
      role: 'Automated Bot',
      organization: 'Internal Ops & Server Watchdog',
      phone: 'Internal Agent',
      avatarColor: 'bg-zinc-700',
      unreadCount: 0,
      lastMessage: 'Daily backup: 12TB Razak RAID snapshot verified. Checksum SHA-256 match 100%.',
      lastMessageTime: '06:00 AM',
      isOnline: true,
      messages: [
        {
          id: 'b1',
          sender: 'system',
          senderName: 'P3L Watchdog',
          text: 'Daily backup: 12TB Razak RAID snapshot verified. Checksum SHA-256 match 100%.',
          timestamp: '06:00 AM'
        }
      ]
    }
  ]);

  const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'admin',
      senderName: 'Guyo (P3L)',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: true
    };

    setChannels(prev => prev.map(ch => {
      if (ch.id === activeChannel.id) {
        return {
          ...ch,
          lastMessage: newMsg.text,
          lastMessageTime: newMsg.timestamp,
          messages: [...ch.messages, newMsg]
        };
      }
      return ch;
    }));

    setInputText('');
    showToast(`Message sent to ${activeChannel.name}`);
  };

  const handleQuickSnippet = (snippet: string) => {
    setInputText(snippet);
  };

  const filteredChannels = channels.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Header (Minimalist, no enclosing background card) */}
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Messages &amp; Client Dispatch
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Direct communications hub for retail clients, legal stakeholders, and infrastructure NOC
          </p>
        </div>

        {/* Quick status pill */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-zinc-500">Dispatch Gateway:</span>
          <strong className="text-zinc-900 dark:text-white font-bold">Online (Marsabit &bull; Adrian AK)</strong>
        </div>
      </div>

      {/* Main Two-Pane Chat Container */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        {/* Left Column: Channels List (4 cols) */}
        <div className="md:col-span-4 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/50">
          {/* Channel Search Bar */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* List of Channels */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filteredChannels.map((c) => {
              const isActive = c.id === activeChannel.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveChannelId(c.id);
                    // Clear unread
                    setChannels(prev => prev.map(item => item.id === c.id ? { ...item, unreadCount: 0 } : item));
                  }}
                  className={`w-full text-left p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                    isActive 
                      ? 'bg-white dark:bg-zinc-800/80 border-l-3 border-amber-500 shadow-xs' 
                      : 'hover:bg-zinc-100/60 dark:hover:bg-zinc-800/30'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-9 h-9 rounded-full ${c.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-xs`}>
                      {c.name.charAt(0)}
                    </div>
                    {c.isOnline && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute bottom-0 right-0 border-2 border-white dark:border-zinc-900" />
                    )}
                  </div>

                  {/* Channel details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                        {c.name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0 ml-1">
                        {c.lastMessageTime}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 truncate font-sans">
                      {c.organization}
                    </p>

                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate mt-1">
                      {c.lastMessage}
                    </p>
                  </div>

                  {c.unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-full bg-amber-500 text-white shrink-0">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chat View & Composer (8 cols) */}
        <div className="md:col-span-8 flex flex-col h-full bg-white dark:bg-zinc-900">
          {/* Active Chat Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full ${activeChannel.avatarColor} text-white flex items-center justify-center font-bold text-xs`}>
                {activeChannel.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    {activeChannel.name}
                  </h3>
                  {activeChannel.isOnline && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-600">
                      Online
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  {activeChannel.role} &bull; {activeChannel.organization}
                </p>
              </div>
            </div>

            {/* Quick Action: WhatsApp launch */}
            <div className="flex items-center gap-2">
              {activeChannel.whatsappUrl && (
                <a
                  href={activeChannel.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Open WhatsApp Web</span>
                </a>
              )}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans text-xs">
            <div className="text-center my-2">
              <span className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-400">
                End-to-end P3L Client Channel Active
              </span>
            </div>

            {activeChannel.messages.map((m) => {
              const isAdmin = m.sender === 'admin';
              const isSystem = m.sender === 'system';

              if (isSystem) {
                return (
                  <div key={m.id} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                    <span>{m.text}</span>
                    <span className="text-[10px] text-zinc-400">{m.timestamp}</span>
                  </div>
                );
              }

              return (
                <div key={m.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] font-mono text-zinc-400 mb-1 px-1">
                    {m.senderName} &bull; {m.timestamp}
                  </span>
                  <div className={`max-w-[78%] p-3 rounded-2xl ${
                    isAdmin
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-br-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-xs'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 mt-1 px-1">
                      <CheckCheck className="w-3 h-3 text-emerald-500" />
                      <span>Delivered</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Reply Presets */}
          <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-zinc-400 shrink-0 font-mono text-[10px]">Quick replies:</span>
            <button
              onClick={() => handleQuickSnippet('Received, investigating on the local test server right now.')}
              className="px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 whitespace-nowrap cursor-pointer transition-colors"
            >
              Investigating now
            </button>
            <button
              onClick={() => handleQuickSnippet('Update deployed successfully. Please refresh and test.')}
              className="px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 whitespace-nowrap cursor-pointer transition-colors"
            >
              Update deployed
            </button>
            <button
              onClick={() => handleQuickSnippet('Payment confirmed and reconciled via Daraja 2.0 Webhook.')}
              className="px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 whitespace-nowrap cursor-pointer transition-colors"
            >
              Payment reconciled
            </button>
          </div>

          {/* Input Composer */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <input
              type="text"
              placeholder={`Reply to ${activeChannel.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
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

