'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, Play, Square, CheckCircle2, AlertTriangle, Wallet, ArrowRight, 
  History, ArrowLeftRight, Check, X, ShieldAlert, Cpu, Lock, CheckCircle, 
  UserCheck, RefreshCw, AlertCircle, Info, MessageSquare, ThumbsUp, ThumbsDown, 
  PlusCircle, Send
} from 'lucide-react';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [shiftType, setShiftType] = useState('صباحي');
  const [shiftNote, setShiftNote] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Custody & Handover data
  const [custodyData, setCustodyData] = useState<{
    isUserShiftActive: boolean;
    isMorningOrSoloShift: boolean;
    activeColleaguesCount: number;
    isSalesLocked: boolean;
    lockReason: string;
    wallets: any[];
    machines: any[];
    drawers: any[];
    itemsInUserCustody: any[];
    pendingHandovers: any[];
  }>({
    isUserShiftActive: false,
    isMorningOrSoloShift: true,
    activeColleaguesCount: 0,
    isSalesLocked: true,
    lockReason: '',
    wallets: [],
    machines: [],
    drawers: [],
    itemsInUserCustody: [],
    pendingHandovers: []
  });

  // Modal State for Receiving Custody Item (Dislike 👎)
  const [receiveModalItem, setReceiveModalItem] = useState<any | null>(null);
  const [actualBalanceInput, setActualBalanceInput] = useState<string>('');
  const [discrepancyReasonInput, setDiscrepancyReasonInput] = useState<string>('');
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);

  // Modal State for Delivering Custody Item
  const [deliverModalItem, setDeliverModalItem] = useState<any | null>(null);
  const [deliverReceiverId, setDeliverReceiverId] = useState<string>('');
  const [deliverSubmitting, setDeliverSubmitting] = useState(false);

  // Modal State for Deposit to Cash Drawer (إيداع في الدرج)
  const [drawerDepositItem, setDrawerDepositItem] = useState<any | null>(null);
  const [depositAmountInput, setDepositAmountInput] = useState<string>('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);

  // Peer Cash Transfers State
  const [users, setUsers] = useState<any[]>([]);
  const [peerReceiverId, setPeerReceiverId] = useState<string>('');
  const [peerAmount, setPeerAmount] = useState<string>('');
  const [peerNote, setPeerNote] = useState<string>('');
  const [peerSubmitting, setPeerSubmitting] = useState(false);

  const fetchShiftsAndCustody = async () => {
    setLoading(true);
    try {
      const [sRes, cRes, uRes] = await Promise.all([
        fetch('/api/shifts?page=1&limit=10'),
        fetch('/api/custody/handover'),
        fetch('/api/users')
      ]);

      if (sRes.ok) {
        const sData = await sRes.json();
        setShifts(sData.shifts || []);
      }

      if (cRes.ok) {
        const cData = await cRes.json();
        setCustodyData(cData);
      }

      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftsAndCustody();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleStartShift = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', shiftType, shiftNote })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل بدء الشفت');

      showToast('تم بدء الشفت بنجاح 🎉 برجاء تأكيد الأرصدة والعهد من الجداول أدناه.');
      setShiftNote('');
      fetchShiftsAndCustody();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeShift = shifts.find((s) => !s.end_time);

  const handleEndShift = async (shiftId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', shiftId, shiftNote })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إنهاء الشفت');

      showToast('تم إنهاء الشفت بنجاح ✅');
      fetchShiftsAndCustody();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 1-Click Fast Like 👍 Receive Action (Exact balance match)
  const handleFastLikeReceive = async (item: any) => {
    try {
      const res = await fetch('/api/custody/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fast_receive',
          walletId: item.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تأكيد الاستلام');

      showToast(`تم استلام وتأكيد (${item.wallet_name}) بنجاح 👍`);
      fetchShiftsAndCustody();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Open Dislike 👎 Modal (For entering actual typed balance)
  const openDislikeReceiveModal = (item: any) => {
    setReceiveModalItem(item);
    const expected = Number(item.actual_balance || item.current_balance || 0);
    setActualBalanceInput(expected.toString());
    setDiscrepancyReasonInput('');
  };

  // Submit Receive Custody Form (Dislike Modal)
  const handleConfirmReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveModalItem) return;

    setReceiveSubmitting(true);
    try {
      const res = await fetch('/api/custody/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'receive',
          walletId: receiveModalItem.id,
          actualBalance: parseFloat(actualBalanceInput || '0'),
          discrepancyReason: discrepancyReasonInput
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل استلام العهدة');

      showToast(data.message || 'تم إدخال الرصيد الفعلي واستلام العهدة ✅');
      setReceiveModalItem(null);
      fetchShiftsAndCustody();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setReceiveSubmitting(false);
    }
  };

  // Submit Deliver Custody Form
  const handleConfirmDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverModalItem || !deliverReceiverId) return;

    setDeliverSubmitting(true);
    try {
      const res = await fetch('/api/custody/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deliver',
          walletId: deliverModalItem.id,
          receiverId: deliverReceiverId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال التسليم');

      showToast(data.message || 'تم إرسال طلب التسليم بنجاح 👍');
      setDeliverModalItem(null);
      setDeliverReceiverId('');
      fetchShiftsAndCustody();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDeliverSubmitting(false);
    }
  };

  // Submit Deposit to Cash Drawer Action
  const handleConfirmDepositToDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerDepositItem || !depositAmountInput) return;

    setDepositSubmitting(true);
    try {
      const res = await fetch('/api/custody/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deposit_to_drawer',
          walletId: drawerDepositItem.id,
          amount: parseFloat(depositAmountInput)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الإيداع في الدرج');

      showToast(data.message || 'تم تحويل النقدية وإيداعها في الدرج بنجاح 💰');
      setDrawerDepositItem(null);
      setDepositAmountInput('');
      fetchShiftsAndCustody();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDepositSubmitting(false);
    }
  };

  // Handle Send Peer-to-Peer Cash Transfer
  const handleSendPeerTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peerReceiverId || !peerAmount) return;

    setPeerSubmitting(true);
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          receiverId: peerReceiverId,
          amount: parseFloat(peerAmount),
          note: peerNote
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال التحويل');

      showToast('تم إرسال تحويل النقدية إلى الموظف بانتظار موافقته 👍');
      setPeerAmount('');
      setPeerNote('');
      fetchShiftsAndCustody();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPeerSubmitting(false);
    }
  };

  // Helper for difference calculation in Dislike Modal
  const expectedVal = receiveModalItem ? Number(receiveModalItem.actual_balance || receiveModalItem.current_balance || 0) : 0;
  const actualVal = parseFloat(actualBalanceInput || '0');
  const diffVal = actualVal - expectedVal;

  let auditTag = { text: 'مطابق', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  if (diffVal !== 0) {
    if (receiveModalItem?.wallet_type === 'محفظة' && diffVal <= -3 && diffVal >= -10) {
      auditTag = { text: 'عجز طبيعي (رسوم تحويلات)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    } else if (receiveModalItem?.wallet_type === 'ماكينة' && diffVal >= 20 && diffVal <= 30) {
      auditTag = { text: 'زيادة طبيعية (عمولات شركات)', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    } else {
      auditTag = { text: 'الرجاء المراجعة ⚠️', color: 'text-red-400 bg-red-500/10 border-red-500/30' };
    }
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="glass-panel px-6 py-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="w-6 h-6 text-cyan-400" />
          <span>إدارة الشفتات</span>
        </h1>

        <Link
          href="/shifts-history"
          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
        >
          <History className="w-4 h-4" />
          <span>سجل الشفتات</span>
        </Link>
      </div>

      {/* Inline Feedback Toast Banner */}
      {feedbackMsg && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all animate-in fade-in duration-200 ${
          feedbackMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sales Lock Warning Banner */}
      {custodyData.isSalesLocked && (
        <div className="p-3.5 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-300 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold text-red-400 block mb-0.5">⚠️ المبيعات مقفولة حالياً:</span>
            <span>{custodyData.lockReason}</span>
          </div>
        </div>
      )}

      {/* Active Shift Card & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Active Shift Action Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>حالة الشفت الحالي</span>
          </h2>

          {activeShift ? (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-3 text-right">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded">
                  نشط الآن
                </span>
                <span className="text-xs text-slate-400">{activeShift.shift_type}</span>
              </div>
              
              <div className="space-y-0.5">
                <p className="text-xs text-slate-300">
                  البداية: <span className="font-bold text-white">{new Date(activeShift.start_time).toLocaleTimeString('ar-EG')}</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  الموظف: <span className="text-slate-200">{activeShift.employee_name || 'أنت'}</span>
                </p>
              </div>

              <div className="pt-1">
                <input
                  type="text"
                  value={shiftNote}
                  onChange={(e) => setShiftNote(e.target.value)}
                  placeholder="ملاحظات الإغلاق..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 mb-2.5"
                />
                <button
                  onClick={() => handleEndShift(activeShift.id)}
                  disabled={submitting}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Square className="w-4 h-4" />
                  <span>إنهاء الشفت</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">نوع الشفت</label>
                <select
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="صباحي">صباحي (Morning)</option>
                  <option value="مسائي">مسائي (Evening)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">ملاحظات البداية</label>
                <input
                  type="text"
                  value={shiftNote}
                  onChange={(e) => setShiftNote(e.target.value)}
                  placeholder="ملاحظات عند البدء..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                onClick={handleStartShift}
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>بدء شفت جديد</span>
              </button>
            </div>
          )}
        </div>

        {/* Peer-to-Peer Cash Transfer Form */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
            <span>تحويل نقدية مباشرة بين الموظفين</span>
          </h2>

          <form onSubmit={handleSendPeerTransfer} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">الموظف المستلم</label>
              <select
                required
                value={peerReceiverId}
                onChange={(e) => setPeerReceiverId(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- اختر الموظف --</option>
                {users.filter(u => u.id !== activeShift?.employee_id).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">المبلغ المالي</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                required
                value={peerAmount}
                onChange={(e) => setPeerAmount(e.target.value)}
                placeholder="المبلغ"
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">بيان التحويل</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={peerNote}
                  onChange={(e) => setPeerNote(e.target.value)}
                  placeholder="ملاحظات..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={peerSubmitting}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1 shrink-0 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال</span>
                </button>
              </div>
            </div>
          </form>
        </div>

      </div>

      {/* ── CUSTODY TABLES (Wallets, Machines, Cash Drawers) ── */}

      {/* 1. WALLETS TABLE */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Wallet className="w-4 h-4 text-blue-400" />
          <span>جدول المحافظ</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase border-b border-slate-800">
              <tr>
                <th className="px-3 py-2">المحفظة</th>
                <th className="px-3 py-2">الرقم</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">الرصيد</th>
                <th className="px-3 py-2 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {custodyData.wallets.map((item: any) => {
                const isCustodyOfUser = item.custodian_id === activeShift?.employee_id;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2 font-bold text-white">{item.wallet_name}</td>
                    <td className="px-3 py-2 text-[11px] font-mono text-slate-400">{item.wallet_number || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCustodyOfUser ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isCustodyOfUser ? 'في عهدتك' : 'متاح'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-white">
                      {Number(item.actual_balance || item.current_balance || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isCustodyOfUser ? (
                        <button
                          onClick={() => setDeliverModalItem(item)}
                          className="py-1 px-3 bg-amber-600/80 hover:bg-amber-500 text-white font-bold rounded text-[11px]"
                        >
                          تسليم
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleFastLikeReceive(item)}
                            className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-sm"
                            title="مطابق واستلام بنقرة واحدة 👍"
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>تأكيد</span>
                          </button>

                          <button
                            onClick={() => openDislikeReceiveModal(item)}
                            className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-[11px] flex items-center gap-1"
                            title="تعديل الرصيد الفعلي 👎"
                          >
                            <ThumbsDown className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. MACHINES TABLE */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          <span>جدول المكن</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase border-b border-slate-800">
              <tr>
                <th className="px-3 py-2">المكن</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">الرصيد</th>
                <th className="px-3 py-2 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {custodyData.machines.map((item: any) => {
                const isCustodyOfUser = item.custodian_id === activeShift?.employee_id;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2 font-bold text-white">{item.wallet_name}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCustodyOfUser ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isCustodyOfUser ? 'في عهدتك' : 'متاح'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-white">
                      {Number(item.actual_balance || item.current_balance || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isCustodyOfUser ? (
                        <button
                          onClick={() => setDeliverModalItem(item)}
                          className="py-1 px-3 bg-amber-600/80 hover:bg-amber-500 text-white font-bold rounded text-[11px]"
                        >
                          تسليم
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleFastLikeReceive(item)}
                            className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-sm"
                            title="مطابق واستلام بنقرة واحدة 👍"
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>تأكيد</span>
                          </button>

                          <button
                            onClick={() => openDislikeReceiveModal(item)}
                            className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-[11px] flex items-center gap-1"
                            title="تعديل الرصيد الفعلي 👎"
                          >
                            <ThumbsDown className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. CASH DRAWERS TABLE */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <span>جدول الأدراج</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase border-b border-slate-800">
              <tr>
                <th className="px-3 py-2">الدرج</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">الرصيد</th>
                <th className="px-3 py-2 text-center">الإجراءات والتحويل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {custodyData.drawers.map((item: any) => {
                const isCustodyOfUser = item.custodian_id === activeShift?.employee_id;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2 font-bold text-white">{item.wallet_name}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCustodyOfUser ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isCustodyOfUser ? 'في عهدتك' : 'متاح'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-white">
                      {Number(item.actual_balance || item.current_balance || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Deposit to Drawer Action Button */}
                        <button
                          onClick={() => {
                            setDrawerDepositItem(item);
                            setDepositAmountInput('');
                          }}
                          className="py-1 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-sm"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>إيداع بالدرج</span>
                        </button>

                        {isCustodyOfUser ? (
                          <button
                            onClick={() => setDeliverModalItem(item)}
                            className="py-1 px-3 bg-amber-600/80 hover:bg-amber-500 text-white font-bold rounded text-[11px]"
                          >
                            تسليم
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleFastLikeReceive(item)}
                              className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-sm"
                              title="مطابق واستلام 👍"
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => openDislikeReceiveModal(item)}
                              className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-[11px]"
                              title="تعديل الرصيد 👎"
                            >
                              <ThumbsDown className="w-3 h-3 text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISLIKE RECEIVE MODAL (For entering typed actual balance) */}
      {receiveModalItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmReceive} className="glass-panel w-full max-w-md p-5 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ThumbsDown className="w-4 h-4 text-red-400" />
                  <span>تعديل رصيد ({receiveModalItem.wallet_name})</span>
                </h3>
              </div>
              <button type="button" onClick={() => setReceiveModalItem(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">الرصيد المتوقع بالسيستم:</span>
                <span className="font-bold text-white font-mono">{expectedVal.toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">أدخل المبلغ الفعلي بين يديك *</label>
                <input
                  type="number"
                  step="0.25"
                  required
                  value={actualBalanceInput}
                  onChange={(e) => setActualBalanceInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">الفارق:</span>
                  <span className={`font-bold font-mono ${diffVal < 0 ? 'text-red-400' : diffVal > 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                    {diffVal > 0 ? `+${diffVal.toFixed(2)}` : diffVal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/60">
                  <span className="text-slate-400">حالة التقييم:</span>
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${auditTag.color}`}>
                    {auditTag.text}
                  </span>
                </div>
              </div>

              {diffVal !== 0 && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-amber-400 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>توضيح سبب الاختلاف (إجباري) *</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={discrepancyReasonInput}
                    onChange={(e) => setDiscrepancyReasonInput(e.target.value)}
                    placeholder="سبب الاختلاف..."
                    className="w-full p-2.5 bg-slate-900 border border-amber-500/40 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="submit"
                disabled={receiveSubmitting}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                تأكيد واستلام
              </button>
              <button
                type="button"
                onClick={() => setReceiveModalItem(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DEPOSIT TO CASH DRAWER MODAL */}
      {drawerDepositItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmDepositToDrawer} className="glass-panel w-full max-w-md p-5 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-400" />
                <span>إيداع نقدية في ({drawerDepositItem.wallet_name})</span>
              </h3>
              <button type="button" onClick={() => setDrawerDepositItem(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                سيتم تحويل المبلغ المالي من عهدتك النقدية وإضافته مباشرة إلى رصيد {drawerDepositItem.wallet_name}.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">المبلغ المراد إيداعه *</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  required
                  value={depositAmountInput}
                  onChange={(e) => setDepositAmountInput(e.target.value)}
                  placeholder="المبلغ"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="submit"
                disabled={depositSubmitting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                تأكيد الإيداع بالدرج
              </button>
              <button
                type="button"
                onClick={() => setDrawerDepositItem(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELIVER CUSTODY MODAL */}
      {deliverModalItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmDeliver} className="glass-panel w-full max-w-md p-5 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-amber-400" />
                <span>تسليم عهدة ({deliverModalItem.wallet_name})</span>
              </h3>
              <button type="button" onClick={() => setDeliverModalItem(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">اختر الموظف المستلم *</label>
                <select
                  required
                  value={deliverReceiverId}
                  onChange={(e) => setDeliverReceiverId(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- اختر الموظف --</option>
                  {users.filter(u => u.id !== activeShift?.employee_id).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="submit"
                disabled={deliverSubmitting}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 disabled:opacity-50"
              >
                إرسال طلب التسليم
              </button>
              <button
                type="button"
                onClick={() => setDeliverModalItem(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
