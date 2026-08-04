'use client';

import { useState, useEffect } from 'react';
import { Users, Wallet, ShieldCheck, ArrowLeftRight } from 'lucide-react';

export default function ManagerWalletsPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const res = await fetch('/api/wallets');
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.employeeWallets || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchWallets();
  }, []);

  const totalEmployeesCash = employees.reduce(
    (sum, emp) => sum + Number(emp.wallet_balance || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-400" />
            <span>رقابة محافظ الموظفين والخزينة الحالية</span>
          </h1>
          <p className="text-slate-400 text-sm">
            عرض وحصر أرصدة العهد النقدية المتواجدة مع جميع الموظفين في الوقت الحالي
          </p>
        </div>

        {/* Total Cash with Employees */}
        <div className="glass-card px-6 py-3 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-400 text-left">
          <span className="text-xs text-slate-400 block font-medium">إجمالي النقدية مع الموظفين</span>
          <span className="text-2xl font-black text-white">
            {totalEmployeesCash.toLocaleString('ar-EG')} <span className="text-xs font-normal text-indigo-400">ج.م</span>
          </span>
        </div>
      </div>

      {/* Employees Wallets Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-indigo-400" />
          <span>أرصدة عهد الموظفين</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري تحميل المحافظ...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <div key={emp.id} className="glass-card p-5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white text-base">{emp.name}</h3>
                    {emp.role === 'manager' && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                        مدير
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{emp.job_title || 'موظف مبيعات'}</p>
                </div>

                <div className="text-left">
                  <span className="text-xs text-slate-500 block">رصيد العهدة</span>
                  <span className="text-xl font-black text-emerald-400">
                    {Number(emp.wallet_balance || 0).toLocaleString('ar-EG')} <span className="text-xs text-slate-300">ج.م</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
