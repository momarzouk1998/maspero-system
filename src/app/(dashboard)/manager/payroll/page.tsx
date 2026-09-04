'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Search, Calendar, RefreshCw, CheckCircle2, AlertTriangle, 
  ArrowRight, DollarSign, Clock, UserCheck, ShieldCheck, Coins,
  Share2, MessageSquare, Printer, X, Eye, FileText
} from 'lucide-react';
import { formatNumber } from '@/lib/user-utils';

export default function EmployeePayrollReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  // Selected Employee for Modal & Share
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);

  const fetchPayroll = async () => {
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
    fetchPayroll();
  }, [startDate, endDate]);

  const employeePayrolls = data?.employeePayrolls || [];

  const filteredPayrolls = employeePayrolls.filter((emp: any) => 
    !search || emp.name.toLowerCase().includes(search.toLowerCase()) || (emp.jobTitle && emp.jobTitle.toLowerCase().includes(search.toLowerCase()))
  );

  const getWhatsAppShareUrl = (emp: any) => {
    const periodText = startDate && endDate 
      ? `من ${startDate} إلى ${endDate}`
      : 'الفترة الحالية';

    const text = `📋 *مستحقات الموظف: ${emp.name}*
🗓️ *الفترة:* ${periodText}
-------------------------------
💵 *الراتب الأساسي:* ${formatNumber(emp.monthlySalary)} ج
⏱️ *سعر الساعة:* ${formatNumber(emp.hourlyRate)} ج
⏰ *ساعات العمل:* ${emp.achievedHours} ساعة
🎁 *مكافآت ساعات:* +${emp.bonusHours} ساعة
⚠️ *خصومات ساعات:* -${emp.deductedHours} ساعة
📊 *صافي الساعات:* ${emp.finalHours} ساعة (${formatNumber(emp.hoursValue)} ج)
💰 *عمولة الموظف:* +${formatNumber(emp.employeeCommission)} ج
🔻 *السُلف:* -${formatNumber(emp.totalAdvances)} ج
🔻 *القبض المدفوع:* -${formatNumber(emp.totalSalaryPaid)} ج
-------------------------------
⭐ *صافي المستحق النهائي:* ${emp.netAccountDue >= 0 ? '+' : ''}${formatNumber(emp.netAccountDue)} ج
-------------------------------
مركز ماسبيرو لخدمات الطباعة`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

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
              <Users className="w-7 h-7 text-indigo-600" />
              <span>مستحقات الموظفين</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Date Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
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
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200"
          >
            إعادة ضبط
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم الموظف..."
            className="w-full pl-4 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Payroll Table with Zebra Striping */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
            <span>جاري تحميل مستحقات الموظفين...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-700 min-w-[950px]">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3.5 whitespace-nowrap">الموظف</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">الراتب</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">سعر س</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">س العمل</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">مكافئة س</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">خصم س</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">صافي س</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">قيمة س</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">عمولة الموظف</th>
                  <th className="px-3 py-3.5 whitespace-nowrap text-amber-800">سلف</th>
                  <th className="px-3 py-3.5 whitespace-nowrap text-emerald-800">قبض</th>
                  <th className="px-3 py-3.5 whitespace-nowrap text-center bg-indigo-50 text-indigo-900 font-bold">المستحق</th>
                  <th className="px-3 py-3.5 whitespace-nowrap text-center">مشاركة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPayrolls.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-8 text-slate-500">لا يوجد موظفين تطابق البحث</td>
                  </tr>
                ) : (
                  filteredPayrolls.map((emp: any, index: number) => (
                    <tr 
                      key={emp.employeeId} 
                      onClick={() => setSelectedEmp(emp)}
                      className={`cursor-pointer transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-100/70'
                      } hover:bg-indigo-50/60`}
                    >
                      <td className="px-3 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{emp.name}</span>
                          {!emp.isActive && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700">غير نشط</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">{formatNumber(emp.monthlySalary)}</td>
                      <td className="px-3 py-3.5 font-mono text-slate-600 whitespace-nowrap">{formatNumber(emp.hourlyRate)}</td>
                      <td className="px-3 py-3.5 font-mono text-slate-800 whitespace-nowrap">{emp.achievedHours} س</td>
                      <td className="px-3 py-3.5 font-mono text-emerald-700 font-bold whitespace-nowrap">+{emp.bonusHours} س</td>
                      <td className="px-3 py-3.5 font-mono text-red-700 font-bold whitespace-nowrap">-{emp.deductedHours} س</td>
                      <td className="px-3 py-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">{emp.finalHours} س</td>
                      <td className="px-3 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">{formatNumber(emp.hoursValue)}</td>
                      <td className="px-3 py-3.5 font-mono text-emerald-700 whitespace-nowrap">+{formatNumber(emp.employeeCommission)}</td>
                      <td className="px-3 py-3.5 font-mono text-amber-800 whitespace-nowrap">-{formatNumber(emp.totalAdvances)}</td>
                      <td className="px-3 py-3.5 font-mono text-emerald-800 whitespace-nowrap">-{formatNumber(emp.totalSalaryPaid)}</td>
                      <td className={`px-3 py-3.5 font-mono font-bold text-center text-sm whitespace-nowrap ${
                        emp.netAccountDue >= 0 ? 'bg-emerald-50 text-emerald-900 border-l border-r border-emerald-200' : 'bg-red-50 text-red-900 border-l border-r border-red-200'
                      }`}>
                        {emp.netAccountDue >= 0 ? `+${formatNumber(emp.netAccountDue)}` : formatNumber(emp.netAccountDue)}
                      </td>
                      <td className="px-3 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedEmp(emp)}
                            title="عرض تفاصيل الحساب"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4 text-indigo-600" />
                          </button>
                          <a
                            href={getWhatsAppShareUrl(emp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="إرسال الحساب عبر الواتساب"
                            className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors flex items-center gap-1 font-bold text-[11px]"
                          >
                            <MessageSquare className="w-4 h-4 text-emerald-600" />
                            <span className="hidden sm:inline">واتساب</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Payroll Breakdown Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedEmp.name}</h3>
                  <p className="text-xs text-slate-500">{selectedEmp.jobTitle || 'موظف مبيعات'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmp(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable/Exportable Employee Card */}
            <div id="payroll-card" className="p-5 bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200 space-y-3.5 text-xs text-slate-800">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-700">🗓️ الفترة المالية:</span>
                <span className="font-bold text-indigo-700 font-mono">
                  {startDate && endDate ? `${startDate} إلى ${endDate}` : 'الشهر الحالي'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">الراتب الأساسي</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">{formatNumber(selectedEmp.monthlySalary)} ج</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">سعر الساعة</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">{formatNumber(selectedEmp.hourlyRate)} ج</span>
                </div>
              </div>

              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-600">ساعات العمل الفعلية:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedEmp.achievedHours} ساعة</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>مكافآت ساعات:</span>
                  <span className="font-mono font-bold">+{selectedEmp.bonusHours} ساعة</span>
                </div>
                <div className="flex justify-between text-red-700">
                  <span>خصومات ساعات:</span>
                  <span className="font-mono font-bold">-{selectedEmp.deductedHours} ساعة</span>
                </div>
                <div className="flex justify-between text-indigo-700 font-bold border-t border-slate-100 pt-1">
                  <span>صافي الساعات المستحقة:</span>
                  <span className="font-mono">{selectedEmp.finalHours} ساعة ({formatNumber(selectedEmp.hoursValue)} ج)</span>
                </div>
              </div>

              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between text-emerald-700">
                  <span>عمولة الموظف:</span>
                  <span className="font-mono font-bold">+{formatNumber(selectedEmp.employeeCommission)} ج</span>
                </div>
                <div className="flex justify-between text-amber-800">
                  <span>السُلف المسحوبة:</span>
                  <span className="font-mono font-bold">-{formatNumber(selectedEmp.totalAdvances)} ج</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>القبض المدفوع:</span>
                  <span className="font-mono font-bold">-{formatNumber(selectedEmp.totalSalaryPaid)} ج</span>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border flex justify-between items-center ${
                selectedEmp.netAccountDue >= 0 
                  ? 'bg-emerald-100/80 border-emerald-300 text-emerald-950' 
                  : 'bg-red-100/80 border-red-300 text-red-950'
              }`}>
                <span className="font-extrabold text-sm">إجمالي الصافي المستحق:</span>
                <span className="font-mono font-black text-lg">
                  {selectedEmp.netAccountDue >= 0 ? `+${formatNumber(selectedEmp.netAccountDue)}` : formatNumber(selectedEmp.netAccountDue)} ج
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <a
                href={getWhatsAppShareUrl(selectedEmp)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>مشاركة الحساب واتساب</span>
              </a>

              <button
                onClick={() => window.print()}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>طباعة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

