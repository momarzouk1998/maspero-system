'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Printer, Train, Cpu, Receipt, 
  ArrowLeftRight, Filter, Search, Calendar, RefreshCw, CheckCircle2, AlertTriangle, Info 
} from 'lucide-react';

export default function ManagerReportsPage() {
  const [activeTab, setActiveTab] = useState<'financial' | 'custody'>('financial');
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Custody Reports state
  const [custodyReports, setCustodyReports] = useState<any[]>([]);
  const [custodyPagination, setCustodyPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [custodyLoading, setCustodyLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/reports/financial');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const fetchCustodyReports = async (page = 1) => {
    setCustodyLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        search: searchQuery,
        reviewStatus: reviewFilter,
        startDate,
        endDate
      });

      const res = await fetch(`/api/custody/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustodyReports(data.reports || []);
        setCustodyPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCustodyLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'custody') {
      fetchCustodyReports(1);
    }
  }, [activeTab, reviewFilter, searchQuery, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Title & Tabs */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-400" />
            <span>لوحة التقارير والرقابة</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            متابعة الأرباح الإجمالية وتقارير تسليم وتأكيد الأرصدة والعهدة
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('financial')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'financial' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>التقارير المالية والأرباح</span>
          </button>
          
          <button
            onClick={() => setActiveTab('custody')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'custody' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>تقرير التسليم والتسلم</span>
          </button>
        </div>
      </div>

      {activeTab === 'financial' && (
        <>
          {loading ? (
            <div className="p-12 text-center text-slate-400">جاري تحميل التقارير المالية...</div>
          ) : (
            <div className="space-y-6">
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-400">إجمالي الإيرادات</span>
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-white">
                    {Number(metrics?.totalRevenue || 0).toLocaleString('ar-EG')} <span className="text-sm font-normal text-emerald-400">ج.م</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">خدمات + عمولات التذاكر</p>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-blue-500/30 bg-blue-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-400">إيرادات الطباعة والخدمات</span>
                    <Printer className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-white">
                    {Number(metrics?.serviceValue || 0).toLocaleString('ar-EG')} <span className="text-sm font-normal text-blue-400">ج.م</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">من إجمالي {metrics?.totalServiceEntries} عملية</p>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-purple-500/30 bg-purple-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-400">عمولات التذاكر</span>
                    <Train className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-white">
                    {Number(metrics?.ticketCommission || 0).toLocaleString('ar-EG')} <span className="text-sm font-normal text-purple-400">ج.م</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">من {metrics?.totalTicketBookings} حجز قطار</p>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-rose-500/30 bg-rose-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-rose-400">إجمالي المصروفات والسلف</span>
                    <Receipt className="w-5 h-5 text-rose-400" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-white">
                    {Number(metrics?.expensesValue || 0).toLocaleString('ar-EG')} <span className="text-sm font-normal text-rose-400">ج.م</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">خصم تشغيلي</p>
                </div>
              </div>

              {/* Net Profit Big Banner */}
              <div className="glass-panel p-8 rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 to-slate-900/80 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                    النتيجة المالية النهائية
                  </span>
                  <h2 className="text-xl font-bold text-white mt-2">صافي الربح الإجمالي للمؤسسة</h2>
                  <p className="text-slate-400 text-sm">الإيرادات بعد خصم كافة المصروفات التشغيلية</p>
                </div>
                <div className="text-left">
                  <span className="text-4xl font-black text-emerald-400">
                    {Number(metrics?.netProfit || 0).toLocaleString('ar-EG')} <span className="text-lg font-normal text-white">ج.م</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'custody' && (
        <div className="space-y-6">
          {/* Custody Filter & Search Header */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالعنصر، الموظف، أو سبب الاختلاف..."
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
                className="py-2.5 px-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="">حالة المراجعة: الكل</option>
                <option value="الرجاء المراجعة">الرجاء المراجعة ⚠️</option>
                <option value="تم المطابقة">تم المطابقة ✅</option>
                <option value="عجز طبيعي (رسوم)">عجز طبيعي (رسوم) ℹ️</option>
                <option value="زيادة طبيعية (عمولات)">زيادة طبيعية (عمولات) ℹ️</option>
              </select>
            </div>
          </div>

          {/* Custody Audit Table */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">التاريخ والوقت</th>
                    <th className="px-4 py-3">المحفظة / الماكينة</th>
                    <th className="px-4 py-3">المسالم</th>
                    <th className="px-4 py-3">المستلم</th>
                    <th className="px-4 py-3">الرصيد المتوقع</th>
                    <th className="px-4 py-3">الرصيد الفعلي</th>
                    <th className="px-4 py-3">الفارق</th>
                    <th className="px-4 py-3">سبب الاختلاف</th>
                    <th className="px-4 py-3 text-center">حالة المراجعة الآلية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {custodyLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                        <span>جاري تحميل تقرير التسليم والتسلم...</span>
                      </td>
                    </tr>
                  ) : custodyReports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-500">
                        لا توجد حركات تسليم وتأكيد مسجلة تطابق التصفية الحالية
                      </td>
                    </tr>
                  ) : (
                    custodyReports.map((item) => {
                      const diff = Number(item.difference || 0);

                      let badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                      if (item.review_status === 'الرجاء المراجعة') {
                        badgeStyle = 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse';
                      } else if (item.review_status?.includes('عجز')) {
                        badgeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                      } else if (item.review_status?.includes('زيادة')) {
                        badgeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                            {item.created_at ? new Date(item.created_at).toLocaleString('ar-EG') : '-'}
                          </td>
                          <td className="px-4 py-3 font-bold text-white">{item.wallet_name}</td>
                          <td className="px-4 py-3 text-slate-300">{item.sender_name || 'النظام'}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-400">{item.receiver_name}</td>
                          <td className="px-4 py-3 font-mono text-slate-300">{Number(item.expected_balance || 0).toFixed(2)} ج.م</td>
                          <td className="px-4 py-3 font-mono font-bold text-white">{Number(item.actual_balance || 0).toFixed(2)} ج.م</td>
                          <td className={`px-4 py-3 font-mono font-bold ${diff < 0 ? 'text-red-400' : diff > 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} ج.م
                          </td>
                          <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate" title={item.discrepancy_reason || ''}>
                            {item.discrepancy_reason || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${badgeStyle}`}>
                              {item.review_status || 'تم المطابقة'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
