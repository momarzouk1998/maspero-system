'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Receipt, Search, Filter, Calendar, RefreshCw, ChevronLeft, ChevronRight, 
  User, X, ArrowRight, Trash2, DollarSign, Wallet
} from 'lucide-react';
import { getActiveUsers } from '@/lib/user-utils';

export default function ExpensesHistoryPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [mainTypeFilter, setMainTypeFilter] = useState('');
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

  const hasActiveFilters = mainTypeFilter || startDate || endDate || filterEmployeeId;

  const fetchExpenses = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        search,
        mainType: mainTypeFilter,
        startDate,
        endDate,
        employeeId: filterEmployeeId
      });

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchExpenses(1), 300);
    return () => clearTimeout(timer);
  }, [search, mainTypeFilter, startDate, endDate, filterEmployeeId]);

  const resetFilters = () => {
    setMainTypeFilter('');
    setStartDate('');
    setEndDate('');
    setFilterEmployeeId('');
    setIsFilterOpen(false);
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
              <Receipt className="w-6 h-6 text-rose-600" />
              <span>سجل المصروفات والقيود المالية</span>
            </h1>
            <p className="text-slate-600 text-xs mt-0.5">
              متابعة جميع المصروفات، السلف، المشتريات، الإيرادات، والدعم المالي
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالتصنيف، الموظف، الملاحظات..."
              className="pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 w-64"
            />
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              hasActiveFilters
                ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-500/20'
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
          <table className="w-full text-right text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">التصنيف الرئيسي</th>
                <th className="px-4 py-3">طريقة الصرف</th>
                <th className="px-4 py-3">المبلغ</th>
                <th className="px-4 py-3">الموظف المعني</th>
                <th className="px-4 py-3">ملاحظات</th>
                <th className="px-4 py-3">التاريخ والوقت</th>
                {currentUser?.role === 'manager' && <th className="px-4 py-3 text-center">حذف</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                    <span>جاري تحميل سجل المصروفات...</span>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    لا توجد مصروفات مسجلة تطابق التصفية
                  </td>
                </tr>
              ) : (
                expenses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        item.main_type === 'سلفة' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        item.main_type === 'قبض' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        item.main_type === 'إيرادات' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                        'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        {item.main_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{item.expense_type || 'نقدي'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-base">
                      {Number(item.amount).toLocaleString('ar-EG')} <span className="text-xs text-slate-500 font-normal">ج.م</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800">{item.employee_name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{item.notes || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString('ar-EG') : '-'}
                    </td>
                    {currentUser?.role === 'manager' && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={async () => {
                            if (!confirm('هل أنت تأكد من رغبتك في حذف هذا المصروف؟')) return;
                            await fetch(`/api/expenses?id=${item.id}`, { method: 'DELETE' });
                            fetchExpenses(pagination.page);
                          }}
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-200 transition-colors"
                          title="حذف المصروف"
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
                onClick={() => fetchExpenses(pagination.page - 1)}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl disabled:opacity-40 border border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchExpenses(pagination.page + 1)}
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
                <Filter className="w-5 h-5 text-rose-600" />
                <span>خيارات التصفية</span>
              </h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-1 text-slate-500 hover:text-slate-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">التصنيف الرئيسي</label>
                <select
                  value={mainTypeFilter}
                  onChange={(e) => setMainTypeFilter(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500"
                >
                  <option value="">جميع التصنيفات</option>
                  <option value="مصروفات">مصروفات 📉</option>
                  <option value="سلفة">سلفة 💰</option>
                  <option value="قبض">قبض 💵</option>
                  <option value="دعم مالي">دعم مالي 💸</option>
                  <option value="مشتريات">مشتريات 🛒</option>
                  <option value="إيرادات">إيرادات 📈</option>
                </select>
              </div>

              {usersList.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">الموظف المعني</label>
                  <select
                    value={filterEmployeeId}
                    onChange={(e) => setFilterEmployeeId(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500"
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
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">إلى تاريخ</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => { fetchExpenses(1); setIsFilterOpen(false); }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md"
              >
                تطبيق التصفية
              </button>
              <button
                onClick={resetFilters}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
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
