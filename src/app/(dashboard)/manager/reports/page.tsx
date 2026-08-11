'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, TrendingUp, DollarSign, Printer, Train, Cpu, Receipt, 
  Calendar, RefreshCw, ArrowRight, Coins, ShoppingBag, Layers, 
  FileText, ArrowDownLeft, ArrowUpRight, Zap, Wallet, Building2,
  Archive, Users, ChevronDown, ChevronUp, Banknote, AlertCircle
} from 'lucide-react';
import { formatNumber, formatNumberLocale } from '@/lib/user-utils';

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
              {/* Top Banner: Net Profit */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
                    النتيجة المالية
                  </span>
                  <h2 className="text-xl font-bold mt-2 text-slate-900">صافي الربح</h2>
                  <p className="text-slate-500 text-xs mt-1">
                    الإيرادات - المشتريات + العمولات - المصروفات - الرواتب
                  </p>
                </div>
                <div className="text-left">
                  <span className={`text-3xl font-bold font-mono ${Number(metrics.netProfit || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatNumberLocale(Number(metrics.netProfit || 0), 'en-US')}
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Revenue */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">الإيرادات</span>
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">
                    {formatNumberLocale(Number(metrics.totalRevenue || 0), 'en-US')}
                  </h3>
                  <p className="text-[11px] text-slate-500">المبيعات</p>
                </div>

                {/* 2. Total Commissions */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">العمولات</span>
                    <Coins className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">
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
                  <h3 className="text-2xl font-bold font-mono text-slate-900">
                    {formatNumberLocale(Number(metrics.otherExpenses || 0), 'en-US')}
                  </h3>
                  <p className="text-[11px] text-slate-500">الإدارة والمحل</p>
                </div>

                {/* 4. Salaries & Advances */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">الرواتب</span>
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">
                    {formatNumberLocale(Number(metrics.salaries || 0), 'en-US')}
                  </h3>
                  <p className="text-[11px] text-slate-500">الموظفين</p>
                </div>

                {/* 5. Purchases Cost */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">المشتريات</span>
                    <ShoppingBag className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">
                    {formatNumberLocale(Number(metrics.purchasesCost || 0), 'en-US')}
                  </h3>
                  <p className="text-[11px] text-slate-500">{metrics.purchasesCostPercent || 0}%</p>
                </div>

                {/* 6. Manager Withdrawals */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">مسحوبات المدير</span>
                    <ArrowUpRight className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">
                    {formatNumberLocale(Number(metrics.withdrawnRevenue || 0), 'en-US')}
                  </h3>
                  <p className="text-[11px] text-slate-500">الأرباح الشخصية</p>
                </div>

                {/* 7. Paper Count */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">الورق</span>
                    <Printer className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">
                    {formatNumberLocale(Number(metrics.paperCount || 0), 'en-US')}
                  </h3>
                  <p className="text-[11px] text-slate-500">ورقة</p>
                </div>

                {/* 8. Ticket Count */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">التذاكر</span>
                    <Train className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">
                    {formatNumberLocale(Number(metrics.ticketCount || 0), 'en-US')}
                  </h3>
                  <p className="text-[11px] text-slate-500">تذكرة</p>
                </div>

                {/* 9. Wallet Commissions */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">عمولات المحافظ</span>
                    <Zap className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">
                    {formatNumber(Number(metrics.walletCommission || 0))}
                  </h3>
                  <p className="text-[11px] text-slate-500">فودافون كاش</p>
                </div>

                {/* 10. Machine Withdrawals Commission */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">عمولات السحب</span>
                    <Cpu className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">
                    {formatNumber(Number(metrics.machineWithdrawlCommission || 0))}
                  </h3>
                  <p className="text-[11px] text-slate-500">فوري وأمان</p>
                </div>

                {/* 11. Machine Deposits Commission */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">عمولات الإيداع</span>
                    <Coins className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">
                    {formatNumber(Number(metrics.machineDepositsCommission || 0))}
                  </h3>
                  <p className="text-[11px] text-slate-500">{formatNumberLocale(Number(metrics.machineDeposits || 0), 'en-US')}</p>
                </div>
              </div>

              {/* ── Section B: ثابتة — أرصدة لحظية ── */}
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-slate-200" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                  <Banknote className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] font-bold text-slate-600">الأرصدة الحالية</span>
                  <span className="text-[10px] text-slate-500 font-medium">لا تتأثر بالتصفية</span>
                </div>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Summary Row — 4 totals */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">المحافظ</span>
                    <Wallet className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">{formatNumberLocale(Number(walletsTotals.محافظ), 'en-US')}</h3>
                  <p className="text-[11px] text-slate-500">{walletsByType.محافظ.length} محفظة</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">الماكينات</span>
                    <Building2 className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">{formatNumberLocale(Number(walletsTotals.ماكينات), 'en-US')}</h3>
                  <p className="text-[11px] text-slate-500">{walletsByType.ماكينات.length} ماكينة</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">الأدراج</span>
                    <Archive className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">{formatNumberLocale(Number(walletsTotals.أدراج), 'en-US')}</h3>
                  <p className="text-[11px] text-slate-500">{walletsByType.أدراج.length} درج</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">عهدة الموظفين</span>
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-slate-900">{formatNumberLocale(Number(totalEmployeeCustody), 'en-US')}</h3>
                  <p className="text-[11px] text-slate-500">{employeeCustody.length} موظف</p>
                </div>
              </div>

              {/* 1. المحافظ الإلكترونية */}
              {walletsByType.محافظ.length > 0 && (
                <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow">
                        <Wallet className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">المحافظ الإلكترونية</h3>
                        <p className="text-[11px] text-slate-500">فودافون كاش وغيرها</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold font-mono text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                      {formatNumberLocale(Number(walletsTotals.محافظ), 'en-US')}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {walletsByType.محافظ.map((w: any) => (
                      <div key={w.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Wallet className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{w.wallet_name}</p>
                            {w.custodian_name && (
                              <p className="text-[10px] text-slate-500">{w.custodian_name}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-bold font-mono ${Number(w.current_balance) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {formatNumberLocale(Number(w.current_balance), 'en-US')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. الماكينات */}
              {walletsByType.ماكينات.length > 0 && (
                <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-600 flex items-center justify-center shadow">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">ماكينات فوري وأمان</h3>
                        <p className="text-[11px] text-slate-500">رصيد كل ماكينة</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold font-mono text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                      {formatNumberLocale(Number(walletsTotals.ماكينات), 'en-US')}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {walletsByType.ماكينات.map((w: any) => (
                      <div key={w.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Cpu className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{w.wallet_name}</p>
                            {w.custodian_name && (
                              <p className="text-[10px] text-slate-500">{w.custodian_name}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-bold font-mono ${Number(w.current_balance) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {formatNumberLocale(Number(w.current_balance), 'en-US')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. الأدراج */}
              {walletsByType.أدراج.length > 0 && (
                <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center shadow">
                        <Archive className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">أدراج الكاشير</h3>
                        <p className="text-[11px] text-slate-500">رصيد كل درج</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold font-mono text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                      {formatNumberLocale(Number(walletsTotals.أدراج), 'en-US')}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {walletsByType.أدراج.map((w: any) => (
                      <div key={w.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Banknote className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{w.wallet_name}</p>
                            {w.custodian_name && (
                              <p className="text-[10px] text-slate-500">{w.custodian_name}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-bold font-mono ${Number(w.current_balance) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {formatNumberLocale(Number(w.current_balance), 'en-US')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. عهدة الكاش للموظفين */}
              {employeeCustody.length > 0 && (
                <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">عهدة الكاش للموظفين</h3>
                        <p className="text-[11px] text-slate-500">رصيد النقدية في عهدة كل موظف</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold font-mono text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                      {formatNumberLocale(Number(totalEmployeeCustody), 'en-US')}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {employeeCustody.map((emp: any) => (
                      <div key={emp.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                            <span className="text-[11px] font-bold text-slate-700">
                              {emp.name.trim().charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{emp.name}</p>
                            <p className="text-[10px] text-slate-500">{emp.jobTitle}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {emp.walletBalance < 0 && (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span className={`text-sm font-bold font-mono ${emp.walletBalance < 0 ? 'text-rose-600' : emp.walletBalance === 0 ? 'text-slate-400' : 'text-slate-900'}`}>
                            {formatNumberLocale(Number(emp.walletBalance), 'en-US')}
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
    </div>
  );
}
