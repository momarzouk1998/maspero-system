'use client';

import { useState, useEffect } from 'react';
import { Users, Wallet, ShieldCheck, Cpu, Archive, Edit3, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ManagerWalletsPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [externalWallets, setExternalWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Initial Balance Modal State
  const [editingWallet, setEditingWallet] = useState<any>(null);
  const [initialBalance, setInitialBalance] = useState('');
  const [custodianName, setCustodianName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/wallets');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employeeWallets || []);
        setExternalWallets(data.externalWallets || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalEmployeesCash = employees.reduce(
    (sum, emp) => sum + Number(emp.wallet_balance || 0),
    0
  );

  const handleSaveInitialBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWallet || initialBalance === '') return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: editingWallet.id,
          initialBalance: Number(initialBalance),
          custodianName: custodianName || editingWallet.custodian_name
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث الرصيد الافتتاحي');

      setMessage({ type: 'success', text: data.message || 'تم تحديث الرصيد الافتتاحي بنجاح 🎉' });
      setEditingWallet(null);
      setInitialBalance('');
      setCustodianName('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const drawersList = externalWallets.filter((w) => w.wallet_type === 'درج كاش' || w.wallet_type === 'درج');
  const machinesList = externalWallets.filter((w) => w.wallet_type !== 'درج كاش' && w.wallet_type !== 'درج');

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-400" />
            <span>رقابة محافظ الموظفين والضبط المالي (لوحة المدير)</span>
          </h1>
          <p className="text-slate-400 text-sm">
            عرض وحصر عهد الموظفين، وضبط <strong className="text-amber-400">الأرصدة الافتتاحية</strong> لماكينات فوري ومحافظ كاش والأدراج
          </p>
        </div>

        {/* Total Cash with Employees */}
        <div className="glass-card px-6 py-3 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-400 text-left">
          <span className="text-xs text-slate-400 block font-medium">إجمالي النقدية الكاش مع الموظفين</span>
          <span className="text-2xl font-black text-white">
            {totalEmployeesCash.toLocaleString('ar-EG')} <span className="text-xs font-normal text-indigo-400">ج.م</span>
          </span>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. External Machines & Wallets Initial Balances (Manager Control) */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <span>إدارة الأرصدة الافتتاحية للمحافظ والماكينات (فوري / فودافون كاش)</span>
          </h2>
          <span className="text-xs text-slate-400">يمكنك كمدير تحديد الرصيد الافتتاحي للشباب للبدء بها</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {machinesList.map((w) => (
            <div key={w.id} className="glass-card p-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {w.wallet_type}
                </span>
                <span className="text-[11px] text-slate-400">عهدة: {w.custodian_name || 'عامة'}</span>
              </div>

              <div>
                <h3 className="font-bold text-white text-base">{w.wallet_name}</h3>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                  {Number(w.current_balance).toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-400">ج.م</span>
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingWallet(w);
                  setInitialBalance(String(w.current_balance || 0));
                  setCustodianName(w.custodian_name || '');
                }}
                className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل الرصيد الافتتاحي</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Cash Drawers Initial Balances */}
      <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-purple-950/10 space-y-4">
        <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-purple-400" />
            <span>إدارة رصيد أدراج الأمانات الثلاثة</span>
          </h2>
          <span className="text-xs text-purple-300">درج 1، درج 2، درج 3</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {drawersList.map((w) => (
            <div key={w.id} className="glass-card p-4 rounded-2xl border border-purple-500/30 bg-slate-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {w.wallet_type}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-white text-base">{w.wallet_name}</h3>
                <p className="text-2xl font-extrabold text-purple-300 mt-1">
                  {Number(w.current_balance).toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-400">ج.م</span>
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingWallet(w);
                  setInitialBalance(String(w.current_balance || 0));
                  setCustodianName('');
                }}
                className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>ضبط رصيد الدرج</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Employees Wallets Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-indigo-400" />
          <span>أرصدة عهد الموظفين الكاش الحالية</span>
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
                  <span className="text-xs text-slate-500 block">رصيد العهدة الكاش</span>
                  <span className={`text-xl font-black ${Number(emp.wallet_balance || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {Number(emp.wallet_balance || 0).toLocaleString('ar-EG')} <span className="text-xs text-slate-300">ج.م</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Initial Balance Modal */}
      {editingWallet && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-amber-500/40 bg-slate-900 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" />
              <span>ضبط الرصيد الافتتاحي لـ ({editingWallet.wallet_name})</span>
            </h3>

            <form onSubmit={handleSaveInitialBalance} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الرصيد الافتتاحي الجديد (ج.م)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="أدخل الرصيد الافتتاحي"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {editingWallet.wallet_type !== 'درج كاش' && editingWallet.wallet_type !== 'درج' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">اسم مسئول العهدة (اختياري)</label>
                  <input
                    type="text"
                    value={custodianName}
                    onChange={(e) => setCustodianName(e.target.value)}
                    placeholder="اسم الموظف المسئول"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingWallet(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 cursor-pointer disabled:opacity-50"
                >
                  <span>حفظ الرصيد الافتتاحي</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
