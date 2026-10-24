import React, { useEffect, useState } from 'react';
import { ExactVaultFileRecord, SystemUser } from '../../services/supabase';
import { createDocumentDownloadUrl, deleteDocument, fetchDocuments, uploadDocument } from '../../services/data';
import { hasPermission } from '../../services/rbac';
import {
  Search,
  Upload,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Film,
  Music,
  MoreVertical,
  Download,
  Share2,
  Trash2,
  ExternalLink,
  Eye,
  FolderOpen,
  LayoutGrid,
  Table as TableIcon,
  X,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Building2,
  Briefcase,
  Calculator
} from 'lucide-react';

interface DocumentVaultViewProps {
  currentUser?: SystemUser | null;
}

export const DocumentVaultView: React.FC<DocumentVaultViewProps> = ({ currentUser }) => {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'pdfs' | 'excels' | 'multimedia'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [fileList, setFileList] = useState<ExactVaultFileRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [, setPermissionTick] = useState(0);

  const can = (code: string) => hasPermission(currentUser, code);
  
  // Active Context Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // File Preview Modal State
  const [previewFile, setPreviewFile] = useState<ExactVaultFileRecord | null>(null);

  useEffect(() => {
    const handlePermissions = () => {
      setPermissionTick(t => t + 1);
    };
    window.addEventListener('permissionsUpdated', handlePermissions);
    window.addEventListener('storage', handlePermissions);
    return () => {
      window.removeEventListener('permissionsUpdated', handlePermissions);
      window.removeEventListener('storage', handlePermissions);
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.firmId) return;
    const loadDocuments = () => fetchDocuments(currentUser.firmId!).then(setFileList).catch(error => setErrorMessage(error.message || 'Unable to load documents.'));
    void loadDocuments();
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ table?: string }>).detail;
      if (detail?.table === 'documents') void loadDocuments();
    };
    window.addEventListener('databaseRealtimeUpdate', handleRealtime);
    return () => window.removeEventListener('databaseRealtimeUpdate', handleRealtime);
  }, [currentUser?.firmId]);

  // File Upload Handler (Connected to Supabase Storage state)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!currentUser?.firmId || !currentUser.id) return;
      try {
        const newRecord = await uploadDocument(currentUser.firmId, currentUser.id, file);
        setFileList(prev => [newRecord, ...prev]);
      } catch (error: any) {
        setErrorMessage(error.message || `Unable to upload ${file.name}.`);
      }
    }
  };

  // Filter & Search Logic
  const filtered = fileList.filter(f => {
    const matchesSearch =
      f.filename.toLowerCase().includes(search.toLowerCase()) ||
      f.matter.toLowerCase().includes(search.toLowerCase()) ||
      f.client.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterCategory === 'pdfs') return f.filename.toLowerCase().endsWith('.pdf') || f.fileType.includes('PDF');
    if (filterCategory === 'excels') return f.filename.toLowerCase().endsWith('.xlsx') || f.filename.toLowerCase().endsWith('.csv') || f.fileType.includes('Excel');
    if (filterCategory === 'multimedia') return f.fileType.includes('Multimedia') || f.filename.toLowerCase().match(/\.(png|jpg|jpeg|mp4|mp3|wav)$/);

    return true;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.filename.localeCompare(b.filename);
    if (sortBy === 'size') return parseInt(b.size) - parseInt(a.size);
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  // Action Menu Handlers
  const handleOpenFile = (f: ExactVaultFileRecord) => {
    setPreviewFile(f);
    setActiveMenuId(null);
  };

  const handleDownload = async (f: ExactVaultFileRecord) => {
    try {
      const url = await createDocumentDownloadUrl(f.path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      setErrorMessage(error.message || `Unable to download ${f.filename}.`);
    }
    setActiveMenuId(null);
  };

  const handleShare = async (f: ExactVaultFileRecord) => {
    try {
      const url = await createDocumentDownloadUrl(f.path);
      await navigator.clipboard.writeText(url);
    } catch (error: any) {
      setErrorMessage(error.message || `Unable to share ${f.filename}.`);
    }
    setActiveMenuId(null);
  };

  const handleDelete = async (f: ExactVaultFileRecord) => {
    if (confirm(`Are you sure you want to delete "${f.filename}" from Supabase storage?`)) {
      if (!currentUser?.firmId) return;
      try {
        await deleteDocument(currentUser.firmId, f.id, f.path);
        setFileList(prev => prev.filter(item => item.id !== f.id));
      } catch (error: any) {
        setErrorMessage(error.message || `Unable to delete ${f.filename}.`);
      }
    }
    setActiveMenuId(null);
  };

  const getFileIcon = (file: ExactVaultFileRecord) => {
    const lower = file.filename.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.csv') || file.fileType.includes('Excel')) {
      return <FileSpreadsheet className="w-10 h-10 text-emerald-500 shrink-0" />;
    }
    if (lower.endsWith('.pdf') || file.fileType.includes('PDF')) {
      return <FileText className="w-10 h-10 text-red-500 shrink-0" />;
    }
    if (lower.match(/\.(png|jpg|jpeg|svg)$/)) {
      return <ImageIcon className="w-10 h-10 text-blue-500 shrink-0" />;
    }
    if (lower.match(/\.(mp4|mov|avi)$/)) {
      return <Film className="w-10 h-10 text-purple-500 shrink-0" />;
    }
    if (lower.match(/\.(mp3|wav)$/)) {
      return <Music className="w-10 h-10 text-amber-500 shrink-0" />;
    }
    return <FileText className="w-10 h-10 text-gray-500 shrink-0" />;
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner */}
      <div className="pt-1 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--border-color)]/50 pb-3">
        <div>
          <h1 className="font-brand font-extrabold text-xl sm:text-2xl text-[var(--text-main)] tracking-tight">
            Documents
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 font-sans">
            Legal PDFs, Excel statements, media, and cause filings
          </p>
        </div>

        {/* Upload Button connected to Supabase storage */}
        {can('vault.upload') && (
          <label className="btn-black px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer">
            <Upload className="w-4 h-4" /> Upload File
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.xlsx,.csv,.docx,.png,.jpg,.jpeg,.mp4"
            />
          </label>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 text-xs">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documentation by file, case, client..."
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl pl-10 pr-3.5 py-2 text-xs text-[var(--text-main)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-color)]">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-[var(--btn-bg)] text-[var(--btn-text)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterCategory('pdfs')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterCategory === 'pdfs'
                  ? 'bg-[var(--btn-bg)] text-[var(--btn-text)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              PDFs
            </button>
            <button
              onClick={() => setFilterCategory('excels')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterCategory === 'excels'
                  ? 'bg-[var(--btn-bg)] text-[var(--btn-text)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Excels
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-color)]">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-[var(--btn-bg)] text-[var(--btn-text)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[var(--btn-bg)] text-[var(--btn-text)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CARD VIEW MODE */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((f: ExactVaultFileRecord) => (
            <div
              key={f.id}
              onClick={() => {
                if (can('vault.preview')) handleOpenFile(f);
              }}
              className={`vercel-card-interactive p-5 space-y-4 flex flex-col justify-between relative group min-w-0 ${!can('vault.preview') ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="flex items-start gap-3 min-w-0">
                {getFileIcon(f)}
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="font-bold text-xs text-[var(--text-main)] truncate leading-snug">
                    {f.filename}
                  </h3>
                  <p className="text-[10.5px] text-[var(--text-muted)] font-mono truncate">
                    {f.client}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                    {f.matter}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[var(--text-muted)]">{f.size} &bull; {f.updatedAt}</span>
                {can('vault.preview') && <span className="font-bold text-[var(--text-main)] group-hover:underline">Preview & Metrics →</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABLE VIEW MODE */}
      {viewMode === 'table' && (
        <div className="vercel-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--text-main)]">
              <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase text-[10px] tracking-wider border-b border-[var(--border-color)] font-semibold">
                <tr>
                  <th className="px-4 py-3.5">Filename & Type</th>
                  <th className="px-4 py-3.5">Client & Matter</th>
                  <th className="px-4 py-3.5 font-mono">File Size</th>
                  <th className="px-4 py-3.5 font-mono">Updated Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filtered.map((f: ExactVaultFileRecord) => (
                  <tr 
                    key={f.id} 
                    className={`hover:bg-[var(--bg-subtle)] transition-colors ${can('vault.preview') ? 'cursor-pointer' : 'cursor-default'}`} 
                    onClick={() => {
                      if (can('vault.preview')) handleOpenFile(f);
                    }}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {getFileIcon(f)}
                        <div>
                          <strong className="font-bold text-[var(--text-main)] block">{f.filename}</strong>
                          <span className="text-[10.5px] text-[var(--text-muted)] font-mono">{f.fileType}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <strong className="text-[var(--text-main)] block truncate">{f.client}</strong>
                      <span className="text-[10.5px] text-[var(--text-muted)] truncate block">{f.matter}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-[var(--text-muted)]">{f.size}</td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-[var(--text-muted)]">{f.updatedAt}</td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {can('vault.preview') && (
                          <button
                            onClick={() => handleOpenFile(f)}
                            className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                            title="Preview Metrics"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {can('vault.download') && (
                          <button
                            onClick={() => handleDownload(f)}
                            className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FILE PREVIEW & METRICS MODAL */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] w-full max-w-2xl rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto text-xs">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                {getFileIcon(previewFile)}
                <div>
                  <h3 className="font-mono font-bold text-sm text-[var(--text-main)]">{previewFile.filename}</h3>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">{previewFile.fileType} &bull; {previewFile.size} &bull; {previewFile.updatedAt}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-xl border border-[var(--border-color)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client & Matter Details */}
            <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-[var(--text-main)]">Legal Cause & Client Entity</span>
              </div>
              <p className="text-xs font-semibold text-[var(--text-main)]">{previewFile.matter}</p>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">Client Entity: {previewFile.client}</p>
            </div>

            {/* Extracted Remuneration Order Metrics */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
                <Calculator className="w-4 h-4 text-emerald-500" />
                <h4 className="font-brand font-bold text-xs uppercase text-[var(--text-main)] tracking-wider">
                  Extracted Remuneration Order Metrics (LN 64/1962 ed. 2022)
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold uppercase">Subject Claim Value</span>
                  <strong className="text-xs font-bold text-[var(--text-main)]">
                    Kshs {previewFile.extractedMetrics.claimValue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold uppercase">Instruction Fee</span>
                  <strong className="text-xs font-bold text-[var(--text-main)]">
                    Kshs {previewFile.extractedMetrics.instructionFee.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold uppercase">Getting-Up Fee (1/3)</span>
                  <strong className="text-xs font-bold text-[var(--text-main)]">
                    Kshs {previewFile.extractedMetrics.gettingUpFee.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] sm:col-span-3 flex items-center justify-between bg-emerald-500/10 border-emerald-500/30">
                  <div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold uppercase">Calculated Grand Total</span>
                    <strong className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      Kshs {previewFile.extractedMetrics.grandTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-bold">
                    ✓ Verified Legal Bill
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => handleShare(previewFile)}
                className="btn-outline px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> Share Link
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="btn-black px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentVaultView;
