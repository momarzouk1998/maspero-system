'use client';

import { useState, useEffect } from 'react';
import { 
  Zap, Search, Filter, Calendar, RefreshCw, ChevronLeft, ChevronRight, 
  ArrowDownLeft, ArrowUpRight, Wallet, User, X
} from 'lucide-react';
import { getActiveUsers } from '@/lib/user-utils';

export default function ChargeHistoryPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterWalletName, setFilterWalletName] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [walletsList, setWalletsList] = useState<string[]>([]);

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
      });

      const res = await fetch(`/api/charge-history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
        // collect unique wallet names for filter dropdown
        if (data.walletNames) setWalletsList(data.walletNames);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(d => setUsersList(getActiveUsers(d.users || [])))
      .catch(console.error);
    // fetch wallet names for filter
    fetch('/api/wallets')
      .then(r => r.json())
      .then(d => {
        const names = (d.externalWallets || []).map((w: any) => w.wallet_name);
        setWalletsList(names);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchTransactions(1), 300);
    return () => clearTimeout(timer);
  }, [search, transactionType, startDate, endDate, filterWalletName, filterEmployeeId]);

  const resetFilters = () => {
    setTransactionType('');
    setStartDate('');
    setEndDate('');
    setFilterWalletName('');
    setFilterEmployeeId('');
    setIsFilterOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-7 h-7 text-amber-600" />
            <span>سجل عمليات الشحن</span>
          </h1>
          <p className="text-slate-600 text-xs mt-1">
            متابعة حركات الإيداع والسحب لـ ماكينات فوري وبساطة ومحافظ كاش وفودافون كاش
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالماكينة، الموظف، رقم الفاتورة..."
              className="pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 w-64"
            />
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              hasActiveFilters
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>تصفية</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
          </button>
        </div>
      </div>

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
                <div className="grid grid-cols-3 gap-2">
                  {['', 'إيداع', 'سحب'].map(t => (
                    <button key={t} onClick={() => setTransactionType(t)}
                      className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                        transactionType === t
                          ? t === 'إيداع' ? 'bg-emerald-600 text-white border-emerald-600'
                          : t === 'سحب' ? 'bg-red-600 text-white border-red-600'
                          : 'bg-slate-700 text-white border-slate-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                      }`}
                    >{t === '' ? 'الكل' : t}</button>
                  ))}
                </div>
              </div>

              {walletsList.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">المحفظة / الماكينة</label>
                  <select value={filterWalletName} onChange={e => setFilterWalletName(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
                    <option value="">الكل</option>
                    {walletsList.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              )}

              {usersList.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">الموظف</label>
                  <select value={filterEmployeeId} onChange={e => setFilterEmployeeId(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
                    <option value="">جميع الموظفين</option>
                    {usersList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">من تاريخ</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">إلى تاريخ</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-200">
              <button onClick={() => { fetchTransactions(1); setIsFilterOpen(false); }}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl">
                تطبيق التصفية
              </button>
              <button onClick={resetFilters}
                className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl">
                إعادة ضبط
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">المحفظة / الماكينة</th>
                <th className="px-4 py-3">نوع العملية</th>
                <th className="px-4 py-3">المبلغ</th>
                <th className="px-4 py-3">العمولة</th>
                <th className="px-4 py-3">الإجمالي المحصل</th>
                <th className="px-4 py-3">الموظف</th>
                <th className="px-4 py-3">كود الفاتورة</th>
                <th className="px-4 py-3">التاريخ والوقت</th>
                <th className="px-4 py-3">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    <span>جاري تحميل سجل عمليات الشحن...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    لا توجد عمليات شحن مسجلة تطابق التصفية
                  </td>
                </tr>
              ) : (
                transactions.map((item) => {
                  const amt = Number(item.amount || 0);
                  const comm = Number(item.wallet_commission || 0);
                  const totalCollected = item.transaction_type === 'إيداع' ? amt + comm : amt - comm;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{item.wallet_name || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{amt.toFixed(2)} ج.م</td>
                      <td className="px-4 py-3 font-mono text-amber-700">{comm.toFixed(2)} ج.م</td>
                      <td className="px-4 py-3 font-mono font-extrabold text-emerald-700">{totalCollected.toFixed(2)} ج.م</td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          {item.employee_name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">{item.invoice_code || '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString('ar-EG') : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.description || '-'}</td>
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
  );
}
