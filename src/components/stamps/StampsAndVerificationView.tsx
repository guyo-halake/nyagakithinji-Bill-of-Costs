import React, { useState, useEffect, useRef } from 'react';
import {
  Stamp,
  QrCode,
  ShieldCheck,
  Download,
  Copy,
  ExternalLink,
  Camera,
  Check,
  RefreshCw,
  Code2,
  Layers,
  FileText,
  CheckCircle2,
  Trash2,
  Globe,
  Building,
  User,
  Hash,
  Calendar,
  DollarSign,
  Lock,
  ArrowRight,
  Upload,
  Search,
  Plus,
  X,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import {
  LawFirmStamp,
  mintLawFirmStamp,
} from '../../services/documentSecurity';
import { getActiveFirmProfile, SystemUser } from '../../services/supabase';
import {
  deleteFirmStamp,
  fetchFirmStamps,
  saveFirmStamp,
  setDefaultFirmStamp,
} from '../../services/firmStamps';
import { DocumentVerifyView } from '../verify/DocumentVerifyView';

interface StampsAndVerificationViewProps {
  onNavigateHome?: () => void;
  currentUser: SystemUser | null;
}

export const StampsAndVerificationView: React.FC<StampsAndVerificationViewProps> = ({ onNavigateHome, currentUser }) => {
  const [activeFirm, setActiveFirm] = useState(() => getActiveFirmProfile());
  const canManageStamps = Boolean(
    currentUser?.hasAllPermissions ||
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'Developer'
  );
  const [stamps, setStamps] = useState<LawFirmStamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStamp, setSelectedStamp] = useState<LawFirmStamp | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Modal / View Controls
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeMainView, setActiveMainView] = useState<'catalog' | 'connect' | 'verify'>('catalog');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Inspector Editing State
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorCategory, setInspectorCategory] = useState<LawFirmStamp['category']>('General Practice');
  const [inspectorMatterTypes, setInspectorMatterTypes] = useState<string[]>([]);
  const [matterTypeInput, setMatterTypeInput] = useState('');
  const [inspectorTargetDomain, setInspectorTargetDomain] = useState('');
  const [inspectorSignatory, setInspectorSignatory] = useState('');
  const [inspectorLsk, setInspectorLsk] = useState('');
  const [inspectorImageUrl, setInspectorImageUrl] = useState('');
  const [inspectorDescription, setInspectorDescription] = useState('');
  const [isReMinting, setIsReMinting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addModalFileRef = useRef<HTMLInputElement | null>(null);

  // Add Stamp Form State
  const [newStampName, setNewStampName] = useState('');
  const [newStampCode, setNewStampCode] = useState('');
  const [newStampCategory, setNewStampCategory] = useState<LawFirmStamp['category']>('General Practice');
  const [newStampMatterTypes, setNewStampMatterTypes] = useState<string[]>(['General Legal Documents']);
  const [newStampMatterInput, setNewStampMatterInput] = useState('');
  const [newStampDescription, setNewStampDescription] = useState('');
  const [newStampSignatory, setNewStampSignatory] = useState(activeFirm.name);
  const [newStampLsk, setNewStampLsk] = useState(activeFirm.lskRegNo || 'P.105/14233/26');
  const [newStampImage, setNewStampImage] = useState<string>('/stamp.png');
  const [isCreating, setIsCreating] = useState(false);

  const loadCatalog = async () => {
    if (!currentUser?.firmId) {
      setPageError('Your firm account could not be loaded. Sign in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setPageError('');
    try {
      const catalog = await fetchFirmStamps(currentUser.firmId, canManageStamps);
      setStamps(catalog);
      if (catalog.length > 0 && !selectedStamp) {
        // default select first stamp for quick preview
        openInspector(catalog[0]);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not load stamps. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalog();
  }, [currentUser?.firmId, canManageStamps]);

  const openInspector = (stamp: LawFirmStamp) => {
    setSelectedStamp(stamp);
    setInspectorName(stamp.name);
    setInspectorCategory(stamp.category);
    setInspectorMatterTypes([...stamp.matterTypes]);
    setInspectorTargetDomain(stamp.targetDomain || 'https://kithinjilaw.co.ke');
    setInspectorSignatory(stamp.signatory);
    setInspectorLsk(stamp.lskNumber);
    setInspectorImageUrl(stamp.imageUrl || '/stamp.png');
    setInspectorDescription(stamp.description);
    setIsInspectorOpen(true);
  };

  const triggerCopyNotice = (key: string) => {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadMergedStamp = (stamp: LawFirmStamp) => {
    const pngUrl = stamp.mergedStampPng || stamp.imageUrl;
    if (!pngUrl) return;
    void fetch(pngUrl)
      .then(response => {
        if (!response.ok) throw new Error('Could not download this stamp.');
        return response.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${stamp.code}_Stamp.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        triggerCopyNotice(`download_${stamp.id}`);
      })
      .catch(error => setPageError(error instanceof Error ? error.message : 'Could not download this stamp.'));
  };

  const handleCopyPngToClipboard = async (stamp: LawFirmStamp) => {
    const pngUrl = stamp.mergedStampPng || stamp.imageUrl;
    if (!pngUrl) return;
    try {
      const res = await fetch(pngUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      triggerCopyNotice(`copied_png_${stamp.id}`);
    } catch {
      await navigator.clipboard.writeText(pngUrl);
      triggerCopyNotice(`copied_png_${stamp.id}`);
    }
  };

  const handleCopyVerifyUrl = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    triggerCopyNotice(`copied_url_${id}`);
  };

  const handleUploadImageForInspector = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setPageError('Choose an image that is 5 MB or smaller.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        setInspectorImageUrl(result);
        triggerCopyNotice('inspector_img_uploaded');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveInspectorChanges = async () => {
    if (!selectedStamp || !currentUser?.firmId) return;
    setIsReMinting(true);
    setPageError('');
    try {
      const reMinted = await mintLawFirmStamp({
        id: selectedStamp.id,
        name: inspectorName,
        code: selectedStamp.code,
        category: inspectorCategory,
        matterTypes: inspectorMatterTypes,
        description: inspectorDescription,
        signatory: inspectorSignatory,
        lskNumber: inspectorLsk,
        targetDomain: inspectorTargetDomain,
        imageUrl: inspectorImageUrl
      });

      const saved = await saveFirmStamp(currentUser.firmId, { ...reMinted, isDefault: selectedStamp.isDefault });
      setSelectedStamp(saved);
      setStamps((prev) => prev.map((s) => (s.id === selectedStamp.id ? saved : s)));
      triggerCopyNotice('inspector_saved');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not save this stamp.');
    } finally {
      setIsReMinting(false);
    }
  };

  const handleDeleteStamp = async (stamp: LawFirmStamp) => {
    if (!currentUser?.firmId) return;
    const { id, name } = stamp;
    if (!window.confirm(`Are you sure you want to delete and revoke "${name}"?`)) return;
    setPageError('');
    try {
      await deleteFirmStamp(currentUser.firmId, stamp);
      const remaining = stamps.filter(item => item.id !== id);
      setStamps(remaining);
      if (selectedStamp?.id === id) {
        setSelectedStamp(null);
        setIsInspectorOpen(false);
      }
      if (stamp.isDefault && remaining.length > 0) {
        await setDefaultFirmStamp(currentUser.firmId, remaining[0].id);
        setStamps(remaining.map((item, index) => ({ ...item, isDefault: index === 0 })));
      } else if (stamp.isDefault) {
        localStorage.removeItem('karani_firm_stamp_url');
        window.dispatchEvent(new CustomEvent('firmStampUpdated', { detail: '' }));
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not remove this stamp.');
      try {
        setStamps(await fetchFirmStamps(currentUser.firmId));
      } catch {
        // Keep the original error visible if refreshing also fails.
      }
    }
  };

  const handleChooseDefault = async (stamp: LawFirmStamp) => {
    if (!currentUser?.firmId) return;
    setPageError('');
    try {
      await setDefaultFirmStamp(currentUser.firmId, stamp.id);
      const updated = stamps.map(item => ({ ...item, isDefault: item.id === stamp.id }));
      setStamps(updated);
      const chosen = updated.find(item => item.id === stamp.id) || stamp;
      setSelectedStamp(chosen);
      localStorage.setItem('karani_firm_stamp_url', chosen.imageUrl);
      window.dispatchEvent(new CustomEvent('firmStampUpdated', { detail: chosen.imageUrl }));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not choose this stamp.');
    }
  };

  const handleAddMatterTypeChip = () => {
    if (!matterTypeInput.trim()) return;
    if (!inspectorMatterTypes.includes(matterTypeInput.trim())) {
      setInspectorMatterTypes([...inspectorMatterTypes, matterTypeInput.trim()]);
    }
    setMatterTypeInput('');
  };

  const handleRemoveMatterTypeChip = (chip: string) => {
    setInspectorMatterTypes(inspectorMatterTypes.filter((c) => c !== chip));
  };

  const handleCreateNewStamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStampName || !newStampCode || !currentUser?.firmId) return;
    setIsCreating(true);
    setPageError('');
    try {
      const minted = await mintLawFirmStamp({
        name: newStampName,
        code: newStampCode.toUpperCase(),
        category: newStampCategory,
        matterTypes: newStampMatterTypes,
        description: newStampDescription,
        signatory: newStampSignatory,
        lskNumber: newStampLsk,
        targetDomain: 'https://kithinjilaw.co.ke',
        imageUrl: newStampImage
      });

      const saved = await saveFirmStamp(currentUser.firmId, {
        ...minted,
        isDefault: stamps.length === 0,
      });
      setStamps((prev) => [saved, ...prev]);
      openInspector(saved);
      setShowAddModal(false);
      // Reset
      setNewStampName('');
      setNewStampCode('');
      setNewStampDescription('');
      triggerCopyNotice('stamp_created');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not add this stamp.');
    } finally {
      setIsCreating(false);
    }
  };

  // Filtered stamps
  const filteredStamps = stamps.filter((stamp) => {
    const matchesSearch =
      stamp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stamp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stamp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stamp.matterTypes.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || stamp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    'All',
    'General Practice',
    'Commissioner for Oaths',
    'Litigation & Court Process',
    'Conveyancing & Land',
    'Commercial & Corporate',
    'Registry & Filing'
  ];

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Commissioner for Oaths':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Litigation & Court Process':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'Conveyancing & Land':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 'Commercial & Corporate':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'Registry & Filing':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300 border-slate-300 dark:border-zinc-700';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] p-4 md:p-8">
      {/* Top Main Navigation Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Stamp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Stamps</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {stamps.length} stamps
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Upload, check, and download your firm stamps. QR codes are made automatically.
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveMainView('catalog')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMainView === 'catalog'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Stamp className="w-4 h-4" />
              <span>All stamps ({stamps.length})</span>
            </button>

            <button
              onClick={() => setActiveMainView('connect')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMainView === 'connect'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Link another system</span>
            </button>

            <button
              onClick={() => setActiveMainView('verify')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMainView === 'verify'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Document Verifier</span>
            </button>

            {canManageStamps && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ml-auto md:ml-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add stamp</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Category Filter Bar (Only in catalog view) */}
        {activeMainView === 'catalog' && (
          <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stamps by name, matter type, or code..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {cat}
                </button>
              ))}

            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        {pageError && (
          <div role="alert" className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {pageError}
          </div>
        )}
        {!canManageStamps && (
          <p className="mb-4 text-sm text-slate-600">
            Ask a firm admin to add, change, or remove stamps.
          </p>
        )}
        {/* ========================================================= */}
        {/* VIEW 1: STAMP DIRECTORY / CATALOG GRID                    */}
        {/* ========================================================= */}
        {activeMainView === 'catalog' && (
          <div className="space-y-8">
            {loading ? (
              <div className="text-center py-24 text-[var(--text-muted)]">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-500" />
                <p className="text-xs font-semibold">Loading stamps...</p>
              </div>
            ) : filteredStamps.length === 0 ? (
              <div className="text-center py-16 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-8">
                <Stamp className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-zinc-700" />
                <p className="text-sm font-bold">No stamps match your search</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Try selecting "All" categories or reset search filters.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStamps.map((stamp) => {
                  const isSelected = selectedStamp?.id === stamp.id && isInspectorOpen;
                  const isCopiedPng = copiedKey === `copied_png_${stamp.id}`;
                  const isDownloaded = copiedKey === `download_${stamp.id}`;

                  return (
                    <div
                      key={stamp.id}
                      onClick={() => openInspector(stamp)}
                      className={`group relative bg-[var(--bg-card)] rounded-2xl border transition-all duration-200 p-5 shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10'
                          : 'border-[var(--border-color)] hover:border-slate-400 dark:hover:border-zinc-700'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(
                            stamp.category
                          )}`}
                        >
                          {stamp.category}
                        </span>

                        <span className="flex items-center gap-1 text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>{stamp.code}</span>
                        </span>
                      </div>

                      {/* Unified Visual Preview Card */}
                      <div className="relative rounded-xl border border-[var(--border-color)] p-4 bg-slate-50 dark:bg-zinc-950/70 mb-4 flex items-center justify-between gap-4 overflow-hidden group-hover:border-slate-300 dark:group-hover:border-zinc-700 transition-colors">
                        {/* Stamp Image Graphic */}
                        <div className="w-20 h-20 shrink-0 flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg p-1 border border-slate-200 dark:border-zinc-800 shadow-2xs">
                          <img
                            src={stamp.imageUrl || '/stamp.png'}
                            alt={stamp.name}
                            className="w-full h-full object-contain select-none"
                          />
                        </div>

                        {/* Real QR Code Badge */}
                        <div className="flex flex-col items-center shrink-0 bg-white p-1.5 rounded-lg border border-slate-300 shadow-2xs">
                          {stamp.qrCodeDataUrl ? (
                            <img
                              src={stamp.qrCodeDataUrl}
                              alt="Verification QR"
                              className="w-16 h-16 object-contain select-none"
                            />
                          ) : (
                            <QrCode className="w-16 h-16 text-slate-400" />
                          )}
                          <span className="text-[7.5px] font-mono font-bold text-slate-800 mt-0.5">SCAN TO CHECK</span>
                        </div>
                      </div>

                      {/* Stamp Name & Description */}
                      <div className="space-y-1 mb-3">
                        <h3 className="text-sm font-bold text-[var(--text-main)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {stamp.name}
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                          {stamp.description}
                        </p>
                      </div>

                      {/* "What type of matter is this stamp for?" Section */}
                      <div className="pt-3 border-t border-[var(--border-color)] mb-4">
                        <p className="text-[9.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-emerald-500" />
                          <span>What type of matter is this stamp for?</span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {stamp.matterTypes.map((matter, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-main)]"
                            >
                              {matter}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Security Features Digest Line */}
                      <div className="p-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] mb-4 flex items-center justify-between text-[10px] font-mono">
                        <span className="flex items-center gap-1 text-[var(--text-muted)]">
                          <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Stamp check code:</span>
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {stamp.shortToken}
                        </span>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-color)]">
                        {canManageStamps && <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleChooseDefault(stamp);
                          }}
                          disabled={stamp.isDefault}
                          className="col-span-2 py-2 px-3 rounded-xl border border-[var(--border-color)] text-xs font-semibold disabled:bg-emerald-50 disabled:text-emerald-700 disabled:dark:bg-emerald-950 disabled:dark:text-emerald-300"
                        >
                          {stamp.isDefault ? 'Used on fee notes' : 'Use on fee notes'}
                        </button>}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadMergedStamp(stamp);
                          }}
                          className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isDownloaded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                          <span>{isDownloaded ? 'Downloaded!' : 'Download PNG'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openInspector(stamp);
                          }}
                          className="py-2 px-3 rounded-xl bg-[var(--bg-subtle)] hover:bg-slate-100 dark:hover:bg-zinc-800 border border-[var(--border-color)] text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Edit</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: CONNECT EXTERNAL PROJECTS (API HUB)               */}
        {/* ========================================================= */}
        {activeMainView === 'connect' && (
          <div className="space-y-8">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Connect External Projects to Karani Law Stamps</h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Any outside system, web app, or document pipeline can request these stamps and verify them against this website
                  </p>
                </div>
              </div>

              {/* Step Flow */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center justify-center">
                    1
                  </div>
                  <h3 className="text-xs font-bold">Choose Stamp Code</h3>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Select from <code>NBK-MASTER-SEAL</code>, <code>NBK-OATHS-NOTARY</code>, <code>NBK-CONVEYANCING-LAND</code>, etc.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center justify-center">
                    2
                  </div>
                  <h3 className="text-xs font-bold">Embed Unified PNG</h3>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    The external project downloads or receives the Base64 PNG stamp containing the real scannable QR badge.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center justify-center">
                    3
                  </div>
                  <h3 className="text-xs font-bold">Live Camera Verification</h3>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Scanning the stamp with any phone camera validates the law firm's authentic seal and practicing roll status.
                  </p>
                </div>
              </div>

              {/* Code Snippet */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-mono">Sample Fetch Request (Other Project):</span>
                  <span className="text-[10px] text-emerald-600 font-bold">REST API</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  <pre>{`// In the other project: Request stamp
const response = await fetch('https://kithinjilaw.co.ke/api/v1/stamp/issue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    stampCode: 'NBK-CONVEYANCING-LAND',
    documentRef: 'TITLE-TRANSFER-498',
    clientName: 'Absa Bank Kenya PLC'
  })
});

const { mergedStampPng, verificationUrl, shortToken } = await response.json();
// mergedStampPng is the high-res transparent PNG with the real scannable QR embedded!`}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: DOCUMENT VERIFIER                                 */}
        {/* ========================================================= */}
        {activeMainView === 'verify' && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-500" />
                  <span>Check a stamp</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Scan the QR code on a stamp, or enter its check code.
                </p>
              </div>
            </div>

            <DocumentVerifyView onNavigateHome={onNavigateHome} />
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* DETAILED STAMP INSPECTOR (SIDE DRAWER / MODAL)            */}
      {/* ========================================================= */}
      {isInspectorOpen && selectedStamp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-[var(--bg-main)] h-full overflow-y-auto border-l border-[var(--border-color)] shadow-2xl p-6 md:p-8 flex flex-col justify-between">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsInspectorOpen(false)}
                    className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                      <span>Stamp details</span>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{selectedStamp.code}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canManageStamps && <button
                    onClick={() => void handleDeleteStamp(selectedStamp)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                    title="Remove this stamp"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>}
                  <button
                    onClick={() => setIsInspectorOpen(false)}
                    className="p-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inspector Content */}
              <div className="space-y-6">
                {/* 1. Unified Merged Stamp Live Canvas Display */}
                <div className="rounded-2xl border border-[var(--border-color)] bg-slate-100 dark:bg-zinc-950 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>

                  {selectedStamp.mergedStampPng ? (
                    <img
                      src={selectedStamp.mergedStampPng}
                      alt="Merged Stamp and QR"
                      className="max-h-56 max-w-full object-contain filter drop-shadow-md select-none relative z-10"
                    />
                  ) : (
                    <div className="flex items-center gap-4 relative z-10">
                      <img
                        src={selectedStamp.imageUrl}
                        alt="Stamp"
                        className="w-28 h-28 object-contain"
                      />
                      <img
                        src={selectedStamp.qrCodeDataUrl}
                        alt="QR"
                        className="w-24 h-24 object-contain bg-white p-2 rounded-lg"
                      />
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-zinc-900/90 px-3 py-1 rounded-full border border-gray-200 dark:border-zinc-800 z-10">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>QR code and stamp check code included</span>
                  </div>
                </div>

                {/* Instant Download & Copy Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadMergedStamp(selectedStamp)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === `download_${selectedStamp.id}` ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    <span>{copiedKey === `download_${selectedStamp.id}` ? 'Downloaded!' : 'Download PNG'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyPngToClipboard(selectedStamp)}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === `copied_png_${selectedStamp.id}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey === `copied_png_${selectedStamp.id}` ? 'Copied!' : 'Copy PNG Image'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyVerifyUrl(selectedStamp.verificationUrl, selectedStamp.id)}
                    className="py-2.5 px-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === `copied_url_${selectedStamp.id}` ? <Check className="w-4 h-4 text-emerald-500" /> : <ExternalLink className="w-4 h-4" />}
                    <span>{copiedKey === `copied_url_${selectedStamp.id}` ? 'URL Copied!' : 'Copy Verify URL'}</span>
                  </button>
                </div>

                {/* 2. Stamp Image Upload & Customization */}
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                        Stamp Image Graphic (.PNG)
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)]">Upload a new transparent seal or graphic for this stamp</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleUploadImageForInspector}
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={!canManageStamps}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canManageStamps}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload New PNG</span>
                      </button>

                      {inspectorImageUrl !== '/stamp.png' && (
                        <button
                          type="button"
                          onClick={() => setInspectorImageUrl('/stamp.png')}
                          className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-medium hover:text-rose-500 cursor-pointer"
                        >
                          Default
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-12 h-12 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center p-1 shrink-0">
                      <img src={inspectorImageUrl} alt="Graphic" className="w-full h-full object-contain" />
                    </div>
                    <div className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                      {inspectorImageUrl.startsWith('data:') ? 'Custom Base64 PNG Graphic Uploaded' : 'Official /stamp.png'}
                    </div>
                  </div>
                </div>

                {/* 3. Stamp Name, Category & Matter Types */}
                <div className="space-y-4 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--text-main)]">Stamp / Image Name</label>
                    <input
                      type="text"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-[var(--text-main)]">Practice Category</label>
                      <select
                        value={inspectorCategory}
                        onChange={(e) => setInspectorCategory(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                      >
                        {categories.filter((c) => c !== 'All').map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-[var(--text-main)]">LSK Practicing Roll #</label>
                      <input
                        type="text"
                        value={inspectorLsk}
                        onChange={(e) => setInspectorLsk(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]"
                      />
                    </div>
                  </div>

                  {/* What type of matter is this stamp for? (Editor) */}
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--text-main)]">
                      What types of matters is this stamp for?
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {inspectorMatterTypes.map((chip) => (
                        <span
                          key={chip}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center gap-1.5"
                        >
                          <span>{chip}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMatterTypeChip(chip)}
                            className="text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={matterTypeInput}
                        onChange={(e) => setMatterTypeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMatterTypeChip();
                          }
                        }}
                        placeholder="Add another matter type (e.g. Affidavit, Title Transfer) and press Enter..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]"
                      />
                      <button
                        type="button"
                        onClick={handleAddMatterTypeChip}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--text-main)]">Verification Target Domain</label>
                    <div className="relative">
                      <Globe className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={inspectorTargetDomain}
                        onChange={(e) => setInspectorTargetDomain(e.target.value)}
                        placeholder="https://kithinjilaw.co.ke"
                        className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]"
                      />
                    </div>
                    <p className="text-[10.5px] text-[var(--text-muted)] mt-1">
                      Target destination opened when the QR code is scanned in the real world with a smartphone.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--text-main)]">Stamp Description &amp; Usage</label>
                    <textarea
                      rows={2}
                      value={inspectorDescription}
                      onChange={(e) => setInspectorDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                    />
                  </div>
                </div>

                {/* 4. Cryptographic Security Features Footprint */}
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Cryptographic Security Features</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      AUTHENTICATED
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] font-mono text-[11px]">
                      <span className="text-[var(--text-muted)]">Verification Token:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{selectedStamp.shortToken}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                      <span className="block text-[10px] font-mono text-[var(--text-muted)] mb-1">
                        Full stamp check code
                      </span>
                      <div className="font-mono text-[10px] text-slate-700 dark:text-slate-300 break-all">
                        {selectedStamp.sha256Fingerprint}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[10.5px]">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Stamp image saved</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>QR code included</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Firm details included</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Check code included</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Bottom Action */}
            <div className="pt-6 border-t border-[var(--border-color)] mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsInspectorOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-[var(--border-color)] text-xs font-semibold hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleSaveInspectorChanges}
                disabled={isReMinting || !canManageStamps}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReMinting ? 'animate-spin' : ''}`} />
                <span>{isReMinting ? 'Saving...' : 'Save changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD NEW CUSTOM STAMP MODAL                                */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-emerald-500" />
                  <span>Add a stamp</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Add a stamp for your firm. A QR code will be created automatically.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewStamp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Stamp Name</label>
                <input
                  type="text"
                  required
                  value={newStampName}
                  onChange={(e) => setNewStampName(e.target.value)}
                  placeholder="e.g. Probate & Succession Department Seal"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Stamp Code</label>
                  <input
                    type="text"
                    required
                    value={newStampCode}
                    onChange={(e) => setNewStampCode(e.target.value)}
                    placeholder="e.g. NBK-PROBATE-SEAL"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Practice Category</label>
                  <select
                    value={newStampCategory}
                    onChange={(e) => setNewStampCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]"
                  >
                    {categories.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  What matter types is this stamp for? (Comma separated)
                </label>
                <input
                  type="text"
                  value={newStampMatterInput}
                  onChange={(e) => {
                    setNewStampMatterInput(e.target.value);
                    const split = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                    setNewStampMatterTypes(split.length > 0 ? split : ['General Legal Documents']);
                  }}
                  placeholder="e.g. Letters of Administration, Grants of Probate, Wills"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Stamp Description</label>
                <textarea
                  rows={2}
                  value={newStampDescription}
                  onChange={(e) => setNewStampDescription(e.target.value)}
                  placeholder="Purpose and legal authorization of this seal..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-subtle)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border flex items-center justify-center p-1">
                    <img src={newStampImage} alt="Stamp" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Stamp image</p>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">
                      {newStampImage.startsWith('data:') ? 'Custom PNG loaded' : 'Default /stamp.png'}
                    </p>
                  </div>
                </div>

                <input
                  type="file"
                  ref={addModalFileRef}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 5 * 1024 * 1024) {
                      setPageError('Choose an image that is 5 MB or smaller.');
                      e.target.value = '';
                      return;
                    }
                    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) {
                      setPageError('Choose a PNG, JPG, or WebP image.');
                      e.target.value = '';
                      return;
                    }
                    setPageError('');
                    const r = new FileReader();
                    r.onload = (ev) => {
                      if (ev.target?.result) setNewStampImage(ev.target.result as string);
                    };
                    r.readAsDataURL(f);
                  }}
                  accept="image/png,image/jpeg"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => addModalFileRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg border bg-[var(--bg-card)] text-xs font-semibold cursor-pointer"
                >
                  Choose PNG
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreating ? 'Saving...' : 'Save stamp'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
