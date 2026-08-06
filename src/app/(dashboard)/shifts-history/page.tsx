'use client';

import { useState, useEffect } from 'react';
import { Clock, Search, Filter } from 'lucide-react';

export default function ShiftsHistoryPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [showFilter, setShowFilter] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      // Fetch users for admin filter
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

      // Fetch shifts
      let url = `/api/shifts?page=${page}&limit=50`;
      if (employeeId) url += `&employee_id=${employeeId}`;
      if (date) url += `&date=${date}`;

      const res = await fetch(url);
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
    fetchData(1);
  }, [employeeId, date]);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-7 h-7 text-cyan-400" />
            <span>سجل الشفتات</span>
          </h1>
          <p className="text-slate-400 text-sm">
            عرض وتصفية السجل الكامل لشفتات العمل السابقة والحالية
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>تصفية متقدمة</span>
          </button>
        </div>
      </div>

      {/* Filter Modal */}
      {showFilter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Filter className="w-5 h-5 text-cyan-400" />
              <span>تصفية الشفتات</span>
            </h3>

            {currentUser?.role === 'manager' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الموظف</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
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
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setEmployeeId('');
                  setDate('');
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium"
              >
                إعادة ضبط
              </button>
              <button
                onClick={() => setShowFilter(false)}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-medium"
              >
                تطبيق وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shifts Log Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        {loading ? (
          <div className="p-10 text-center text-slate-400">جاري تحميل السجل...</div>
        ) : shifts.length === 0 ? (
          <div className="p-10 text-center text-slate-400">لا توجد شفتات مسجلة بهذه المواصفات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">الموظف</th>
                  <th className="px-4 py-3">النوع</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3">البداية</th>
                  <th className="px-4 py-3">النهاية</th>
                  <th className="px-4 py-3">الساعات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {shifts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{item.employee_name || '-'}</td>
                    <td className="px-4 py-3 text-cyan-400">{item.shift_type || 'صباحي'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {item.shift_date ? new Date(item.shift_date).toLocaleDateString('ar-EG') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {item.start_time ? new Date(item.start_time).toLocaleTimeString('ar-EG') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {item.end_time ? new Date(item.end_time).toLocaleTimeString('ar-EG') : (
                        <span className="text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 rounded-md">نشط الآن</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-white">
                      {Number(item.total_hours || 0).toFixed(2)} س
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
