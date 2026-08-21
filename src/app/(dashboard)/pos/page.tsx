'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Printer, Train, Wallet, Plus, Trash2, RefreshCw, X, Receipt,
  Bus, CheckCircle2, Info, ArrowDownLeft, ArrowUpRight, ChevronRight,
  FileText, PlusCircle, Cpu, Lock, HelpCircle, Edit3
} from 'lucide-react';
import { calculatePrintPrice } from '@/lib/print-pricing';
import { InvoicePrint, InvoiceItem } from '@/components/pos/invoice-print';
import { KioskPrintGuideModal } from '@/components/pos/kiosk-print-guide-modal';
import ServiceIcon from '@/components/ServiceIcon';
import { formatNumber } from '@/lib/user-utils';

// ─── Types ───────────────────────────────────────────────
interface OpenInvoice {
  code: string;
  label: string;        // e.g. "فاتورة 1" or custom name
  items: InvoiceItem[];
  total: number;
}

export default function POSPage() {

  // ─── Open Invoices (multi-invoice tabs) ─────────────────
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [activeInvoiceCode, setActiveInvoiceCode] = useState<string>('');
  const [invoiceCounter, setInvoiceCounter] = useState(1);

  const activeInvoice = openInvoices.find(i => i.code === activeInvoiceCode) ?? null;

  const generateCode = () => Math.random().toString(36).substring(2, 10).toUpperCase();

  const createNewInvoice = (label?: string) => {
    const code = generateCode();
    const num = invoiceCounter;
    setInvoiceCounter(n => n + 1);
    const invLabel = label ?? `فاتورة ${num}`;
    const inv: OpenInvoice = { code, label: invLabel, items: [], total: 0 };
    setOpenInvoices(prev => [...prev, inv]);
    setActiveInvoiceCode(code);
    fetch('/api/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, label: invLabel })
    }).catch(console.error);
    return code;
  };

  const closeInvoice = (code: string) => {
    if (!confirm('إغلاق هذه الفاتورة وحذف محتواها؟')) return;
    setOpenInvoices(prev => {
      const remaining = prev.filter(i => i.code !== code);
      if (activeInvoiceCode === code && remaining.length > 0) {
        setActiveInvoiceCode(remaining[remaining.length - 1].code);
      }
      return remaining;
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetch('/api/invoice?active=true')
      .then(res => res.json())
      .then(data => {
        if (data.openInvoices && data.openInvoices.length > 0) {
          const loadedInvs: OpenInvoice[] = data.openInvoices.map((inv: any, idx: number) => ({
            code: inv.invoice_number,
            label: `فاتورة ${idx + 1}`,
            items: [],
            total: Number(inv.total_invoice || 0)
          }));
          setOpenInvoices(loadedInvs);
          setInvoiceCounter(loadedInvs.length + 1);
          setActiveInvoiceCode(loadedInvs[0].code);
          loadedInvs.forEach(i => fetchInvoice(i.code));
        } else {
          createNewInvoice('فاتورة 1');
        }
      })
      .catch(() => createNewInvoice('فاتورة 1'));
  }, []);

  // ─── Refresh invoice items from server ──────────────────
  const [refreshing, setRefreshing] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [timestamp, setTimestamp] = useState('');

  const fetchInvoice = async (code: string) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/invoice?code=${code}`);
      const data = await res.json();
      if (res.ok) {
        setOpenInvoices(prev => prev.map(i =>
          i.code === code ? { ...i, items: data.items || [], total: data.total || 0 } : i
        ));
        setEmployeeName(data.employeeName || 'غير محدد');
        if (data.timestamp) {
          setTimestamp(new Date(data.timestamp).toLocaleString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }));
        }
      }
    } finally {
      setRefreshing(false);
    }
  };

  // ─── Print ───────────────────────────────────────────────
  const [showPrintHint, setShowPrintHint] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = (mode: 'cashier' | 'normal') => {
    document.body.classList.add(mode === 'cashier' ? 'cashier-print' : 'normal-print');
    setTimeout(() => {
      window.print();
      document.body.classList.remove(mode === 'cashier' ? 'cashier-print' : 'normal-print');
    }, 100);
  };

  // ─── Delete item ─────────────────────────────────────────
  const handleDeleteItem = async (id: string, type: string) => {
    if (!confirm('حذف هذا العنصر؟')) return;
    setRefreshing(true);
    try {
      await fetch('/api/invoice/item', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type }),
      });
      if (activeInvoiceCode) fetchInvoice(activeInvoiceCode);
    } finally { setRefreshing(false); }
  };

  // ─── Edit item ───────────────────────────────────────────
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCommission, setEditCommission] = useState('');
  const [editCount, setEditCount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editFaceType, setEditFaceType] = useState<'وجه واحد' | 'وجهين'>('وجه واحد');
  const [editTransactionType, setEditTransactionType] = useState<'إيداع' | 'سحب'>('إيداع');
  const [editKomandaProvider, setEditKomandaProvider] = useState<'011' | '010' | 'انستا' | ''>('');
  const [editFawryType, setEditFawryType] = useState<'عادية' | 'مشتريات' | ''>('');
  const [editLoading, setEditLoading] = useState(false);

  const openEditItem = (item: any) => {
    setEditItem(item);
    setEditAmount(String(item.type === 'wallet' ? (item.amount ?? item.price ?? 0) : (item.total ?? item.price ?? 0)));
    setEditCommission(String(item.commission ?? 0));
    setEditCount(String(item.count ?? 1));
    setEditNotes(item.type === 'wallet' ? (item.description ?? '') : (item.notes ?? ''));
    setEditFaceType(item.faceType === 'وجهين' ? 'وجهين' : 'وجه واحد');
    const initialTxType = item.transaction_type || (item.name?.includes('سحب') ? 'سحب' : 'إيداع');
    setEditTransactionType(initialTxType === 'سحب' ? 'سحب' : 'إيداع');
    setEditKomandaProvider(item.comanda_type || item.komanda_type || (item.name?.includes('انستا') ? 'انستا' : item.name?.includes('010') ? '010' : item.name?.includes('011') ? '011' : ''));
    setEditFawryType(item.fawry_type || (item.name?.includes('مشتريات') ? 'مشتريات' : item.name?.includes('عادية') ? 'عادية' : ''));
  };

  const handleEditItem = async () => {
    if (!editItem || !activeInvoiceCode) return;
    setEditLoading(true);
    try {
      const res = await fetch('/api/invoice/item', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editItem.id,
          type: editItem.type,
          newAmount: parseFloat(editAmount) || 0,
          newCommission: editItem.type === 'wallet' ? (parseFloat(editCommission) || 0) : undefined,
          newCount: editItem.type !== 'wallet' ? (parseInt(editCount) || 1) : undefined,
          newNotes: editNotes || undefined,
          newFaceType: editItem.type === 'service' ? editFaceType : undefined,
          newTransactionType: editItem.type === 'wallet' ? editTransactionType : undefined,
          newKomandaProvider: editKomandaProvider || undefined,
          newFawryType: editFawryType || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التعديل');
      setEditItem(null);
      fetchInvoice(activeInvoiceCode);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // ─── Services & Custody data ──────────────────────────────
  const [services, setServices] = useState<any[]>([]);
  const [dbPrices, setDbPrices] = useState<any[]>([]);

  // Automatically recalculate print total price when faceType or count changes in edit modal
  useEffect(() => {
    if (!editItem) return;
    const sName = editItem.rawServiceName || editItem.name || '';
    if (editItem.type === 'service' && isPrint(sName)) {
      const count = parseInt(editCount) || 0;
      if (count > 0 && dbPrices.length > 0) {
        const result = calculatePrintPrice(sName, editFaceType, count, dbPrices);
        if (result && result.totalAmount > 0) {
          setEditAmount(String(result.totalAmount));
        }
      }
    }
  }, [editItem?.id, editFaceType, editCount, dbPrices]);
  const [custodyData, setCustodyData] = useState<{
    isSalesLocked: boolean;
    lockReason: string;
    onlineCashiers: Array<{ id: string; name: string; balance: number }>;
  } | null>(null);

  const fetchCustodyAndPrices = () => {
    Promise.all([
      fetch('/api/services'),
      fetch('/api/print-prices'),
      fetch('/api/custody/handover')
    ]).then(async ([sRes, pRes, cRes]) => {
      if (sRes.ok) { const d = await sRes.json(); setServices(d.services || []); }
      if (pRes.ok) { const d = await pRes.json(); setDbPrices(d.prices || []); }
      if (cRes.ok) { const d = await cRes.json(); setCustodyData(d); }
    });
  };

  useEffect(() => {
    fetchCustodyAndPrices();
  }, []);

  // ─── Wallets data ────────────────────────────────────────
  const [extWallets, setExtWallets] = useState<any[]>([]);
  const [mobilePosView, setMobilePosView] = useState<'catalog' | 'invoice'>('catalog');
  useEffect(() => {
    fetch('/api/wallets').then(r => r.json()).then(d => setExtWallets(d.externalWallets || d.wallets || []));
  }, []);

  const assignedIds: string[] = (custodyData as any)?.assignedWalletIds || [];
  const wallets = extWallets.filter(w => w.wallet_type === 'محفظة' && assignedIds.includes(w.id));
  const machines = extWallets.filter(w => w.wallet_type === 'ماكينة' && assignedIds.includes(w.id));

  // ─── Active Tab ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'services' | 'tickets' | 'wallets' | 'machines'>('services');

  // ─── Service Popup ───────────────────────────────────────
  const [svcPopup, setSvcPopup] = useState<any | null>(null);
  const [printModalData, setPrintModalData] = useState<any | null>(null);
  const [isCashierPrint, setIsCashierPrint] = useState(true);

  // Kiosk Print Guide Modal
  const [showKioskGuideModal, setShowKioskGuideModal] = useState(false);
  const [svcFace, setSvcFace] = useState<'وجه واحد' | 'وجهين'>('وجه واحد');
  const [svcPaper, setSvcPaper] = useState(0);
  const [svcAmt, setSvcAmt] = useState(0);
  const [svcNotes, setSvcNotes] = useState('');  // for "أخرى" service
  const [svcLoading, setSvcLoading] = useState(false);

  useEffect(() => {
    if (!svcPopup) return;
    if (svcPopup.service_name?.includes('طباعة')) {
      const result = calculatePrintPrice(svcPopup.service_name, svcFace, svcPaper, dbPrices);
      setSvcAmt(result.totalAmount);
    }
  }, [svcPopup, svcFace, svcPaper, dbPrices]);

  const openSvcPopup = (svc: any) => {
    setSvcPopup(svc);
    setSvcFace('وجه واحد');
    setSvcPaper(0);
    setSvcAmt(0);
    setSvcNotes('');
  };

  const handleAddService = async () => {
    if (!svcPopup || !activeInvoiceCode) return;
    setSvcLoading(true);
    try {
      const isOther = svcPopup.service_name === 'أخرى';
      const actualPaperCount = svcFace === 'وجهين' ? Math.ceil(svcPaper / 2) : svcPaper;

      await fetch('/api/service-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: svcPopup.id,
          serviceName: isOther && svcNotes ? `أخرى: ${svcNotes}` : svcPopup.service_name,
          paperCount: actualPaperCount, pageCount: svcPaper, faceType: svcFace,
          amount: svcAmt, notes: svcNotes || null,
          invoice_code: activeInvoiceCode,
        }),
      });
      setSvcPopup(null);
      fetchInvoice(activeInvoiceCode);
      setMobilePosView('invoice');
    } finally { setSvcLoading(false); }
  };

  // ─── Ticket (inline form, no popup) ─────────────────────
  const [tktType, setTktType] = useState<'قطار' | 'أتوبيس' | null>(null);
  const [tktCount, setTktCount] = useState(1);
  const [tktPrice, setTktPrice] = useState(0);
  const [tktComm, setTktComm] = useState(0);
  const [tktNotes, setTktNotes] = useState('');
  const [tktLoading, setTktLoading] = useState(false);

  const handleAddTicket = async () => {
    if (!activeInvoiceCode || !tktType) return;
    setTktLoading(true);
    try {
      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCount: tktCount, ticketPrice: tktPrice,
          ticketCommission: tktComm, serviceName: tktType,
          notes: tktNotes || null,
          invoice_code: activeInvoiceCode,
        }),
      });
      fetchInvoice(activeInvoiceCode);
      setTktCount(1); setTktPrice(0); setTktComm(0); setTktNotes('');
      setMobilePosView('invoice');
    } finally { setTktLoading(false); }
  };

  // ─── Wallet Popup ────────────────────────────────────────
  const [wltPopup, setWltPopup] = useState<any | null>(null);
  const [wltOpType, setWltOpType] = useState<'إيداع' | 'سحب'>('إيداع');
  const [wltAmt, setWltAmt] = useState(0);
  const [wltComm, setWltComm] = useState(0);
  const [wltNotes, setWltNotes] = useState('');
  const [wltLoading, setWltLoading] = useState(false);
  const [komandaProvider, setKomandaProvider] = useState<'011' | '010' | 'انستا' | ''>('');
  const [fawryWithdrawalType, setFawryWithdrawalType] = useState<'عادية' | 'مشتريات' | ''>('');

  const isWithdrawalDisabledForMachine = (name: string) => {
    const n = (name || '').trim();
    if (n.includes('سحب فوري') || n.includes('سحب فوري1') || n.includes('سحب فوري2')) {
      return false;
    }
    if (n.includes('فوري1') || n.includes('فوري 1') || n.includes('فوري2') || n.includes('فوري 2') || n.includes('بساطة') || n.includes('بسطة')) {
      return true;
    }
    return false;
  };

  const isDepositDisabledForMachine = (name: string) => {
    const n = (name || '').trim();
    if (n.includes('سحب فوري') || n.includes('سحب فوري1') || n.includes('سحب فوري 1') || n.includes('سحب فوري2') || n.includes('سحب فوري 2')) {
      return true;
    }
    return false;
  };

  const openWltPopup = (w: any, defaultType: 'إيداع' | 'سحب' = 'إيداع') => {
    let targetType = defaultType;
    if (isDepositDisabledForMachine(w.wallet_name)) {
      targetType = 'سحب';
    } else if (isWithdrawalDisabledForMachine(w.wallet_name)) {
      targetType = 'إيداع';
    }
    setWltPopup(w);
    setWltOpType(targetType);
    setWltAmt(0); setWltComm(0); setWltNotes('');
    setKomandaProvider('');
    setFawryWithdrawalType('');
  };

  const handleAddWallet = async () => {
    if (!wltPopup || wltAmt <= 0 || !activeInvoiceCode) return;
    const isKomandaCheck = wltPopup.wallet_name?.includes('كوماندا') || wltPopup.wallet_name?.includes('الكوماندا');
    const isFawryCheck = wltPopup.wallet_name === 'سحب فوري1' || wltPopup.wallet_name === 'سحب فوري2';
    if (isKomandaCheck && !komandaProvider) {
      alert('برجاء اختيار نوع الكوماندا (011 / 010 / انستا) أولاً');
      return;
    }
    if (isFawryCheck && !fawryWithdrawalType) {
      alert('برجاء اختيار نوع المعاملة (عادية / مشتريات) أولاً');
      return;
    }
    setWltLoading(true);
    const isKomanda = wltPopup.wallet_name?.includes('كوماندا') || wltPopup.wallet_name?.includes('الكوماندا');
    const isFawryMachine = wltPopup.wallet_name === 'سحب فوري1' || wltPopup.wallet_name === 'سحب فوري2';
    const finalDescription = isKomanda
      ? `[${komandaProvider}] ${wltNotes}`.trim()
      : isFawryMachine
      ? `[${fawryWithdrawalType}] ${wltNotes}`.trim()
      : wltNotes;

    try {
      await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: wltPopup.id, transactionType: wltOpType,
          amount: wltAmt, commission: wltComm,
          description: finalDescription, invoice_code: activeInvoiceCode,
          comanda_type: isKomanda ? komandaProvider : undefined,
          fawry_type: isFawryMachine ? fawryWithdrawalType : undefined,
        }),
      });
      setWltPopup(null);
      fetchInvoice(activeInvoiceCode);
      setMobilePosView('invoice');
    } finally { setWltLoading(false); }
  };

  const handleFinishCurrentInvoice = () => {
    const currentCode = activeInvoiceCode;
    const currentInv = activeInvoice;

    // 1. Mark current invoice as completed in DB
    if (currentCode) {
      fetch('/api/invoice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: currentCode, total: currentInv?.total || 0 })
      }).catch(console.error);
    }

    // 2. Create next open invoice
    const nextCode = generateCode();
    const nextNum = invoiceCounter;
    setInvoiceCounter(n => n + 1);
    const nextLabel = `فاتورة ${nextNum}`;

    fetch('/api/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: nextCode, label: nextLabel })
    }).catch(console.error);

    const newInv: OpenInvoice = {
      code: nextCode,
      label: nextLabel,
      items: [],
      total: 0
    };

    setOpenInvoices(prev => {
      const remaining = prev.filter(i => i.code !== currentCode);
      return [...remaining, newInv];
    });

    setActiveInvoiceCode(nextCode);
  };

  const handleFinishAndPrint = () => {
    handlePrint('cashier');
    handleFinishCurrentInvoice();
  };

  // ─── Helpers ──────────────────────────────────────────────
  const isPrint = (name: string) => name?.includes('طباعة');

  const TabBtn = ({ id, label, icon: Icon, color }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${activeTab === id
        ? `${color} text-white shadow-md`
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
    >
      <Icon className="w-4 h-4" /><span>{label}</span>
    </button>
  );

  // ════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════
  return (
    <div className="min-h-[calc(100vh-6rem)] md:h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-4 md:overflow-hidden pb-16 md:pb-0">

      {/* Mobile View Switcher Tabs (Only on small screens) */}
      <div className="flex md:hidden glass-panel p-1 rounded-2xl border border-slate-200 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setMobilePosView('catalog')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobilePosView === 'catalog'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>الخدمات والعمليات</span>
        </button>
        <button
          type="button"
          onClick={() => setMobilePosView('invoice')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all relative cursor-pointer ${
            mobilePosView === 'invoice'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>سلة الفاتورة</span>
          {activeInvoice && activeInvoice.items.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-mono font-bold mr-1">
              {activeInvoice.items.length}
            </span>
          )}
        </button>
      </div>

      {/* ── LEFT PANEL ────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col gap-3 min-w-0 ${mobilePosView === 'invoice' ? 'hidden md:flex' : 'flex'} md:overflow-y-auto`}>

        {/* Page title */}
        <div className="glass-panel px-5 py-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900">صفحة البيع</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Online Cashiers Summary Bar (Brief & Concise, no EGP) */}
            {custodyData?.onlineCashiers && custodyData.onlineCashiers.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {custodyData.onlineCashiers.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{c.name}:</span>
                    <span className="font-mono text-emerald-700">{c.balance}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sales Lock Red Alert Warning Banner */}
        {custodyData?.isSalesLocked && (
          <div className="p-4 rounded-2xl border border-red-300 bg-red-50 text-red-800 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs leading-relaxed font-bold">
              <Lock className="w-5 h-5 text-red-600 shrink-0 animate-bounce" />
              <span>⚠️ المبيعات مقفولة حالياً: {custodyData.lockReason}</span>
            </div>
            <Link
              href="/shifts"
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shrink-0"
            >
              صفحة الشفتات والعهدة 🚀
            </Link>
          </div>
        )}

        {/* Tabs */}
        <div className={`flex gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 ${custodyData?.isSalesLocked ? 'pointer-events-none opacity-50 select-none' : ''}`}>
          <TabBtn id="services" label="الخدمات" icon={Printer} color="bg-blue-600" />
          <TabBtn id="tickets" label="التذاكر" icon={Train} color="bg-purple-600" />
          <TabBtn id="wallets" label="المحافظ" icon={Wallet} color="bg-emerald-600" />
          <TabBtn id="machines" label="الماكينات" icon={Cpu} color="bg-amber-600" />
        </div>

        {/* ── TAB: SERVICES ─────────────────────────────── */}
        {activeTab === 'services' && (
          <div className={`glass-panel p-4 rounded-3xl border border-slate-200 flex-1 ${custodyData?.isSalesLocked ? 'pointer-events-none opacity-50 select-none' : ''}`}>
            <p className="text-xs text-slate-500 mb-3 font-medium">اضغط على الخدمة لإضافتها للفاتورة</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Sort: طباعة أسود first, طباعة ألوان second, others, then أخرى last */}
              {[
                ...services.filter(s => s.service_name?.includes('طباعة أسود')),
                ...services.filter(s => s.service_name?.includes('طباعة ألوان')),
                ...services.filter(s => !s.service_name?.includes('طباعة') && s.service_name !== 'أخرى'),
                // "أخرى" from DB if exists, else a virtual one
              ].map((svc) => {
                const isPrintSvc = svc.service_name?.includes('طباعة');
                const cardColor = svc.service_name?.includes('أسود')
                  ? 'border-slate-300 hover:border-slate-500 hover:bg-slate-50 bg-white'
                  : svc.service_name?.includes('ألوان')
                    ? 'border-amber-200 hover:border-amber-400 hover:bg-amber-50 bg-white'
                    : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50 bg-white';
                const iconColor = svc.service_name?.includes('أسود')
                  ? 'bg-slate-100 group-hover:bg-slate-200 text-slate-700'
                  : svc.service_name?.includes('ألوان')
                    ? 'bg-amber-100 group-hover:bg-amber-200 text-amber-700'
                    : 'bg-blue-100 group-hover:bg-blue-200 text-blue-600';
                return (
                  <button key={svc.id} onClick={() => openSvcPopup(svc)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 ${cardColor} hover:shadow-md transition-all text-center group`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${iconColor}`}>
                      <ServiceIcon name={svc.service_name} className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 leading-tight">{svc.service_name}</span>
                  </button>
                );
              })}
              {/* أخرى - always last */}
              <button
                onClick={() => openSvcPopup({ id: null, service_name: 'أخرى' })}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 hover:shadow-md transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5 text-slate-500" />
                </div>
                <span className="text-xs font-bold text-slate-600">أخرى</span>
              </button>

              {services.length === 0 && (
                <div className="col-span-4 py-10 text-center text-slate-400 text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  جاري تحميل الخدمات...
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: TICKETS ──────────────────────────────── */}
        {activeTab === 'tickets' && (
          <div className="glass-panel p-5 rounded-3xl border border-slate-200 space-y-4 flex-1">
            {/* Type selector */}
            <div>
              <p className="text-xs text-slate-500 font-medium mb-3">اختر نوع التذكرة</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setTktType('قطار'); setTktCount(1); setTktPrice(0); setTktComm(0); }}
                  className={`flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${tktType === 'قطار'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400'
                    }`}
                >
                  <Train className="w-5 h-5" />
                  <span>قطار</span>
                </button>
                <button
                  onClick={() => { setTktType('أتوبيس'); setTktCount(1); setTktPrice(0); setTktComm(0); }}
                  className={`flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${tktType === 'أتوبيس'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400'
                    }`}
                >
                  <Bus className="w-5 h-5" />
                  <span>أتوبيس</span>
                </button>
              </div>
            </div>

            {/* Inline form - shown when type is selected */}
            {tktType && (
              <div className={`p-4 rounded-2xl border-2 space-y-4 transition-all ${tktType === 'قطار' ? 'border-purple-200 bg-purple-50/50' : 'border-indigo-200 bg-indigo-50/50'
                }`}>
                <p className="text-xs font-bold text-slate-700">تفاصيل تذكرة {tktType}</p>

                {/* Count + Price + Commission in one row */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">العدد</label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setTktCount(c => Math.max(1, c - 1))}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 shrink-0">−</button>
                      <input type="number" min="1" value={tktCount}
                        onChange={e => setTktCount(parseInt(e.target.value) || 1)}
                        className="w-full p-2 text-center bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-purple-400"
                      />
                      <button onClick={() => setTktCount(c => c + 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 shrink-0">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">سعر التذكرة</label>
                    <input type="number" step="0.25" min="0" value={tktPrice || ''}
                      onChange={e => setTktPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">العمولة</label>
                    <input type="number" step="0.25" min="0" value={tktComm || ''}
                      onChange={e => setTktComm(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                {/* Notes Input Field */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات التذكرة (اختياري)</label>
                  <input
                    type="text"
                    value={tktNotes}
                    onChange={(e) => setTktNotes(e.target.value)}
                    placeholder="رقم القطار / اسم الراكب / المحطة..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                {/* Summary row + Add button */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white rounded-xl px-3 py-2 border border-slate-200">
                    <span>الإجمالي:</span>
                    <span className="font-bold font-mono text-emerald-700 text-sm">
                      {formatNumber((tktPrice + tktComm) * tktCount)}
                    </span>
                  </div>
                  <button
                    onClick={handleAddTicket}
                    disabled={tktLoading || tktPrice <= 0}
                    className={`flex items-center gap-2 px-5 py-2.5 font-bold text-sm rounded-xl text-white disabled:opacity-50 transition-all shadow-md ${tktType === 'قطار'
                      ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-200'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-200'
                      }`}
                  >
                    {tktLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    إضافة للفاتورة
                  </button>
                </div>
              </div>
            )}

            {!tktType && (
              <div className="py-8 text-center text-slate-400 text-sm">
                اختر نوع التذكرة أعلاه لعرض التفاصيل
              </div>
            )}
          </div>
        )}

        {/* ── TAB: WALLETS ──────────────────────────── */}
        {activeTab === 'wallets' && (
          <div className="glass-panel p-4 rounded-3xl border border-slate-200 space-y-5 flex-1 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              المحافظ الإلكترونية
            </h3>
            {wallets.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-right text-sm table-auto">
                  <thead className="bg-slate-100 text-slate-600 text-xs font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 whitespace-nowrap">المحفظة</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">الرصيد الحالي</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>إيداع الشهر</span>
                          <div className="relative group cursor-pointer">
                            <HelpCircle className="w-3.5 h-3.5 text-blue-500 hover:text-blue-700 transition-colors" />
                            <div className="absolute right-0 top-5 hidden group-hover:block bg-slate-900 text-white text-[11px] font-normal p-2.5 rounded-xl shadow-xl w-56 z-50 leading-relaxed normal-case">
                              إجمالي مبالغ الإيداع المنفذة على هذه المحفظة خلال الشهر الحالي.
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>سحب الشهر</span>
                          <div className="relative group cursor-pointer">
                            <HelpCircle className="w-3.5 h-3.5 text-blue-500 hover:text-blue-700 transition-colors" />
                            <div className="absolute right-0 top-5 hidden group-hover:block bg-slate-900 text-white text-[11px] font-normal p-2.5 rounded-xl shadow-xl w-56 z-50 leading-relaxed normal-case">
                              إجمالي مبالغ السحب المنفذة على هذه المحفظة خلال الشهر الحالي.
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-2.5 text-center whitespace-nowrap">إيداع</th>
                      <th className="px-4 py-2.5 text-center whitespace-nowrap">سحب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {wallets.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{w.wallet_name}
                          {w.wallet_number && <span className="text-xs text-slate-400 mr-1 font-mono">({w.wallet_number})</span>}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {formatNumber(Number(w.actual_balance || w.current_balance || 0))}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-700 whitespace-nowrap text-xs">
                          {formatNumber(Number(w.monthly_deposit || 0))}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-red-700 whitespace-nowrap text-xs">
                          {formatNumber(Number(w.monthly_withdrawal || 0))}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button onClick={() => openWltPopup(w, 'إيداع')}
                            className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 mx-auto">
                            <ArrowDownLeft className="w-3 h-3" /> إيداع
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button onClick={() => openWltPopup(w, 'سحب')}
                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 mx-auto">
                            <ArrowUpRight className="w-3 h-3" /> سحب
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">لا توجد محافظ مضافة</div>
            )}
          </div>
        )}

        {/* ── TAB: MACHINES ─────────────────────────── */}
        {activeTab === 'machines' && (
          <div className="glass-panel p-4 rounded-3xl border border-slate-200 space-y-5 flex-1 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-600" />
              الماكينات (فوري / بسطة / أمان)
            </h3>
            {machines.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-right text-sm table-auto">
                  <thead className="bg-slate-100 text-slate-600 text-xs font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 whitespace-nowrap">الماكينة</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">الرصيد الحالي</th>
                      <th className="px-4 py-2.5 text-center whitespace-nowrap">إيداع</th>
                      <th className="px-4 py-2.5 text-center whitespace-nowrap">سحب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {machines.map(w => {
                      const hideWithdrawal = isWithdrawalDisabledForMachine(w.wallet_name);
                      const hideDeposit = isDepositDisabledForMachine(w.wallet_name);
                      return (
                        <tr key={w.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{w.wallet_name}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {formatNumber(Number(w.actual_balance || w.current_balance || 0))}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {!hideDeposit ? (
                              <button onClick={() => openWltPopup(w, 'إيداع')}
                                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 mx-auto">
                                <ArrowDownLeft className="w-3.5 h-3.5" /> إيداع
                              </button>
                            ) : (
                              <span className="text-slate-300 font-bold text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {!hideWithdrawal ? (
                              <button onClick={() => openWltPopup(w, 'سحب')}
                                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 mx-auto">
                                <ArrowUpRight className="w-3.5 h-3.5" /> سحب
                              </button>
                            ) : (
                              <span className="text-slate-300 font-bold text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">لا توجد ماكينات مضافة</div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: INVOICE ──────────────────────────── */}
      <div className={`w-full md:w-[390px] shrink-0 flex flex-col gap-3 ${mobilePosView === 'catalog' ? 'hidden md:flex' : 'flex'} md:overflow-hidden`}>

        {/* ── Invoice Tabs (open invoices) ──────────────── */}
        <div className="glass-panel p-2 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {openInvoices.map(inv => (
              <div key={inv.code}
                onClick={() => setActiveInvoiceCode(inv.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer whitespace-nowrap transition-all text-xs font-bold border shrink-0 ${inv.code === activeInvoiceCode
                  ? 'bg-blue-600 text-white border-blue-600 shadow'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{inv.label}</span>
                <span className={`text-[10px] font-mono ml-0.5 ${inv.code === activeInvoiceCode ? 'text-blue-200' : 'text-slate-400'}`}>
                  ({inv.items.length})
                </span>
                {openInvoices.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); closeInvoice(inv.code); }}
                    className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${inv.code === activeInvoiceCode ? 'hover:bg-blue-500' : 'hover:bg-slate-200'
                      }`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => createNewInvoice()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold border border-dashed border-slate-300 transition-all shrink-0"
              title="إضافة فاتورة جديدة معلقة"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>فاتورة جديدة</span>
            </button>
          </div>
        </div>

        {/* ── Invoice Body ──────────────────────────────── */}
        <div className="glass-panel rounded-3xl border border-slate-200 flex-1 overflow-hidden flex flex-col relative">
          {refreshing && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          )}

          {/* Invoice code header */}
          {activeInvoice && (
            <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs text-slate-500">
                كود: <span className="font-mono font-bold text-blue-600">{activeInvoice.code}</span>
              </span>
              <span className="text-xs text-slate-400">{activeInvoice.items.length} عنصر</span>
            </div>
          )}

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!activeInvoice || activeInvoice.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                <Receipt className="w-10 h-10" />
                <p className="text-sm">الفاتورة فارغة</p>
                <p className="text-xs">اضغط على خدمة من اليسار لإضافتها</p>
              </div>
            ) : (
              activeInvoice.items.map((item) => (
                <div key={item.id}
                  className="bg-white border border-slate-200 rounded-2xl p-3 flex gap-3 relative group hover:border-slate-300 transition-colors"
                >
                  <div className={`p-2 rounded-xl h-fit shrink-0 ${item.type === 'service' ? 'bg-blue-100 text-blue-600' :
                    item.type === 'ticket' ? 'bg-purple-100 text-purple-600' :
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                    {item.type === 'service' ? <Printer className="w-4 h-4" /> :
                      item.type === 'ticket' ? <Train className="w-4 h-4" /> :
                        <Wallet className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-mono">
                      <span>× {item.count}</span>
                      <span>·</span>
                      <span>{item.price} ج</span>
                    </div>
                  </div>
                  <div className={`shrink-0 font-bold font-mono text-sm ${item.total < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {item.total < 0 ? `-${formatNumber(Math.abs(item.total))}` : formatNumber(item.total)} ج
                  </div>
                  {/* زرار تعديل */}
                  <button
                    onClick={() => openEditItem(item)}
                    className="absolute -top-1.5 left-5 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow hidden group-hover:flex cursor-pointer"
                    title="تعديل البند"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  {/* زرار حذف */}
                  <button
                    onClick={() => handleDeleteItem(item.id, item.type)}
                    className="absolute -top-1.5 -left-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow hidden group-hover:flex"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Invoice footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-sm">الإجمالي الكلي</span>
              <span className={`text-2xl font-bold font-mono ${(activeInvoice?.total ?? 0) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {(activeInvoice?.total ?? 0) < 0 ? `-${formatNumber(Math.ceil(Math.abs(activeInvoice?.total ?? 0)))}` : formatNumber(Math.ceil(activeInvoice?.total ?? 0))}
              </span>
            </div>

            <button
              onClick={() => setShowKioskGuideModal(true)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer font-medium"
            >
              <Info className="w-3.5 h-3.5" />
              <span>طباعة بدون نافذة انتظار</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!activeInvoice || activeInvoice.items.length === 0}
                onClick={handleFinishCurrentInvoice}
                className="py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>إنهاء الفاتورة</span>
              </button>
              <button
                disabled={!activeInvoice || activeInvoice.items.length === 0}
                onClick={handleFinishAndPrint}
                className="py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>إنهاء وطباعة</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
           POPUP: SERVICE
      ══════════════════════════════════════════════════ */}
      {svcPopup && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">

            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Printer className="w-5 h-5 text-blue-600" />
                  {svcPopup.service_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">أدخل التفاصيل ثم اضغط إضافة</p>
              </div>
              <button onClick={() => setSvcPopup(null)} className="p-1 text-slate-500 hover:text-slate-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* "أخرى" notes field */}
            {svcPopup.service_name === 'أخرى' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">وصف الخدمة / البيان *</label>
                <input
                  type="text"
                  value={svcNotes}
                  onChange={e => setSvcNotes(e.target.value)}
                  placeholder="مثال: لامينيشن، فلاشة، سكان..."
                  autoFocus
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <p className="text-xs text-slate-400 mt-1">سيتم حفظه مع الخدمة لمراجعته لاحقاً</p>
              </div>
            )}

            {/* Face type buttons (only for print) */}
            {isPrint(svcPopup.service_name) && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">نوع الوجه</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['وجه واحد', 'وجهين'] as const).map(f => (
                    <button key={f} onClick={() => setSvcFace(f)}
                      className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${svcFace === f
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                        }`}
                    >{f}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Paper count (the SECOND field in all service sale modals) */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center justify-between">
                <span>{isPrint(svcPopup.service_name) ? 'عدد الأوجه المطلوبة' : 'عدد الورق (اختياري)'} *</span>
                {isPrint(svcPopup.service_name) && svcFace === 'وجهين' && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    عدد الورق الفعلي: {Math.ceil(svcPaper / 2)} ورقة
                  </span>
                )}
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => setSvcPaper(p => Math.max(0, p - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center border border-slate-200">−</button>
                <input type="number" min="0" value={svcPaper}
                  onChange={e => setSvcPaper(parseInt(e.target.value) || 0)}
                  className="flex-1 p-2.5 text-center bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <button onClick={() => setSvcPaper(p => p + 1)}
                  className="w-10 h-10 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-lg flex items-center justify-center border border-blue-200">+</button>
              </div>
            </div>

            {/* Amount - Item 14: Allow manual total price override */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2 flex items-center justify-between">
                <span>المبلغ الإجمالي</span>
                <span className="text-[10px] text-slate-400 font-normal">(يمكن تعديل المبلغ النهائي يدويًا)</span>
              </label>
              <div className="relative">
                <input type="number" step="0.25" min="0" value={svcAmt || ''}
                  onChange={e => setSvcAmt(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            {/* Notes field for all services */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">ملاحظات (اختياري)</label>
              <input
                type="text"
                value={svcNotes}
                onChange={e => setSvcNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات تفصيلية هنا..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleAddService}
                disabled={svcLoading || svcAmt <= 0 || (svcPopup.service_name === 'أخرى' && !svcNotes.trim())}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md"
              >
                {svcLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة للفاتورة
              </button>
              <button onClick={() => setSvcPopup(null)}
                className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
           POPUP: WALLET / MACHINE TRANSACTION
      ══════════════════════════════════════════════════ */}
      {wltPopup && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">

            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  {wltPopup.wallet_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  الرصيد الحالي: <span className="font-mono font-bold">{formatNumber(Number(wltPopup.actual_balance || wltPopup.current_balance || 0))}</span>
                </p>
              </div>
              <button onClick={() => setWltPopup(null)} className="p-1 text-slate-500 hover:text-slate-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Operation type toggle - Radio buttons style */}
            {!isDepositDisabledForMachine(wltPopup.wallet_name) && !isWithdrawalDisabledForMachine(wltPopup.wallet_name) ? (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">نوع العملية</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setWltOpType('إيداع')}
                    className={`py-3 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${wltOpType === 'إيداع'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                      }`}>
                    <ArrowDownLeft className="w-4 h-4" /> إيداع
                  </button>
                  <button onClick={() => setWltOpType('سحب')}
                    className={`py-3 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${wltOpType === 'سحب'
                      ? 'bg-red-600 text-white border-red-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-red-300'
                      }`}>
                    <ArrowUpRight className="w-4 h-4" /> سحب
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-center">
                <span className="text-xs text-slate-600">نوع المعاملة المتاحة للماكينة: </span>
                <span className={`text-xs font-bold ${wltOpType === 'إيداع' ? 'text-emerald-700' : 'text-red-700'}`}>
                  {wltOpType}
                </span>
              </div>
            )}

            {/* Komanda Provider Buttons */}
            {(wltPopup.wallet_name?.includes('كوماندا') || wltPopup.wallet_name?.includes('الكوماندا')) && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">كوماندا *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['011', '010', 'انستا'] as const).map(prov => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => setKomandaProvider(prov)}
                      className={`py-2.5 rounded-xl font-bold text-xs border-2 transition-all flex items-center justify-center cursor-pointer ${
                        komandaProvider === prov
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {prov}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fawry Sub-Type Buttons (سحب فوري1 / سحب فوري2 for both deposit & withdrawal) */}
            {(wltPopup.wallet_name === 'سحب فوري1' || wltPopup.wallet_name === 'سحب فوري2') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">نوع المعاملة (عادية / مشتريات) *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['عادية', 'مشتريات'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFawryWithdrawalType(type)}
                      className={`py-2.5 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center cursor-pointer ${
                        fawryWithdrawalType === type
                          ? type === 'مشتريات'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                            : 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">المبلغ</label>
                <input type="number" step="0.25" min="1" value={wltAmt}
                  onChange={e => setWltAmt(parseFloat(e.target.value) || 0)}
                  className={`w-full p-3 bg-white border rounded-xl text-slate-900 font-mono font-bold text-lg focus:outline-none focus:ring-2 transition-colors ${wltOpType === 'إيداع'
                    ? 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
                    : 'border-slate-300 focus:border-red-500 focus:ring-red-200'
                    }`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">عمولتنا</label>
                <input type="number" step="0.25" min="0" value={wltComm}
                  onChange={e => setWltComm(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">رقم تليفون / ملاحظات (اختياري)</label>
              <input type="text" value={wltNotes} onChange={e => setWltNotes(e.target.value)}
                placeholder="مثال: 010xxxxxxxx"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Summary */}
            <div className={`p-3 rounded-xl border text-xs flex justify-between ${wltOpType === 'إيداع' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
              }`}>
              <span className="text-slate-600">الإجمالي المحصّل:</span>
              <span className={`font-bold font-mono ${wltOpType === 'إيداع' ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatNumber(wltOpType === 'إيداع' ? wltAmt + wltComm : wltAmt - wltComm)}
              </span>
            </div>

            <div className="flex gap-3">
              <button onClick={handleAddWallet} disabled={wltLoading || wltAmt <= 0}
                className={`flex-1 py-3 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors ${wltOpType === 'إيداع'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-red-600 hover:bg-red-500'
                  }`}>
                {wltLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                تسجيل {wltOpType}
              </button>
              <button onClick={() => setWltPopup(null)}
                className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print component */}
      {activeInvoice && (
        <InvoicePrint
          ref={printRef}
          invoiceCode={activeInvoice.code}
          timestamp={timestamp}
          employeeName={employeeName}
          items={activeInvoice.items}
          total={activeInvoice.total}
          isCashierPrint={isCashierPrint}
        />
      )}

      {/* Kiosk Print Guide Modal */}
      <KioskPrintGuideModal
        isOpen={showKioskGuideModal}
        onClose={() => setShowKioskGuideModal(false)}
      />

      {/* ══════════════════════════════════════════════════
           MODAL: EDIT INVOICE ITEM (خدمة / تذكرة)
      ══════════════════════════════════════════════════ */}
      {editItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">

            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  تعديل بند الفاتورة
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{editItem.name}</p>
              </div>
              <button onClick={() => setEditItem(null)} className="p-1 text-slate-500 hover:text-slate-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* اختيار نوع العملية للمحافظ (إيداع / سحب) */}
              {editItem.type === 'wallet' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">نوع العملية *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditTransactionType('إيداع')}
                      className={`py-2.5 rounded-xl font-bold text-xs border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        editTransactionType === 'إيداع'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <ArrowDownLeft className="w-4 h-4" /> إيداع
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTransactionType('سحب')}
                      className={`py-2.5 rounded-xl font-bold text-xs border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        editTransactionType === 'سحب'
                          ? 'bg-red-600 text-white border-red-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-red-300'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" /> سحب
                    </button>
                  </div>
                </div>
              )}

              {/* اختيار مزود الخدمة لعمليات شحن الكوماندا */}
              {(editItem.name?.includes('كوماندا') || editItem.description?.includes('كوماندا') || editKomandaProvider) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">مزود خدمة الكوماندا *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['011', '010', 'انستا'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditKomandaProvider(p)}
                        className={`py-2.5 rounded-xl font-bold text-xs border-2 transition-all cursor-pointer ${
                          editKomandaProvider === p
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* اختيار نوع المعاملة لعمليات سحب فوري */}
              {(editItem.name?.includes('فوري') || editItem.description?.includes('فوري') || editFawryType) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">نوع المعاملة *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['عادية', 'مشتريات'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditFawryType(t)}
                        className={`py-2.5 rounded-xl font-bold text-xs border-2 transition-all cursor-pointer ${
                          editFawryType === t
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* اختيار نوع الوجه لخدمات الطباعة */}
              {editItem.type === 'service' && isPrint(editItem.rawServiceName || editItem.name) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">نوع الوجه *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['وجه واحد', 'وجهين'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setEditFaceType(f)}
                        className={`py-2.5 rounded-xl font-bold text-xs border-2 transition-all cursor-pointer ${
                          editFaceType === f
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* المبلغ الإجمالي / الأساسي */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {editItem.type === 'wallet' ? 'المبلغ الأساسي للعملية *' : 'المبلغ الإجمالي *'}
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  autoFocus
                />
              </div>

              {/* العمولة — عمليات المحافظ فقط */}
              {editItem.type === 'wallet' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">عمولتنا *</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={editCommission}
                    onChange={e => setEditCommission(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              )}

              {/* العدد — خدمات فقط */}
              {editItem.type === 'service' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">عدد الأوراق / الوحدات</label>
                  <input
                    type="number"
                    min="0"
                    value={editCount}
                    onChange={e => setEditCount(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* عدد التذاكر */}
              {editItem.type === 'ticket' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">عدد التذاكر</label>
                  <input
                    type="number"
                    min="1"
                    value={editCount}
                    onChange={e => setEditCount(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* ملاحظات */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">ملاحظات (اختياري)</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="ملاحظات تفصيلية..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleEditItem}
                disabled={editLoading || !editAmount || parseFloat(editAmount) <= 0}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md"
              >
                {editLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                حفظ التعديل
              </button>
              <button
                onClick={() => setEditItem(null)}
                className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Sticky Bottom Cart Bar for Mobile */}
      {activeInvoice && activeInvoice.items.length > 0 && mobilePosView === 'catalog' && (
        <div className="fixed bottom-3 inset-x-3 z-40 md:hidden animate-in slide-in-from-bottom duration-300">
          <button
            onClick={() => setMobilePosView('invoice')}
            className="w-full py-3 px-4 bg-slate-900 text-white rounded-2xl font-bold text-xs shadow-2xl flex items-center justify-between border border-slate-700 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>سلة الفاتورة الحالية ({activeInvoice.items.length} بند)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-emerald-400">
                {(activeInvoice?.total ?? 0) < 0 ? `-${formatNumber(Math.ceil(Math.abs(activeInvoice?.total ?? 0)))}` : formatNumber(Math.ceil(activeInvoice?.total ?? 0))} ج
              </span>
              <span className="bg-blue-600 text-white text-[11px] px-2.5 py-1 rounded-xl flex items-center gap-1 font-bold">
                عرض 🛒
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
