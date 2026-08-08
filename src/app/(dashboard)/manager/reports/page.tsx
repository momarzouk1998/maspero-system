'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, TrendingUp, DollarSign, Printer, Train, Cpu, Receipt, 
  Filter, Search, Calendar, RefreshCw, CheckCircle2, AlertTriangle, Info, ArrowRight,
  UserCheck, Users, FileText, PieChart, Coins, CreditCard
} from 'lucide-react';

export default function ManagerReportsPage() {
  const [activeTab, setActiveTab] = useState<'financial' | 'payroll'>('financial');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
  const employeePayrolls = data?.employeePayrolls || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Navigation */}
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
              <BarChart3 className="w-7 h-7 text-blue-600" />
              <span>تقارير الماليات ومستحقات الموظفين</span>
            </h1>
            <p className="text-slate-600 text-xs mt-1">
              متابعة الأرباح الإجمالية، العمولات، حسابات الشحن، ومستحقات جميع الموظفين
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('financial')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'financial' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>التقارير المالية والأرباح</span>
          </button>
          
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'payroll' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>حسابات ومستحقات الموظفين</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">تصفية بالفترة:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="py-1.5 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-mono"
          />
          <span className="text-xs text-slate-400">إلى</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="py-1.5 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-mono"
          />
        </div>

        <button
          onClick={() => { setStartDate(''); setEndDate(''); }}
          className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200"
        >
          إعادة ضبط
        </button>
      </div>

      {/* TAB 1: FINANCIAL & PROFIT REPORT */}
      {activeTab === 'financial' && (
        <>
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-2" />
              <span>جاري تحميل التقارير المالية والأرباح...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Primary Metric Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-800">إجمالي الإيرادات (المبيعات)</span>
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-emerald-900">
                    {Number(metrics.totalRevenue || 0).toLocaleString('ar-EG')} ج.م
                  </h3>
                  <p className="text-[11px] text-emerald-700 mt-1">مبيعات الخدمات والطباعة</p>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-blue-200 bg-blue-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-800">إجمالي العمولات المكتسبة</span>
                    <Coins className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-blue-900">
                    {Number(metrics.totalCommissions || 0).toLocaleString('ar-EG')} ج.م
                  </h3>
                  <p className="text-[11px] text-blue-700 mt-1">محافظ + ماكينات + تذاكر</p>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-purple-200 bg-purple-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-800">إجمالي المصروفات التشغيلية</span>
                    <Receipt className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-purple-900">
                    {Number(metrics.otherExpenses || 0).toLocaleString('ar-EG')} ج.م
                  </h3>
                  <p className="text-[11px] text-purple-700 mt-1">مصروفات الإدارة والمحل</p>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-amber-200 bg-amber-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-800">إجمالي الرواتب والسلف</span>
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-black font-mono text-amber-900">
                    {Number(metrics.salaries || 0).toLocaleString('ar-EG')} ج.م
                  </h3>
                  <p className="text-[11px] text-amber-700 mt-1">مستحقات الموظفين المسحوبة</p>
                </div>
              </div>

              {/* Net Profit Banner */}
              <div className="glass-panel p-6 rounded-3xl border border-emerald-300 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                <div>
                  <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full border border-white/30">
                    النتيجة المالية النهائية
                  </span>
                  <h2 className="text-2xl font-bold mt-2">صافي الربح النهائي (Net Profit)</h2>
                  <p className="text-emerald-100 text-xs mt-0.5">
                    (الإيرادات - المشتريات) + العمولات - المصروفات - الرواتب والسلف
                  </p>
                </div>
                <div className="text-left">
                  <span className="text-4xl font-black font-mono text-white">
                    {Number(metrics.netProfit || 0).toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
              </div>

              {/* Detailed Financial Breakdown Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Commissions & Charges Breakdown */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3 border-slate-200">
                    <Coins className="w-4 h-4 text-blue-600" />
                    <span>تفاصيل العمولات المكتسبة</span>
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600 font-semibold">عمولات المحافظ الإلكترونية:</span>
                      <span className="font-mono font-bold text-slate-900">{Number(metrics.walletCommission || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600 font-semibold">عمولات تذاكر القطارات:</span>
                      <span className="font-mono font-bold text-slate-900">{Number(metrics.ticketCommission || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600 font-semibold">عمولات سحب الماكينات (فوري):</span>
                      <span className="font-mono font-bold text-slate-900">{Number(metrics.machineWithdrawlCommission || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600 font-semibold">عمولات إيداع الماكينات (0.7%):</span>
                      <span className="font-mono font-bold text-slate-900">{Number(metrics.machineDepositsCommission || 0).toFixed(2)} ج.م</span>
                    </div>
                  </div>
                </div>

                {/* 2. Operational Stats & Quantities */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3 border-slate-200">
                    <Printer className="w-4 h-4 text-emerald-600" />
                    <span>إحصائيات المشتريات والكميات</span>
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600 font-semibold">تكلفة المشتريات (Purchases Cost):</span>
                      <span className="font-mono font-bold text-slate-900">{Number(metrics.purchasesCost || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600 font-semibold">نسبة تكلفة المشتريات من الإيراد:</span>
                      <span className="font-mono font-bold text-indigo-700">{Number(metrics.purchasesCostPercent || 0)} %</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600 font-semibold">إجمالي الورق المستهلك (Paper Count):</span>
                      <span className="font-mono font-bold text-emerald-700">{Number(metrics.paperCount || 0).toLocaleString('ar-EG')} ورقة</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-600 font-semibold">إجمالي عدد التذاكر المحجوزة:</span>
                      <span className="font-mono font-bold text-purple-700">{Number(metrics.ticketCount || 0).toLocaleString('ar-EG')} تذكرة</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: ALL EMPLOYEES PAYROLL ACCOUNT REPORT */}
      {activeTab === 'payroll' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b pb-4 border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>كشف حساب ومستحقات جميع الموظفين (Active & Inactive)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                حساب الساعات المحققة، المكافآت، الخصومات، العمولات، والسلف لكل موظف
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3">الموظف</th>
                  <th className="px-3 py-3">الراتب الأساسي</th>
                  <th className="px-3 py-3">سعر الساعة</th>
                  <th className="px-3 py-3">ساعات الشفتات</th>
                  <th className="px-3 py-3">مكافآت (+س)</th>
                  <th className="px-3 py-3">خصومات (-س)</th>
                  <th className="px-3 py-3">صافي الساعات</th>
                  <th className="px-3 py-3">قيمة الساعات</th>
                  <th className="px-3 py-3">عمولة المبيعات</th>
                  <th className="px-3 py-3 text-amber-800">إجمالي السلف</th>
                  <th className="px-3 py-3 text-emerald-800">الراتب المدفوع</th>
                  <th className="px-3 py-3 text-center bg-indigo-50 text-indigo-900 font-bold">الصافي والمستحق النهائي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {employeePayrolls.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-slate-500">لا يوجد موظفين لعرض التقارير</td>
                  </tr>
                ) : (
                  employeePayrolls.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{emp.name}</span>
                          {!emp.isActive && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700">غير نشط</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900">{emp.monthlySalary.toFixed(2)}</td>
                      <td className="px-3 py-3 font-mono text-slate-600">{emp.hourlyRate.toFixed(2)}</td>
                      <td className="px-3 py-3 font-mono text-slate-800">{emp.achievedHours} س</td>
                      <td className="px-3 py-3 font-mono text-emerald-700 font-bold">+{emp.bonusHours} س</td>
                      <td className="px-3 py-3 font-mono text-red-700 font-bold">-{emp.deductedHours} س</td>
                      <td className="px-3 py-3 font-mono font-bold text-indigo-700">{emp.finalHours} س</td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900">{emp.hoursValue.toFixed(2)}</td>
                      <td className="px-3 py-3 font-mono text-emerald-700">+{emp.employeeCommission.toFixed(2)}</td>
                      <td className="px-3 py-3 font-mono text-amber-800">-{emp.totalAdvances.toFixed(2)}</td>
                      <td className="px-3 py-3 font-mono text-emerald-800">-{emp.totalSalaryPaid.toFixed(2)}</td>
                      <td className={`px-3 py-3 font-mono font-bold text-center text-sm ${
                        emp.netAccountDue >= 0 ? 'bg-emerald-50 text-emerald-900 border-l border-r border-emerald-200' : 'bg-red-50 text-red-900 border-l border-r border-red-200'
                      }`}>
                        {emp.netAccountDue >= 0 ? `+${emp.netAccountDue.toFixed(2)}` : emp.netAccountDue.toFixed(2)} ج.م
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
