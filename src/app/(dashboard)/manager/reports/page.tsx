'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, TrendingUp, DollarSign, Printer, Train, Cpu, Receipt, 
  Filter, Search, Calendar, RefreshCw, CheckCircle2, AlertTriangle, Info, ArrowRight,
  UserCheck, Users, FileText, PieChart, Coins, CreditCard, Folder, Clock, Layers
} from 'lucide-react';

export default function ManagerReportsPage() {
  const [activeTab, setActiveTab] = useState<'financial' | 'monthly' | 'category' | 'payroll'>('financial');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Month & Category for Sub-reports
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
  const employeePayrolls = data?.employeePayrolls || [];
  const monthlyReports = data?.monthlyReports || [];
  const categoryReports = data?.categoryReports || [];
  const allExpenses = data?.allExpenses || [];

  const activeMonthReport = monthlyReports.find((m: any) => m.month === selectedMonth) || { items: [], totalSum: 0 };
  const activeCategoryReport = categoryReports.find((c: any) => c.category === selectedCategory) || { items: [], totalSum: 0 };

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
              <span>تقارير الماليات والتصنيفات والأجر</span>
            </h1>
            <p className="text-slate-600 text-xs mt-1">
              متابعة الأرباح الإجمالية، التقارير الشهرية، تقارير التصنيف، ومستحقات جميع الموظفين
            </p>
          </div>
        </div>

        {/* 4 Main Tab Buttons */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('financial')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'financial' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>ملخص الأرباح</span>
          </button>

          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'monthly' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>الماليات (الشهر)</span>
          </button>

          <button
            onClick={() => setActiveTab('category')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'category' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>الماليات (التصنيف)</span>
          </button>
          
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'payroll' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>مستحقات الموظفين</span>
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

      {/* TAB 1: FINANCIAL SUMMARY & PROFIT */}
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
            </div>
          )}
        </>
      )}

      {/* TAB 2: FINANCIALS BY MONTH (الماليات - الشهر) */}
      {activeTab === 'monthly' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Months Sidebar Selector */}
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
                <span className={`px-2 py-0.5 rounded-lg font-mono text-[11px] ${
                  selectedMonth === m.month ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                }`}>
                  {Number(m.totalSum || 0).toLocaleString('ar-EG')}
                </span>
              </button>
            ))}
          </div>

          {/* Month Transactions Table */}
          <div className="md:col-span-3 glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span>الماليات لشهر ({selectedMonth || '-'})</span>
              </h3>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                إجمالي الشهر: {Number(activeMonthReport.totalSum || 0).toLocaleString('ar-EG')} ج.م
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3">تاريخ الحركة</th>
                    <th className="px-3 py-3">التصنيف</th>
                    <th className="px-3 py-3">البند / البيان</th>
                    <th className="px-3 py-3">المبلغ</th>
                    <th className="px-3 py-3">الموظف المعني</th>
                    <th className="px-3 py-3">الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeMonthReport.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">لا توجد معاملات مسجلة لهذا الشهر</td>
                    </tr>
                  ) : (
                    activeMonthReport.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 font-mono text-slate-600">
                          {item.date ? new Date(item.date).toLocaleDateString('ar-EG') : '-'}
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-900">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200">
                            {item.main_type}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-bold text-blue-700">{item.items || '-'}</td>
                        <td className="px-3 py-3 font-mono font-bold text-slate-900">{Number(item.amount).toFixed(2)}</td>
                        <td className="px-3 py-3 text-slate-700">{item.employee_name || '-'}</td>
                        <td className="px-3 py-3 text-slate-500 max-w-[150px] truncate">{item.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIALS BY CATEGORY (الماليات - التصنيف) */}
      {activeTab === 'category' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Categories Sidebar Selector */}
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
                <span className={`px-2 py-0.5 rounded-lg font-mono text-[11px] ${
                  selectedCategory === c.category ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                }`}>
                  {Number(c.totalSum || 0).toLocaleString('ar-EG')}
                </span>
              </button>
            ))}
          </div>

          {/* Category Transactions Table */}
          <div className="md:col-span-3 glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <span>التعاملات لتصنيف ({selectedCategory})</span>
              </h3>
              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                إجمالي التصنيف: {Number(activeCategoryReport.totalSum || 0).toLocaleString('ar-EG')} ج.م
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3">التاريخ</th>
                    <th className="px-3 py-3">الشهر</th>
                    <th className="px-3 py-3">البند / البيان</th>
                    <th className="px-3 py-3">المبلغ</th>
                    <th className="px-3 py-3">الموظف المعني</th>
                    <th className="px-3 py-3">الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeCategoryReport.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">لا توجد معاملات مسجلة لهذا التصنيف</td>
                    </tr>
                  ) : (
                    activeCategoryReport.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 font-mono text-slate-600">
                          {item.date ? new Date(item.date).toLocaleDateString('ar-EG') : '-'}
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-slate-700">{item.month || '-'}</td>
                        <td className="px-3 py-3 font-bold text-purple-700">{item.items || '-'}</td>
                        <td className="px-3 py-3 font-mono font-bold text-slate-900">{Number(item.amount).toFixed(2)}</td>
                        <td className="px-3 py-3 text-slate-700">{item.employee_name || '-'}</td>
                        <td className="px-3 py-3 text-slate-500 max-w-[150px] truncate">{item.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ALL EMPLOYEES PAYROLL ACCOUNT REPORT */}
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
                  employeePayrolls.map((emp: any) => (
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
