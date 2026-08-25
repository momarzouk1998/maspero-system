'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, TrendingUp, DollarSign, Printer, Train, Cpu, Receipt, 
  Calendar, RefreshCw, ArrowRight, Coins, ShoppingBag, Layers, 
  FileText, ArrowDownLeft, ArrowUpRight, Zap, Wallet, Building2,
  Archive, Users, ChevronDown, ChevronUp, Banknote, AlertCircle,
  Edit3, Trash2, X, Calculator
} from 'lucide-react';
import { formatNumber, formatNumberLocale } from '@/lib/user-utils';

export default function ManagerReportsPage() {
  const [data, setData] = useState<any>(null);
  const [walletsExpanded, setWalletsExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [closingBalance, setClosingBalance] = useState<number>(0);

  // Hidden tabs state (kept in code as requested, but default is 'financial')
  const [activeTab, setActiveTab] = useState<'financial' | 'monthly' | 'category'>('financial');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('مسحوبات');

  // Archival Monthly Profit Reports State (CSV Matching)
  const [archivedReports, setArchivedReports] = useState<any[]>([]);
  const [savingArchive, setSavingArchive] = useState(false);

  // Edit Modal State for Manager Archival Reports (All Fields)
  const [editArchItem, setEditArchItem] = useState<any>(null);
  const [editArchMonth, setEditArchMonth] = useState('');
  const [editArchOpening, setEditArchOpening] = useState('');
  const [editArchClosing, setEditArchClosing] = useState('');
  const [editArchPurchases, setEditArchPurchases] = useState('');
  const [editArchServiceRevenue, setEditArchServiceRevenue] = useState('');
  const [editArchWalletComm, setEditArchWalletComm] = useState('');
  const [editArchTicketsComm, setEditArchTicketsComm] = useState('');
  const [editArchMachineDepComm, setEditArchMachineDepComm] = useState('');
  const [editArchMachineWtdComm, setEditArchMachineWtdComm] = useState('');
  const [editArchSalaries, setEditArchSalaries] = useState('');
  const [editArchExpenses, setEditArchExpenses] = useState('');
  const [editArchPaperCount, setEditArchPaperCount] = useState('');
  const [editArchTicketCount, setEditArchTicketCount] = useState('');
  const [editArchNotes, setEditArchNotes] = useState('');
  const [editArchSubmitting, setEditArchSubmitting] = useState(false);

  // نسبة عمولة إيداع المكن — قابلة للتعديل (default: 7 لكل 1000)
  const [machineCommissionRate, setMachineCommissionRate] = useState<number>(7);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('machineCommissionRate', String(machineCommissionRate));

      const res = await fetch(`/api/reports/financial?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);

        if (result.monthlyReports && result.monthlyReports.length > 0 && !selectedMonth) {
          setSelectedMonth(result.monthlyReports[0].month);
        }
      }

      // Fetch archived reports
      const archRes = await fetch('/api/reports/monthly-archive');
      if (archRes.ok) {
        const archData = await archRes.json();
        setArchivedReports(archData.reports || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, machineCommissionRate]);

  const handleSaveMonthArchive = async () => {
    if (!metrics) return;
    setSavingArchive(true);
    try {
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()} ${now.getMonth() + 1}`;
      
      const payload = {
        month: currentMonthStr,
        wallet_commission: metrics.walletCommission || 0,
        tickets_commission: metrics.ticketCommission || 0,
        machine_withdrawal_commission: metrics.machineWithdrawlCommission || 0,
        machine_deposit_commission: metrics.machineDepositsCommission || 0,
        machine_deposits: metrics.machineDeposits || 0,
        service_revenue: metrics.serviceValue || 0,
        total_revenue: metrics.totalRevenue || 0,
        opening_balance: openingBalance,
        closing_balance: closingBalance,
        purchases_cost: metrics.purchasesCost || 0,
        purchases_cost_percent: metrics.purchasesCostPercent || 0,
        total_profit: metrics.totalProfit || 0,
        total_commissions: metrics.totalCommissions || 0,
        other_expenses: metrics.otherExpenses || 0,
        salaries: metrics.salaries || 0,
        net_profit: metrics.netProfit || 0,
        withdrawn_revenue: metrics.withdrawnRevenue || 0,
        ticket_count: metrics.ticketCount || 0,
        paper_count: metrics.paperCount || 0
      };

      const res = await fetch('/api/reports/monthly-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchReports();
        alert('تم أرشفة وتقييد تقرير هذا الشهر بنجاح في سجل التقارير الشهرية 💾');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingArchive(false);
    }
  };

  const metrics = data?.metrics || {};
  const monthlyReports = data?.monthlyReports || [];
  const categoryReports = data?.categoryReports || [];
  const rawWalletsByType = data?.walletsByType || { محافظ: [], ماكينات: [], أدراج: [] };

  const filteredWallets = (rawWalletsByType.محافظ || []).filter((w: any) =>
    !w.wallet_name.includes('الصياد') && !w.wallet_name.includes('الكوماندا')
  );

  const filteredMachines = (rawWalletsByType.ماكينات || []).filter((w: any) =>
    !w.wallet_name.includes('سحب فوري 1') && !w.wallet_name.includes('سحب فوري 2') && !w.wallet_name.includes('سحب فوري1') && !w.wallet_name.includes('سحب فوري2')
  );

  const filteredDrawers = rawWalletsByType.أدراج || [];

  const walletsByType = {
    محافظ: filteredWallets,
    ماكينات: filteredMachines,
    أدراج: filteredDrawers
  };

  const walletsTotals = {
    محافظ: filteredWallets.reduce((sum: number, w: any) => sum + Number(w.current_balance || 0), 0),
    ماكينات: filteredMachines.reduce((sum: number, w: any) => sum + Number(w.current_balance || 0), 0),
    أدراج: filteredDrawers.reduce((sum: number, w: any) => sum + Number(w.current_balance || 0), 0)
  };
  const employeeCustody = data?.employeeCustody || [];
  const totalEmployeeCustody = data?.totalEmployeeCustody || 0;

  const activeMonthReport = monthlyReports.find((m: any) => m.month === selectedMonth) || { items: [], totalSum: 0 };
  const activeCategoryReport = categoryReports.find((c: any) => c.category === selectedCategory) || { items: [], totalSum: 0 };

  // Main 2 Tabs state: 'report' for Financial Report & Monthly Archive, 'balances' for Live Balances Tables
  const [activeMainTab, setActiveMainTab] = useState<'report' | 'balances'>('report');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Navigation - Sleek Light Theme */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/manager"
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span>لوحة المدير</span>
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-emerald-600" />
              <span>تقرير الماليات والأرباح</span>
            </h1>
          </div>
        </div>

        {/* 2 Main Tabs Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveMainTab('report')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'report'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>📊 التقرير المالي والأرشيف الشهري</span>
          </button>
          <button
            onClick={() => setActiveMainTab('balances')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'balances'
                ? 'bg-slate-900 text-white shadow-md font-bold'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>🏛️ الأرصدة الحالية اللحظية</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector Bar (Show ONLY on Financial Report Tab) */}
      {activeMainTab === 'report' && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">تصفية بالفترة:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-1.5 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-slate-400 font-bold">إلى</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-1.5 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
            >
              إعادة ضبط
            </button>
          </div>

          {/* نسبة عمولة إيداع المكن + رصيد افتتاحي/ختامي */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">عمولة إيداع المكن (÷1000):</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={machineCommissionRate}
                onChange={(e) => setMachineCommissionRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-20 py-1.5 px-3 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-center"
                title="نسبة عمولة إيداع الماكينات — يتم حساب: (إجمالي الإيداع × النسبة) ÷ 1000"
              />
              <span className="text-[11px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg whitespace-nowrap">
                = {metrics ? formatNumber((metrics.machineDeposits * machineCommissionRate) / 1000) : '0'} ج
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">رصيد افتتاحي:</span>
              <input
                type="number"
                min="0"
                step="1"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                className="w-24 py-1.5 px-3 bg-white border border-indigo-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-center"
                placeholder="0"
              />
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">رصيد ختامي:</span>
              <input
                type="number"
                min="0"
                step="1"
                value={closingBalance}
                onChange={(e) => setClosingBalance(parseFloat(e.target.value) || 0)}
                className="w-24 py-1.5 px-3 bg-white border border-indigo-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-center"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: FINANCIAL REPORT & LIVE BALANCES */}
      {activeMainTab === 'report' && (
        <>
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
              <span>جاري تحميل التقرير المالي والأرباح...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Banner: Net Profit */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                <div>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                    النتيجة المالية للفترة
                  </span>
                  <h2 className="text-xl font-bold mt-2 text-slate-900">صافي الربح</h2>
                  <p className="text-slate-700 text-xs font-semibold mt-1">
                    إجمالي الربح + إجمالي العمولات - القبض والسلف - باقي المصروفات
                  </p>
                </div>
                <div className="text-left">
                  <span className={`text-3xl font-bold font-mono ${Number(metrics.netProfit || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatNumberLocale(Number(metrics.netProfit || 0), 'en-US')} ج
                  </span>
                </div>
              </div>

              {/* ── Section A: متغيرة بالتصفية ── */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] font-bold text-slate-600">نتائج الفترة</span>
                  {(startDate || endDate) && (
                    <span className="text-[10px] font-mono text-slate-700 font-bold">
                      {startDate || '…'} → {endDate || '…'}
                    </span>
                  )}
                </div>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {(() => {
                const livePurchaseVal = Number(metrics.purchaseValue ?? metrics.purchasesCost ?? 0);
                const liveCalculatedPurchasesCost = openingBalance + livePurchaseVal - closingBalance;
                const liveServiceRev = Number(metrics.serviceValue ?? metrics.totalRevenue ?? 0);
                const livePurchasesCostPercent = liveServiceRev > 0
                  ? ((liveCalculatedPurchasesCost / liveServiceRev) * 100).toFixed(1)
                  : '0.0';

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Services & Printing Revenue */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">إيراد الخدمات والطباعة</span>
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-emerald-600">
                        {formatNumberLocale(Number(metrics.totalRevenue || 0), 'en-US')}
                      </h3>
                      <p className="text-[11px] text-slate-500">إجمالي مبيعات وإيراد الخدمات والطباعة</p>
                    </div>

                    {/* 2. Total Commissions */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">العمولات</span>
                        <Coins className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-emerald-600">
                        {formatNumberLocale(Number(metrics.totalCommissions || 0), 'en-US')}
                      </h3>
                      <p className="text-[11px] text-slate-500">محافظ + ماكينات + تذاكر</p>
                    </div>

                    {/* 3. Operational Expenses */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">المصروفات</span>
                        <Receipt className="w-5 h-5 text-rose-600" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-rose-600">
                        {formatNumberLocale(Number(metrics.otherExpenses || 0), 'en-US')}
                      </h3>
                      <p className="text-[11px] text-slate-500">الإدارة والمحل</p>
                    </div>

                    {/* 4. Salaries & Advances */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">الرواتب والسلف</span>
                        <DollarSign className="w-5 h-5 text-rose-600" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-rose-600">
                        {formatNumberLocale(Number(metrics.salaries || 0), 'en-US')}
                      </h3>
                      <p className="text-[11px] text-slate-500">الموظفين</p>
                    </div>

                    {/* 5. Purchases Value */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">المشتريات</span>
                        <ShoppingBag className="w-5 h-5 text-rose-600" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-rose-600">
                        {formatNumberLocale(livePurchaseVal, 'en-US')}
                      </h3>
                      <p className="text-[11px] text-slate-500">قيمة المشتريات الإجمالية</p>
                    </div>

                    {/* 6. Manager Withdrawals */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">مسحوبات المدير</span>
                        <ArrowUpRight className="w-5 h-5 text-amber-600" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-amber-600">
                        {formatNumberLocale(Number(metrics.withdrawnRevenue || 0), 'en-US')}
                      </h3>
                      <p className="text-[11px] text-slate-500">الأرباح الشخصية</p>
                    </div>

                    {/* 7. Paper Count */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">الورق</span>
                        <Printer className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-blue-600">
                        {formatNumberLocale(Number(metrics.paperCount || 0), 'en-US')}
                      </h3>
                      <p className="text-[11px] text-slate-500">ورقة</p>
                    </div>

                    {/* 8. Ticket Count */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">التذاكر</span>
                        <Train className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-blue-600">
                        {formatNumberLocale(Number(metrics.ticketCount || 0), 'en-US')}
                      </h3>
                      <p className="text-[11px] text-slate-500">تذكرة</p>
                    </div>

                    {/* 9. Wallet Commissions */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">عمولات المحافظ</span>
                        <Zap className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-emerald-700">
                        {formatNumber(Number(metrics.walletCommission || 0))}
                      </h3>
                      <p className="text-[11px] text-slate-500">فودافون كاش</p>
                    </div>

                    {/* 10. Machine Withdrawals Commission */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">عمولات سحب المكن</span>
                        <Cpu className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-emerald-700">
                        {formatNumber(Number(metrics.machineWithdrawlCommission || 0))}
                      </h3>
                      <p className="text-[11px] text-slate-500">فوري وأمان</p>
                    </div>

                    {/* 11. Machine Deposits Commission */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">عمولات إيداع المكن</span>
                        <Coins className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-emerald-700">
                        {formatNumber(Number(metrics.machineDepositsCommission || 0))}
                      </h3>
                      <p className="text-[11px] text-slate-500">إيداع: {formatNumberLocale(Number(metrics.machineDeposits || 0), 'en-US')} ج</p>
                    </div>

                    {/* 12. Ticket Commissions */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">عمولة التذاكر</span>
                        <Train className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-emerald-700">
                        {formatNumber(Number(metrics.ticketCommission || 0))}
                      </h3>
                      <p className="text-[11px] text-slate-500">{formatNumberLocale(Number(metrics.ticketCount || 0), 'en-US')} تذكرة</p>
                    </div>

                    {/* 13. Machine Deposits (raw amount) */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">إيداع المكن</span>
                        <Cpu className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-indigo-700">
                        {formatNumberLocale(Number(metrics.machineDeposits || 0), 'en-US')}
                      </h3>
                      <p className="text-[11px] text-slate-500">أساس حساب عمولة الإيداع</p>
                    </div>

                    {/* 14. Calculated Purchases Cost & Percentage */}
                    <div className="glass-panel p-5 rounded-2xl border border-amber-300 bg-amber-50/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950">تكلفة المشتريات</span>
                        <ShoppingBag className="w-5 h-5 text-amber-700" />
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-amber-800">
                        {formatNumberLocale(liveCalculatedPurchasesCost, 'en-US')}
                      </h3>
                      <p className="text-[11px] text-amber-700 font-bold">النسبة: {livePurchasesCostPercent}%</p>
                    </div>
                  </div>
                );
              })()}

              {/* 📊 ARCHIVAL MONTHLY PROFIT REPORT (سجل تقرير الماليات والأرشيف الشهري) */}
              <div className="glass-panel rounded-3xl border border-slate-200 overflow-hidden space-y-4">
                <div className="p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      <Archive className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <span>سجل تقرير الماليات والأرشيف الشهري</span>
                      </h3>
                      <p className="text-xs text-slate-400">سجل تراكمي تاريخي لجميع أشهر التعاملات</p>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveMonthArchive}
                    disabled={savingArchive}
                    className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {savingArchive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                    <span>حفظ / أرشفة تقرير الشهر الحالي 💾</span>
                  </button>
                </div>

                {/* Formula Explanation Block */}
                <div className="px-5 py-4 bg-amber-50/90 border-y border-amber-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                    <Calculator className="w-4 h-4 text-amber-600" />
                    <span>دليل ومعادلات تقرير الماليات (للتذكرة 📐):</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200/80 shadow-sm flex flex-col">
                      <span className="font-bold text-amber-950 text-xs">📐 إجمالي الربح</span>
                      <span className="text-slate-700 font-mono text-[11px] font-bold mt-0.5 dir-ltr text-right">(إيراد الخدمات - تكلفة المشتريات)</span>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200/80 shadow-sm flex flex-col">
                      <span className="font-bold text-amber-950 text-xs">📐 نسبة تكلفة المشتريات</span>
                      <span className="text-slate-700 font-mono text-[11px] font-bold mt-0.5 dir-ltr text-right">(تكلفة المشتريات ÷ إيراد الخدمات)</span>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200/80 shadow-sm flex flex-col">
                      <span className="font-bold text-amber-950 text-xs">📐 عمولة إيداع المكن</span>
                      <span className="text-slate-700 font-mono text-[11px] font-bold mt-0.5 dir-ltr text-right">(إيداع المكن × النسبة المرادة ÷ 1000)</span>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200/80 shadow-sm flex flex-col">
                      <span className="font-bold text-amber-950 text-xs">📐 تكلفة المشتريات</span>
                      <span className="text-slate-700 font-mono text-[11px] font-bold mt-0.5 dir-ltr text-right">(رصيد أول المدة + قيمة المشتريات - رصيد آخر المدة)</span>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200/80 shadow-sm flex flex-col md:col-span-2 lg:col-span-2">
                      <span className="font-bold text-amber-950 text-xs">📐 صافي الربح النهائي</span>
                      <span className="text-slate-700 font-mono text-[11px] font-bold mt-0.5 dir-ltr text-right">(إجمالي الربح + إجمالي العمولات - القبض والسلف - باقي المصروفات)</span>
                    </div>
                  </div>
                </div>

                {/* Archived Monthly Snapshots Table */}
                <div className="p-5 space-y-4">
                  {archivedReports.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      لا توجد أرشفات شهرية مسجلة بعد. اضغط زر "أرشفة تقرير الشهر" أعلاه لتقييد أول شهر.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs text-slate-700 table-auto border border-slate-200 rounded-2xl overflow-hidden">
                        <thead className="bg-slate-100 text-slate-800 font-bold uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-3 whitespace-nowrap">الشهر</th>
                            <th className="px-3 py-3 whitespace-nowrap text-amber-700 bg-amber-50/50">قيمة المشتريات</th>
                            <th className="px-3 py-3 whitespace-nowrap text-indigo-700 bg-indigo-50/50">رصيد أول المدة</th>
                            <th className="px-3 py-3 whitespace-nowrap text-indigo-700 bg-indigo-50/50">رصيد آخر المدة</th>
                            <th className="px-3 py-3 whitespace-nowrap text-amber-800 bg-amber-100/50">تكلفة المشتريات</th>
                            <th className="px-3 py-3 whitespace-nowrap text-amber-600 bg-amber-50/30">نسبة تكلفة المشتريات</th>
                            <th className="px-3 py-3 whitespace-nowrap text-emerald-700">عمولة المحافظ</th>
                            <th className="px-3 py-3 whitespace-nowrap text-emerald-700">عمولة التذاكر</th>
                            <th className="px-3 py-3 whitespace-nowrap text-emerald-700">عمولة إيداع المكن</th>
                            <th className="px-3 py-3 whitespace-nowrap text-emerald-700">عمولة سحب المكن</th>
                            <th className="px-3 py-3 whitespace-nowrap text-blue-700">إيراد الخدمات والطباعة</th>
                            <th className="px-3 py-3 whitespace-nowrap text-emerald-700">إجمالي الربح</th>
                            <th className="px-3 py-3 whitespace-nowrap text-emerald-700 bg-emerald-50/50">إجمالي العمولات</th>
                            <th className="px-3 py-3 whitespace-nowrap text-rose-700">القبض والسلف</th>
                            <th className="px-3 py-3 whitespace-nowrap text-rose-700">باقي المصروفات</th>
                            <th className="px-3 py-3 whitespace-nowrap text-emerald-800 font-extrabold bg-emerald-50">صافي الربح</th>
                            <th className="px-3 py-3 whitespace-nowrap">عدد الورق</th>
                            <th className="px-3 py-3 whitespace-nowrap">عدد التذاكر</th>
                            <th className="px-3 py-3 text-center whitespace-nowrap">إجراءات المدير</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white font-mono">
                          {archivedReports.map((report: any) => {
                            const opening = Number(report.opening_balance || 0);
                            const closing = Number(report.closing_balance || 0);
                            const purchasesVal = Number(report.purchases_cost || 0);
                            const calculatedPurchasesCost = opening + purchasesVal - closing;

                            const serviceRev = Number(report.service_revenue || 0);
                            const purchasesCostPercent = serviceRev > 0
                              ? ((calculatedPurchasesCost / serviceRev) * 100).toFixed(1)
                              : '0.0';

                            const totalProfit = serviceRev - calculatedPurchasesCost;

                            const totalComm = Number(report.total_commissions || 0) || (
                              Number(report.wallet_commission || 0) +
                              Number(report.tickets_commission || 0) +
                              Number(report.machine_deposit_commission || 0) +
                              Number(report.machine_withdrawal_commission || 0)
                            );
                            const salaries = Number(report.salaries || 0);
                            const otherExpenses = Number(report.other_expenses || 0);
                            const calculatedNetProfit = totalProfit + totalComm - salaries - otherExpenses;

                            return (
                              <tr key={report.id || report.month} className="hover:bg-slate-50 font-semibold">
                                <td className="px-3 py-3 font-bold text-slate-900 whitespace-nowrap dir-ltr text-right">{report.month}</td>
                                <td className="px-3 py-3 text-amber-700 font-bold whitespace-nowrap bg-amber-50/30">{formatNumber(purchasesVal)}</td>
                                <td className="px-3 py-3 text-indigo-700 font-bold whitespace-nowrap bg-indigo-50/30">{formatNumber(opening)}</td>
                                <td className="px-3 py-3 text-indigo-700 font-bold whitespace-nowrap bg-indigo-50/30">{formatNumber(closing)}</td>
                                <td className="px-3 py-3 text-amber-900 font-extrabold whitespace-nowrap bg-amber-100/50">{formatNumber(calculatedPurchasesCost)}</td>
                                <td className="px-3 py-3 text-amber-600 font-bold whitespace-nowrap bg-amber-50/20">{purchasesCostPercent}%</td>
                                <td className="px-3 py-3 text-emerald-600 font-bold whitespace-nowrap">{formatNumber(Number(report.wallet_commission))}</td>
                                <td className="px-3 py-3 text-emerald-600 font-bold whitespace-nowrap">{formatNumber(Number(report.tickets_commission))}</td>
                                <td className="px-3 py-3 text-emerald-600 font-bold whitespace-nowrap">{formatNumber(Number(report.machine_deposit_commission))}</td>
                                <td className="px-3 py-3 text-emerald-600 font-bold whitespace-nowrap">{formatNumber(Number(report.machine_withdrawal_commission))}</td>
                                <td className="px-3 py-3 text-blue-700 whitespace-nowrap">{formatNumber(serviceRev)}</td>
                                <td className="px-3 py-3 text-emerald-700 whitespace-nowrap font-bold">{formatNumber(totalProfit)}</td>
                                <td className="px-3 py-3 text-emerald-700 font-bold whitespace-nowrap bg-emerald-50/40">{formatNumber(totalComm)}</td>
                                <td className="px-3 py-3 text-rose-600 font-bold whitespace-nowrap">{formatNumber(salaries)}</td>
                                <td className="px-3 py-3 text-rose-600 font-bold whitespace-nowrap">{formatNumber(otherExpenses)}</td>
                                <td className="px-3 py-3 text-emerald-900 bg-emerald-50 font-extrabold whitespace-nowrap text-sm">{formatNumber(calculatedNetProfit)}</td>
                                <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{report.paper_count} ورقة</td>
                                <td className="px-3 py-3 text-purple-700 font-bold whitespace-nowrap">{report.ticket_count || 0} تذكرة</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        setEditArchItem(report);
                                        setEditArchOpening(String(report.opening_balance || 0));
                                        setEditArchClosing(String(report.closing_balance || 0));
                                        setEditArchPurchases(String(report.purchases_cost || 0));
                                        setEditArchSalaries(String(report.salaries || 0));
                                        setEditArchExpenses(String(report.other_expenses || 0));
                                      }}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                      title="تعديل التقرير الأرشيفي"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (!confirm(`هل أنت تأكد من حذف تقرير شهر (${report.month}) من الأرشيف؟`)) return;
                                        try {
                                          const res = await fetch(`/api/reports/monthly-archive?month=${encodeURIComponent(report.month)}`, { method: 'DELETE' });
                                          if (res.ok) fetchReports();
                                        } catch (e) { console.error(e); }
                                      }}
                                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="حذف التقرير"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: LIVE BALANCES TABLES (الأرصدة الحالية اللحظية) */}
      {activeMainTab === 'balances' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto pt-2">
          {/* Table 1: Wallets & Machines Table (3 equal columns, centered alignment) */}
          <div className="glass-panel rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col">
            {/* Header Banner - Light Theme */}
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">جدول أرصدة المحافظ والماكينات</h3>
              </div>
              <span className="text-sm font-extrabold font-mono text-indigo-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm dir-ltr">
                {formatNumberLocale(Number(walletsTotals.محافظ + walletsTotals.ماكينات), 'en-US')}
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-center text-xs text-slate-700 table-fixed">
                <tbody className="divide-y divide-slate-200 font-semibold">
                  {/* Sub-total 1: Wallets Header Row (Full-bleed colSpan=3, no white gaps) */}
                  <tr className="bg-indigo-50/90 border-y border-indigo-200">
                    <td colSpan={3} className="px-4 py-2.5 bg-indigo-50/90 text-indigo-950 font-extrabold">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-indigo-600" />
                          <span>إجمالي المحافظ الإلكترونية ({walletsByType.محافظ.length} محفظة)</span>
                        </div>
                        <span className="font-mono text-indigo-900 text-sm font-extrabold dir-ltr">
                          {formatNumberLocale(Number(walletsTotals.محافظ), 'en-US')}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Wallet Rows */}
                  {walletsByType.محافظ.map((w: any) => (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                      <td className="w-1/3 px-3 py-3 font-bold text-slate-900 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                          <span>{w.wallet_name}</span>
                        </div>
                      </td>
                      <td className="w-1/3 px-3 py-3 text-slate-600 font-medium text-center">{w.custodian_name || '-'}</td>
                      <td className={`w-1/3 px-3 py-3 font-bold font-mono text-center text-sm ${Number(w.current_balance) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatNumberLocale(Number(w.current_balance), 'en-US')}
                      </td>
                    </tr>
                  ))}

                  {/* Sub-total 2: Machines Header Row (Full-bleed colSpan=3, no white gaps) */}
                  <tr className="bg-slate-100 border-y border-slate-300">
                    <td colSpan={3} className="px-4 py-2.5 bg-slate-100 text-slate-900 font-extrabold">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-700" />
                          <span>إجمالي ماكينات الدفع ({walletsByType.ماكينات.length} ماكينة)</span>
                        </div>
                        <span className="font-mono text-slate-900 text-sm font-extrabold dir-ltr">
                          {formatNumberLocale(Number(walletsTotals.ماكينات), 'en-US')}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Machine Rows */}
                  {walletsByType.ماكينات.map((w: any) => (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                      <td className="w-1/3 px-3 py-3 font-bold text-slate-900 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                          <span>{w.wallet_name}</span>
                        </div>
                      </td>
                      <td className="w-1/3 px-3 py-3 text-slate-600 font-medium text-center">{w.custodian_name || '-'}</td>
                      <td className={`w-1/3 px-3 py-3 font-bold font-mono text-center text-sm ${Number(w.current_balance) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatNumberLocale(Number(w.current_balance), 'en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Employee Cash Custody & Drawers Table (2 equal columns, centered alignment) */}
          <div className="glass-panel rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col">
            {/* Header Banner - Light Theme */}
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
                  <Banknote className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">جدول النقدية (عهد الموظفين والأدراج)</h3>
              </div>
              <span className="text-sm font-extrabold font-mono text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm dir-ltr">
                {formatNumberLocale(Number(totalEmployeeCustody + walletsTotals.أدراج), 'en-US')}
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-center text-xs text-slate-700 table-fixed">
                <tbody className="divide-y divide-slate-200 font-semibold">
                  {/* Sub-total 1: Employee Cash Custody Header Row (Full-bleed colSpan=2) */}
                  <tr className="bg-emerald-50/90 border-y border-emerald-200">
                    <td colSpan={2} className="px-4 py-2.5 bg-emerald-50/90 text-emerald-950 font-extrabold">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-700" />
                          <span>إجمالي عهدة الكاش للموظفين ({employeeCustody.length} موظف)</span>
                        </div>
                        <span className="font-mono text-emerald-900 text-sm font-extrabold dir-ltr">
                          {formatNumberLocale(Number(totalEmployeeCustody), 'en-US')}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Employee Rows */}
                  {employeeCustody.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="w-1/2 px-3 py-3 font-bold text-slate-900 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>{emp.name}</span>
                        </div>
                      </td>
                      <td className={`w-1/2 px-3 py-3 font-bold font-mono text-center text-sm ${emp.walletBalance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatNumberLocale(Number(emp.walletBalance), 'en-US')}
                      </td>
                    </tr>
                  ))}

                  {/* Sub-total 2: Cashier Drawers Header Row (Full-bleed colSpan=2) */}
                  <tr className="bg-amber-50/90 border-y border-amber-200">
                    <td colSpan={2} className="px-4 py-2.5 bg-amber-50/90 text-amber-950 font-extrabold">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Archive className="w-4 h-4 text-amber-700" />
                          <span>إجمالي أدراج الكاشير ({walletsByType.أدراج.length} درج)</span>
                        </div>
                        <span className="font-mono text-amber-900 text-sm font-extrabold dir-ltr">
                          {formatNumberLocale(Number(walletsTotals.أدراج), 'en-US')}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Drawer Rows */}
                  {walletsByType.أدراج.map((w: any) => (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                      <td className="w-1/2 px-3 py-3 font-bold text-slate-900 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <span>{w.wallet_name}</span>
                        </div>
                      </td>
                      <td className={`w-1/2 px-3 py-3 font-bold font-mono text-center text-sm ${Number(w.current_balance) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatNumberLocale(Number(w.current_balance), 'en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN TABS (Kept in code as requested for future needs) */}
      {activeTab === 'monthly' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-4 rounded-3xl border border-slate-200 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 mb-3 border-b pb-2 border-slate-200">أشهر التعاملات</h3>
            {monthlyReports.map((m: any) => (
              <button
                key={m.month}
                onClick={() => setSelectedMonth(m.month)}
                className={`w-full p-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                  selectedMonth === m.month
                    ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>📅 {m.month}</span>
                <span className="px-2 py-0.5 rounded-lg font-mono text-[11px] bg-slate-100 text-slate-800">
                  {formatNumberLocale(Number(m.totalSum || 0), 'en-US')}
                </span>
              </button>
            ))}
          </div>

          <div className="md:col-span-3 glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200">
              <h3 className="text-base font-bold text-slate-900">الماليات لشهر ({selectedMonth || '-'})</h3>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                إجمالي الشهر: {formatNumberLocale(Number(activeMonthReport.totalSum || 0), 'en-US')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-700 table-auto">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 whitespace-nowrap">تاريخ الحركة</th>
                    <th className="px-3 py-3 whitespace-nowrap">التصنيف</th>
                    <th className="px-3 py-3 whitespace-nowrap">البند / البيان</th>
                    <th className="px-3 py-3 whitespace-nowrap">المبلغ</th>
                    <th className="px-3 py-3 whitespace-nowrap">الموظف المعني</th>
                    <th className="px-3 py-3 whitespace-nowrap">الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeMonthReport.items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">{item.date ? new Date(item.date).toLocaleDateString('en-US') : '-'}</td>
                      <td className="px-3 py-3 font-bold text-slate-900 whitespace-nowrap">{item.main_type}</td>
                      <td className="px-3 py-3 font-bold text-slate-700 whitespace-nowrap">{item.items || '-'}</td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{formatNumber(Number(item.amount))}</td>
                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{item.employee_name || '-'}</td>
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'category' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-4 rounded-3xl border border-slate-200 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 mb-3 border-b pb-2 border-slate-200">تصنيفات التعاملات</h3>
            {categoryReports.map((c: any) => (
              <button
                key={c.category}
                onClick={() => setSelectedCategory(c.category)}
                className={`w-full p-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                  selectedCategory === c.category
                    ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>🏷️ {c.category}</span>
                <span className="px-2 py-0.5 rounded-lg font-mono text-[11px] bg-slate-100 text-slate-800">
                  {formatNumberLocale(Number(c.totalSum || 0), 'en-US')}
                </span>
              </button>
            ))}
          </div>

          <div className="md:col-span-3 glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200">
              <h3 className="text-base font-bold text-slate-900">التعاملات لتصنيف ({selectedCategory})</h3>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                إجمالي التصنيف: {formatNumberLocale(Number(activeCategoryReport.totalSum || 0), 'en-US')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-700 table-auto">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 whitespace-nowrap">التاريخ</th>
                    <th className="px-3 py-3 whitespace-nowrap">الشهر</th>
                    <th className="px-3 py-3 whitespace-nowrap">البند / البيان</th>
                    <th className="px-3 py-3 whitespace-nowrap">المبلغ</th>
                    <th className="px-3 py-3 whitespace-nowrap">الموظف المعني</th>
                    <th className="px-3 py-3 whitespace-nowrap">الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeCategoryReport.items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">{item.date ? new Date(item.date).toLocaleDateString('en-US') : '-'}</td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-700 whitespace-nowrap">{item.month || '-'}</td>
                      <td className="px-3 py-3 font-bold text-slate-700 whitespace-nowrap">{item.items || '-'}</td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{formatNumber(Number(item.amount))}</td>
                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{item.employee_name || '-'}</td>
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ARCHIVAL MONTHLY REPORT MODAL (ALL COLUMNS EDITABLE) */}
      {editArchItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-3xl space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <span>تعديل التقرير الأرشيفي الكامل لشهر ({editArchMonth || editArchItem.month})</span>
              </h3>
              <button onClick={() => setEditArchItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Preview Bar of Calculated Equations */}
            {(() => {
              const op = parseFloat(editArchOpening || '0');
              const cl = parseFloat(editArchClosing || '0');
              const pu = parseFloat(editArchPurchases || '0');
              const sr = parseFloat(editArchServiceRevenue || '0');
              const wc = parseFloat(editArchWalletComm || '0');
              const tc = parseFloat(editArchTicketsComm || '0');
              const md = parseFloat(editArchMachineDepComm || '0');
              const mw = parseFloat(editArchMachineWtdComm || '0');
              const sa = parseFloat(editArchSalaries || '0');
              const ex = parseFloat(editArchExpenses || '0');

              const calcPurchasesCost = op + pu - cl;
              const calcPurchasesCostPercent = sr > 0 ? ((calcPurchasesCost / sr) * 100).toFixed(1) : '0.0';
              const calcTotalProfit = sr - calcPurchasesCost;
              const calcTotalComm = wc + tc + md + mw;
              const calcNetProfit = calcTotalProfit + calcTotalComm - sa - ex;

              return (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">📊 المعاينة اللحظية للمعادلات المحسوبة:</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block">تكلفة المشتريات:</span>
                      <span className="font-bold text-amber-800">{formatNumber(calcPurchasesCost)} ({calcPurchasesCostPercent}%)</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block">إجمالي الربح:</span>
                      <span className="font-bold text-emerald-700">{formatNumber(calcTotalProfit)}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block">إجمالي العمولات:</span>
                      <span className="font-bold text-emerald-700">{formatNumber(calcTotalComm)}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block">صافي الربح:</span>
                      <span className={`font-bold ${calcNetProfit < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatNumber(calcNetProfit)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Inputs Grid for ALL columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* 1. Period & Balances */}
              <div className="md:col-span-3 font-bold text-slate-800 border-b pb-1 border-slate-200 mt-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>الشهر والأرصدة المخزنية:</span>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">فترة الشهر (الشهر/السنة) *</label>
                <input
                  type="text"
                  required
                  value={editArchMonth}
                  onChange={e => setEditArchMonth(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                  placeholder="2026 8"
                />
              </div>
              <div>
                <label className="block font-bold text-indigo-700 mb-1">رصيد أول المدة *</label>
                <input
                  type="number"
                  value={editArchOpening}
                  onChange={e => setEditArchOpening(e.target.value)}
                  className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl font-mono font-bold text-indigo-900"
                />
              </div>
              <div>
                <label className="block font-bold text-indigo-700 mb-1">رصيد آخر المدة *</label>
                <input
                  type="number"
                  value={editArchClosing}
                  onChange={e => setEditArchClosing(e.target.value)}
                  className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl font-mono font-bold text-indigo-900"
                />
              </div>

              {/* 2. Revenues & Purchases */}
              <div className="md:col-span-3 font-bold text-slate-800 border-b pb-1 border-slate-200 mt-2 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>المشتريات وإيرادات الخدمات:</span>
              </div>
              <div>
                <label className="block font-bold text-amber-700 mb-1">قيمة المشتريات</label>
                <input
                  type="number"
                  value={editArchPurchases}
                  onChange={e => setEditArchPurchases(e.target.value)}
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-mono font-bold text-amber-900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-bold text-blue-700 mb-1">إيراد الخدمات والطباعة</label>
                <input
                  type="number"
                  value={editArchServiceRevenue}
                  onChange={e => setEditArchServiceRevenue(e.target.value)}
                  className="w-full p-2.5 bg-white border border-blue-300 rounded-xl font-mono font-bold text-blue-900"
                />
              </div>

              {/* 3. Commissions */}
              <div className="md:col-span-3 font-bold text-slate-800 border-b pb-1 border-slate-200 mt-2 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span>عمولات الأنشطة المباشرة:</span>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">عمولة المحافظ (فودافون كاش)</label>
                <input
                  type="number"
                  value={editArchWalletComm}
                  onChange={e => setEditArchWalletComm(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">عمولة التذاكر</label>
                <input
                  type="number"
                  value={editArchTicketsComm}
                  onChange={e => setEditArchTicketsComm(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">عمولة إيداع المكن</label>
                <input
                  type="number"
                  value={editArchMachineDepComm}
                  onChange={e => setEditArchMachineDepComm(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">عمولة سحب المكن (فوري وأمان)</label>
                <input
                  type="number"
                  value={editArchMachineWtdComm}
                  onChange={e => setEditArchMachineWtdComm(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              {/* 4. Expenses & Salaries */}
              <div className="md:col-span-3 font-bold text-slate-800 border-b pb-1 border-slate-200 mt-2 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-rose-600" />
                <span>القبض والمصروفات الإدارية:</span>
              </div>
              <div>
                <label className="block font-bold text-rose-700 mb-1">القبض والسلف</label>
                <input
                  type="number"
                  value={editArchSalaries}
                  onChange={e => setEditArchSalaries(e.target.value)}
                  className="w-full p-2.5 bg-white border border-rose-200 rounded-xl font-mono font-bold text-rose-800"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-bold text-rose-700 mb-1">باقي المصروفات</label>
                <input
                  type="number"
                  value={editArchExpenses}
                  onChange={e => setEditArchExpenses(e.target.value)}
                  className="w-full p-2.5 bg-white border border-rose-200 rounded-xl font-mono font-bold text-rose-800"
                />
              </div>

              {/* 5. Quantities & Notes */}
              <div className="md:col-span-3 font-bold text-slate-800 border-b pb-1 border-slate-200 mt-2 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-blue-600" />
                <span>أعداد العمليات والملاحظات:</span>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">عدد الورق</label>
                <input
                  type="number"
                  value={editArchPaperCount}
                  onChange={e => setEditArchPaperCount(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">عدد التذاكر</label>
                <input
                  type="number"
                  value={editArchTicketCount}
                  onChange={e => setEditArchTicketCount(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات التقرير</label>
                <input
                  type="text"
                  value={editArchNotes}
                  onChange={e => setEditArchNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                  placeholder="ملاحظات توضيحية..."
                />
              </div>
            </div>

            <div className="pt-3 flex gap-3 border-t border-slate-200">
              <button
                disabled={editArchSubmitting}
                onClick={async () => {
                  setEditArchSubmitting(true);
                  try {
                    const res = await fetch('/api/reports/monthly-archive', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        id: editArchItem.id,
                        month: editArchMonth || editArchItem.month,
                        opening_balance: parseFloat(editArchOpening || '0'),
                        closing_balance: parseFloat(editArchClosing || '0'),
                        purchases_cost: parseFloat(editArchPurchases || '0'),
                        service_revenue: parseFloat(editArchServiceRevenue || '0'),
                        wallet_commission: parseFloat(editArchWalletComm || '0'),
                        tickets_commission: parseFloat(editArchTicketsComm || '0'),
                        machine_deposit_commission: parseFloat(editArchMachineDepComm || '0'),
                        machine_withdrawal_commission: parseFloat(editArchMachineWtdComm || '0'),
                        salaries: parseFloat(editArchSalaries || '0'),
                        other_expenses: parseFloat(editArchExpenses || '0'),
                        paper_count: parseInt(editArchPaperCount || '0'),
                        ticket_count: parseInt(editArchTicketCount || '0'),
                        notes: editArchNotes
                      })
                    });
                    if (res.ok) {
                      setEditArchItem(null);
                      fetchReports();
                    }
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setEditArchSubmitting(false);
                  }
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {editArchSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                <span>حفظ التعديلات الشاملة 💾</span>
              </button>
              <button
                onClick={() => setEditArchItem(null)}
                className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
