'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Search, Filter, Calendar, User, X, RefreshCw, ChevronLeft, ChevronRight, ArrowRight, Trash2, Edit3, FileText, CheckCircle2, DollarSign, Wallet } from 'lucide-react';
import { getActiveUsers, formatNumber } from '@/lib/user-utils';

export default function ShiftsHistoryPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isManager = currentUser?.role === 'manager';
  let userPerms = currentUser?.permissions;
  if (typeof userPerms === 'string') { try { userPerms = JSON.parse(userPerms); } catch { userPerms = {}; } }
  const canUpdateShift = isManager || Boolean(userPerms?.shifts?.update);
  const canDeleteShift = isManager || Boolean(userPerms?.shifts?.delete);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAuditShift, setSelectedAuditShift] = useState<any | null>(null);
  const [auditData, setAuditData] = useState<any | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (!selectedAuditShift) {
      setAuditData(null);
      return;
    }
    setAuditLoading(true);
    fetch(`/api/shifts/audit?shiftId=${selectedAuditShift.id}`)
      .then(res => res.json())
      .then(d => setAuditData(d))
      .catch(console.error)
      .finally(() => setAuditLoading(false));
  }, [selectedAuditShift]);

  // Filter popup modal state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);

  const [treeData, setTreeData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  const fetchTreeData = () => {
    fetch('/api/shifts/tree')
      .then(res => res.json())
      .then(d => setTreeData(d))
      .catch(console.error);
  };

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
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterType('');
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
      setFilterStartDate(start);
      setFilterEndDate(end);
    }
  };

  const handleSelectDay = (dStr: string, monthName: string) => {
    setSelectedMonth(monthName);
    setSelectedDay(dStr);
    const parts = dStr.split('/');
    if (parts.length === 3) {
      const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      setFilterStartDate(formatted);
      setFilterEndDate(formatted);
    }
  };

  const handleSelectCategory = (cat: string, dStr: string, monthName: string) => {
    setSelectedMonth(monthName);
    setSelectedDay(dStr);
    setFilterType(cat);
    const parts = dStr.split('/');
    if (parts.length === 3) {
      const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      setFilterStartDate(formatted);
      setFilterEndDate(formatted);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setCurrentUser(data.user))
      .catch(() => {});

    fetchTreeData();
  }, []);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editShiftType, setEditShiftType] = useState('');
  const [editShiftNote, setEditShiftNote] = useState('');
  const [editTotalHours, setEditTotalHours] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

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
        setSelectedIds([]);
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

  const handleSelectAll = () => {
    if (shifts.length > 0 && selectedIds.length === shifts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(shifts.map(s => s.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.length} من الشفتات المحددة؟`)) return;
    try {
      await Promise.all(selectedIds.map(id => fetch(`/api/shifts?id=${id}`, { method: 'DELETE' })));
      setSelectedIds([]);
      fetchShifts(pagination.page);
    } catch (e: any) {
      alert(e.message || 'حدث خطأ أثناء الحذف الجماعي');
    }
  };

  const resetFilters = () => {
    setFilterType('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterEmployeeId('');
    setIsFilterOpen(false);
  };

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

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditShiftType(item.shift_type || 'صباحي');
    setEditShiftNote(item.shift_note || '');
    setEditTotalHours((item.total_hours || 0).toString());
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setEditSubmitting(true);
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          shiftId: editingItem.id,
          shiftType: editShiftType,
          shiftNote: editShiftNote,
          totalHours: parseFloat(editTotalHours)
        })
      });

      if (res.ok) {
        setEditingItem(null);
        fetchShifts(pagination.page);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEditSubmitting(false);
    }
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

      {/* Main Container: Collapsible Tree Sidebar + Table */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Hierarchical Sidebar Tree View (AppSheet Style - Narrower & Collapsible) */}
        <div className={`w-full ${isTreeCollapsed ? 'lg:w-16' : 'lg:w-64 xl:w-72'} shrink-0 glass-panel p-4 rounded-3xl border border-slate-200 bg-white space-y-3 h-fit transition-all duration-300`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
            {!isTreeCollapsed && (
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-cyan-600" />
                <span>شجرة التصفية</span>
              </h3>
            )}
            <div className="flex items-center gap-1.5 mr-auto">
              {!isTreeCollapsed && (
                <button
                  onClick={handleSelectAllNode}
                  className="text-[11px] text-cyan-600 hover:text-cyan-700 font-bold"
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
                !selectedMonth && !selectedDay && !filterType
                  ? 'bg-cyan-50 text-cyan-700 font-bold shadow-sm'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ChevronLeft className="w-3.5 h-3.5 opacity-40" />
                <span>الكل</span>
              </div>
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono">
                {treeData?.totalShifts || 0} شفت
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
                          className={`cursor-pointer truncate ${isMonthSelected ? 'text-cyan-700 font-bold' : ''}`}
                        >
                          {m.month}
                        </span>
                      </div>
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono">
                        {m.totalShifts} شفت
                      </span>
                    </div>

                    {/* Days level */}
                    {isMonthExpanded && (
                      <div className="mr-3 border-r border-slate-100 pr-1.5 space-y-1">
                        {m.days?.map((d: any) => {
                          const isDayExpanded = expandedDays.includes(d.day);
                          const isDaySelected = selectedDay === d.day && !filterType;

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
                                    className={`cursor-pointer truncate ${isDaySelected ? 'text-cyan-700 font-bold' : ''}`}
                                  >
                                    {d.day}
                                  </span>
                                </div>
                                <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1 py-0.5 rounded font-mono">
                                  {d.shiftCount} شفت
                                </span>
                              </div>

                              {/* Categories level */}
                              {isDayExpanded && (
                                <div className="mr-3 border-r border-slate-100 pr-1.5 space-y-1">
                                  {d.categories?.map((c: any) => {
                                    const isCatSelected = selectedDay === d.day && filterType === c.category;

                                    return (
                                      <div
                                        key={c.category}
                                        onClick={() => handleSelectCategory(c.category, d.day, m.month)}
                                        className={`flex items-center justify-between p-1 rounded-md cursor-pointer hover:bg-cyan-50/50 transition-colors ${
                                          isCatSelected ? 'bg-cyan-50 text-cyan-700 font-bold' : 'text-slate-600'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                                          <span>شفت {c.category}</span>
                                        </div>
                                        <span className="text-[9px] text-slate-500 font-mono">
                                          {c.count}
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

        {/* Shifts Table & Pagination (Flex-1) */}
        <div className="flex-1 space-y-4 min-w-0">
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4 bg-white">
            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
              <div className="p-3.5 bg-cyan-50 border border-cyan-200 rounded-2xl flex items-center justify-between animate-in fade-in">
                <span className="text-xs font-bold text-cyan-900">
                  تم تحديد ({selectedIds.length}) شفت من أصل ({shifts.length})
                </span>
                {currentUser?.role === 'manager' && (
                  <button
                    onClick={handleBulkDelete}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف المحددة ({selectedIds.length})</span>
                  </button>
                )}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm text-slate-700 table-auto">
                <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={shifts.length > 0 && selectedIds.length === shifts.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-cyan-600 rounded cursor-pointer accent-cyan-600"
                      />
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">الموظف</th>
                    <th className="px-4 py-3 whitespace-nowrap">نوع الشفت</th>
                    <th className="px-4 py-3 whitespace-nowrap">التاريخ</th>
                    <th className="px-4 py-3 whitespace-nowrap">وقت البداية</th>
                    <th className="px-4 py-3 whitespace-nowrap">وقت النهاية</th>
                    <th className="px-4 py-3 whitespace-nowrap">إجمالي الساعات</th>
                    <th className="px-4 py-3 whitespace-nowrap">ملاحظات</th>
                    {currentUser?.role === 'manager' && <th className="px-4 py-3 text-center whitespace-nowrap">إجراءات المدير</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-600" />
                        <span>جاري تحميل سجل الشفتات...</span>
                      </td>
                    </tr>
                  ) : shifts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-500">
                        لا توجد شفتات مسجلة تطابق التصفية الحالية
                      </td>
                    </tr>
                  ) : (
                    shifts.map((item) => (
                      <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(item.id) ? 'bg-cyan-50/50' : ''}`}>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelectRow(item.id)}
                            className="w-4 h-4 text-cyan-600 rounded cursor-pointer accent-cyan-600"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{item.employee_name || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            item.shift_type === 'صباحي' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-cyan-100 text-cyan-700 border border-cyan-200'
                          }`}>
                            {item.shift_type || 'صباحي'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700 font-mono whitespace-nowrap">
                          {item.start_time ? new Date(item.start_time).toLocaleDateString('en-US') : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                          {item.start_time ? new Date(item.start_time).toLocaleTimeString('en-US') : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                          {item.end_time ? new Date(item.end_time).toLocaleTimeString('en-US') : (
                            <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">نشط الآن</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 font-mono whitespace-nowrap">
                          {formatNumber(Number(item.total_hours || 0))} ساعة
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.shift_note || '-'}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedAuditShift(item)}
                              className="px-2.5 py-1 bg-cyan-100 hover:bg-cyan-200 text-cyan-800 text-xs font-bold rounded-lg border border-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                              title="عرض تقرير الشفت التفصيلي"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>تقرير الشفت</span>
                            </button>
                            {canUpdateShift && (
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-200 transition-colors"
                                title="تعديل الشفت"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {canDeleteShift && (
                              <button
                                onClick={() => handleDeleteShift(item.id)}
                                className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-200 transition-colors"
                                title="حذف الشفت"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
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
        </div>
      </div>

      {/* Manager Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-600" />
                <span>تعديل بيانات الشفت</span>
              </h3>
              <button onClick={() => setEditingItem(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الموظف</label>
                <input
                  type="text"
                  disabled
                  value={editingItem.employee_name}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع الشفت</label>
                <select
                  value={editShiftType}
                  onChange={(e) => setEditShiftType(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                >
                  <option value="صباحي">صباحي</option>
                  <option value="مسائي">مسائي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">إجمالي ساعات الدوام</label>
                <input
                  type="number"
                  step="0.1"
                  value={editTotalHours}
                  onChange={(e) => setEditTotalHours(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-bold font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الشفت</label>
                <input
                  type="text"
                  value={editShiftNote}
                  onChange={(e) => setEditShiftNote(e.target.value)}
                  placeholder="ملاحظات..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-md"
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

      {/* SHIFT AUDIT REPORT MODAL (Item 4: تقرير الشفت التفصيلي) */}
      {selectedAuditShift && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-4xl space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in duration-200 my-8">
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-4 border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold shadow-sm">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <span>تقرير الشفت التفصيلي (كشف حساب العمليات)</span>
                    <span className="text-xs bg-cyan-100 text-cyan-800 px-2.5 py-0.5 rounded-lg border border-cyan-300 font-bold">
                      {selectedAuditShift.shift_type || 'صباحي'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">الكاشير / الموظف: <span className="text-slate-900 font-bold">{selectedAuditShift.employee_name || 'موظف'}</span></p>
                </div>
              </div>
              <button onClick={() => setSelectedAuditShift(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {auditLoading ? (
              <div className="py-16 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-cyan-600" />
                <span className="font-bold text-sm">جاري جلب وتجميع عمليات وتقارير الشفت...</span>
              </div>
            ) : (
              <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto p-1 pr-2">
                {/* 1. Timing & Summary Header */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block mb-1">توقيت البداية:</span>
                    <span className="font-bold font-mono text-slate-900 dir-ltr text-xs">
                      {selectedAuditShift.start_time ? new Date(selectedAuditShift.start_time).toLocaleString('en-US') : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">توقيت الإغلاق:</span>
                    <span className="font-bold font-mono text-slate-900 dir-ltr text-xs">
                      {selectedAuditShift.end_time ? new Date(selectedAuditShift.end_time).toLocaleString('en-US') : 'نشط الآن'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">مدة العمل:</span>
                    <span className="font-bold text-cyan-700 font-mono text-xs">
                      {formatNumber(Number(selectedAuditShift.total_hours || 0))} ساعة
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">النية النقدية المتوقعة بالدرج:</span>
                    <span className="font-extrabold text-emerald-700 font-mono text-sm">
                      {formatNumber(Number(auditData?.summary?.expectedCashDrawerBalance || 0))} ج
                    </span>
                  </div>
                </div>

                {/* 2. Operations Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1">
                    <span className="text-[11px] text-blue-700 font-bold block">مبيعات الخدمات والطباعة</span>
                    <span className="text-base font-extrabold font-mono text-blue-900 block">
                      {formatNumber(Number(auditData?.summary?.totalServicesAmount || 0))} ج
                    </span>
                    <span className="text-[10px] text-blue-600 block">
                      عدد الورق: {auditData?.summary?.totalPaperCount || 0} ورقة | عمولات: {formatNumber(Number(auditData?.summary?.totalServiceCommission || 0))} ج
                    </span>
                  </div>

                  <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-1">
                    <span className="text-[11px] text-purple-700 font-bold block">حجوزات التذاكر</span>
                    <span className="text-base font-extrabold font-mono text-purple-900 block">
                      {formatNumber(Number(auditData?.summary?.totalTicketsAmount || 0))} ج
                    </span>
                    <span className="text-[10px] text-purple-600 block">عدد التذاكر: {auditData?.summary?.totalTicketsCount || 0} | عمولات: {formatNumber(Number(auditData?.summary?.totalTicketCommission || 0))} ج</span>
                  </div>

                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                    <span className="text-[11px] text-emerald-700 font-bold block">المحافظ والماكينات</span>
                    <span className="text-xs font-bold font-mono text-emerald-900 block">
                      إيداع: {formatNumber(Number(auditData?.summary?.walletDeposits || 0))} | سحب: {formatNumber(Number(auditData?.summary?.walletWithdrawals || 0))}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">عمولات المحافظ: {formatNumber(Number(auditData?.summary?.walletCommissions || 0))} ج</span>
                  </div>

                  <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-1">
                    <span className="text-[11px] text-rose-700 font-bold block">المصروفات والسلف</span>
                    <span className="text-base font-extrabold font-mono text-rose-900 block">
                      {formatNumber(Number((auditData?.summary?.totalExpenses || 0) + (auditData?.summary?.totalAdvances || 0)))} ج
                    </span>
                    <span className="text-[10px] text-rose-600 block">مصروفات: {formatNumber(Number(auditData?.summary?.totalExpenses || 0))} | سلف: {formatNumber(Number(auditData?.summary?.totalAdvances || 0))}</span>
                  </div>
                </div>

                {/* 3. Detailed Line Items Tables */}

                {/* Services Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b pb-1 border-slate-200">
                    <span>🖨️ الخدمات والطباعة المسجلة بالشفت ({auditData?.details?.services?.length || 0})</span>
                  </h4>
                  {auditData?.details?.services?.length === 0 ? (
                    <p className="text-slate-400 text-[11px]">لا توجد خدمات مسجلة خلال هذا الشفت</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-right text-[11px] table-auto">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2">الخدمة</th>
                            <th className="p-2">عدد الورق</th>
                            <th className="p-2">النوع</th>
                            <th className="p-2">المبلغ</th>
                            <th className="p-2">عمولة الموظف</th>
                            <th className="p-2">الوقت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {auditData?.details?.services?.map((svc: any) => (
                            <tr key={svc.id}>
                              <td className="p-2 font-bold text-slate-900">{svc.service_name}</td>
                              <td className="p-2 font-mono">{svc.paper_count || svc.page_count || 1}</td>
                              <td className="p-2">{svc.face_type || '-'}</td>
                              <td className="p-2 font-mono font-bold text-blue-700">{formatNumber(Number(svc.amount))} ج</td>
                              <td className="p-2 font-mono font-bold text-amber-800">
                                {Number(svc.employee_commission || 0) > 0 ? (
                                  <span className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                                    +{formatNumber(Number(svc.employee_commission))} ج
                                  </span>
                                ) : (
                                  <span className="text-slate-400">0 ج</span>
                                )}
                              </td>
                              <td className="p-2 text-slate-500 font-mono">{svc.timestamp ? new Date(svc.timestamp).toLocaleTimeString('en-US') : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Wallet Transactions Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b pb-1 border-slate-200">
                    <span>💳 حركات المحافظ والماكينات بالشفت ({auditData?.details?.walletTx?.length || 0})</span>
                  </h4>
                  {auditData?.details?.walletTx?.length === 0 ? (
                    <p className="text-slate-400 text-[11px]">لا توجد حركات محافظ مسجلة خلال هذا الشفت</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-right text-[11px] table-auto">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2">المحفظة/الماكينة</th>
                            <th className="p-2">نوع الحركة</th>
                            <th className="p-2">المبلغ</th>
                            <th className="p-2">العمولة</th>
                            <th className="p-2">البيان / الوصف</th>
                            <th className="p-2">الوقت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {auditData?.details?.walletTx?.map((w: any) => (
                            <tr key={w.id}>
                              <td className="p-2 font-bold text-slate-900">{w.wallet_name}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${w.transaction_type === 'إيداع' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                  {w.transaction_type}
                                </span>
                              </td>
                              <td className="p-2 font-mono font-bold text-slate-900">{formatNumber(Number(w.amount))} ج</td>
                              <td className="p-2 font-mono text-emerald-700">{formatNumber(Number(w.wallet_commission))} ج</td>
                              <td className="p-2 text-slate-600">{w.description || '-'}</td>
                              <td className="p-2 text-slate-500 font-mono">{w.timestamp ? new Date(w.timestamp).toLocaleTimeString('en-US') : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Expenses Table */}
                {auditData?.details?.expenses?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b pb-1 border-slate-200">
                      <span>💸 المصروفات والسلف بالشفت ({auditData?.details?.expenses?.length})</span>
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-right text-[11px] table-auto">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2">النوع الرئيسي</th>
                            <th className="p-2">طريقة الصرف</th>
                            <th className="p-2">المبلغ</th>
                            <th className="p-2">الملاحظات</th>
                            <th className="p-2">الوقت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {auditData?.details?.expenses?.map((e: any) => (
                            <tr key={e.id}>
                              <td className="p-2 font-bold text-slate-900">{e.main_type}</td>
                              <td className="p-2">{e.expense_type || '-'}</td>
                              <td className="p-2 font-mono font-bold text-rose-700">{formatNumber(Number(e.amount))} ج</td>
                              <td className="p-2 text-slate-600">{e.notes || '-'}</td>
                              <td className="p-2 text-slate-500 font-mono">{e.timestamp ? new Date(e.timestamp).toLocaleTimeString('en-US') : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedAuditShift(null)}
                className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                إغلاق التقرير
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
