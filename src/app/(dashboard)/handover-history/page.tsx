'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeftRight, Search, Filter, Calendar, RefreshCw, ChevronLeft, ChevronRight, 
  User, X, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, Info, Wallet, Trash2, ThumbsUp
} from 'lucide-react';
import { getActiveUsers, formatNumber } from '@/lib/user-utils';

export default function HandoverHistoryPage() {
  const [handovers, setHandovers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setCurrentUser(data.user))
      .catch(() => {});

    fetch('/api/users')
      .then(r => r.json())
      .then(d => setUsersList(getActiveUsers(d.users || [])))
      .catch(console.error);
  }, []);

  const hasActiveFilters = reviewStatus || startDate || endDate || filterEmployeeId;

  const fetchHandovers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        search,
        reviewStatus,
        startDate,
        endDate,
        employeeId: filterEmployeeId
      });

      const res = await fetch(`/api/handover-history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHandovers(data.handovers || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchHandovers(1), 300);
    return () => clearTimeout(timer);
  }, [search, reviewStatus, startDate, endDate, filterEmployeeId]);

  const resetFilters = () => {
    setReviewStatus('');
    setStartDate('');
    setEndDate('');
    setFilterEmployeeId('');
    setIsFilterOpen(false);
  };

  // Quick Date Helpers for "اليوم" and "أمس"
  const setTodayFilter = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const setYesterdayFilter = () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    setStartDate(yesterday);
    setEndDate(yesterday);
  };

  const handleApproveReview = async (id: string) => {
    try {
      const res = await fetch('/api/custody/handover', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handoverId: id, reviewStatus: 'تم المراجعة بواسطة المدير' })
      });
      if (res.ok) {
        setHandovers((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, review_status: 'تم المراجعة بواسطة المدير' } : item
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>

          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ArrowLeftRight className="w-6 h-6 text-emerald-600" />
              <span>سجل التسليم والتسلم</span>
            </h1>
          </div>
        </div>

        {/* Filters & Quick Date Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Buttons: اليوم and أمس */}
          <button
            onClick={setTodayFilter}
            className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
          >
            اليوم
          </button>
          <button
            onClick={setYesterdayFilter}
            className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
          >
            أمس
          </button>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالعهدة، الموظف..."
              className="pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 w-56"
            />
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              hasActiveFilters
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>تصفية</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-700 table-auto">
            <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">العهدة</th>
                <th className="px-4 py-3 whitespace-nowrap">المسلّم</th>
                <th className="px-4 py-3 whitespace-nowrap">المستلم</th>
                <th className="px-4 py-3 whitespace-nowrap">المتوقع</th>
                <th className="px-4 py-3 whitespace-nowrap">الفعلي</th>
                <th className="px-4 py-3 whitespace-nowrap">الفارق</th>
                <th className="px-4 py-3 whitespace-nowrap">الحالة والتقييم</th>
                <th className="px-4 py-3 whitespace-nowrap">ملاحظات</th>
                <th className="px-4 py-3 whitespace-nowrap">التاريخ</th>
                {currentUser?.role === 'manager' && <th className="px-4 py-3 text-center whitespace-nowrap">إجراءات المدير</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>جاري تحميل سجل التسليم والتسلم...</span>
                  </td>
                </tr>
              ) : handovers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500">
                    لا توجد حركات تسليم مسجلة
                  </td>
                </tr>
              ) : (
                handovers.map((item) => {
                  const exp = Number(item.expected_balance || item.balance_at_time || 0);
                  const act = Number(item.actual_balance || 0);
                  const diff = item.difference !== undefined && item.difference !== null ? Number(item.difference) : act - exp;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                        <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{item.wallet_name || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">{item.sender_name || '-'}</td>
                      <td className="px-4 py-3 text-xs font-bold text-blue-700 whitespace-nowrap">{item.receiver_name || '-'}</td>
                      <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">{formatNumber(exp)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{formatNumber(act)}</span>
                          {/* Item 5: Concise Like 👍 button right next to value for manager review */}
                          {currentUser?.role === 'manager' && item.review_status !== 'تم المراجعة بواسطة المدير' && (
                            <button
                              onClick={() => handleApproveReview(item.id)}
                              className="p-1 hover:bg-emerald-100 rounded-md text-emerald-700 transition-colors cursor-pointer"
                              title="اعتماد المراجعة 👍"
                            >
                              👍
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-3 font-mono font-bold text-xs whitespace-nowrap ${
                        diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-emerald-600'
                      }`}>
                        {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(() => {
                          const status = item.review_status || 'تم المطابقة';
                          let style = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                          let icon = '✅';

                          if (status === 'الرجاء المراجعة') {
                            style = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                            icon = '⌛';
                          } else if (status.includes('عجز')) {
                            style = 'bg-red-100 text-red-800 border-red-300';
                            icon = '⚠️';
                          } else if (status.includes('زيادة')) {
                            style = 'bg-blue-100 text-blue-800 border-blue-300';
                            icon = '📈';
                          } else if (status.includes('بواسطة المدير')) {
                            style = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                            icon = '👍';
                          }

                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${style}`}>
                              <span>{icon}</span>
                              <span>{status}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.discrepancy_reason || '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-mono whitespace-nowrap">
                        {item.created_at ? new Date(item.created_at).toLocaleString('en-US') : '-'}
                      </td>

                      {currentUser?.role === 'manager' && (
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            onClick={async () => {
                              if (!confirm('هل أنت تأكد من رغبتك في حذف حركة التسليم هذه؟')) return;
                              try {
                                const res = await fetch(`/api/custody/handover?id=${item.id}`, { method: 'DELETE' });
                                if (res.ok) {
                                  fetchHandovers(pagination.page);
                                }
                              } catch (e) { console.error(e); }
                            }}
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-200 transition-colors"
                            title="حذف الحركة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <span className="text-xs text-slate-600">
              صفحة {pagination.page} من {pagination.totalPages} (إجمالي {pagination.total})
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchHandovers(pagination.page - 1)}
                className="p-2 border rounded-xl hover:bg-slate-50 disabled:opacity-50 text-xs font-bold flex items-center gap-1"
              >
                <ChevronRight className="w-4 h-4" /> السابق
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchHandovers(pagination.page + 1)}
                className="p-2 border rounded-xl hover:bg-slate-50 disabled:opacity-50 text-xs font-bold flex items-center gap-1"
              >
                التالي <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3 border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">تصفية سجل التسليم والتسلم</h3>
              <button onClick={() => setIsFilterOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الموظف</label>
                <select
                  value={filterEmployeeId}
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                >
                  <option value="">جميع الموظفين</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">من تاريخ</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-colors"
              >
                تطبيق التصفية
              </button>
              <button
                onClick={resetFilters}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
              >
                إعادة ضبط
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
