'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Receipt, Search, Filter, Calendar, RefreshCw, ChevronLeft, ChevronRight,
  User, X, ArrowRight, Trash2, Edit3, DollarSign, Wallet
} from 'lucide-react';
import { getActiveUsers, formatNumberLocale } from '@/lib/user-utils';

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

  // Dynamic Months & Days State
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [treeData, setTreeData] = useState<any>(null);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  const fetchTreeData = () => {
    fetch('/api/expenses/tree')
      .then(res => res.json())
      .then(data => setTreeData(data))
      .catch(console.error);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} من المعاملات المحددة؟`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?id=${selectedIds.join(',')}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchExpenses();
        fetchTreeData();
      } else {
        const data = await res.json();
        alert(data.error || 'فشل حذف المعاملات');
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء الحذف');
    } finally {
      setLoading(false);
    }
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editMainType, setEditMainType] = useState('مصروفات');
  const [editExpenseType, setEditExpenseType] = useState('نقدي');
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setCurrentUser(data.user))
      .catch(() => { });

    fetch('/api/users')
      .then(r => r.json())
      .then(d => setUsersList(getActiveUsers(d.users || [])))
      .catch(console.error);

    fetchTreeData();
  }, []);

  useEffect(() => {
    fetch(`/api/expenses/months?mainType=${encodeURIComponent(mainTypeFilter)}&employeeId=${filterEmployeeId}`)
      .then(r => r.json())
      .then(d => {
        setAvailableMonths(d.months || []);
        setSelectedMonth('');
        setAvailableDays([]);
        setSelectedDay('');
      })
      .catch(console.error);
  }, [mainTypeFilter, filterEmployeeId]);

  useEffect(() => {
    if (!selectedMonth) {
      setAvailableDays([]);
      setSelectedDay('');
      return;
    }
    fetch(`/api/expenses/days?mainType=${encodeURIComponent(mainTypeFilter)}&month=${encodeURIComponent(selectedMonth)}&employeeId=${filterEmployeeId}`)
      .then(r => r.json())
      .then(d => setAvailableDays(d.days || []))
      .catch(console.error);
  }, [selectedMonth, mainTypeFilter, filterEmployeeId]);

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

  const toggleMonth = (m: string) => {
    setExpandedMonths(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const toggleDay = (d: string) => {
    setExpandedDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  const handleSelectAllNode = () => {
    setMainTypeFilter('');
    setStartDate('');
    setEndDate('');
    setSelectedMonth('');
    setSelectedDay('');
  };

  const handleSelectMonth = (m: string) => {
    setSelectedMonth(m);
    setSelectedDay('');
    const parts = m.split(' ');
    if (parts.length === 2) {
      const yyyy = parseInt(parts[0]);
      const mm = parseInt(parts[1]);
      const start = new Date(yyyy, mm - 1, 1).toISOString().split('T')[0];
      const end = new Date(yyyy, mm, 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleSelectDay = (dStr: string, monthName: string) => {
    setSelectedMonth(monthName);
    setSelectedDay(dStr);
    const parts = dStr.split('/');
    if (parts.length === 3) {
      const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      setStartDate(formatted);
      setEndDate(formatted);
    }
  };

  const handleSelectCategory = (cat: string, dStr: string, monthName: string) => {
    setSelectedMonth(monthName);
    setSelectedDay(dStr);
    setMainTypeFilter(cat);
    const parts = dStr.split('/');
    if (parts.length === 3) {
      const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      setStartDate(formatted);
      setEndDate(formatted);
    }
  };

  const resetFilters = () => {
    setMainTypeFilter('');
    setStartDate('');
    setEndDate('');
    setFilterEmployeeId('');
    setSelectedMonth('');
    setSelectedDay('');
    setIsFilterOpen(false);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditMainType(item.main_type || 'مصروفات');
    setEditExpenseType(item.expense_type || 'نقدي');
    setEditAmount((item.amount || 0).toString());
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setEditSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          mainType: editMainType,
          expenseType: editExpenseType,
          amount: parseFloat(editAmount),
          notes: editNotes
        })
      });

      if (res.ok) {
        setEditingItem(null);
        fetchExpenses(pagination.page);
        fetchTreeData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEditSubmitting(false);
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
              <Receipt className="w-6 h-6 text-rose-600" />
              <span>سجل المصروفات</span>
            </h1>
          </div>
        </div>

        {/* Category & Date Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالتصنيف، الملاحظات..."
              className="pl-4 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 w-48"
            />
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${hasActiveFilters
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

      {/* Main Container: Collapsible Tree Sidebar + Table */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Hierarchical Sidebar Tree View (AppSheet Style - Narrower & Collapsible) */}
        <div className={`w-full ${isTreeCollapsed ? 'lg:w-16' : 'lg:w-64 xl:w-72'} shrink-0 glass-panel p-4 rounded-3xl border border-slate-200 bg-white space-y-3 h-fit transition-all duration-300`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
            {!isTreeCollapsed && (
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-rose-600" />
                <span>شجرة التصفية</span>
              </h3>
            )}
            <div className="flex items-center gap-1.5 mr-auto">
              {!isTreeCollapsed && (
                <button
                  onClick={handleSelectAllNode}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-bold"
                >
                  إعادة تعيين
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsTreeCollapsed(!isTreeCollapsed)}
                className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer border border-slate-200"
                title={isTreeCollapsed ? 'توسيع الشجرة 📂' : 'طي الشجرة 📂'}
              >
                {isTreeCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isTreeCollapsed && (
            <div className="space-y-1 text-slate-800 text-xs max-h-[600px] overflow-y-auto no-scrollbar">
            {/* Grand Total "الكل" node */}
            <div
              onClick={handleSelectAllNode}
              className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                !selectedMonth && !selectedDay && !mainTypeFilter
                  ? 'bg-blue-50 text-blue-700 font-bold shadow-sm'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ChevronLeft className="w-3.5 h-3.5 opacity-40" />
                <span>الكل</span>
              </div>
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                {formatNumberLocale(treeData?.totalSum || 0)}
              </span>
            </div>

            {/* Months level */}
            <div className="mr-2 border-r border-slate-100 pr-1.5 space-y-1">
              {treeData?.months?.map((m: any) => {
                const isMonthExpanded = expandedMonths.includes(m.month);
                const isMonthSelected = selectedMonth === m.month && !selectedDay;

                return (
                  <div key={m.month} className="space-y-1">
                    {/* Month header */}
                    <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-1 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMonth(m.month);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500"
                        >
                          <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${isMonthExpanded ? '-rotate-90' : ''}`} />
                        </button>
                        <span
                          onClick={() => handleSelectMonth(m.month)}
                          className={`cursor-pointer truncate ${isMonthSelected ? 'text-blue-700 font-bold' : ''}`}
                        >
                          {m.month}
                        </span>
                      </div>
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        {formatNumberLocale(m.totalSum)}
                      </span>
                    </div>

                    {/* Days level */}
                    {isMonthExpanded && (
                      <div className="mr-3 border-r border-slate-100 pr-1.5 space-y-1">
                        {m.days?.map((d: any) => {
                          const isDayExpanded = expandedDays.includes(d.day);
                          const isDaySelected = selectedDay === d.day && !mainTypeFilter;

                          return (
                            <div key={d.day} className="space-y-1">
                              {/* Day header */}
                              <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-1 min-w-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleDay(d.day);
                                    }}
                                    className="p-0.5 hover:bg-slate-100 rounded text-slate-500"
                                  >
                                    <ChevronLeft className={`w-3 h-3 transition-transform duration-200 ${isDayExpanded ? '-rotate-90' : ''}`} />
                                  </button>
                                  <span
                                    onClick={() => handleSelectDay(d.day, m.month)}
                                    className={`cursor-pointer truncate ${isDaySelected ? 'text-blue-700 font-bold' : ''}`}
                                  >
                                    {d.day}
                                  </span>
                                </div>
                                <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1 py-0.5 rounded">
                                  {formatNumberLocale(d.totalSum)}
                                </span>
                              </div>

                              {/* Categories level */}
                              {isDayExpanded && (
                                <div className="mr-3 border-r border-slate-100 pr-1.5 space-y-1">
                                  {d.categories?.map((c: any) => {
                                    const isCatSelected = selectedDay === d.day && mainTypeFilter === c.category;

                                    return (
                                      <div
                                        key={c.category}
                                        onClick={() => handleSelectCategory(c.category, d.day, m.month)}
                                        className={`flex items-center justify-between p-1 rounded-md cursor-pointer hover:bg-blue-50/50 transition-colors ${
                                          isCatSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                          <span>{c.category}</span>
                                        </div>
                                        <span className="text-[9px] text-slate-500 font-mono">
                                          {formatNumberLocale(c.totalSum)}
                                        </span>
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
                );
              })}
            </div>
          </div>
        )}
      </div>

        {/* Table & Pagination (Flex-1) */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && currentUser?.role === 'manager' && (
            <div className="flex items-center justify-between bg-rose-50 border border-rose-200 p-4 rounded-3xl animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="text-xs font-bold text-rose-955">
                تم تحديد {selectedIds.length} معاملة للمصروفات
              </span>
              <button
                onClick={handleBulkDelete}
                className="py-2 px-5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition-all hover:scale-[1.02]"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف المحدد جماعياً</span>
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm text-slate-700 table-auto">
                <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
                  <tr>
                    {currentUser?.role === 'manager' && (
                      <th className="px-4 py-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={expenses.length > 0 && selectedIds.length === expenses.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(expenses.map(exp => exp.id));
                            } else {
                              setSelectedIds([]);
                            }
                          }}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 whitespace-nowrap">التصنيف الرئيسي</th>
                    <th className="px-4 py-3 whitespace-nowrap">طريقة الصرف</th>
                    <th className="px-4 py-3 whitespace-nowrap">المبلغ</th>
                    <th className="px-4 py-3 whitespace-nowrap">الشهر</th>
                    <th className="px-4 py-3 whitespace-nowrap">الموظف المعني</th>
                    <th className="px-4 py-3 whitespace-nowrap">ملاحظات</th>
                    <th className="px-4 py-3 whitespace-nowrap">التاريخ والوقت</th>
                    {currentUser?.role === 'manager' && <th className="px-4 py-3 whitespace-nowrap text-center">إجراءات المدير</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={currentUser?.role === 'manager' ? 9 : 8} className="text-center py-12 text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                        <span>جاري تحميل سجل المصروفات...</span>
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={currentUser?.role === 'manager' ? 9 : 8} className="text-center py-12 text-slate-500">
                        لا توجد مصروفات مسجلة تطابق التصفية
                      </td>
                    </tr>
                  ) : (
                    expenses.map((item) => (
                      <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(item.id) ? 'bg-rose-50/45' : ''}`}>
                        {currentUser?.role === 'manager' && (
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(prev => [...prev, item.id]);
                                } else {
                                  setSelectedIds(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${item.main_type === 'سلفة' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            item.main_type === 'قبض' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              item.main_type === 'مسحوبات' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                                'bg-red-100 text-red-800 border border-red-300'
                            }`}>
                            {item.main_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.expense_type || 'نقدي'}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 text-base whitespace-nowrap">
                          {formatNumberLocale(Number(item.amount), 'en-US')}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-800 font-mono whitespace-nowrap">{item.month || item.transaction_month || '-'}</td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-800 whitespace-nowrap">{item.employee_name || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.notes || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-mono whitespace-nowrap">
                          {item.timestamp ? new Date(item.timestamp).toLocaleString('en-US') : '-'}
                        </td>
                        {currentUser?.role === 'manager' && (
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg border border-rose-200 transition-colors"
                                title="تعديل المعاملة"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm('هل أنت تأكد من رغبتك في حذف هذا المصروف؟')) return;
                                  await fetch(`/api/expenses?id=${item.id}`, { method: 'DELETE' });
                                  fetchExpenses(pagination.page);
                                  fetchTreeData();
                                }}
                                className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-200 transition-colors"
                                title="حذف المصروف"
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
        </div>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-rose-600" />
                <span>تعديل القيد المالي</span>
              </h3>
              <button onClick={() => setEditingItem(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف الرئيسي</label>
                <select
                  value={editMainType}
                  onChange={(e) => setEditMainType(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="مصروفات">مصروفات</option>
                  <option value="سلفة">سلفة</option>
                  <option value="قبض">قبض</option>
                  <option value="دعم مالي">دعم مالي</option>
                  <option value="مشتريات">مشتريات</option>
                  <option value="مسحوبات">مسحوبات</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الصرف</label>
                <select
                  value={editExpenseType}
                  onChange={(e) => setEditExpenseType(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="نقدي">نقدي</option>
                  <option value="محفظة">محفظة إلكترونية</option>
                  <option value="خزينة">خزينة رئيسية</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-bold font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="ملاحظات..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md"
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
                  <option value="مسحوبات">مسحوبات 💸</option>
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
