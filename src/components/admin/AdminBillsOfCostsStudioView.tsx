import React, { useState, useMemo } from 'react';
import { 
  Scale, FileText, Download, Upload, Plus, Trash2, 
  Printer, CheckCircle2, Search, RefreshCw, Calculator, 
  ArrowUpRight, AlertCircle, FileSpreadsheet, Sparkles, X, Edit3, ChevronRight, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface BillLineItem {
  id: string;
  itemNo: string;
  date: string;
  particulars: string;
  amountClaimed: number;
  amountTaxedOff: number;
  category?: 'INSTRUCTION' | 'DRAWING' | 'PERUSAL' | 'ATTENDANCE' | 'DISBURSEMENT' | 'OTHER';
}

export interface TaxationMatter {
  id: string;
  title: string;
  caseNo: string;
  forum: string;
  bench?: string;
  claimant: string;
  respondent: string;
  disputeSubject: string;
  statutoryBasis: string;
  items: BillLineItem[];
}

interface AdminBillsOfCostsStudioViewProps {
  showToast: (msg: string) => void;
}

export const AdminBillsOfCostsStudioView: React.FC<AdminBillsOfCostsStudioViewProps> = ({ showToast }) => {
  // Preloaded Real Firm Matters from files/
  const [matters, setMatters] = useState<TaxationMatter[]>([
    {
      id: 'seyani',
      title: 'Seyani Brothers & Co. (K) Ltd v Greenhills Investment Ltd',
      caseNo: 'Under Arbitration Act 1995',
      forum: 'Arbitral Tribunal at Nairobi',
      bench: 'Arbitration under Arbitration Act 1995',
      claimant: 'Seyani Brothers & Co. (K) Limited (Claimant)',
      respondent: 'Greenhills Investment Limited (Respondent)',
      disputeSubject: 'Dispute on the contract for the construction of the Village Market Expansion and Greenhills Hotel on Limuru Road, Nairobi (KES 116,000,000.00 subject claim)',
      statutoryBasis: 'Pursuant to the Advocates (Remuneration) Order — Schedule 6',
      items: [
        {
          id: 's-1',
          itemNo: '1',
          date: '12.04.2021',
          particulars: 'To receiving instructions to act on behalf of the Claimant to institute an arbitration dispute against the Respondent for KES 116,000,000.00 under Clause 34.21 of contract',
          amountClaimed: 3519033.22,
          amountTaxedOff: 0,
          category: 'INSTRUCTION'
        },
        {
          id: 's-2',
          itemNo: '2',
          date: '15.05.2021',
          particulars: 'Getting up fees for trial (taking instructions, interviewing site engineers, quantum valuation per Schedule 6 Item 2)',
          amountClaimed: 1173011.07,
          amountTaxedOff: 0,
          category: 'INSTRUCTION'
        },
        {
          id: 's-3',
          itemNo: '3',
          date: '20.06.2021',
          particulars: 'To drawing Statement of Claim (48 folios @ KES 150 per folio)',
          amountClaimed: 7200.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        },
        {
          id: 's-4',
          itemNo: '4',
          date: '20.06.2021',
          particulars: 'To engrossing Statement of Claim and filing 3 copies before Tribunal',
          amountClaimed: 2400.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        },
        {
          id: 's-5',
          itemNo: '5',
          date: '28.07.2021',
          particulars: 'To perusing Respondent Statement of Defence and Counterclaim (65 folios)',
          amountClaimed: 4875.00,
          amountTaxedOff: 0,
          category: 'PERUSAL'
        },
        {
          id: 's-6',
          itemNo: '6',
          date: '14.09.2021',
          particulars: 'To drawing Reply to Defence & Defence to Counterclaim (32 folios)',
          amountClaimed: 4800.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        },
        {
          id: 's-7',
          itemNo: '7',
          date: '04.11.2021',
          particulars: 'To attending preliminary meeting before Sole Arbitrator for directions (3 hours)',
          amountClaimed: 4500.00,
          amountTaxedOff: 0,
          category: 'ATTENDANCE'
        },
        {
          id: 's-8',
          itemNo: '8',
          date: '18.01.2022',
          particulars: 'To drawing and filing Claimant Trial Bundle of Documents (Vol I & II, 420 folios)',
          amountClaimed: 63000.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        },
        {
          id: 's-9',
          itemNo: '9',
          date: '22.03.2022',
          particulars: 'To attending substantive arbitral hearing — Day 1: Claimant Witness Examination-in-Chief',
          amountClaimed: 15000.00,
          amountTaxedOff: 0,
          category: 'ATTENDANCE'
        },
        {
          id: 's-10',
          itemNo: '10',
          date: '23.03.2022',
          particulars: 'To attending substantive arbitral hearing — Day 2: Cross-examination of Project Architect',
          amountClaimed: 15000.00,
          amountTaxedOff: 0,
          category: 'ATTENDANCE'
        },
        {
          id: 's-11',
          itemNo: '11',
          date: '26.02.2026',
          particulars: 'To drawing this Party & Party Bill of Costs (18 folios) and attending taxation',
          amountClaimed: 5200.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        }
      ]
    },
    {
      id: 'dhanya',
      title: 'Dhanya Construction Kenya Ltd v Sunil Shah',
      caseNo: 'Under Arbitration Act 1995',
      forum: 'Arbitral Tribunal at Nairobi',
      bench: 'Before Arch. Nekoye Masibili, MCIArb (Sole Arbitrator)',
      claimant: 'Dhanya Construction Kenya Limited (Claimant)',
      respondent: 'Mr. Sunil Shah (Respondent)',
      disputeSubject: 'Arbitration on dispute over contract for construction of residential house at Muthaiga, Nairobi',
      statutoryBasis: 'Pursuant to the Advocates (Remuneration) (Amendment) Order 2014 — Schedule 6',
      items: [
        {
          id: 'd-1',
          itemNo: '1',
          date: '15.06.2023',
          particulars: 'To receiving instructions to act on behalf of the Claimant to institute dispute against Respondent for KES 3,522,803.00 & liquidated damages',
          amountClaimed: 419035.62,
          amountTaxedOff: 0,
          category: 'INSTRUCTION'
        },
        {
          id: 'd-2',
          itemNo: '2',
          date: '20.07.2023',
          particulars: 'Getting up fees for trial before Arbitral Tribunal',
          amountClaimed: 197771.97,
          amountTaxedOff: 0,
          category: 'INSTRUCTION'
        },
        {
          id: 'd-3',
          itemNo: '3',
          date: '20.07.2023',
          particulars: 'To drawing Statement of Claim (17 folios)',
          amountClaimed: 3050.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        },
        {
          id: 'd-4',
          itemNo: '4',
          date: '20.07.2023',
          particulars: 'Claimant List of Documents (2 folios)',
          amountClaimed: 1100.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        },
        {
          id: 'd-5',
          itemNo: '5',
          date: '24.08.2023',
          particulars: 'Reply to Defence and Defence to Counterclaim (21 folios)',
          amountClaimed: 3650.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        },
        {
          id: 'd-6',
          itemNo: '6',
          date: '12.10.2023',
          particulars: 'Claimant List of Issues for determination (2 folios)',
          amountClaimed: 1100.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        },
        {
          id: 'd-7',
          itemNo: '7',
          date: '25.10.2023',
          particulars: 'Witness Statement of Mr. Barnabas Mati (7 folios)',
          amountClaimed: 1550.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        },
        {
          id: 'd-8',
          itemNo: '8',
          date: '18.01.2024',
          particulars: 'Claimant response to Respondent grounds of opposition to Application to file Supplementary documents (31 folios)',
          amountClaimed: 5150.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        },
        {
          id: 'd-9',
          itemNo: '9',
          date: '14.01.2026',
          particulars: 'Drawing Claimant Party and Party Bill of Costs and attending taxation before Arbitrator',
          amountClaimed: 3500.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        }
      ]
    },
    {
      id: 'hccomm',
      title: 'Zhenjian Chengjian Construction Africa Ltd v Eighty Eight Nairobi Ltd & Anor',
      caseNo: 'HCCOMM E547 of 2024',
      forum: 'High Court of Kenya at Nairobi (Milimani Commercial Division)',
      bench: 'Commercial & Tax Division',
      claimant: 'Zhenjian Chengjian Construction Africa Ltd (Plaintiff)',
      respondent: 'Eighty Eight Nairobi Ltd & Anor (Defendants)',
      disputeSubject: 'Commercial dispute on prime development Upper Hill Nairobi, Main Suit Defense',
      statutoryBasis: 'Pursuant to the Advocates (Remuneration) Order — Schedule 6',
      items: [
        {
          id: 'h-1',
          itemNo: '1',
          date: '02.04.2024',
          particulars: 'To receiving instructions from Defendants (Eighty Eight Nairobi Ltd) to defend High Court Commercial Suit No. E547 of 2024',
          amountClaimed: 245000.00,
          amountTaxedOff: 0,
          category: 'INSTRUCTION'
        },
        {
          id: 'h-2',
          itemNo: '2',
          date: '14.04.2024',
          particulars: 'To drawing Statement of Defence and Replying Affidavit (26 folios)',
          amountClaimed: 3900.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        },
        {
          id: 'h-3',
          itemNo: '3',
          date: '20.05.2024',
          particulars: 'To attending High Court Commercial Division before Hon. Judge for Case Management Conference',
          amountClaimed: 3500.00,
          amountTaxedOff: 0,
          category: 'ATTENDANCE'
        },
        {
          id: 'h-4',
          itemNo: '4',
          date: '18.07.2024',
          particulars: 'To drawing Party and Party Bill of Costs on dismissal of Plaintiff chamber summons with costs',
          amountClaimed: 3200.00,
          amountTaxedOff: 0,
          category: 'DRAWING'
        }
      ]
    }
  ]);

  const [activeMatterId, setActiveMatterId] = useState<string>('seyani');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);

  // New item form state
  const [newItemDate, setNewItemDate] = useState<string>('Today');
  const [newItemParticulars, setNewItemParticulars] = useState<string>('');
  const [newItemAmount, setNewItemAmount] = useState<number>(1500);
  const [newItemCategory, setNewItemCategory] = useState<BillLineItem['category']>('ATTENDANCE');

  // Currently active matter
  const activeMatter = matters.find(m => m.id === activeMatterId) || matters[0];

  // Mathematical Calculation of Court Bill
  const calculation = useMemo(() => {
    let totalClaimed = 0;
    let totalTaxedOff = 0;

    activeMatter.items.forEach(item => {
      totalClaimed += item.amountClaimed || 0;
      totalTaxedOff += item.amountTaxedOff || 0;
    });

    const netAllowed = Math.max(0, totalClaimed - totalTaxedOff);
    const vat16 = netAllowed * 0.16;
    const courtFilingFee = netAllowed * 0.01; // 1% statutory taxation fee
    const grandCertificateTotal = netAllowed + vat16 + courtFilingFee;

    return {
      totalClaimed,
      totalTaxedOff,
      netAllowed,
      vat16,
      courtFilingFee,
      grandCertificateTotal
    };
  }, [activeMatter]);

  // Handle live deduction update
  const handleTaxedOffChange = (itemId: string, valStr: string) => {
    const num = Math.max(0, parseFloat(valStr) || 0);
    setMatters(prev => prev.map(m => {
      if (m.id === activeMatter.id) {
        return {
          ...m,
          items: m.items.map(it => it.id === itemId ? { ...it, amountTaxedOff: num } : it)
        };
      }
      return m;
    }));
  };

  // Add line item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemParticulars.trim()) return;

    const newItem: BillLineItem = {
      id: `it-${Date.now()}`,
      itemNo: (activeMatter.items.length + 1).toString(),
      date: newItemDate || 'Today',
      particulars: newItemParticulars.trim(),
      amountClaimed: newItemAmount,
      amountTaxedOff: 0,
      category: newItemCategory
    };

    setMatters(prev => prev.map(m => {
      if (m.id === activeMatter.id) {
        return { ...m, items: [...m.items, newItem] };
      }
      return m;
    }));

    setIsAddingItem(false);
    setNewItemParticulars('');
    showToast(`Added Item #${newItem.itemNo} to ${activeMatter.title}`);
  };

  // Quick statutory schedule 6 presets
  const applyPreset = (particulars: string, amount: number, cat: BillLineItem['category']) => {
    setNewItemParticulars(particulars);
    setNewItemAmount(amount);
    setNewItemCategory(cat);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const dataRows = activeMatter.items.map(it => ({
        'Item #': it.itemNo,
        'Date': it.date,
        'Particulars of Services Rendered': it.particulars,
        'Amount Claimed (KES)': it.amountClaimed,
        'Amount Taxed Off (KES)': it.amountTaxedOff,
        'Net Allowed (KES)': it.amountClaimed - it.amountTaxedOff
      }));

      // Add summary rows
      dataRows.push({
        'Item #': '',
        'Date': '',
        'Particulars of Services Rendered': 'SUBTOTAL (PROFESSIONAL FEES)',
        'Amount Claimed (KES)': calculation.totalClaimed,
        'Amount Taxed Off (KES)': calculation.totalTaxedOff,
        'Net Allowed (KES)': calculation.netAllowed
      });
      dataRows.push({
        'Item #': '',
        'Date': '',
        'Particulars of Services Rendered': 'ADD: VALUE ADDED TAX (VAT) @ 16%',
        'Amount Claimed (KES)': calculation.totalClaimed * 0.16,
        'Amount Taxed Off (KES)': calculation.totalTaxedOff * 0.16,
        'Net Allowed (KES)': calculation.vat16
      });
      dataRows.push({
        'Item #': '',
        'Date': '',
        'Particulars of Services Rendered': 'ADD: TAXATION FILING ASSESSMENT (1%)',
        'Amount Claimed (KES)': calculation.totalClaimed * 0.01,
        'Amount Taxed Off (KES)': 0,
        'Net Allowed (KES)': calculation.courtFilingFee
      });
      dataRows.push({
        'Item #': '',
        'Date': '',
        'Particulars of Services Rendered': 'GRAND TOTAL (CERTIFICATE OF TAXATION)',
        'Amount Claimed (KES)': calculation.totalClaimed * 1.17,
        'Amount Taxed Off (KES)': calculation.totalTaxedOff * 1.16,
        'Net Allowed (KES)': calculation.grandCertificateTotal
      });

      const worksheet = XLSX.utils.json_to_sheet(dataRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bill of Costs');
      
      const fileName = `${activeMatter.id.toUpperCase()}_Bill_of_Costs_Taxation.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showToast(`Exported ${fileName} successfully`);
    } catch (err) {
      showToast('Failed to export Excel file');
    }
  };

  // Import from Excel (.xlsx)
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws);

        if (json.length === 0) {
          showToast('Uploaded spreadsheet appears empty.');
          return;
        }

        const parsedItems: BillLineItem[] = json.map((row: any, idx) => {
          const date = row['Date'] || row['date'] || '';
          const particulars = row['Particulars'] || row['Particulars of Services Rendered'] || row['particulars'] || `Item ${idx + 1}`;
          const claimed = parseFloat(row['Amount Claimed (KES)'] || row['Amount Claimed'] || row['claimed'] || row['Amount'] || 0) || 0;
          const taxed = parseFloat(row['Amount Taxed Off (KES)'] || row['Amount Taxed Off'] || row['taxed'] || 0) || 0;

          return {
            id: `imp-${Date.now()}-${idx}`,
            itemNo: (idx + 1).toString(),
            date: String(date),
            particulars: String(particulars),
            amountClaimed: claimed,
            amountTaxedOff: taxed,
            category: 'OTHER'
          };
        });

        setMatters(prev => prev.map(m => {
          if (m.id === activeMatter.id) {
            return { ...m, items: parsedItems };
          }
          return m;
        }));

        showToast(`Imported ${parsedItems.length} line items from ${file.name}`);
      } catch (err) {
        showToast('Error parsing Excel spreadsheet.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filtered Items
  const filteredItems = activeMatter.items.filter(it => {
    if (filterCategory !== 'ALL' && it.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        it.particulars.toLowerCase().includes(q) ||
        it.itemNo.includes(q) ||
        it.date.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Top Header */}
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              REPUBLIC OF KENYA &middot; ADVOCATES REMUNERATION TAXATION STUDIO
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 font-brand">
            <Scale className="w-5 h-5 text-amber-500" />
            Party &amp; Party Bills of Costs Studio
          </h2>
          <p className="text-xs text-zinc-500">
            Schedule 6 statutory taxation, folios calculator, deductions tracking, and court certificate exporter
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 cursor-pointer shadow-2xs">
            <Upload className="w-3.5 h-3.5 text-zinc-500" />
            <span>Import Excel (.xlsx)</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Court Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Court Schedule</span>
          </button>
        </div>
      </div>

      {/* Matter Switcher Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold gap-3 overflow-x-auto pb-1">
        {matters.map(m => (
          <button
            key={m.id}
            onClick={() => setActiveMatterId(m.id)}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeMatter.id === m.id
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span>{m.title.split('v')[0].trim()}</span>
            <span className="text-[10px] font-mono opacity-70">
              ({m.items.length} items)
            </span>
          </button>
        ))}
      </div>

      {/* Matter Letterhead & Particulars Card */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 font-sans text-xs shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Forum &amp; Suit No.</span>
            <strong className="text-sm text-zinc-900 dark:text-white font-bold">{activeMatter.forum} &middot; {activeMatter.caseNo}</strong>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {activeMatter.statutoryBasis}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-zinc-400 text-[10.5px] block font-mono">Claimant / Plaintiff:</span>
            <strong className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">{activeMatter.claimant}</strong>
          </div>
          <div>
            <span className="text-zinc-400 text-[10.5px] block font-mono">Respondent / Defendant:</span>
            <strong className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">{activeMatter.respondent}</strong>
          </div>
        </div>

        <p className="text-zinc-600 dark:text-zinc-400 text-[11.5px] pt-1 border-t border-zinc-50 dark:border-zinc-800/60 leading-relaxed">
          <strong className="text-zinc-700 dark:text-zinc-300">Subject Matter:</strong> {activeMatter.disputeSubject}
        </p>
      </div>

      {/* Live Court Taxation Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Total Claimed</span>
          <span className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-white block">
            KES {calculation.totalClaimed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-zinc-400">{activeMatter.items.length} bill items</span>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1">
          <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 uppercase tracking-wider block font-bold">
            Total Taxed Off
          </span>
          <span className="text-base sm:text-lg font-bold font-mono text-rose-600 dark:text-rose-400 block">
            -KES {calculation.totalTaxedOff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-rose-500 font-medium">Court Deductions</span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Net Allowed Fees</span>
          <span className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
            KES {calculation.netAllowed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-zinc-400">Professional Fees</span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">VAT @ 16%</span>
          <span className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-white block">
            KES {calculation.vat16.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-zinc-400">Statutory Tax</span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Court Filing (1%)</span>
          <span className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-white block">
            KES {calculation.courtFilingFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-zinc-400">Judiciary Assessment</span>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-1">
          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block font-bold">
            Taxation Certificate
          </span>
          <span className="text-base sm:text-lg font-extrabold font-mono text-emerald-700 dark:text-emerald-400 block">
            KES {calculation.grandCertificateTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">Enforceable Sum</span>
        </div>
      </div>

      {/* Table Toolbar & Search */}
      <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search particulars, folios, dates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
            />
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px]">
            {['ALL', 'INSTRUCTION', 'DRAWING', 'ATTENDANCE', 'PERUSAL'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingItem(true)}
          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Line Item</span>
        </button>
      </div>

      {/* Main Interactive Bill Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-[10.5px] font-mono text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-3 w-14 text-center">Item</th>
                <th className="p-3 w-28">Date</th>
                <th className="p-3">Particulars of Professional Services Rendered</th>
                <th className="p-3 w-36 text-right">Claimed (KES)</th>
                <th className="p-3 w-40 text-right">Taxed Off (KES)</th>
                <th className="p-3 w-36 text-right">Net Allowed (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
              {filteredItems.map(item => {
                const net = Math.max(0, item.amountClaimed - item.amountTaxedOff);
                const hasDeduction = item.amountTaxedOff > 0;

                return (
                  <tr 
                    key={item.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="p-3 text-center text-zinc-500 font-bold">
                      {item.itemNo}
                    </td>
                    <td className="p-3 text-zinc-500 font-sans text-[11px] whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="p-3 font-sans text-zinc-900 dark:text-zinc-100 leading-relaxed text-[11.5px]">
                      {item.particulars}
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-900 dark:text-white">
                      {item.amountClaimed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-zinc-400 text-[10px]">-</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={item.amountClaimed}
                          value={item.amountTaxedOff === 0 ? '' : item.amountTaxedOff}
                          onChange={(e) => handleTaxedOffChange(item.id, e.target.value)}
                          placeholder="0.00"
                          className={`w-28 px-2 py-1 text-right rounded border font-mono text-xs focus:outline-none focus:ring-1 ${
                            hasDeduction
                              ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 font-bold'
                              : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        />
                      </div>
                    </td>
                    <td className={`p-3 text-right font-bold ${
                      hasDeduction ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Grand Summary Footer */}
            <tfoot className="bg-zinc-50/80 dark:bg-zinc-800/60 font-mono text-xs font-bold border-t-2 border-zinc-200 dark:border-zinc-700">
              <tr>
                <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-sans">
                  Total Professional Fees Taxed &amp; Allowed:
                </td>
                <td className="p-3 text-right text-zinc-900 dark:text-white">
                  KES {calculation.totalClaimed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-3 text-right text-rose-600 dark:text-rose-400">
                  -KES {calculation.totalTaxedOff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                  KES {calculation.netAllowed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Add Line Item Modal with Schedule 6 Presets */}
      {isAddingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <form onSubmit={handleAddItem} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-sans text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />
                Add Line Item to {activeMatter.title.split('v')[0]}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAddingItem(false)} 
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Statutory Presets */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/60 space-y-1.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">
                Statutory Schedule 6 Fast Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('To drawing Chamber Summons and Supporting Affidavit (14 folios)', 2100, 'DRAWING')}
                  className="px-2 py-1 rounded bg-white dark:bg-zinc-800 text-[10.5px] border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 cursor-pointer"
                >
                  Drawing Summons (KES 2,100)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('To attending High Court Commercial Division for mention / directions (1 hour)', 1500, 'ATTENDANCE')}
                  className="px-2 py-1 rounded bg-white dark:bg-zinc-800 text-[10.5px] border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 cursor-pointer"
                >
                  Court Mention (KES 1,500)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('To attending virtual court session for ruling / delivery of judgment', 2500, 'ATTENDANCE')}
                  className="px-2 py-1 rounded bg-white dark:bg-zinc-800 text-[10.5px] border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 cursor-pointer"
                >
                  Ruling Attendance (KES 2,500)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('To perusing witness statement and list of documents filed by Respondent (18 folios)', 1350, 'PERUSAL')}
                  className="px-2 py-1 rounded bg-white dark:bg-zinc-800 text-[10.5px] border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 cursor-pointer"
                >
                  Perusal (KES 1,350)
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-zinc-500 block mb-1">Date of Professional Service</label>
                <input
                  type="text"
                  placeholder="e.g. 14.03.2024"
                  value={newItemDate}
                  onChange={(e) => setNewItemDate(e.target.value)}
                  className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Particulars of Service</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. To attending before Registrar for mention of taxation..."
                  value={newItemParticulars}
                  onChange={(e) => setNewItemParticulars(e.target.value)}
                  className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block mb-1">Amount Claimed (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-zinc-500 block mb-1">Statutory Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white font-mono"
                  >
                    <option value="INSTRUCTION">Instruction Fee</option>
                    <option value="DRAWING">Drawing Pleadings</option>
                    <option value="ATTENDANCE">Court Attendance</option>
                    <option value="PERUSAL">Perusal</option>
                    <option value="DISBURSEMENT">Disbursement</option>
                    <option value="OTHER">Other Service</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsAddingItem(false)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Add Item to Bill
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

