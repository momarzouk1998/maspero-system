'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, TrendingUp, DollarSign, Printer, Train, Cpu, Receipt, 
  Calendar, RefreshCw, ArrowRight, Coins, ShoppingBag, Layers, 
  FileText, ArrowDownLeft, ArrowUpRight, Zap, Wallet, Building2,
  Archive, Users, ChevronDown, ChevronUp, Banknote, AlertCircle
} from 'lucide-react';

export default function ManagerReportsPage() {
  const [data, setData] = useState<any>(null);
  const [walletsExpanded, setWalletsExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Hidden tabs state (kept in code as requested, but default is 'financial')
  const [activeTab, setActiveTab] = useState<'financial' | 'monthly' | 'category'>('financial');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('إيرادات');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/reports/financial?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);

        if (result.monthlyReports && result.monthlyReports.length > 0 && !selectedMonth) {
          setSelectedMonth(result.monthlyReports[0].month);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const metrics = data?.metrics || {};
  const monthlyReports = data?.monthlyReports || [];
  const categoryReports = data?.categoryReports || [];
  const walletsByType = data?.walletsByType || { محافظ: [], ماكينات: [], أدراج: [] };
  const walletsTotals = data?.walletsTotals || { محافظ: 0, ماكينات: 0, أدراج: 0 };
  const employeeCustody = data?.employeeCustody || [];
  const totalEmployeeCustody = data?.totalEmployeeCustody || 0;

  const activeMonthReport = monthlyReports.find((m: any) => m.month === selectedMonth) || { items: [], totalSum: 0 };
  const activeCategoryReport = categoryReports.find((c: any) => c.category === selectedCategory) || { items: [], totalSum: 0 };

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
              <span>تقرير الماليات</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Date Range Selector Bar */}
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
      </div>

      {/* MAIN CONTENT: FINANCIAL METRICS GRID */}
      {activeTab === 'financial' && (
        <>
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
              <span>جاري تحميل التقرير المالي والأرباح...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Banner: Net Profit — ألوان اللوجو */}
              <div className="relative p-6 rounded-3xl overflow-hidden text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d0a1a 40%, #E8197A 100%)' }}>
                {/* decorative arcs from logo colors */}
                <div className="absolute top-0 left-0 w-40 h-40 rounded-full opacity-10" style={{ background: '#00AEEF', transform: 'translate(-30%, -30%)' }} />
                <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full opacity-10" style={{ background: '#E8197A', transform: 'translate(30%, 30%)' }} />
                <div className="absolute top-0 right-1/3 w-24 h-24 rounded-full opacity-10" style={{ background: '#FFC20E', transform: 'translateY(-50%)' }} />
                <div className="relative z-10">
                  <span className="text-xs font-bold bg-white/15 px-3 py-1 rounded-full border border-white/25">
                    النتيجة المالية النهائية (Net Profit)
                  </span>
                  <h2 className="text-2xl font-black mt-2">صافي الربح الإجمالي للمؤسسة</h2>
                  <p className="text-white/70 text-xs mt-1">
                    (الإيرادات - المشتريات) + العمولات - المصروفات التشغيلية - الرواتب
                  </p>
                </div>
                <div className="relative z-10 text-left">
                  <span className={`text-4xl font-black font-mono ${Number(metrics.netProfit || 0) < 0 ? 'text-red-300' : 'text-white'}`}>
                    {Number(metrics.netProfit || 0).toLocaleString('ar-EG')}
                  </span>
                  <p className="text-white/60 text-xs mt-1 text-center">ج.م</p>
                </div>
              </div>

              {/* ── Section A: متغيرة بالتصفية ── */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] font-bold text-slate-600">نتائج الفترة المحددة</span>
                  {(startDate || endDate) && (
                    <span className="text-[10px] font-mono text-[#E8197A] font-bold">
                      {startDate || '…'} → {endDate || '…'}
                    </span>
                  )}
                </div>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Revenue */}
                <div className="glass-panel p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800">إجمالي الإيرادات (المبيعات)</span>
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-emerald-900">
                    {Number(metrics.totalRevenue || 0).toLocaleString('ar-EG')}
                  </h3>
                  <p className="text-[11px] text-emerald-700">خدمات الطباعة والإنترنت</p>
                </div>

                {/* 2. Total Commissions */}
                <div className="glass-panel p-5 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800">إجمالي العمولات المكتسبة</span>
                    <Coins className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-blue-900">
                    {Number(metrics.totalCommissions || 0).toLocaleString('ar-EG')}
                  </h3>
                  <p className="text-[11px] text-blue-700">محافظ + ماكينات + تذاكر</p>
                </div>

                {/* 3. Operational Expenses */}
                <div className="glass-panel p-5 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800">المصروفات التشغيلية</span>
                    <Receipt className="w-5 h-5 text-rose-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-rose-900">
                    {Number(metrics.otherExpenses || 0).toLocaleString('ar-EG')}
                  </h3>
                  <p className="text-[11px] text-rose-700">مصروفات الإدارة والمحل</p>
                </div>

                {/* 4. Salaries & Advances */}
                <div className="glass-panel p-5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800">الرواتب والسلف</span>
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-amber-900">
                    {Number(metrics.salaries || 0).toLocaleString('ar-EG')}
                  </h3>
                  <p className="text-[11px] text-amber-700">مستحقات وسلف الموظفين</p>
                </div>

                {/* 5. Purchases Cost */}
                <div className="glass-panel p-5 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-800">تكلفة المشتريات</span>
                    <ShoppingBag className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-purple-900">
                    {Number(metrics.purchasesCost || 0).toLocaleString('ar-EG')}
                  </h3>
                  <p className="text-[11px] text-purple-700">نسبة المشتريات: {metrics.purchasesCostPercent || 0}%</p>
                </div>

                {/* 6. Manager Withdrawals */}
                <div className="glass-panel p-5 rounded-2xl border border-indigo-200 bg-indigo-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-800">مسحوبات المدير</span>
                    <ArrowUpRight className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-indigo-900">
                    {Number(metrics.withdrawnRevenue || 0).toLocaleString('ar-EG')}
                  </h3>
                  <p className="text-[11px] text-indigo-700">مسحوبات الأرباح الشخصية</p>
                </div>

                {/* 7. Paper Count */}
                <div className="glass-panel p-5 rounded-2xl border border-teal-200 bg-teal-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-800">إجمالي الورق المستهلك</span>
                    <Printer className="w-5 h-5 text-teal-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-teal-900">
                    {Number(metrics.paperCount || 0).toLocaleString('ar-EG')} ورقة
                  </h3>
                  <p className="text-[11px] text-teal-700">استهلاك الطباعة والخدمات</p>
                </div>

                {/* 8. Ticket Count */}
                <div className="glass-panel p-5 rounded-2xl border border-violet-200 bg-violet-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-800">إجمالي تذاكر القطارات</span>
                    <Train className="w-5 h-5 text-violet-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-violet-900">
                    {Number(metrics.ticketCount || 0).toLocaleString('ar-EG')} تذكرة
                  </h3>
                  <p className="text-[11px] text-violet-700">عمولة: {Number(metrics.ticketCommission || 0).toFixed(2)}</p>
                </div>

                {/* 9. Wallet Commissions */}
                <div className="glass-panel p-5 rounded-2xl border border-cyan-200 bg-cyan-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-800">عمولات المحافظ الإلكترونية</span>
                    <Zap className="w-5 h-5 text-cyan-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-cyan-900">
                    {Number(metrics.walletCommission || 0).toFixed(2)}
                  </h3>
                  <p className="text-[11px] text-cyan-700">فودافون كاش والأجهزة</p>
                </div>

                {/* 10. Machine Withdrawals Commission */}
                <div className="glass-panel p-5 rounded-2xl border border-sky-200 bg-sky-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-800">عمولات سحب الماكينات</span>
                    <Cpu className="w-5 h-5 text-sky-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-sky-900">
                    {Number(metrics.machineWithdrawlCommission || 0).toFixed(2)}
                  </h3>
                  <p className="text-[11px] text-sky-700">من مسحوبات فوري وأمان</p>
                </div>

                {/* 11. Machine Deposits Commission */}
                <div className="glass-panel p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800">عمولات إيداع الماكينات (0.7%)</span>
                    <Coins className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-emerald-900">
                    {Number(metrics.machineDepositsCommission || 0).toFixed(2)}
                  </h3>
                  <p className="text-[11px] text-emerald-700">إيداعات: {Number(metrics.machineDeposits || 0).toLocaleString('ar-EG')}</p>
                </div>
              </div>

              {/* ── Section B: ثابتة — أرصدة لحظية ── */}
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-slate-200" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
                  <Banknote className="w-3.5 h-3.5 text-slate-300" />
                  <span className="text-[11px] font-bold text-slate-200">الأرصدة الفعلية الحالية</span>
                  <span className="text-[10px] text-slate-400 font-medium">لا تتأثر بالتصفية</span>
                </div>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Summary Row — 4 totals */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="glass-panel p-4 rounded-2xl border border-blue-300 bg-gradient-to-br from-blue-600 to-blue-700 text-white space-y-1 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold opacity-90">إجمالي المحافظ</span>
                    <Wallet className="w-5 h-5 opacity-80" />
                  </div>
                  <h3 className="text-2xl font-black font-mono">{Number(walletsTotals.محافظ).toLocaleString('ar-EG')}</h3>
                  <p className="text-[11px] opacity-75">{walletsByType.محافظ.length} محفظة نشطة</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-violet-300 bg-gradient-to-br from-violet-600 to-purple-700 text-white space-y-1 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold opacity-90">إجمالي الماكينات</span>
                    <Building2 className="w-5 h-5 opacity-80" />
                  </div>
                  <h3 className="text-2xl font-black font-mono">{Number(walletsTotals.ماكينات).toLocaleString('ar-EG')}</h3>
                  <p className="text-[11px] opacity-75">{walletsByType.ماكينات.length} ماكينة نشطة</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-500 to-orange-600 text-white space-y-1 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold opacity-90">إجمالي الأدراج</span>
                    <Archive className="w-5 h-5 opacity-80" />
                  </div>
                  <h3 className="text-2xl font-black font-mono">{Number(walletsTotals.أدراج).toLocaleString('ar-EG')}</h3>
                  <p className="text-[11px] opacity-75">{walletsByType.أدراج.length} درج كاشير</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-teal-300 bg-gradient-to-br from-teal-600 to-emerald-700 text-white space-y-1 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold opacity-90">إجمالي عهدة الموظفين</span>
                    <Users className="w-5 h-5 opacity-80" />
                  </div>
                  <h3 className="text-2xl font-black font-mono">{Number(totalEmployeeCustody).toLocaleString('ar-EG')}</h3>
                  <p className="text-[11px] opacity-75">{employeeCustody.length} موظف</p>
                </div>
              </div>

              {/* 1. المحافظ الإلكترونية */}
              {walletsByType.محافظ.length > 0 && (
                <div className="glass-panel rounded-2xl border border-blue-200 overflow-hidden">
                  <div className="px-5 py-3.5 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow">
                        <Wallet className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-blue-900">المحافظ الإلكترونية</h3>
                        <p className="text-[11px] text-blue-600">فودافون كاش وغيرها</p>
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono text-blue-800 bg-blue-100 px-3 py-1 rounded-xl border border-blue-200">
                      {Number(walletsTotals.محافظ).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {walletsByType.محافظ.map((w: any) => (
                      <div key={w.id} className="flex items-center justify-between p-3.5 rounded-xl border border-blue-100 bg-white hover:bg-blue-50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Wallet className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{w.wallet_name}</p>
                            {w.custodian_name && (
                              <p className="text-[10px] text-slate-400">{w.custodian_name}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-black font-mono ${Number(w.current_balance) < 0 ? 'text-rose-600' : 'text-blue-700'}`}>
                          {Number(w.current_balance).toLocaleString('ar-EG')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. الماكينات */}
              {walletsByType.ماكينات.length > 0 && (
                <div className="glass-panel rounded-2xl border border-violet-200 overflow-hidden">
                  <div className="px-5 py-3.5 bg-violet-50 border-b border-violet-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-violet-900">ماكينات فوري وأمان</h3>
                        <p className="text-[11px] text-violet-600">رصيد كل ماكينة</p>
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono text-violet-800 bg-violet-100 px-3 py-1 rounded-xl border border-violet-200">
                      {Number(walletsTotals.ماكينات).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {walletsByType.ماكينات.map((w: any) => (
                      <div key={w.id} className="flex items-center justify-between p-3.5 rounded-xl border border-violet-100 bg-white hover:bg-violet-50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                            <Cpu className="w-3.5 h-3.5 text-violet-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{w.wallet_name}</p>
                            {w.custodian_name && (
                              <p className="text-[10px] text-slate-400">{w.custodian_name}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-black font-mono ${Number(w.current_balance) < 0 ? 'text-rose-600' : 'text-violet-700'}`}>
                          {Number(w.current_balance).toLocaleString('ar-EG')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. الأدراج */}
              {walletsByType.أدراج.length > 0 && (
                <div className="glass-panel rounded-2xl border border-amber-200 overflow-hidden">
                  <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shadow">
                        <Archive className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-amber-900">أدراج الكاشير</h3>
                        <p className="text-[11px] text-amber-600">رصيد كل درج</p>
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono text-amber-800 bg-amber-100 px-3 py-1 rounded-xl border border-amber-200">
                      {Number(walletsTotals.أدراج).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {walletsByType.أدراج.map((w: any) => (
                      <div key={w.id} className="flex items-center justify-between p-3.5 rounded-xl border border-amber-100 bg-white hover:bg-amber-50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Banknote className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{w.wallet_name}</p>
                            {w.custodian_name && (
                              <p className="text-[10px] text-slate-400">{w.custodian_name}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-black font-mono ${Number(w.current_balance) < 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                          {Number(w.current_balance).toLocaleString('ar-EG')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. عهدة الكاش للموظفين */}
              {employeeCustody.length > 0 && (
                <div className="glass-panel rounded-2xl border border-teal-200 overflow-hidden">
                  <div className="px-5 py-3.5 bg-teal-50 border-b border-teal-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center shadow">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-teal-900">عهدة الكاش للموظفين</h3>
                        <p className="text-[11px] text-teal-600">رصيد النقدية في عهدة كل موظف</p>
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono text-teal-800 bg-teal-100 px-3 py-1 rounded-xl border border-teal-200">
                      {Number(totalEmployeeCustody).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {employeeCustody.map((emp: any) => (
                      <div key={emp.id} className="flex items-center justify-between p-3.5 rounded-xl border border-teal-100 bg-white hover:bg-teal-50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
                            <span className="text-[11px] font-black text-teal-700">
                              {emp.name.trim().charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{emp.name}</p>
                            <p className="text-[10px] text-slate-400">{emp.jobTitle}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {emp.walletBalance < 0 && (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span className={`text-sm font-black font-mono ${emp.walletBalance < 0 ? 'text-rose-600' : emp.walletBalance === 0 ? 'text-slate-400' : 'text-teal-700'}`}>
                            {Number(emp.walletBalance).toLocaleString('ar-EG')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
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
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>📅 {m.month}</span>
                <span className="px-2 py-0.5 rounded-lg font-mono text-[11px] bg-slate-100 text-slate-800">
                  {Number(m.totalSum || 0).toLocaleString('ar-EG')}
                </span>
              </button>
            ))}
          </div>

          <div className="md:col-span-3 glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200">
              <h3 className="text-base font-bold text-slate-900">الماليات لشهر ({selectedMonth || '-'})</h3>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                إجمالي الشهر: {Number(activeMonthReport.totalSum || 0).toLocaleString('ar-EG')}
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
                      <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">{item.date ? new Date(item.date).toLocaleDateString('ar-EG') : '-'}</td>
                      <td className="px-3 py-3 font-bold text-slate-900 whitespace-nowrap">{item.main_type}</td>
                      <td className="px-3 py-3 font-bold text-blue-700 whitespace-nowrap">{item.items || '-'}</td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{Number(item.amount).toFixed(2)}</td>
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
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>🏷️ {c.category}</span>
                <span className="px-2 py-0.5 rounded-lg font-mono text-[11px] bg-slate-100 text-slate-800">
                  {Number(c.totalSum || 0).toLocaleString('ar-EG')}
                </span>
              </button>
            ))}
          </div>

          <div className="md:col-span-3 glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200">
              <h3 className="text-base font-bold text-slate-900">التعاملات لتصنيف ({selectedCategory})</h3>
              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                إجمالي التصنيف: {Number(activeCategoryReport.totalSum || 0).toLocaleString('ar-EG')}
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
                      <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">{item.date ? new Date(item.date).toLocaleDateString('ar-EG') : '-'}</td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-700 whitespace-nowrap">{item.month || '-'}</td>
                      <td className="px-3 py-3 font-bold text-purple-700 whitespace-nowrap">{item.items || '-'}</td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{Number(item.amount).toFixed(2)}</td>
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
    </div>
  );
}
