'use client';

import { useState, useEffect } from 'react';
import { Cpu, Plus, ArrowUpRight, ArrowDownLeft, CheckCircle2 } from 'lucide-react';

export default function MachinesPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [walletId, setWalletId] = useState('');
  const [transactionType, setTransactionType] = useState('إيداع');
  const [amount, setAmount] = useState('');
  const [commission, setCommission] = useState('');
  const [description, setDescription] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchWallets = async () => {
    try {
      const res = await fetch('/api/wallets');
      if (res.ok) {
        const data = await res.json();
        setWallets(data.externalWallets || []);
        if (data.externalWallets?.length > 0) {
          setWalletId(data.externalWallets[0].id);
        }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId || !amount || Number(amount) <= 0) return;

    setSubmitting(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId,
          transactionType,
          amount: Number(amount),
          commission: Number(commission || 0),
          description
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ عملية الماكينة');

      setSuccessMsg(`تم إكمال عملية الـ ${transactionType} بمبلغ ${amount} ج.م وتحديث المحفظة بنجاح 🎉`);
      setAmount('');
      setCommission('');
      setDescription('');
      fetchWallets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-7 h-7 text-amber-400" />
            <span>الخدمات المالية والماكينات (فوري / كاش)</span>
          </h1>
          <p className="text-slate-400 text-sm">
            تسجيل حركات الإيداع والسحب على ماكينات فوري والمحافظ الإلكترونية
          </p>
        </div>
      </div>

      {/* External Wallets Balance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {wallets.map((w) => (
          <div key={w.id} className="glass-card p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400">{w.wallet_type}</span>
              <span className="text-xs text-slate-400">{w.custodian_name || 'ماكينة عامة'}</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{w.wallet_name}</h3>
            <p className="text-2xl font-extrabold text-emerald-400">
              {Number(w.current_balance).toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-400">ج.م</span>
            </p>
          </div>
        ))}
      </div>

      {/* Machine Transaction Form */}
      <div className="max-w-2xl glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-amber-400" />
          <span>عملية ماكينة / فوري جديدة</span>
        </h2>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">اختر الماكينة / المحفظة</label>
              <select
                required
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.wallet_name} ({w.wallet_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">نوع العملية</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="إيداع">إيداع (Deposit)</option>
                <option value="سحب">سحب (Withdrawal)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">المبلغ (ج.م)</label>
              <input
                type="number"
                step="0.5"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">العمولة (ج.م)</label>
              <input
                type="number"
                step="0.5"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">الوصف / اسم العميل / رقم العملية</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف تفصيلي للعملية..."
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Cpu className="w-5 h-5" />
            <span>تنفيذ عملية الماكينة</span>
          </button>
        </form>
      </div>
    </div>
  );
}
