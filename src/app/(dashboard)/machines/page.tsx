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
  Coins
} from 'lucide-react';

export default function MachinesPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fawryMachines = wallets.filter(
    (w) => (w.wallet_type === 'ماكينة' || w.wallet_name.includes('فوري') || w.wallet_name.includes('بساطة')) && w.wallet_type !== 'درج كاش' && w.wallet_type !== 'درج'
  );

  const cashWallets = wallets.filter(
    (w) => w.wallet_type === 'محفظة' && !w.wallet_name.includes('فوري') && !w.wallet_name.includes('بساطة')
  );

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

      {/* 1. Categorized Section: Fawry Machines */}
      <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-amber-950/10 space-y-4">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <span>ماكينات فوري وبساطة</span>
          </h2>
          <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            {fawryMachines.length} ماكينات شحن/سحب
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fawryMachines.map((w) => (
            <div key={w.id} className="glass-card p-5 rounded-2xl border border-amber-500/30 bg-slate-900/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{w.wallet_type}</span>
                <span className="text-[11px] text-slate-400">مسؤول العهدة: {w.custodian_name || 'عامة'}</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{w.wallet_name}</h3>
                <p className="text-2xl font-extrabold text-amber-400 mt-1">
                  {Number(w.current_balance).toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-400">ج.م</span>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setSelectedWallet(w);
                    setActionType('إيداع');
                  }}
                  className="flex-1 py-2 px-3 bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>إيداع ماكينة</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedWallet(w);
                    setActionType('سحب');
                  }}
                  className="flex-1 py-2 px-3 bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                  <span>سحب ماكينة</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Categorized Section: Vodafone Cash Wallets */}
      <div className="glass-panel p-6 rounded-3xl border border-blue-500/30 bg-blue-950/10 space-y-4">
        <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-400" />
            <span>محافظ كاش وفودافون كاش</span>
          </h2>
          <span className="text-xs text-blue-400 font-semibold bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            {cashWallets.length} محافظ إلكترونية
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cashWallets.map((w) => (
            <div key={w.id} className="glass-card p-5 rounded-2xl border border-blue-500/30 bg-slate-900/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{w.wallet_type}</span>
                <span className="text-[11px] text-slate-400">مسؤول العهدة: {w.custodian_name || 'عامة'}</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{w.wallet_name}</h3>
                {w.wallet_number && <p className="text-xs text-slate-400 font-mono mt-0.5">{w.wallet_number}</p>}
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                  {Number(w.current_balance).toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-400">ج.م</span>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setSelectedWallet(w);
                    setActionType('إيداع');
                  }}
                  className="flex-1 py-2 px-3 bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                  <span>تحويل / إيداع</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedWallet(w);
                    setActionType('سحب');
                  }}
                  className="flex-1 py-2 px-3 bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                  <span>استلام / سحب</span>
                </button>
              </div>
            </div>
          ))}
        </div>
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
