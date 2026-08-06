'use client';

import { useState, useEffect } from 'react';
import { Cpu, Search, Filter } from 'lucide-react';

export default function ChargeHistoryPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [showFilter, setShowFilter] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      if (!currentUser) {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const data = await meRes.json();
          setCurrentUser(data.user);
          if (data.user?.role === 'manager') {
            const usersRes = await fetch('/api/users');
            if (usersRes.ok) {
              const usersData = await usersRes.json();
              setUsers(usersData.users || []);
            }
          }
        }
      }

      let url = `/api/wallets/transactions?page=${page}&limit=25`;
      if (employeeId) url += `&employee_id=${employeeId}`;
      if (date) url += `&date=${date}`;
      if (search) url += `&search=${search}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [employeeId, date, search]);

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-7 h-7 text-cyan-400" />
            <span>سجل عمليات الشحن والمحافظ</span>
          </h1>
          <p className="text-slate-400 text-sm">
            عرض وتصفية السجل الكامل لعمليات الإيداع والسحب للمحافظ والماكينات
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث باسم المحفظة، الملاحظات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 border border-slate-700 transition-colors shrink-0"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">تصفية</span>
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 bg-slate-800/40 grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentUser?.role === 'manager' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">الموظف</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
              >
                <option value="">جميع الموظفين</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">التاريخ</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => { setEmployeeId(''); setDate(''); setSearch(''); }}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        {loading ? (
          <div className="p-10 text-center text-slate-400">جاري تحميل السجل...</div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center text-slate-400">لا توجد عمليات مسجلة تطابق بحثك</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">النوع</th>
                  <th className="px-4 py-3">المحفظة / الماكينة</th>
                  <th className="px-4 py-3">العملية</th>
                  <th className="px-4 py-3">المبلغ</th>
                  <th className="px-4 py-3">العمولة</th>
                  <th className="px-4 py-3">الموظف</th>
                  <th className="px-4 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {item.wallet_type || item.wallet?.wallet_type || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-white">{item.wallet_name || item.wallet?.wallet_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                        item.transaction_type === 'إيداع'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {item.transaction_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-extrabold text-white">
                      {Number(item.amount).toLocaleString('ar-EG')} ج
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-bold">
                      {Number(item.wallet_commission).toLocaleString('ar-EG')} ج
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-300">{item.employee_name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(item.timestamp || item.date).toLocaleString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                {Array.from({ length: pagination.totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => fetchData(i + 1)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold ${
                      pagination.page === i + 1
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
