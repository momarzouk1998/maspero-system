'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Gift, Search, Filter, Calendar, RefreshCw, ChevronLeft, ChevronRight, 
  User, X, ArrowRight, CheckCircle2, AlertTriangle, Trash2, Check, Clock, UserCheck
} from 'lucide-react';
import { getActiveUsers, formatNumber } from '@/lib/user-utils';

export default function HRHistoryPage() {
  const [hrItems, setHrItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const fetchHRHistory = async (page = 1) => {
    setLoading(true);
    try {
      let url = `/api/hr?page=${page}&limit=20`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (filterStartDate && filterEndDate) url += `&startDate=${filterStartDate}&endDate=${filterEndDate}`;
      if (filterEmployeeId) url += `&employeeId=${filterEmployeeId}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHrItems(data.hrItems || []);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const [treeData, setTreeData] = useState<any>(null);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  const fetchTreeData = () => {
    fetch('/api/hr-history/tree')
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
      .then(res => res.json())
      .then(data => setEmployees(getActiveUsers(data.users || [])))
      .catch(() => {});

    fetchHRHistory(1);
    fetchTreeData();
  }, [statusFilter, filterStartDate, filterEndDate, filterEmployeeId]);

  const handleApproveReject = async (id: string, newApproval: 'موافقة' | 'مرفوض') => {
    try {
      const res = await fetch('/api/hr', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, approval: newApproval })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `تم تحديث حالة الطلب إلى (${newApproval}) بنجاح` });
        fetchHRHistory(pagination.page);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'فشل تحديث الطلب' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت تأكد من رغبتك في حذف هذا الطلب؟')) return;
    try {
      const res = await fetch(`/api/hr?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'تم حذف الطلب بنجاح' });
        fetchHRHistory(pagination.page);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'فشل حذف الطلب' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredItems = hrItems.filter(item => {
    const matchesSearch = !search || 
      (item.employee_name && item.employee_name.toLowerCase().includes(search.toLowerCase())) ||
      (item.hr_items && item.hr_items.toLowerCase().includes(search.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));

    const matchesEmp = !filterEmployeeId || item.employee_id === filterEmployeeId;

    return matchesSearch && matchesEmp;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
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
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Gift className="w-7 h-7 text-indigo-600" />
              <span>سجل الحوافز والخصومات</span>
            </h1>
          </div>
        </div>

        <Link
          href="/expenses"
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all self-start md:self-auto"
        >
          <Gift className="w-4 h-4" />
          <span>تسجيل طلب جديد</span>
        </Link>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700">إغلاق</button>
        </div>
      )}

      {/* Controls & Filtering */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Tabs */}
          {[
            { key: 'ALL', label: 'الكل' },
            { key: 'PENDING', label: 'معلق ⏳' },
            { key: 'APPROVED', label: 'مقبول ✔️' },
            { key: 'REJECTED', label: 'مرفوض ✖️' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === tab.key
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Filter Employee dropdown for Manager */}
          {currentUser?.role === 'manager' && (
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none"
            >
              <option value="">جميع الموظفين</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالموظف أو نوع الطلب..."
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Container: Collapsible Tree Sidebar + HR Table */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Tree Filter Sidebar (AppSheet Style - Narrower & Collapsible) */}
        {treeData && treeData.months && (
          <div className={`w-full ${isTreeCollapsed ? 'lg:w-16' : 'lg:w-64 xl:w-72'} shrink-0 glass-panel p-4 rounded-3xl border border-slate-200 space-y-3 h-fit transition-all duration-300`}>
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 gap-2">
              {!isTreeCollapsed && (
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-indigo-600" />
                  <span>شجرة التصفية</span>
                </span>
              )}
              <div className="flex items-center gap-1.5 mr-auto">
                {!isTreeCollapsed && (
                  <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
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
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setStatusFilter('ALL');
                  }}
                  className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    !filterStartDate && !filterEndDate && statusFilter === 'ALL'
                      ? 'bg-indigo-600 text-white font-bold border-indigo-600 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1">🌐 الكل</span>
                  <span className={`font-mono font-bold text-[11px] ${!filterStartDate && !filterEndDate && statusFilter === 'ALL' ? 'text-indigo-100' : 'text-indigo-700'}`}>
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
                        setFilterStartDate(`${yyyy}-${String(mm).padStart(2, '0')}-01`);
                        setFilterEndDate(`${yyyy}-${String(mm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 cursor-pointer flex items-center justify-between transition-all"
                    >
                      <span className="font-bold text-slate-800">📅 شهر {m.month}</span>
                      <span className="font-mono font-bold text-indigo-700 text-[11px]">{formatNumber(m.totalSum)}</span>
                    </div>

                    {/* Days inside Month */}
                    {isMonthExpanded && m.days && (
                      <div className="pr-3 space-y-1 border-r-2 border-indigo-200 mr-2">
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
                                className="p-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-[11px] cursor-pointer flex items-center justify-between"
                              >
                                <span className="font-bold text-slate-700">📆 {d.day}</span>
                                <span className="font-mono font-bold text-indigo-600">{formatNumber(d.totalSum)}</span>
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
                                      className="p-1 rounded bg-slate-50 hover:bg-indigo-100 text-[10px] cursor-pointer flex items-center justify-between text-slate-600"
                                    >
                                      <span>🎁 {c.category}</span>
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

      {/* HR Table Container */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 table-auto">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">الموظف المعني</th>
                <th className="px-4 py-3 whitespace-nowrap">نوع الطلب</th>
                <th className="px-4 py-3 whitespace-nowrap">عدد الساعات</th>
                <th className="px-4 py-3 whitespace-nowrap">الحالة والموافقة</th>
                <th className="px-4 py-3 whitespace-nowrap">مُنشئ الطلب</th>
                <th className="px-4 py-3 whitespace-nowrap">الملاحظات</th>
                <th className="px-4 py-3 whitespace-nowrap">التاريخ والوقت</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>جاري تحميل سجل الحوافز والخصومات...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    لا توجد طلبات مسجلة تطابق التصفية
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isManager = currentUser?.role === 'manager';
                  const isCreator = item.created_by_id === currentUser?.id;
                  const isPending = item.approval === 'معلق';
                  const canDelete = isManager || (isCreator && isPending);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                        <User className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>{item.employee_name || item.e_hr_name || '-'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          item.hr_items === 'مكافأة' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          item.hr_items === 'خصم' ? 'bg-red-100 text-red-800 border-red-300' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {item.hr_items}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                        {formatNumber(Number(item.hours))} س
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          item.approval === 'موافقة' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          item.approval === 'مرفوض' ? 'bg-red-100 text-red-800 border-red-300' :
                          'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                        }`}>
                          <span>{item.approval === 'موافقة' ? 'معتمد ✔️' : item.approval === 'مرفوض' ? 'مرفوض ✖️' : 'قيد الانتظار ⏳'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.created_by_name || '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[180px] truncate whitespace-nowrap" title={item.notes || ''}>
                        {item.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-mono whitespace-nowrap">
                        {item.date ? new Date(item.date).toLocaleDateString('en-US') : '-'}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Manager Approval Controls */}
                          {isManager && isPending && (
                            <>
                              <button
                                onClick={() => handleApproveReject(item.id, 'موافقة')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1"
                                title="اعتماد الطلب"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>قبول</span>
                              </button>
                              <button
                                onClick={() => handleApproveReject(item.id, 'مرفوض')}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1"
                                title="رفض الطلب"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>رفض</span>
                              </button>
                            </>
                          )}

                          {/* Delete Button for Manager OR Creator when pending */}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-200 transition-colors"
                              title="حذف الطلب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
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
                onClick={() => fetchHRHistory(pagination.page - 1)}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl disabled:opacity-40 border border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchHRHistory(pagination.page + 1)}
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
  );
}
