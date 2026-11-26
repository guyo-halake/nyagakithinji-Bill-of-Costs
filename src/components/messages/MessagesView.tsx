import React, { useEffect, useState, useRef } from 'react';
import {
  Search,
  Send,
  User,
  Paperclip,
  Users,
  Building2,
  Trash2,
  FileText,
  Download,
  Scale,
  Briefcase,
  Check,
  CheckCheck,
  RotateCw,
  Plus,
  Smile,
  ShieldCheck,
  X
} from 'lucide-react';
import { SystemUser, getFeeNotes, getMatters, ExactFeeNoteRecord, ExactMatterRecord } from '../../services/supabase';
import { fetchFirmUsers } from '../../services/data';
import { showToast } from '../admin/ToastNotification';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  text: string;
  channel: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  matterRef?: string;
  createdAt: string;
}

interface MessagesViewProps {
  currentUser?: SystemUser | null;
}

export const MessagesView: React.FC<MessagesViewProps> = ({ currentUser }) => {
  const [colleagues, setColleagues] = useState<SystemUser[]>([]);
  const [selectedColleague, setSelectedColleague] = useState<SystemUser | null>(null);
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Available Matters & Fee Notes for Direct Attachment
  const [feeNotes] = useState<ExactFeeNoteRecord[]>(() => getFeeNotes());
  const [matters] = useState<ExactMatterRecord[]>(() => {
    try {
      const saved = localStorage.getItem('EXACT_MATTERS');
      return saved ? JSON.parse(saved) : getMatters();
    } catch (e) {
      return getMatters();
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load colleagues on mount
  useEffect(() => {
    if (!currentUser?.firmId) {
      setColleagues([]);
      return;
    }

    let isMounted = true;
    fetchFirmUsers(currentUser.firmId).then(users => {
      if (isMounted) {
        // Exclude current user from colleague list
        const others = users.filter(u => u.id !== currentUser?.id && u.workEmail?.toLowerCase() !== currentUser?.workEmail?.toLowerCase());
        setColleagues(others);
        if (others.length > 0 && !selectedColleague) {
          setSelectedColleague(others[0]);
        }
      }
    }).catch(error => {
      console.error('Failed to load firm colleagues:', error);
      showToast('error', 'Could not load colleagues', error.message || 'Check your connection and permissions.');
    });
    return () => { isMounted = false; };
  }, [currentUser]);

  // Load conversation messages between currentUser and selectedColleague
  const loadConversation = async () => {
    if (!currentUser || !selectedColleague) return;
    try {
      const res = await fetch(`/api/v1/messages?user1=${encodeURIComponent(currentUser.id)}&user2=${encodeURIComponent(selectedColleague.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch (e) {}
  };

  // Poll conversation every 3 seconds for real-time responsiveness
  useEffect(() => {
    loadConversation();
    const interval = setInterval(loadConversation, 3000);
    return () => clearInterval(interval);
  }, [currentUser, selectedColleague]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message handler
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !selectedColleague) return;
    if (!messageInput.trim() && !attachment) return;

    setIsSending(true);
    const newMsgPayload = {
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      recipientId: selectedColleague.id,
      recipientName: selectedColleague.fullName,
      text: messageInput.trim(),
      channel: 'internal',
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
      attachmentType: attachment?.type,
    };

    try {
      const res = await fetch('/api/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsgPayload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        }
        setMessageInput('');
        setAttachment(null);
      }
    } catch (err) {}
    setIsSending(false);
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/messages/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setAttachment({
          url: data.url,
          name: data.fileName,
          type: data.fileType
        });
      }
    } catch (e) {}
    setIsUploading(false);
    e.target.value = '';
    setShowAttachMenu(false);
  };

  // Delete message handler
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/v1/messages/${encodeURIComponent(messageId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (e) {}
  };

  // Filter colleagues
  const filteredColleagues = colleagues.filter(c =>
    c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (c.position || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.role || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-140px)] min-h-[580px] rounded-2xl border border-[var(--border-color)] bg-white dark:bg-zinc-900 shadow-xs flex overflow-hidden animate-fadeIn text-xs">
      
      {/* LEFT SIDEBAR: COLLEAGUES ROSTER */}
      <div className="w-72 sm:w-80 border-r border-[var(--border-color)] flex flex-col bg-slate-50/50 dark:bg-zinc-900/60 shrink-0">
        
        {/* Roster Header */}
        <div className="p-4 border-b border-[var(--border-color)] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-brand font-bold text-sm text-slate-900 dark:text-white">
                Staff Chambers Chat
              </h2>
              <p className="text-[11px] text-slate-500">
                Peer-to-Peer Real-Time Legal Communication
              </p>
            </div>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-mono text-[10px] font-bold">
              LIVE
            </span>
          </div>

          {/* Search Colleague */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search advocates & staff..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-white dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Colleagues List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color)]/50">
          {filteredColleagues.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              No colleagues found matching "{search}".
            </div>
          ) : (
            filteredColleagues.map(colleague => {
              const isSelected = selectedColleague?.id === colleague.id;
              return (
                <button
                  key={colleague.id}
                  onClick={() => setSelectedColleague(colleague)}
                  className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-800/90 border-l-4 border-blue-600 dark:border-blue-500 shadow-xs'
                      : 'hover:bg-slate-100/70 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  {/* Avatar Initials with Online Presence Dot */}
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                      {colleague.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-zinc-900" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white truncate text-xs">
                        {colleague.fullName}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {colleague.position || colleague.role || 'Advocate'}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                        {colleague.role || 'Staff'}
                      </span>
                      {colleague.lskNo && (
                        <span className="text-[9.5px] font-mono text-slate-400 truncate">
                          {colleague.lskNo}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

      </div>

      {/* RIGHT MAIN PANEL: ACTIVE CHAT THREAD */}
      {selectedColleague ? (
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900">
          
          {/* Active Colleague Header */}
          <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-slate-50/40 dark:bg-zinc-900/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {selectedColleague.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                    {selectedColleague.fullName}
                  </h3>
                  <span className="text-[9.5px] font-mono px-2 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Available in Chambers
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {selectedColleague.workEmail} &middot; {selectedColleague.position || 'Advocate'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadConversation}
                className="p-2 rounded-xl border border-[var(--border-color)] hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 cursor-pointer transition-colors"
                title="Refresh Thread"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500">
                  <Users className="w-6 h-6" />
                </div>
                <div className="font-semibold text-slate-700 dark:text-zinc-300 text-xs">
                  Start a direct conversation with {selectedColleague.fullName}
                </div>
                <p className="text-[11px] max-w-sm">
                  Send legal briefs, consult on High Court taxation, or attach case files and Fee Notes directly into this thread.
                </p>
              </div>
            ) : (
              messages.map(msg => {
                const isMine = msg.senderId === currentUser?.id || msg.senderName === currentUser?.fullName;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-mono">
                      <span>{msg.senderName}</span>
                      <span>&middot;</span>
                      <span>{msg.createdAt}</span>
                      {isMine && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity ml-1 cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Speech Bubble */}
                    <div
                      className={`max-w-md p-3 rounded-2xl text-xs space-y-2 shadow-xs ${
                        isMine
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-tr-xs'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-tl-xs border border-[var(--border-color)]/60'
                      }`}
                    >
                      {/* Text Content */}
                      {msg.text && (
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      )}

                      {/* Document / File Attachment */}
                      {msg.attachmentUrl && (
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                          isMine
                            ? 'bg-slate-800 dark:bg-slate-100 border-slate-700 dark:border-slate-200'
                            : 'bg-white dark:bg-zinc-900 border-[var(--border-color)]'
                        }`}>
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 shrink-0 text-blue-500" />
                            <span className="truncate font-medium">{msg.attachmentName || 'Legal Document'}</span>
                          </div>
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0 flex items-center gap-1 text-[10px] font-semibold"
                          >
                            <Download className="w-3 h-3" />
                            <span>Open</span>
                          </a>
                        </div>
                      )}

                      {/* Fee Note / Matter Reference Tag */}
                      {msg.matterRef && (
                        <div className={`p-2 rounded-lg font-mono text-[10.5px] border flex items-center gap-1.5 ${
                          isMine
                            ? 'bg-slate-800/80 dark:bg-slate-200/60 border-slate-700 text-emerald-300 dark:text-emerald-700'
                            : 'bg-slate-50 dark:bg-zinc-900/60 border-[var(--border-color)] text-emerald-600 dark:text-emerald-400'
                        }`}>
                          <Scale className="w-3 h-3" />
                          <span>Linked Case File: {msg.matterRef}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Active Attachment Pill before sending */}
          {attachment && (
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-t border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="truncate font-semibold">{attachment.name}</span>
              </div>
              <button
                onClick={() => setAttachment(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
          />

          {/* Chat Composer */}
          <div className="p-3.5 border-t border-[var(--border-color)] bg-slate-50/50 dark:bg-zinc-900/50 relative">
            
            {/* Quick Attach Dropdown */}
            {showAttachMenu && (
              <div className="absolute bottom-full left-4 mb-2 w-72 rounded-xl bg-white dark:bg-zinc-900 border border-[var(--border-color)] shadow-xl p-2 space-y-1 z-30">
                <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase text-slate-400">
                  Attach Case Record
                </div>
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-left text-xs transition-colors"
                >
                  <Paperclip className="w-4 h-4 text-blue-500" />
                  <span>Upload File from Computer (PDF, Doc)</span>
                </button>

                {feeNotes.length > 0 && (
                  <div className="pt-1 border-t border-[var(--border-color)]">
                    <div className="px-2 py-1 text-[9.5px] font-mono uppercase text-slate-400">
                      Share Active Fee Note
                    </div>
                    {feeNotes.slice(0, 3).map(fn => (
                      <button
                        key={fn.id}
                        type="button"
                        onClick={() => {
                          setMessageInput(`Regarding Fee Note ${fn.billNumber} (${fn.clientName}) — Total: KES ${fn.grandTotal.toLocaleString()}`);
                          setShowAttachMenu(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-left text-[11px] truncate"
                      >
                        <span className="font-mono font-bold text-blue-600 truncate">{fn.billNumber}</span>
                        <span className="text-slate-400 text-[10px]">KES {fn.grandTotal.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-2.5 rounded-xl border border-[var(--border-color)] bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                title="Attach Document or Case File"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder={`Message ${selectedColleague.fullName}...`}
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                className="flex-1 p-2.5 rounded-xl border border-[var(--border-color)] bg-white dark:bg-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              />

              <button
                type="submit"
                disabled={isSending || (!messageInput.trim() && !attachment)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-center">
          Select an advocate or staff member to view conversation.
        </div>
      )}

    </div>
  );
};
