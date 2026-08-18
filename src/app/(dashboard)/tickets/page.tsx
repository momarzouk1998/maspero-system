'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Train, Search, Filter, Calendar, ChevronRight, ChevronLeft, RefreshCw, X, User, Trash2, Edit3, ArrowRight } from 'lucide-react';
import { getActiveUsers, formatNumberLocale } from '@/lib/user-utils';

export default function TicketsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editCommission, setEditCommission] = useState('');
  const [editItemCount, setEditItemCount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [treeData, setTreeData] = useState<any>(null);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  const fetchTreeData = () => {
    fetch('/api/tickets/tree')
      .then(r => r.json())
      .then(d => setTreeData(d))
      .catch(console.error);
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setCurrentUser(data.user))
      .catch(() => {});

    fetch('/api/users')
      .then(r => r.json())
      .then(d => setUsersList(getActiveUsers(d.users || [])))
      .catch(console.error);

    fetchTreeData();
  }, []);

  const fetchBookings = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        search,
        employeeId: filterEmployeeId,
        startDate: filterStartDate,
        endDate: filterEndDate
      });

      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchBookings(1), 300);
    return () => clearTimeout(timer);
  }, [search, filterEmployeeId, filterStartDate, filterEndDate]);

  const hasActiveFilters = filterEmployeeId || filterStartDate || filterEndDate;

  const resetFilters = () => {
    setFilterEmployeeId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setIsFilterOpen(false);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditPrice(item.ticket_price.toString());
    setEditCommission(item.ticket_commission.toString());
    setEditItemCount(item.item_count.toString());
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setEditSubmitting(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          ticketPrice: parseFloat(editPrice),
          ticketCommission: parseFloat(editCommission),
          itemCount: parseInt(editItemCount),
          notes: editNotes
        })
      });

      if (res.ok) {
        setEditingItem(null);
        fetchBookings(pagination.page);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
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
              <Train className="w-6 h-6 text-purple-600" />
              <span>سجل التذاكر</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالموظف أو الملاحظات..."
              className="pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 w-60"
            />
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              hasActiveFilters
                ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20'
                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>تصفية</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
          </button>
        </div>
      </div>

      {/* Main Container: Collapsible Tree Sidebar + Bookings Table */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Tree Filter Sidebar (AppSheet Style - Narrower & Collapsible) */}
        {treeData && treeData.months && (
          <div className={`w-full ${isTreeCollapsed ? 'lg:w-16' : 'lg:w-64 xl:w-72'} shrink-0 glass-panel p-4 rounded-3xl border border-slate-200 space-y-3 h-fit transition-all duration-300`}>
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 gap-2">
              {!isTreeCollapsed && (
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-purple-600" />
                  <span>شجرة التصفية</span>
                </span>
              )}
              <div className="flex items-center gap-1.5 mr-auto">
                {!isTreeCollapsed && (
                  <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                    {formatNumberLocale(treeData.totalSum, 'en-US')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsTreeCollapsed(!isTreeCollapsed)}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer border border-slate-200"
                  title={isTreeCollapsed ? 'توسيع الشجرة 📂' : 'طي الشجرة 📂'}
                >
                  {isTreeCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isTreeCollapsed && (
              <div className="space-y-2 max-h-[500px] overflow-y-auto text-xs no-scrollbar">
                {/* Top-level "الكل 🌐" Item */}
                <div
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    !filterStartDate && !filterEndDate
                      ? 'bg-purple-600 text-white font-bold border-purple-600 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1">🌐 الكل</span>
                  <span className={`font-mono font-bold text-[11px] ${!filterStartDate && !filterEndDate ? 'text-purple-100' : 'text-purple-700'}`}>
                    {formatNumberLocale(treeData.totalSum, 'en-US')}
                  </span>
                </div>
              {treeData.months.map((m: any) => {
                const isMonthExpanded = expandedMonths.includes(m.month);

                return (
                  <div key={m.month} className="space-y-1">
                    {/* Month Node */}
                    <div
                      onClick={() => {
                        setExpandedMonths(prev =>
                          isMonthExpanded ? prev.filter(x => x !== m.month) : [...prev, m.month]
                        );
                        const [yyyy, mm] = m.month.split(' ');
                        const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
                        setFilterStartDate(`${yyyy}-${String(mm).padStart(2, '0')}-01`);
                        setFilterEndDate(`${yyyy}-${String(mm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 cursor-pointer flex items-center justify-between transition-all"
                    >
                      <span className="font-bold text-slate-800">📅 شهر {m.month}</span>
                      <span className="font-mono font-bold text-purple-700 text-[11px]">{formatNumberLocale(m.totalSum, 'en-US')}</span>
                    </div>

                    {/* Days inside Month */}
                    {isMonthExpanded && m.days && (
                      <div className="pr-3 space-y-1 border-r-2 border-purple-200 mr-2">
                        {m.days.map((d: any) => {
                          const isDayExpanded = expandedDays.includes(d.day);

                          return (
                            <div key={d.day} className="space-y-1">
                              <div
                                onClick={() => {
                                  setExpandedDays(prev =>
                                    isDayExpanded ? prev.filter(x => x !== d.day) : [...prev, d.day]
                                  );
                                  const [dd, mm, yyyy] = d.day.split('/');
                                  setFilterStartDate(`${yyyy}-${mm}-${dd}`);
                                  setFilterEndDate(`${yyyy}-${mm}-${dd}`);
                                }}
                                className="p-1.5 rounded-lg bg-white hover:bg-purple-50 border border-slate-200 text-[11px] cursor-pointer flex items-center justify-between"
                              >
                                <span className="font-bold text-slate-700">📆 {d.day}</span>
                                <span className="font-mono font-bold text-purple-600">{formatNumberLocale(d.totalSum, 'en-US')}</span>
                              </div>

                              {/* Categories inside Day */}
                              {isDayExpanded && d.categories && (
                                <div className="pr-3 space-y-1 border-r-2 border-slate-300 mr-2">
                                  {d.categories.map((c: any) => (
                                    <div
                                      key={c.category}
                                      onClick={() => {
                                        const [dd, mm, yyyy] = d.day.split('/');
                                        setFilterStartDate(`${yyyy}-${mm}-${dd}`);
                                        setFilterEndDate(`${yyyy}-${mm}-${dd}`);
                                      }}
                                      className="p-1 rounded bg-slate-50 hover:bg-purple-100 text-[10px] cursor-pointer flex items-center justify-between text-slate-600"
                                    >
                                      <span>🚆 {c.category}</span>
                                      <span className="font-mono font-bold">{formatNumberLocale(c.totalSum, 'en-US')}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bookings Table Container */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Train className="w-5 h-5 text-purple-600" />
            <span>سجل حجوزات التذاكر</span>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {pagination.total}
            </span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">العدد</th>
                <th className="px-4 py-3">سعر التذكرة</th>
                <th className="px-4 py-3">العمولة</th>
                <th className="px-4 py-3">الإجمالي المحصّل</th>
                <th className="px-4 py-3">الموظف</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">الملاحظات</th>
                {currentUser?.role === 'manager' && <th className="px-4 py-3 text-center">إجراءات المدير</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    <span>جاري تحميل سجل التذاكر...</span>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    لا توجد حجوزات مسجلة تطابق التصفية الحالية
                  </td>
                </tr>
              ) : (
                bookings.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.item_count}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {formatNumberLocale(Number(item.ticket_price), 'en-US')}
                    </td>
                    <td className="px-4 py-3 font-bold text-purple-700 font-mono">
                      {formatNumberLocale(Number(item.ticket_commission), 'en-US')}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700 font-mono">
                      {formatNumberLocale(Number(item.amount), 'en-US')}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {item.employee_name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                      {new Date(item.timestamp || item.date).toLocaleDateString('en-US')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">
                      {item.notes || '-'}
                    </td>
                    {currentUser?.role === 'manager' && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg border border-purple-200 transition-colors"
                            title="تعديل الحجز"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('هل أنت تأكد من رغبتك في حذف هذا الحجز؟')) return;
                              await fetch(`/api/tickets?id=${item.id}`, { method: 'DELETE' });
                              fetchBookings(pagination.page);
                            }}
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-200 transition-colors"
                            title="حذف الحجز"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
                onClick={() => fetchBookings(pagination.page - 1)}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl disabled:opacity-40 border border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchBookings(pagination.page + 1)}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl disabled:opacity-40 border border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Manager Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-600" />
                <span>تعديل حجز التذكرة</span>
              </h3>
              <button onClick={() => setEditingItem(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سعر التذكرة</label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-bold font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العمولة</label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={editCommission}
                    onChange={(e) => setEditCommission(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-purple-700 text-sm font-bold font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عدد التذاكر / العناصر</label>
                <input
                  type="number"
                  required
                  value={editItemCount}
                  onChange={(e) => setEditItemCount(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-bold font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الحجز</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="ملاحظات..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Filter className="w-5 h-5 text-purple-600" />
                <span>خيارات التصفية</span>
              </h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {usersList.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">الموظف</label>
                  <select
                    value={filterEmployeeId}
                    onChange={(e) => setFilterEmployeeId(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-500"
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
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">إلى تاريخ</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => { fetchBookings(1); setIsFilterOpen(false); }}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md"
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
