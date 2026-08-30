'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Search, Calendar, RefreshCw, CheckCircle2, AlertTriangle, 
  ArrowRight, DollarSign, Clock, UserCheck, ShieldCheck, Coins
} from 'lucide-react';
import { formatNumber } from '@/lib/user-utils';

export default function EmployeePayrollReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

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

      {/* Payroll Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
            <span>جاري تحميل مستحقات الموظفين...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-700 min-w-[900px]">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 whitespace-nowrap">الموظف</th>
                  <th className="px-3 py-3 whitespace-nowrap">الراتب</th>
                  <th className="px-3 py-3 whitespace-nowrap">سعر س</th>
                  <th className="px-3 py-3 whitespace-nowrap">س العمل</th>
                  <th className="px-3 py-3 whitespace-nowrap">مكافئة س</th>
                  <th className="px-3 py-3 whitespace-nowrap">خصم س</th>
                  <th className="px-3 py-3 whitespace-nowrap">صافي س</th>
                  <th className="px-3 py-3 whitespace-nowrap">قيمة س</th>
                  <th className="px-3 py-3 whitespace-nowrap">عمولة الموظف</th>
                  <th className="px-3 py-3 whitespace-nowrap text-amber-800">سلف</th>
                  <th className="px-3 py-3 whitespace-nowrap text-emerald-800">قبض</th>
                  <th className="px-3 py-3 whitespace-nowrap text-center bg-indigo-50 text-indigo-900 font-bold">المستحق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPayrolls.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-slate-500">لا يوجد موظفين تطابق البحث</td>
                  </tr>
                ) : (
                  filteredPayrolls.map((emp: any) => (
                    <tr key={emp.employeeId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{emp.name}</span>
                          {!emp.isActive && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700">غير نشط</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{formatNumber(emp.monthlySalary)}</td>
                      <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">{formatNumber(emp.hourlyRate)}</td>
                      <td className="px-3 py-3 font-mono text-slate-800 whitespace-nowrap">{emp.achievedHours} س</td>
                      <td className="px-3 py-3 font-mono text-emerald-700 font-bold whitespace-nowrap">+{emp.bonusHours} س</td>
                      <td className="px-3 py-3 font-mono text-red-700 font-bold whitespace-nowrap">-{emp.deductedHours} س</td>
                      <td className="px-3 py-3 font-mono font-bold text-indigo-700 whitespace-nowrap">{emp.finalHours} س</td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{formatNumber(emp.hoursValue)}</td>
                      <td className="px-3 py-3 font-mono text-emerald-700 whitespace-nowrap">+{formatNumber(emp.employeeCommission)}</td>
                      <td className="px-3 py-3 font-mono text-amber-800 whitespace-nowrap">-{formatNumber(emp.totalAdvances)}</td>
                      <td className="px-3 py-3 font-mono text-emerald-800 whitespace-nowrap">-{formatNumber(emp.totalSalaryPaid)}</td>
                      <td className={`px-3 py-3 font-mono font-bold text-center text-sm whitespace-nowrap ${
                        emp.netAccountDue >= 0 ? 'bg-emerald-50 text-emerald-900 border-l border-r border-emerald-200' : 'bg-red-50 text-red-900 border-l border-r border-red-200'
                      }`}>
                        {emp.netAccountDue >= 0 ? `+${formatNumber(emp.netAccountDue)}` : formatNumber(emp.netAccountDue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
