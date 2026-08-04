'use client';

import { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Cpu,
  AlertCircle,
  Coins,
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  Smartphone
} from 'lucide-react';

export default function WalletPage() {
  const [user, setUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [externalWallets, setExternalWallets] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Cash Transfer Form State
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cash Drawer Modal State
  const [drawerAction, setDrawerAction] = useState<'deposit' | 'claim' | null>(null);
  const [selectedDrawer, setSelectedDrawer] = useState<any>(null);
  const [drawerAmount, setDrawerAmount] = useState('');
  const [drawerNotes, setDrawerNotes] = useState('');

  const fetchData = async () => {
    try {
      const [meRes, empRes, transferRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/wallets'),
        fetch('/api/transfers?type=all')
      ]);

      if (meRes.ok) {
        const data = await meRes.json();
        setUser(data.user);
      }

      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data.employeeWallets || []);
        setExternalWallets(data.externalWallets || []);
      }

      if (transferRes.ok) {
        const data = await transferRes.json();
        setTransfers(data.transfers || []);
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

  // Send cash transfer to another employee
  const handleSendTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId || !amount || Number(amount) <= 0) {
      setMessage({ type: 'error', text: 'يرجى اختيار الموظف وإدخال مبلغ صحيح' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          receiverId,
          amount: Number(amount),
          note
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال التحويل');

      setMessage({ type: 'success', text: 'تم إرسال طلب تسليم النقدية للموظف بنجاح وفي انتظار قبوله' });
      setAmount('');
      setNote('');
      setReceiverId('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Drawer Deposit or Claim
  const handleDrawerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrawer || !drawerAction || !drawerAmount || Number(drawerAmount) <= 0) {
      setMessage({ type: 'error', text: 'يرجى إدخال مبلغ صحيح للدرج' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/wallets/drawer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawerId: selectedDrawer.id,
          action: drawerAction,
          amount: Number(drawerAmount),
          notes: drawerNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تنفيذ عملية الدرج');

      setMessage({ type: 'success', text: data.message || 'تمت عملية الدرج بنجاح 🎉' });
      setDrawerAction(null);
      setSelectedDrawer(null);
      setDrawerAmount('');
      setDrawerNotes('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Accept or Reject incoming cash transfer
  const handleTransferAction = async (transferId: string, action: 'accept' | 'reject') => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, transferId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تنفيذ الإجراء');

      setMessage({
        type: 'success',
        text: action === 'accept' ? 'تم قبول تسليم النقدية وتحديث عهدتك النقدية بنجاح 🎉' : 'تم رفض طلب التسليم'
      });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingIncoming = transfers.filter(
    (t) => t.receiver_id === user?.id && t.status === 'PENDING'
  );

  const drawersList = externalWallets.filter((w) => w.wallet_type === 'درج كاش' || w.wallet_type === 'درج');
  const machinesList = externalWallets.filter((w) => w.wallet_type !== 'درج كاش' && w.wallet_type !== 'درج');

  // Separated lists for Fawry vs Vodafone Cash Wallets
  const fawryMachines = machinesList.filter(
    (w) => w.wallet_type === 'ماكينة' || w.wallet_name.includes('فوري') || w.wallet_name.includes('بساطة')
  );
  const cashWallets = machinesList.filter(
    (w) => w.wallet_type === 'محفظة' && !w.wallet_name.includes('فوري') && !w.wallet_name.includes('بساطة')
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Coins className="w-7 h-7 text-emerald-400" />
            <span>المحافظ</span>
          </h1>
          <p className="text-slate-400 text-sm">
            إدارة مفصلة لـ <strong className="text-emerald-400">العهدة الكاش للشخص</strong>، <strong className="text-purple-400">أدراج الكاش 1 و 2 و 3</strong>، وتصنيف خاص لـ <strong className="text-amber-400 font-bold">ماكينات فوري</strong> و <strong className="text-blue-400 font-bold">محافظ كاش</strong>
          </p>
        </div>

        {/* Cash Custody Card */}
        <div className="glass-card px-6 py-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex items-center gap-4">
          <Wallet className="w-8 h-8 text-emerald-400" />
          <div>
            <span className="text-xs text-slate-400 block font-medium">عهدتك الشخصية الكاش (الحالية)</span>
            <span className={`text-3xl font-extrabold ${Number(user?.wallet_balance || 0) < 0 ? 'text-rose-400' : 'text-white'}`}>
              {Number(user?.wallet_balance || 0).toLocaleString('ar-EG')} <span className="text-sm font-normal text-emerald-400">ج.م</span>
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* 3 Cash Drawers Section (24/7 Access for Any Employee) */}
      <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-purple-950/20 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-purple-400" />
            <span>أدراج الأمانات الثلاثة (درج 1، درج 2، درج 3)</span>
          </h2>
          <span className="text-xs text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30 font-semibold">
            إيداع واستلام متاح 24 ساعة لأي موظف
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {drawersList.map((drawer) => (
            <div key={drawer.id} className="glass-card p-5 rounded-2xl border border-purple-500/30 bg-slate-900/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20">
                  {drawer.wallet_type}
                </span>
                <span className="text-[11px] text-slate-400">أمانات وسيطة</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{drawer.wallet_name}</h3>
                <p className="text-2xl font-extrabold text-purple-300 mt-1">
                  {Number(drawer.current_balance).toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-400">ج.م</span>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setSelectedDrawer(drawer);
                    setDrawerAction('deposit');
                  }}
                  className="flex-1 py-2 px-3 bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
                  <span>إيداع بالدرج</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedDrawer(drawer);
                    setDrawerAction('claim');
                  }}
                  className="flex-1 py-2 px-3 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>استلام من الدرج</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drawer Action Modal */}
      {drawerAction && selectedDrawer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-purple-500/40 bg-slate-900 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Archive className="w-5 h-5 text-purple-400" />
              <span>{drawerAction === 'deposit' ? 'إيداع عهدة كاش في' : 'استلام كاش من'} {selectedDrawer.wallet_name}</span>
            </h3>

            <form onSubmit={handleDrawerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">المبلغ المراد {drawerAction === 'deposit' ? 'إيداعه' : 'استلامه'} (ج.م)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={drawerAmount}
                  onChange={(e) => setDrawerAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">ملاحظات (اختياري)</label>
                <textarea
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  rows={2}
                  placeholder="تسليم الشفت / أمانات..."
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDrawerAction(null);
                    setSelectedDrawer(null);
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    drawerAction === 'deposit'
                      ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                >
                  <span>تأكيد {drawerAction === 'deposit' ? 'الإيداع' : 'الاستلام'}</span>
                </button>
              </div>
            </form>
          </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {fawryMachines.map((w) => (
            <div key={w.id} className="glass-card p-4 rounded-2xl border border-amber-500/30 bg-slate-900/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{w.wallet_type}</span>
                <span className="text-[11px] text-slate-400">عهدة: {w.custodian_name || 'عامة'}</span>
              </div>
              <h3 className="font-bold text-white text-base">{w.wallet_name}</h3>
              <p className="text-2xl font-extrabold text-amber-400 mt-2">
                {Number(w.current_balance).toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-400">ج.م</span>
              </p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cashWallets.map((w) => (
            <div key={w.id} className="glass-card p-4 rounded-2xl border border-blue-500/30 bg-slate-900/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{w.wallet_type}</span>
                <span className="text-[11px] text-slate-400">عهدة: {w.custodian_name || 'عامة'}</span>
              </div>
              <h3 className="font-bold text-white text-base">{w.wallet_name}</h3>
              {w.wallet_number && <p className="text-xs text-slate-400 font-mono mt-0.5">{w.wallet_number}</p>}
              <p className="text-2xl font-extrabold text-emerald-400 mt-2">
                {Number(w.current_balance).toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-400">ج.م</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Incoming Cash Transfers Section */}
      {pendingIncoming.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-amber-500/40 bg-amber-500/5 space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-lg">
            <Clock className="w-6 h-6 animate-spin" />
            <span>طلبات تسليم نقدية في انتظار قبولك ({pendingIncoming.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingIncoming.map((t) => (
              <div key={t.id} className="glass-card p-4 rounded-2xl border border-amber-500/30 bg-slate-900/80 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">المُرسِل: <span className="text-white font-bold">{t.sender_name}</span></p>
                  <p className="text-2xl font-extrabold text-emerald-400">{Number(t.amount).toLocaleString('ar-EG')} ج.م</p>
                  {t.sender_note && <p className="text-xs text-slate-400 mt-1">ملاحظة: {t.sender_note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTransferAction(t.id, 'accept')}
                    disabled={submitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center gap-1 shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>قبول واستلام العهدة</span>
                  </button>
                  <button
                    onClick={() => handleTransferAction(t.id, 'reject')}
                    disabled={submitting}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold text-sm rounded-xl border border-red-500/30 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>رفض</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Send Cash Transfer Form & Transfer History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Cash Transfer Form */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-400" />
            <span>تسليم نقدية كاش لموظف آخر</span>
          </h2>

          <form onSubmit={handleSendTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">اختر الموظف المستلم</label>
              <select
                required
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">-- اختر موظف من القائمة --</option>
                {employees
                  .filter((emp) => emp.id !== user?.id)
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.job_title || 'موظف'})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">المبلغ الكاش المراد تسليمه (ج.م)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="أدخل المبلغ"
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">ملاحظات (اختياري)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="تسليم نقدية وردية / تصفية حجز..."
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>إرسال طلب التسليم</span>
            </button>
          </form>
        </div>

        {/* Transfer History Table */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
            <span>سجل تحويلات النقدية وتسليم العهد</span>
          </h2>

          {transfers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">لا توجد تحويلات سابقة حتى الآن</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm text-slate-300">
                <thead className="bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">المُرسِل</th>
                    <th className="px-4 py-3">المستلِم</th>
                    <th className="px-4 py-3">المبلغ</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transfers.map((t) => {
                    const isSender = t.sender_id === user?.id;
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-medium text-white">
                          {isSender ? <span className="text-blue-400 font-bold">أنت</span> : t.sender_name}
                        </td>
                        <td className="px-4 py-3 font-medium text-white">
                          {t.receiver_id === user?.id ? <span className="text-emerald-400 font-bold">أنت</span> : t.receiver_name}
                        </td>
                        <td className="px-4 py-3 font-extrabold text-white">
                          {Number(t.amount).toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="px-4 py-3">
                          {t.status === 'ACCEPTED' && (
                            <span className="px-2.5 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 inline-flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> تم الاستلام
                            </span>
                          )}
                          {t.status === 'PENDING' && (
                            <span className="px-2.5 py-1 text-xs font-bold bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 animate-spin" /> قيد الإنتظار
                            </span>
                          )}
                          {t.status === 'REJECTED' && (
                            <span className="px-2.5 py-1 text-xs font-bold bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 inline-flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> مرفوض
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(t.created_at).toLocaleString('ar-EG')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
