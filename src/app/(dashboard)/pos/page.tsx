'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Printer, Ticket, Wallet, Plus, Trash2, RefreshCw, X, Receipt,
  CheckCircle2, AlertTriangle, Search, Info
} from 'lucide-react';
import { calculatePrintPrice } from '@/lib/print-pricing';
import { InvoicePrint, InvoiceItem } from '@/components/pos/invoice-print';

// We reuse basic logic from /services, /tickets, /wallets pages

export default function POSPage() {
  const [invoiceCode, setInvoiceCode] = useState<string>('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [showPrintHint, setShowPrintHint] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Tabs: 'services' | 'tickets' | 'wallets'
  const [activeTab, setActiveTab] = useState<'services' | 'tickets' | 'wallets'>('services');

  // Load Invoice
  const fetchInvoice = async (code: string) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/invoice?code=${code}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setEmployeeName(data.employeeName || 'غير محدد');
        
        // Format timestamp nicely
        if (data.timestamp) {
          const d = new Date(data.timestamp);
          setTimestamp(d.toLocaleString('ar-EG', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const generateNewInvoice = () => {
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    setInvoiceCode(newCode);
    setItems([]);
    setTotal(0);
    setTimestamp(new Date().toLocaleString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }));
  };

  useEffect(() => {
    generateNewInvoice();
  }, []);

  // --- Add Service Logic ---
  const [services, setServices] = useState<any[]>([]);
  const [dbPrices, setDbPrices] = useState<any[]>([]);
  const [serviceName, setServiceName] = useState('');
  const [paperCount, setPaperCount] = useState(1);
  const [faceType, setFaceType] = useState('وجه واحد');
  const [serviceAmount, setServiceAmount] = useState(0);

  useEffect(() => {
    Promise.all([fetch('/api/services'), fetch('/api/print-prices')])
      .then(async ([sRes, pRes]) => {
        if (sRes.ok) { const sData = await sRes.json(); setServices(sData.services || []); }
        if (pRes.ok) { const pData = await pRes.json(); setDbPrices(pData.prices || []); }
      });
  }, []);

  useEffect(() => {
    if (!serviceName) return;
    const isPrint = serviceName.includes('طباعة');
    if (isPrint) {
      const result = calculatePrintPrice(serviceName, faceType, paperCount, dbPrices);
      setServiceAmount(result.totalAmount);
    }
  }, [serviceName, paperCount, faceType, dbPrices]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName) return;
    setLoading(true);
    try {
      const targetService = services.find(s => s.service_name === serviceName);
      await fetch('/api/service-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: targetService?.id,
          serviceName, paperCount, pageCount: 1, faceType,
          amount: serviceAmount, invoice_code: invoiceCode
        })
      });
      fetchInvoice(invoiceCode);
      setPaperCount(1);
      setServiceAmount(0);
    } finally {
      setLoading(false);
    }
  };

  // --- Add Ticket Logic ---
  const [ticketCount, setTicketCount] = useState(1);
  const [ticketPrice, setTicketPrice] = useState(0);
  const [ticketCommission, setTicketCommission] = useState(0);

  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCount: ticketCount, ticketPrice, ticketCommission,
          invoice_code: invoiceCode
        })
      });
      fetchInvoice(invoiceCode);
      setTicketCount(1);
      setTicketPrice(0);
      setTicketCommission(0);
    } finally {
      setLoading(false);
    }
  };

  // --- Add Wallet Logic ---
  const [extWallets, setExtWallets] = useState<any[]>([]);
  const [walletId, setWalletId] = useState('');
  const [walletType, setWalletType] = useState('إيداع');
  const [walletAmount, setWalletAmount] = useState(0);
  const [walletCommission, setWalletCommission] = useState(0);
  const [walletNotes, setWalletNotes] = useState('');

  useEffect(() => {
    fetch('/api/wallets')
      .then(res => res.json())
      .then(data => setExtWallets(data.wallets || []));
  }, []);

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId || walletAmount <= 0) return;
    setLoading(true);
    try {
      await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId, transactionType: walletType, amount: walletAmount,
          commission: walletCommission, description: walletNotes,
          invoice_code: invoiceCode
        })
      });
      fetchInvoice(invoiceCode);
      setWalletAmount(0);
      setWalletCommission(0);
      setWalletNotes('');
    } finally {
      setLoading(false);
    }
  };

  // --- Delete Item Logic ---
  const handleDeleteItem = async (id: string, type: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;
    setRefreshing(true);
    try {
      await fetch('/api/invoice/item', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type })
      });
      fetchInvoice(invoiceCode);
    } finally {
      setRefreshing(false);
    }
  };

  // --- Print Logic ---
  const handlePrint = (mode: 'cashier' | 'normal') => {
    const parent = document.body;
    parent.classList.add(mode === 'cashier' ? 'cashier-print' : 'normal-print');
    
    // Add wrapper to main element to hide it
    const wrapper = document.createElement('div');
    wrapper.className = 'invoice-print-wrapper';
    
    // Using timeout to ensure CSS is applied
    setTimeout(() => {
      window.print();
      parent.classList.remove(mode === 'cashier' ? 'cashier-print' : 'normal-print');
    }, 100);
  };

  // UI Components
  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
      
      {/* Left Panel: Adding Items (Takes up remaining space) */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
        
        {/* Title */}
        <div className="glass-panel px-6 py-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-400" />
            <span>صفحة البيع</span>
          </h1>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-slate-900 rounded-2xl">
          <TabButton id="services" label="الخدمات والطباعة" icon={Printer} />
          <TabButton id="tickets" label="تذاكر قطارات" icon={Ticket} />
          <TabButton id="wallets" label="المحافظ والكاش" icon={Wallet} />
        </div>

        {/* Tab Content */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          
          {activeTab === 'services' && (
            <form onSubmit={handleAddService} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">اختر الخدمة</label>
                <select
                  required
                  value={serviceName}
                  onChange={(e) => {
                    setServiceName(e.target.value);
                    if (!e.target.value.includes('طباعة')) setFaceType('');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">-- اختر الخدمة --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.service_name}>{s.service_name}</option>
                  ))}
                </select>
              </div>

              {serviceName.includes('طباعة') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">نوع الوجه</label>
                    <select
                      value={faceType}
                      onChange={(e) => setFaceType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="وجه واحد">وجه واحد</option>
                      <option value="وجهين">وجهين</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">عدد الورق</label>
                    <input
                      type="number" min="1" required
                      value={paperCount}
                      onChange={(e) => setPaperCount(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">المبلغ (الإجمالي)</label>
                <div className="relative">
                  <input
                    type="number" step="0.25" min="0" required
                    value={serviceAmount}
                    onChange={(e) => setServiceAmount(parseFloat(e.target.value) || 0)}
                    disabled={serviceName.includes('طباعة')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 font-mono font-bold text-lg"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">ج.م</span>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                <span>إضافة للفاتورة</span>
              </button>
            </form>
          )}

          {activeTab === 'tickets' && (
            <form onSubmit={handleAddTicket} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">عدد التذاكر</label>
                <input
                  type="number" min="1" required
                  value={ticketCount}
                  onChange={(e) => setTicketCount(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">سعر التذكرة الأساسي</label>
                  <input
                    type="number" step="0.25" min="0" required
                    value={ticketPrice}
                    onChange={(e) => setTicketPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">العمولة</label>
                  <input
                    type="number" step="0.25" min="0" required
                    value={ticketCommission}
                    onChange={(e) => setTicketCommission(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                <span>إضافة للفاتورة</span>
              </button>
            </form>
          )}

          {activeTab === 'wallets' && (
            <form onSubmit={handleAddWallet} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">المحفظة / الماكينة</label>
                  <select
                    required
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="">-- اختر --</option>
                    {extWallets.map((w) => (
                      <option key={w.id} value={w.id}>{w.wallet_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">نوع العملية</label>
                  <select
                    value={walletType}
                    onChange={(e) => setWalletType(e.target.value)}
                    className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none transition-colors ${
                      walletType === 'إيداع' ? 'focus:border-emerald-500' : 'focus:border-red-500'
                    }`}
                  >
                    <option value="إيداع">إيداع</option>
                    <option value="سحب">سحب</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">المبلغ المالي</label>
                  <input
                    type="number" step="0.25" min="1" required
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">عمولتنا</label>
                  <input
                    type="number" step="0.25" min="0" required
                    value={walletCommission}
                    onChange={(e) => setWalletCommission(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">رقم التليفون / ملاحظات (اختياري)</label>
                <input
                  type="text"
                  value={walletNotes}
                  onChange={(e) => setWalletNotes(e.target.value)}
                  placeholder="مثال: 010xxxxxxxx"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                <span>إضافة للفاتورة</span>
              </button>
            </form>
          )}

        </div>
      </div>

      {/* Right Panel: The Invoice Container (Fixed Width) */}
      <div className="w-full md:w-[400px] lg:w-[450px] shrink-0 flex flex-col gap-4">
        
        {/* Invoice Header */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-400" />
              <span>الفاتورة الحالية</span>
            </h2>
            <div className="text-xs text-slate-400 font-mono">
              كود: <span className="text-blue-400">{invoiceCode}</span>
            </div>
          </div>
          
          <button
            onClick={generateNewInvoice}
            className="px-4 py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>فاتورة جديدة</span>
          </button>
        </div>

        {/* Invoice Items List */}
        <div className="glass-panel rounded-3xl border border-slate-800 flex-1 overflow-hidden flex flex-col relative">
          
          {refreshing && (
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 opacity-60">
                <Receipt className="w-12 h-12" />
                <p>الفاتورة فارغة</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex gap-3 relative group">
                  <div className={`p-2 rounded-xl h-fit shrink-0 ${
                    item.type === 'service' ? 'bg-blue-500/20 text-blue-400' :
                    item.type === 'ticket' ? 'bg-indigo-500/20 text-indigo-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {item.type === 'service' ? <Printer className="w-4 h-4" /> :
                     item.type === 'ticket' ? <Ticket className="w-4 h-4" /> :
                     <Wallet className="w-4 h-4" />}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-sm line-clamp-2">{item.name}</h4>
                    <div className="flex items-center gap-3 mt-2 text-xs font-mono text-slate-400">
                      <span>الكمية: {item.count}</span>
                      <span>سعر: {item.price} ج</span>
                    </div>
                  </div>
                  
                  <div className="text-left shrink-0">
                    <div className="font-bold text-white font-mono">{item.total} ج</div>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id, item.type)}
                    className="absolute -top-2 -left-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="حذف العنصر"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Invoice Footer / Totals */}
          <div className="p-5 border-t border-slate-800 bg-slate-900/50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-400 font-bold">الإجمالي الكلي</span>
              <div className="text-3xl font-bold font-mono" style={{ color: total < 0 ? '#ef4444' : '#22c55e' }}>
                <span className="text-sm ml-1 text-slate-500">ج.م</span>
                {Math.abs(total)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex justify-between items-center mb-1">
                <button 
                  onClick={() => setShowPrintHint(!showPrintHint)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>كيف أطبع مباشرة بدون نافذة التحميل؟</span>
                </button>
              </div>

              {showPrintHint && (
                <div className="col-span-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-2 text-xs text-blue-200 leading-relaxed">
                  <p className="font-bold mb-1">لطباعة أسرع من ثانية واحدة (تلقائياً):</p>
                  <ol className="list-decimal list-inside space-y-1 opacity-90">
                    <li>اضغط كليك يمين على أيقونة (Google Chrome) في سطح المكتب واختر <strong>Properties</strong>.</li>
                    <li>في خانة مسار الـ Target، أضف في نهايته مسافة ثم اكتب: <code className="bg-black/30 px-1 py-0.5 rounded font-mono text-blue-300">--kiosk-printing</code></li>
                    <li>اجعل طابعة الكاشير هي الطابعة الافتراضية للويندوز.</li>
                  </ol>
                  <p className="mt-1 opacity-80">سيقوم النظام بالطباعة فوراً بمجرد الضغط على الزر أدناه!</p>
                </div>
              )}

              <button
                disabled={items.length === 0}
                onClick={() => handlePrint('cashier')}
                className="py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span className="text-sm">طباعة كاشير</span>
              </button>
              
              <button
                disabled={items.length === 0}
                onClick={() => handlePrint('normal')}
                className="py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Receipt className="w-4 h-4" />
                <span className="text-sm">طباعة A4</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden Print Component */}
      <InvoicePrint
        ref={printRef}
        invoiceCode={invoiceCode}
        timestamp={timestamp}
        employeeName={employeeName}
        items={items}
        total={total}
        isCashierPrint={false}
      />
    </div>
  );
}
