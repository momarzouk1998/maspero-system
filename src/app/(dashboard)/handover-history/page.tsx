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
  const [filterSenderId, setFilterSenderId] = useState('');
  const [filterReceiverId, setFilterReceiverId] = useState('');
  const [filterWalletName, setFilterWalletName] = useState('');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);

  const [treeData, setTreeData] = useState<any>(null);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const fetchTreeData = () => {
    fetch('/api/handover-history/tree')
      .then(r => r.json())
      .then(d => setTreeData(d))
      .catch(console.error);
  };

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

  const hasActiveFilters = reviewStatus || startDate || endDate || filterEmployeeId || filterSenderId || filterReceiverId || filterWalletName;

  const fetchHandovers = async (page = 1) => {
    setLoading(true);
    try {
      const isNeedsReview = reviewStatus === 'NEEDS_REVIEW' || reviewStatus === 'الرجاء المراجعة';
      const params = new URLSearchParams({
        page: page.toString(),
        limit: isNeedsReview ? '1000' : '25',
        search,
        reviewStatus,
        startDate,
        endDate,
        employeeId: filterEmployeeId,
        senderId: filterSenderId,
        receiverId: filterReceiverId,
        walletName: filterWalletName
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
  }, [search, reviewStatus, startDate, endDate, filterEmployeeId, filterSenderId, filterReceiverId, filterWalletName]);

  const resetFilters = () => {
    setReviewStatus('');
    setStartDate('');
    setEndDate('');
    setFilterEmployeeId('');
    setFilterSenderId('');
    setFilterReceiverId('');
    setFilterWalletName('');
    setIsFilterOpen(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === handovers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(handovers.map(h => h.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBatchReview = async () => {
    if (selectedIds.length === 0) return;
    setBatchLoading(true);
    try {
      const res = await fetch('/api/handover-history', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, review_status: 'تم المراجعة بواسطة المدير' })
      });
      if (res.ok) {
        setHandovers(prev =>
          prev.map(item =>
            selectedIds.includes(item.id)
              ? { ...item, review_status: 'تم المراجعة بواسطة المدير' }
              : item
          )
        );
        setSelectedIds([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`هل أنت تأكد من حذف ${selectedIds.length} عنصر محدد؟`)) return;
    setBatchLoading(true);
    try {
      const res = await fetch('/api/handover-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setHandovers(prev => prev.filter(item => !selectedIds.includes(item.id)));
        setSelectedIds([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBatchLoading(false);
    }
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

        {/* Filters & Quick Needs Review Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Manager Quick "Needs Review ⚠️" Button */}
          {currentUser?.role === 'manager' && (
            <button
              onClick={() => {
                if (reviewStatus === 'NEEDS_REVIEW') {
                  setReviewStatus('');
                } else {
                  setReviewStatus('NEEDS_REVIEW');
                  setStartDate('');
                  setEndDate('');
                }
              }}
              className={`py-2.5 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                reviewStatus === 'NEEDS_REVIEW'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>يحتاج مراجعة ⚠️</span>
            </button>
          )}

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
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${hasActiveFilters
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

      {/* Main Container: Collapsible Tree Sidebar + Table */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Tree Filter Sidebar (Narrower & Collapsible) */}
        {treeData && treeData.months && (
          <div className={`w-full ${isTreeCollapsed ? 'lg:w-16' : 'lg:w-64 xl:w-72'} shrink-0 glass-panel p-4 rounded-3xl border border-slate-200 space-y-3 h-fit transition-all duration-300`}>
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 gap-2">
              {!isTreeCollapsed && (
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  <span>شجرة التصفية</span>
                </span>
              )}
              <div className="flex items-center gap-1.5 mr-auto">
                {!isTreeCollapsed && (
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
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
                    setReviewStatus('');
                  }}
                  className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    !startDate && !endDate && !reviewStatus
                      ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1">🌐 الكل</span>
                  <span className={`font-mono font-bold text-[11px] ${!startDate && !endDate && !reviewStatus ? 'text-emerald-100' : 'text-emerald-700'}`}>
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
                          const [yyyy, mm] = m.month.split(' ');
                          const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
                          setStartDate(`${yyyy}-${String(mm).padStart(2, '0')}-01`);
                          setEndDate(`${yyyy}-${String(mm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 cursor-pointer flex items-center justify-between transition-all"
                      >
                        <span className="font-bold text-slate-800">📅 شهر {m.month}</span>
                        <span className="font-mono font-bold text-emerald-700 text-[11px]">{formatNumber(m.totalSum)}</span>
                      </div>

                      {/* Days inside Month */}
                      {isMonthExpanded && m.days && (
                        <div className="pr-3 space-y-1 border-r-2 border-emerald-200 mr-2">
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
                                  className="p-1.5 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 text-[11px] cursor-pointer flex items-center justify-between"
                                >
                                  <span className="font-bold text-slate-700">📆 {d.day}</span>
                                  <span className="font-mono font-bold text-emerald-600">{formatNumber(d.totalSum)}</span>
                                </div>

                                {/* Categories inside Day */}
                                {isDayExpanded && d.categories && (
                                  <div className="pr-3 space-y-1 border-r-2 border-slate-300 mr-2">
                                    {d.categories.map((c: any) => (
                                      <div
                                        key={c.category}
                                        onClick={() => {
                                          const [dd, mm, yyyy] = d.day.split('/');
                                          setStartDate(`${yyyy}-${mm}-${dd}`);
                                          setEndDate(`${yyyy}-${mm}-${dd}`);
                                        }}
                                        className="p-1 rounded bg-slate-50 hover:bg-emerald-100 text-[10px] cursor-pointer flex items-center justify-between text-slate-600"
                                      >
                                        <span>💼 {c.category}</span>
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

        {/* Table Container */}
        <div className="flex-1 space-y-4 min-w-0">

          {/* Manager Batch Actions Bar */}
          {currentUser?.role === 'manager' && selectedIds.length > 0 && (
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-3 shadow-xl animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>تم تحديد ({selectedIds.length}) عنصر من أصل ({handovers.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBatchReview}
                  disabled={batchLoading}
                  className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>تم المراجعة ✅</span>
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={batchLoading}
                  className="py-2 px-3.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف المحدد 🗑️</span>
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto glass-panel rounded-3xl border border-slate-200">
            <table className="w-full text-right text-sm text-slate-700 table-auto">
              <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
                <tr>
                  {currentUser?.role === 'manager' && (
                    <th className="px-3 py-3 w-10 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === handovers.length && handovers.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                  )}
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
                    <td colSpan={currentUser?.role === 'manager' ? 11 : 10} className="text-center py-12 text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                      <span>جاري تحميل سجل التسليم والتسلم...</span>
                    </td>
                  </tr>
                ) : handovers.length === 0 ? (
                  <tr>
                    <td colSpan={currentUser?.role === 'manager' ? 11 : 10} className="text-center py-12 text-slate-500">
                      لا توجد حركات تسليم مسجلة
                    </td>
                  </tr>
                ) : (
                  handovers.map((item) => {
                    const exp = Number(item.expected_balance || item.balance_at_time || 0);
                    const act = Number(item.actual_balance || 0);
                    const diff = item.difference !== undefined && item.difference !== null ? Number(item.difference) : act - exp;
                    const isSelected = selectedIds.includes(item.id);

                    return (
                      <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-emerald-50/50' : ''}`}>
                        {currentUser?.role === 'manager' && (
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(item.id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                        )}
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
                            {currentUser?.role === 'manager' && item.review_status !== 'تم المراجعة بواسطة المدير' && (diff !== 0 || item.review_status === 'الرجاء المراجعة') && (
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
                      <td className={`px-4 py-3 font-mono font-bold text-xs whitespace-nowrap ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-emerald-600'
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
      </div>

      {/* Filter Modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-3 border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Filter className="w-5 h-5 text-emerald-600" />
                <span>خيارات تصفية سجل التسليم والتسلم</span>
              </h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Sender & Receiver Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <span>📤 الموظف المسلّم</span>
                  </label>
                  <select
                    value={filterSenderId}
                    onChange={(e) => setFilterSenderId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="">جميع المسلّمين</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <span>📥 الموظف المستلم</span>
                  </label>
                  <select
                    value={filterReceiverId}
                    onChange={(e) => setFilterReceiverId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="">جميع المستلمين</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Wallet & Review Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>العهدة / المحفظة</span>
                  </label>
                  <input
                    type="text"
                    value={filterWalletName}
                    onChange={(e) => setFilterWalletName(e.target.value)}
                    placeholder="اسم العهدة..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>حالة المراجعة والتقييم</span>
                  </label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="">جميع الحالات</option>
                    <option value="NEEDS_REVIEW">يحتاج مراجعة ⚠️</option>
                    <option value="تم المطابقة">تم المطابقة ✅</option>
                    <option value="تم المراجعة بواسطة المدير">تم المراجعة بواسطة المدير 👍</option>
                  </select>
                </div>
              </div>

              {/* Date Range Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>من تاريخ</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>إلى تاريخ</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => { fetchHandovers(1); setIsFilterOpen(false); }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                تطبيق التصفية
              </button>
              <button
                onClick={resetFilters}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
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
