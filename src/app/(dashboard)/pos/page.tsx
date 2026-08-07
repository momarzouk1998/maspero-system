'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Printer, Train, Wallet, Plus, Trash2, RefreshCw, X, Receipt,
  Bus, CheckCircle2, Info, ArrowDownLeft, ArrowUpRight, ChevronRight,
  FileText, PlusCircle, Cpu
} from 'lucide-react';
import { calculatePrintPrice } from '@/lib/print-pricing';
import { InvoicePrint, InvoiceItem } from '@/components/pos/invoice-print';
import ServiceIcon from '@/components/ServiceIcon';

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
    const inv: OpenInvoice = { code, label: label ?? `فاتورة ${num}`, items: [], total: 0 };
    setOpenInvoices(prev => [...prev, inv]);
    setActiveInvoiceCode(code);
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
  useEffect(() => { createNewInvoice('فاتورة 1'); }, []);

  // ─── Refresh invoice items from server ──────────────────
  const [refreshing, setRefreshing] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [timestamp, setTimestamp]     = useState('');

  const fetchInvoice = async (code: string) => {
    setRefreshing(true);
    try {
      const res  = await fetch(`/api/invoice?code=${code}`);
      const data = await res.json();
      if (res.ok) {
        setOpenInvoices(prev => prev.map(i =>
          i.code === code ? { ...i, items: data.items || [], total: data.total || 0 } : i
        ));
        setEmployeeName(data.employeeName || 'غير محدد');
        if (data.timestamp) {
          setTimestamp(new Date(data.timestamp).toLocaleString('ar-EG', {
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

  // ─── Services data ───────────────────────────────────────
  const [services,  setServices]  = useState<any[]>([]);
  const [dbPrices,  setDbPrices]  = useState<any[]>([]);

  useEffect(() => {
    Promise.all([fetch('/api/services'), fetch('/api/print-prices')])
      .then(async ([sRes, pRes]) => {
        if (sRes.ok) { const d = await sRes.json(); setServices(d.services || []); }
        if (pRes.ok) { const d = await pRes.json(); setDbPrices(d.prices || []); }
      });
  }, []);

  // ─── Wallets data ────────────────────────────────────────
  const [extWallets, setExtWallets] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/wallets').then(r => r.json()).then(d => setExtWallets(d.externalWallets || d.wallets || []));
  }, []);

  const wallets  = extWallets.filter(w => w.wallet_type === 'محفظة');
  const machines = extWallets.filter(w => w.wallet_type === 'ماكينة');

  // ─── Active Tab ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'services' | 'tickets' | 'wallets'>('services');

  // ─── Service Popup ───────────────────────────────────────
  const [svcPopup,    setSvcPopup]    = useState<any | null>(null);
  const [svcFace,     setSvcFace]     = useState<'وجه واحد' | 'وجهين'>('وجه واحد');
  const [svcPaper,    setSvcPaper]    = useState(1);
  const [svcAmt,      setSvcAmt]      = useState(0);
  const [svcNotes,    setSvcNotes]    = useState('');  // for "أخرى" service
  const [svcLoading,  setSvcLoading]  = useState(false);

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
    setSvcPaper(1);
    setSvcAmt(0);
    setSvcNotes('');
  };

  const handleAddService = async () => {
    if (!svcPopup || !activeInvoiceCode) return;
    setSvcLoading(true);
    try {
      const isOther = svcPopup.service_name === 'أخرى';
      await fetch('/api/service-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: svcPopup.id,
          serviceName: isOther && svcNotes ? `أخرى: ${svcNotes}` : svcPopup.service_name,
          paperCount: svcPaper, pageCount: 1, faceType: svcFace,
          amount: svcAmt, notes: svcNotes || null,
          invoice_code: activeInvoiceCode,
        }),
      });
      setSvcPopup(null);
      fetchInvoice(activeInvoiceCode);
    } finally { setSvcLoading(false); }
  };

  // ─── Ticket (inline form, no popup) ─────────────────────
  const [tktType,    setTktType]    = useState<'قطار' | 'أتوبيس' | null>(null);
  const [tktCount,   setTktCount]   = useState(1);
  const [tktPrice,   setTktPrice]   = useState(0);
  const [tktComm,    setTktComm]    = useState(0);
  const [tktNotes,   setTktNotes]   = useState('');
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
    } finally { setTktLoading(false); }
  };

  // ─── Wallet Popup ────────────────────────────────────────
  const [wltPopup,   setWltPopup]   = useState<any | null>(null);
  const [wltOpType,  setWltOpType]  = useState<'إيداع' | 'سحب'>('إيداع');
  const [wltAmt,     setWltAmt]     = useState(0);
  const [wltComm,    setWltComm]    = useState(0);
  const [wltNotes,   setWltNotes]   = useState('');
  const [wltLoading, setWltLoading] = useState(false);

  const openWltPopup = (w: any, defaultType: 'إيداع' | 'سحب' = 'إيداع') => {
    setWltPopup(w);
    setWltOpType(defaultType);
    setWltAmt(0); setWltComm(0); setWltNotes('');
  };

  const handleAddWallet = async () => {
    if (!wltPopup || wltAmt <= 0 || !activeInvoiceCode) return;
    setWltLoading(true);
    try {
      await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: wltPopup.id, transactionType: wltOpType,
          amount: wltAmt, commission: wltComm,
          description: wltNotes, invoice_code: activeInvoiceCode,
        }),
      });
      setWltPopup(null);
      fetchInvoice(activeInvoiceCode);
    } finally { setWltLoading(false); }
  };

  // ─── Helpers ──────────────────────────────────────────────
  const isPrint = (name: string) => name?.includes('طباعة');

  const TabBtn = ({ id, label, icon: Icon, color }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${
        activeTab === id
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
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-4 overflow-hidden">

      {/* ── LEFT PANEL ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-w-0">

        {/* Page title */}
        <div className="glass-panel px-5 py-3 rounded-2xl border border-slate-200 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-bold text-slate-900">صفحة البيع</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <TabBtn id="services" label="الخدمات"       icon={Printer} color="bg-blue-600"   />
          <TabBtn id="tickets"  label="التذاكر"        icon={Train}   color="bg-purple-600" />
          <TabBtn id="wallets"  label="المحافظ والماكينات" icon={Wallet}  color="bg-emerald-600" />
        </div>

        {/* ── TAB: SERVICES ─────────────────────────────── */}
        {activeTab === 'services' && (
          <div className="glass-panel p-4 rounded-3xl border border-slate-200 flex-1">
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
                  className={`flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${
                    tktType === 'قطار'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400'
                  }`}
                >
                  <Train className="w-5 h-5" />
                  <span>قطار</span>
                </button>
                <button
                  onClick={() => { setTktType('أتوبيس'); setTktCount(1); setTktPrice(0); setTktComm(0); }}
                  className={`flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${
                    tktType === 'أتوبيس'
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
              <div className={`p-4 rounded-2xl border-2 space-y-4 transition-all ${
                tktType === 'قطار' ? 'border-purple-200 bg-purple-50/50' : 'border-indigo-200 bg-indigo-50/50'
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
                      {((tktPrice + tktComm) * tktCount).toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={handleAddTicket}
                    disabled={tktLoading || tktPrice <= 0}
                    className={`flex items-center gap-2 px-5 py-2.5 font-bold text-sm rounded-xl text-white disabled:opacity-50 transition-all shadow-md ${
                      tktType === 'قطار'
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

        {/* ── TAB: WALLETS & MACHINES ───────────────────── */}
        {activeTab === 'wallets' && (
          <div className="glass-panel p-4 rounded-3xl border border-slate-200 space-y-5 flex-1 overflow-y-auto">

            {/* Wallets section */}
            {wallets.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  المحافظ الإلكترونية
                </h3>
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-100 text-slate-600 text-xs font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">المحفظة</th>
                        <th className="px-4 py-2.5">الرصيد الحالي</th>
                        <th className="px-4 py-2.5 text-center">إيداع</th>
                        <th className="px-4 py-2.5 text-center">سحب</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {wallets.map(w => (
                        <tr key={w.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{w.wallet_name}
                            {w.wallet_number && <span className="text-xs text-slate-400 mr-1 font-mono">({w.wallet_number})</span>}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-800">
                            {Number(w.actual_balance || w.current_balance || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => openWltPopup(w, 'إيداع')}
                              className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 mx-auto">
                              <ArrowDownLeft className="w-3 h-3" /> إيداع
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
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
              </div>
            )}

            {/* Machines section */}
            {machines.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-600" />
                  الماكينات (فوري / بسطة / أمان)
                </h3>
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-100 text-slate-600 text-xs font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">الماكينة</th>
                        <th className="px-4 py-2.5">الرصيد الحالي</th>
                        <th className="px-4 py-2.5 text-center">إيداع</th>
                        <th className="px-4 py-2.5 text-center">سحب</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {machines.map(w => (
                        <tr key={w.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{w.wallet_name}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-800">
                            {Number(w.actual_balance || w.current_balance || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => openWltPopup(w, 'إيداع')}
                              className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 mx-auto">
                              <ArrowDownLeft className="w-3 h-3" /> إيداع
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
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
              </div>
            )}

            {extWallets.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-sm">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />جاري التحميل...
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: INVOICE ──────────────────────────── */}
      <div className="w-full md:w-[390px] shrink-0 flex flex-col gap-3 overflow-hidden">

        {/* ── Invoice Tabs (open invoices) ──────────────── */}
        <div className="glass-panel p-2 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {openInvoices.map(inv => (
              <div key={inv.code}
                onClick={() => setActiveInvoiceCode(inv.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer whitespace-nowrap transition-all text-xs font-bold border shrink-0 ${
                  inv.code === activeInvoiceCode
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
                    className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                      inv.code === activeInvoiceCode ? 'hover:bg-blue-500' : 'hover:bg-slate-200'
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
                  <div className={`p-2 rounded-xl h-fit shrink-0 ${
                    item.type === 'service' ? 'bg-blue-100 text-blue-600' :
                    item.type === 'ticket'  ? 'bg-purple-100 text-purple-600' :
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {item.type === 'service' ? <Printer className="w-4 h-4" /> :
                     item.type === 'ticket'  ? <Train   className="w-4 h-4" /> :
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
                  <div className="shrink-0 font-bold text-slate-900 font-mono text-sm">{item.total} ج</div>
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
                {Math.abs(activeInvoice?.total ?? 0)}
              </span>
            </div>

            <button
              onClick={() => setShowPrintHint(v => !v)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>طباعة بدون نافذة انتظار</span>
            </button>

            {showPrintHint && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed">
                أضف <code className="bg-blue-100 px-1 rounded font-mono">--kiosk-printing</code> لمسار Chrome واجعل طابعة الكاشير افتراضية.
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!activeInvoice || activeInvoice.items.length === 0}
                onClick={() => handlePrint('cashier')}
                className="py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-colors"
              >
                <Printer className="w-4 h-4" /><span>كاشير</span>
              </button>
              <button
                disabled={!activeInvoice || activeInvoice.items.length === 0}
                onClick={() => handlePrint('normal')}
                className="py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-colors"
              >
                <Receipt className="w-4 h-4" /><span>A4</span>
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
                      className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                        svcFace === f
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                      }`}
                    >{f}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Paper count (only for print) */}
            {isPrint(svcPopup.service_name) && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">عدد الورق</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSvcPaper(p => Math.max(1, p - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center border border-slate-200">−</button>
                  <input type="number" min="1" value={svcPaper}
                    onChange={e => setSvcPaper(parseInt(e.target.value) || 1)}
                    className="flex-1 p-2.5 text-center bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <button onClick={() => setSvcPaper(p => p + 1)}
                    className="w-10 h-10 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-lg flex items-center justify-center border border-blue-200">+</button>
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">المبلغ الإجمالي</label>
              <div className="relative">
                <input type="number" step="0.25" min="0" value={svcAmt || ''}
                  onChange={e => setSvcAmt(parseFloat(e.target.value) || 0)}
                  disabled={isPrint(svcPopup.service_name)}
                  placeholder="0"
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-700"
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
                  الرصيد الحالي: <span className="font-mono font-bold">{Number(wltPopup.actual_balance || wltPopup.current_balance || 0).toFixed(2)}</span>
                </p>
              </div>
              <button onClick={() => setWltPopup(null)} className="p-1 text-slate-500 hover:text-slate-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Operation type toggle - Radio buttons style */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">نوع العملية</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setWltOpType('إيداع')}
                  className={`py-3 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
                    wltOpType === 'إيداع'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                  }`}>
                  <ArrowDownLeft className="w-4 h-4" /> إيداع
                </button>
                <button onClick={() => setWltOpType('سحب')}
                  className={`py-3 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
                    wltOpType === 'سحب'
                      ? 'bg-red-600 text-white border-red-600 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-red-300'
                  }`}>
                  <ArrowUpRight className="w-4 h-4" /> سحب
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">المبلغ</label>
                <input type="number" step="0.25" min="1" value={wltAmt}
                  onChange={e => setWltAmt(parseFloat(e.target.value) || 0)}
                  className={`w-full p-3 bg-white border rounded-xl text-slate-900 font-mono font-bold text-lg focus:outline-none focus:ring-2 transition-colors ${
                    wltOpType === 'إيداع'
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
            <div className={`p-3 rounded-xl border text-xs flex justify-between ${
              wltOpType === 'إيداع' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            }`}>
              <span className="text-slate-600">الإجمالي المحصّل:</span>
              <span className={`font-bold font-mono ${wltOpType === 'إيداع' ? 'text-emerald-700' : 'text-red-700'}`}>
                {(wltOpType === 'إيداع' ? wltAmt + wltComm : wltAmt - wltComm).toFixed(2)}
              </span>
            </div>

            <div className="flex gap-3">
              <button onClick={handleAddWallet} disabled={wltLoading || wltAmt <= 0}
                className={`flex-1 py-3 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors ${
                  wltOpType === 'إيداع'
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
          isCashierPrint={false}
        />
      )}
    </div>
  );
}
