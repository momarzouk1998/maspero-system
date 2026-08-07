'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Search, Filter, Calendar, User, X, RefreshCw, ChevronLeft, ChevronRight, ArrowRight, Trash2 } from 'lucide-react';
import { getActiveUsers } from '@/lib/user-utils';

export default function ShiftsHistoryPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filter popup modal state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setCurrentUser(data.user))
      .catch(() => {});
  }, []);

  const fetchShifts = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        shiftType: filterType,
        startDate: filterStartDate,
        endDate: filterEndDate,
        employeeId: filterEmployeeId
      });

      const res = await fetch(`/api/shifts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts(1);
    fetch('/api/users')
      .then(r => r.json())
      .then(d => setUsersList(getActiveUsers(d.users || [])))
      .catch(console.error);
  }, [search, filterType, filterStartDate, filterEndDate, filterEmployeeId]);

  const handleDeleteShift = async (id: string) => {
    if (!confirm('هل أنت تأكد من رغبتك في حذف هذا الشفت؟')) return;
    try {
      const res = await fetch(`/api/shifts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchShifts(pagination.page);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetFilters = () => {
    setFilterType('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterEmployeeId('');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
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
              <Clock className="w-6 h-6 text-cyan-600" />
              <span>سجل الشفتات</span>
            </h1>
            <p className="text-slate-600 text-xs mt-0.5">
              سجل شامل لمتابعة جميع شفتات العمل وساعات الدوام
            </p>
          </div>
        </div>

        {/* Search & Filter Trigger */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الملاحظات..."
              className="pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 w-60"
            />
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              filterType || filterStartDate || filterEndDate || filterEmployeeId
                ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-500/20'
                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>تصفية</span>
            {(filterType || filterStartDate || filterEndDate || filterEmployeeId) && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">الموظف</th>
                <th className="px-4 py-3">نوع الشفت</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">وقت البداية</th>
                <th className="px-4 py-3">وقت النهاية</th>
                <th className="px-4 py-3">إجمالي الساعات</th>
                <th className="px-4 py-3">ملاحظات</th>
                {currentUser?.role === 'manager' && <th className="px-4 py-3 text-center">حذف</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-600" />
                    <span>جاري تحميل سجل الشفتات...</span>
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    لا توجد شفتات مسجلة تطابق التصفية الحالية
                  </td>
                </tr>
              ) : (
                shifts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.employee_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        item.shift_type === 'صباحي' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-cyan-100 text-cyan-700 border border-cyan-200'
                      }`}>
                        {item.shift_type || 'صباحي'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 font-mono">
                      {item.start_time ? new Date(item.start_time).toLocaleDateString('ar-EG') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {item.start_time ? new Date(item.start_time).toLocaleTimeString('ar-EG') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {item.end_time ? new Date(item.end_time).toLocaleTimeString('ar-EG') : (
                        <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">نشط الآن</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 font-mono">
                      {Number(item.total_hours || 0).toFixed(2)} ساعة
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{item.shift_note || '-'}</td>
                    {currentUser?.role === 'manager' && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteShift(item.id)}
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors border border-red-200"
                          title="حذف الشفت"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
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
                onClick={() => fetchShifts(pagination.page - 1)}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl disabled:opacity-40 border border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchShifts(pagination.page + 1)}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl disabled:opacity-40 border border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Filter className="w-5 h-5 text-cyan-600" />
                <span>خيارات التصفية</span>
              </h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-1 text-slate-500 hover:text-slate-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">نوع الشفت</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                >
                  <option value="">جميع الشفتات</option>
                  <option value="صباحي">صباحي</option>
                  <option value="مسائي">مسائي</option>
                </select>
              </div>

              {usersList.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">الموظف</label>
                  <select
                    value={filterEmployeeId}
                    onChange={(e) => setFilterEmployeeId(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  >
                    <option value="">جميع الموظفين</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">من تاريخ</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">إلى تاريخ</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => { fetchShifts(1); setIsFilterOpen(false); }}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl"
              >
                تطبيق التصفية
              </button>
              <button
                onClick={resetFilters}
                className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl"
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
