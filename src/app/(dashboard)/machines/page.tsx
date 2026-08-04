'use client';

import { useState, useEffect } from 'react';
import {
  Cpu,
  Smartphone,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertTriangle,
  History,
  Coins,
  Search,
  Filter
} from 'lucide-react';

export default function MachinesPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'fawry' | 'cash'>('all');

  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [actionType, setActionType] = useState<'إيداع' | 'سحب' | null>(null);
  const [amount, setAmount] = useState('');
  const [commission, setCommission] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchWallets = async () => {
    try {
      const res = await fetch('/api/wallets');
      if (res.ok) {
        const data = await res.json();
        setWallets(data.externalWallets || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !actionType || !amount || Number(amount) <= 0) {
      setMessage({ type: 'error', text: 'يرجى تحديد المحفظة وإدخال مبلغ صحيح' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: selectedWallet.id,
          transactionType: actionType,
          amount: Number(amount),
          commission: Number(commission || 0),
          description
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إتمام العملية');

      setMessage({ type: 'success', text: `تم تسجيل عملية الـ ${actionType} بنجاح تحديث العهدة والمحفظة 🎉` });
      setAmount('');
      setCommission('');
      setDescription('');
      setSelectedWallet(null);
      setActionType(null);
      fetchWallets();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter out drawers
  const machinesList = wallets.filter(
    (w) => w.wallet_type !== 'درج كاش' && w.wallet_type !== 'درج'
  );

  const filteredWallets = machinesList.filter((w) => {
    const matchesSearch =
      w.wallet_name?.includes(search) ||
      w.wallet_number?.includes(search) ||
      w.custodian_name?.includes(search);

    if (filterType === 'fawry') {
      return matchesSearch && (w.wallet_type === 'ماكينة' || w.wallet_name.includes('فوري') || w.wallet_name.includes('بساطة'));
    }
    if (filterType === 'cash') {
      return matchesSearch && (w.wallet_type === 'محفظة' && !w.wallet_name.includes('فوري') && !w.wallet_name.includes('بساطة'));
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Coins className="w-7 h-7 text-amber-400" />
            <span>المحافظ والخدمات المالية</span>
          </h1>
          <p className="text-slate-400 text-sm">
            تسجيل حركات الإيداع والسحب لـ <strong className="text-amber-400 font-bold">ماكينات فوري وبساطة</strong> و <strong className="text-blue-400 font-bold">محافظ كاش وفودافون كاش</strong>
          </p>
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

      {/* Search & Filter Header Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم المحفظة، الرقم، أو المسؤول..."
            className="w-full pr-10 pl-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            جميع المحافظ ({machinesList.length})
          </button>
          <button
            onClick={() => setFilterType('fawry')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'fawry'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            ماكينات فوري وبساطة
          </button>
          <button
            onClick={() => setFilterType('cash')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'cash'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            محافظ كاش
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري تحميل المحافظ والماكينات...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">النوع</th>
                  <th className="px-4 py-3.5">اسم المحفظة / الماكينة</th>
                  <th className="px-4 py-3.5">رقم المحفظة</th>
                  <th className="px-4 py-3.5">الرصيد الحالي</th>
                  <th className="px-4 py-3.5">مسؤول العهدة</th>
                  <th className="px-4 py-3.5 text-center">الإجراءات والعمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredWallets.map((w) => {
                  const isFawry = w.wallet_type === 'ماكينة' || w.wallet_name.includes('فوري') || w.wallet_name.includes('بساطة');
                  return (
                    <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          isFawry
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
                          {w.wallet_type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-white text-base">
                        {w.wallet_name}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-400">
                        {w.wallet_number || '—'}
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-emerald-400 text-lg">
                        {Number(w.current_balance).toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-400">ج.م</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-300">
                        {w.custodian_name || 'عهدة عامة'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedWallet(w);
                              setActionType('إيداع');
                            }}
                            className="py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                            <span>إيداع / تحويل</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedWallet(w);
                              setActionType('سحب');
                            }}
                            className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                            <span>سحب / استلام</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {actionType && selectedWallet && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-700 bg-slate-900 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>عملية {actionType} — {selectedWallet.wallet_name}</span>
            </h3>

            <form onSubmit={handleTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">المبلغ (ج.م)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">العمولة (اختياري - ج.م)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="عمولة العملية"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">ملاحظات / اسم العميل (اختياري)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ملاحظات"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionType(null);
                    setSelectedWallet(null);
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 cursor-pointer disabled:opacity-50"
                >
                  <span>تأكيد تسجيل الـ {actionType}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
