'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Zap, Search, Filter, Calendar, RefreshCw, ChevronLeft, ChevronRight, 
  ArrowDownLeft, ArrowUpRight, Wallet, User, X, Trash2, Edit3, ArrowRight
} from 'lucide-react';
import { getActiveUsers, formatNumber } from '@/lib/user-utils';

export default function ChargeHistoryPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [search, setSearch] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterWalletName, setFilterWalletName] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [walletsList, setWalletsList] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'type' | 'date'>('type');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCommission, setEditCommission] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editKomandaProvider, setEditKomandaProvider] = useState<'011' | '010' | 'انستا' | ''>('');
  const [editFawryType, setEditFawryType] = useState<'عادية' | 'مشتريات' | ''>('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [treeData, setTreeData] = useState<any>(null);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  const isManager = currentUser?.role === 'manager';
  let userPerms = currentUser?.permissions;
  if (typeof userPerms === 'string') {
    try { userPerms = JSON.parse(userPerms); } catch { userPerms = {}; }
  }
  const canUpdate = isManager || Boolean(userPerms?.charge_history?.update);
  const canDelete = isManager || Boolean(userPerms?.charge_history?.delete);

  const fetchTreeData = () => {
    fetch('/api/charge-history/tree')
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

  const hasActiveFilters = transactionType || startDate || endDate || filterWalletName || filterEmployeeId;

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        search,
        transactionType,
        startDate,
        endDate,
        walletName: filterWalletName,
        employeeId: filterEmployeeId,
        sortBy
      });

      const res = await fetch(`/api/charge-history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });

        // Extract unique wallet names for filter dropdown
        const uniqueWallets = Array.from(new Set((data.transactions || []).map((t: any) => t.wallet_name))).filter(Boolean) as string[];
        setWalletsList(prev => Array.from(new Set([...prev, ...uniqueWallets])));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchTransactions(1), 300);
    return () => clearTimeout(timer);
  }, [search, transactionType, startDate, endDate, filterWalletName, filterEmployeeId, sortBy]);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`هل أنت تأكد من حذف ${selectedIds.length} عملية شحن محددة؟`)) return;
    try {
      await Promise.all(
        selectedIds.map(id =>
          fetch('/api/invoice/item', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, type: 'wallet' })
          })
        )
      );
      setSelectedIds([]);
      fetchTransactions(pagination.page);
    } catch (e: any) {
      alert(e.message || 'حدث خطأ أثناء الحذف الجماعي');
    }
  };

  const resetFilters = () => {
    setTransactionType('');
    setStartDate('');
    setEndDate('');
    setFilterWalletName('');
    setFilterEmployeeId('');
    setIsFilterOpen(false);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditAmount(item.amount.toString());
    setEditCommission((item.wallet_commission || 0).toString());
    setEditDescription(item.description || '');
    setEditKomandaProvider(item.comanda_type || (item.wallet_name?.includes('كوماندا') ? (item.description?.includes('انستا') ? 'انستا' : item.description?.includes('010') ? '010' : '011') : ''));
    setEditFawryType(item.fawry_type || (item.wallet_name?.includes('فوري') ? (item.description?.includes('مشتريات') ? 'مشتريات' : 'عادية') : ''));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setEditSubmitting(true);
    try {
      const res = await fetch('/api/invoice/item', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          type: 'wallet',
          newAmount: parseFloat(editAmount || '0'),
          newCommission: parseFloat(editCommission || '0'),
          newKomandaProvider: editKomandaProvider || undefined,
          newFawryType: editFawryType || undefined,
          newNotes: editDescription
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تعديل العملية');

      setEditingItem(null);
      fetchTransactions(pagination.page);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel px-4 py-3.5 rounded-2xl border border-slate-200 space-y-2.5">
        {/* Row 1: back + title */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all shadow-sm shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">الرئيسية</span>
          </Link>

          <h1 className="text-base md:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 md:w-6 md:h-6 text-amber-600 shrink-0" />
            <span>سجل عمليات الشحن</span>
          </h1>
        </div>

        {/* Row 2: search + sort toggle + filter — wraps on very small screens */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالماكينة، الموظف..."
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </div>

          {/* Sort toggle — icon-only on mobile */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setSortBy('type')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${sortBy === 'type' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600'}`}
              title="حسب النوع (إيداع/سحب)"
            >
              <span className="hidden sm:inline">🏷️ النوع</span>
              <span className="sm:hidden">🏷️</span>
            </button>
            <button
              type="button"
              onClick={() => setSortBy('date')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${sortBy === 'date' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600'}`}
              title="حسب التاريخ"
            >
              <span className="hidden sm:inline">📅 التاريخ</span>
              <span className="sm:hidden">📅</span>
            </button>
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className={`py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all shrink-0 active:scale-95 ${hasActiveFilters ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'}`}
          >
            <Filter className="w-4 h-4" />
            <span>تصفية</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
          </button>
        </div>
      </div>

      {/* Main Container: Collapsible Tree Sidebar + Transactions Table */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Tree Filter Sidebar (AppSheet Style - Narrower & Collapsible) */}
        {treeData && treeData.months && (
          <div className={`w-full ${isTreeCollapsed ? 'lg:w-16' : 'lg:w-64 xl:w-72'} shrink-0 glass-panel p-4 rounded-3xl border border-slate-200 space-y-3 h-fit transition-all duration-300`}>
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 gap-2">
              {!isTreeCollapsed && (
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-amber-600" />
                  <span>شجرة التصفية</span>
                </span>
              )}
              <div className="flex items-center gap-1.5 mr-auto">
                {!isTreeCollapsed && (
                  <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                    {formatNumber(treeData.totalSum)}
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
                    setStartDate('');
                    setEndDate('');
                    setTransactionType('');
                  }}
                  className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    !startDate && !endDate && !transactionType
                      ? 'bg-amber-600 text-white font-bold border-amber-600 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1">🌐 الكل</span>
                  <span className={`font-mono font-bold text-[11px] ${!startDate && !endDate && !transactionType ? 'text-amber-100' : 'text-amber-700'}`}>
                    {formatNumber(treeData.totalSum)}
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
                        // Filter by month
                        const [yyyy, mm] = m.month.split(' ');
                        const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
                        setStartDate(`${yyyy}-${String(mm).padStart(2, '0')}-01`);
                        setEndDate(`${yyyy}-${String(mm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 cursor-pointer flex items-center justify-between transition-all"
                    >
                      <span className="font-bold text-slate-800">📅 شهر {m.month}</span>
                      <span className="font-mono font-bold text-amber-700 text-[11px]">{formatNumber(m.totalSum)}</span>
                    </div>

                    {/* Days inside Month */}
                    {isMonthExpanded && m.days && (
                      <div className="pr-3 space-y-1 border-r-2 border-amber-200 mr-2">
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
                                  setStartDate(`${yyyy}-${mm}-${dd}`);
                                  setEndDate(`${yyyy}-${mm}-${dd}`);
                                }}
                                className="p-1.5 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 text-[11px] cursor-pointer flex items-center justify-between"
                              >
                                <span className="font-bold text-slate-700">📆 {d.day}</span>
                                <span className="font-mono font-bold text-amber-600">{formatNumber(d.totalSum)}</span>
                              </div>

                              {/* Categories inside Day */}
                              {isDayExpanded && d.categories && (
                                <div className="pr-3 space-y-1 border-r-2 border-slate-300 mr-2">
                                  {d.categories.map((c: any) => (
                                    <div
                                      key={c.category}
                                      onClick={() => {
                                        setTransactionType(c.category);
                                        const [dd, mm, yyyy] = d.day.split('/');
                                        setStartDate(`${yyyy}-${mm}-${dd}`);
                                        setEndDate(`${yyyy}-${mm}-${dd}`);
                                      }}
                                      className="p-1 rounded bg-slate-50 hover:bg-amber-100 text-[10px] cursor-pointer flex items-center justify-between text-slate-600"
                                    >
                                      <span>⚡ {c.category}</span>
                                      <span className="font-mono font-bold">{formatNumber(c.totalSum)}</span>
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

      {/* Transactions Table Container */}
      <div className="flex-1 space-y-4 min-w-0">
        {selectedIds.length > 0 && canDelete && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between animate-in fade-in duration-200">
            <span className="text-xs font-bold text-amber-900">
              تم تحديد ({selectedIds.length}) عملية شحن
            </span>
            <button
              onClick={handleBulkDelete}
              className="py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف المحدد</span>
            </button>
          </div>
        )}

        <div className="overflow-x-auto pb-3">
          <table className="w-full text-right text-sm text-slate-700 table-auto min-w-[800px]">
            <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center whitespace-nowrap w-10">
                  <input
                    type="checkbox"
                    checked={transactions.length > 0 && selectedIds.length === transactions.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(transactions.map(t => t.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 whitespace-nowrap">العهدة</th>
                <th className="px-4 py-3 whitespace-nowrap">النوع</th>
                <th className="px-4 py-3 whitespace-nowrap">المبلغ</th>
                <th className="px-4 py-3 whitespace-nowrap">العمولة</th>
                <th className="px-4 py-3 whitespace-nowrap">الاجمالى</th>
                <th className="px-4 py-3 whitespace-nowrap">الموظف</th>
                <th className="px-4 py-3 whitespace-nowrap">التاريخ</th>
                {(canUpdate || canDelete) && <th className="px-4 py-3 whitespace-nowrap text-center">الاجراءات</th>}
                <th className="px-4 py-3 whitespace-nowrap">الملاحظات</th>
                <th className="px-4 py-3 whitespace-nowrap">كود الفاتورة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    <span>جاري تحميل سجل عمليات الشحن...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-500">
                    لا توجد عمليات شحن مسجلة تطابق التصفية
                  </td>
                </tr>
              ) : (
                transactions.map((item) => {
                  const amt = Number(item.amount || 0);
                  const comm = Number(item.wallet_commission || 0);
                  const totalCollected = item.transaction_type === 'إيداع' ? amt + comm : amt - comm;

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(item.id) ? 'bg-amber-50/50' : ''}`}>
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
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2 whitespace-nowrap">
                        <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{item.wallet_name || '-'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          item.transaction_type === 'إيداع'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {item.transaction_type === 'إيداع' ? (
                            <ArrowDownLeft className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          <span>{item.transaction_type}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{formatNumber(amt)}</td>
                      <td className="px-4 py-3 font-mono text-amber-700 whitespace-nowrap">{formatNumber(comm)}</td>
                      <td className="px-4 py-3 font-mono font-extrabold text-emerald-700 whitespace-nowrap">{formatNumber(totalCollected)}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          {item.employee_name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString('en-US') : '-'}
                      </td>
                      {(canUpdate || canDelete) && (
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {canUpdate && (
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg border border-amber-200 transition-colors"
                                title="تعديل العملية"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={async () => {
                                  if (!confirm('هل أنت تأكد من رغبتك في حذف هذه العملية؟')) return;
                                  try {
                                    const res = await fetch(`/api/invoice/item`, {
                                      method: 'DELETE',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: item.id, type: 'wallet' })
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.error || 'فشل الحذف');
                                    fetchTransactions(pagination.page);
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }}
                                className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-200 transition-colors"
                                title="حذف العملية"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.description || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-blue-600 whitespace-nowrap">{item.invoice_code || '-'}</td>
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
                onClick={() => fetchTransactions(pagination.page - 1)}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl disabled:opacity-40 border border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchTransactions(pagination.page + 1)}
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
                <Edit3 className="w-5 h-5 text-amber-600" />
                <span>تعديل عملية الشحن</span>
              </h3>
              <button onClick={() => setEditingItem(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المحفظة / الماكينة</label>
                <input
                  type="text"
                  disabled
                  value={editingItem.wallet_name}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold"
                />
              </div>

              {/* اختيار مزود الخدمة لعمليات شحن الكوماندا */}
              {(editingItem.wallet_name?.includes('كوماندا') || editKomandaProvider) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">مزود خدمة الكوماندا *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['011', '010', 'انستا'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditKomandaProvider(p)}
                        className={`py-2 rounded-xl font-bold text-xs border-2 transition-all cursor-pointer ${
                          editKomandaProvider === p
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* اختيار نوع المعاملة لعمليات سحب فوري */}
              {(editingItem.wallet_name?.includes('فوري') || editFawryType) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع المعاملة *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['عادية', 'مشتريات'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditFawryType(t)}
                        className={`py-2 rounded-xl font-bold text-xs border-2 transition-all cursor-pointer ${
                          editFawryType === t
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ الأساسي</label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-bold font-mono focus:outline-none focus:border-amber-500"
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
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-amber-700 text-sm font-bold font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات / وصف العملية</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="ملاحظات..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md"
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
                <Filter className="w-5 h-5 text-amber-600" />
                <span>خيارات التصفية</span>
              </h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-1 text-slate-600 hover:text-slate-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">نوع العملية</label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="">جميع العمليات</option>
                  <option value="إيداع">إيداع (شحن/تحويل)</option>
                  <option value="سحب">سحب (استلام نقدية)</option>
                </select>
              </div>

              {walletsList.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">المحفظة / الماكينة</label>
                  <select
                    value={filterWalletName}
                    onChange={(e) => setFilterWalletName(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="">جميع المحافظ والماكينات</option>
                    {walletsList.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              )}

              {usersList.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">الموظف</label>
                  <select
                    value={filterEmployeeId}
                    onChange={(e) => setFilterEmployeeId(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500"
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
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">إلى تاريخ</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => { fetchTransactions(1); setIsFilterOpen(false); }}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md"
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
