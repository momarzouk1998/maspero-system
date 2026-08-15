'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, Play, Square, CheckCircle2, AlertTriangle, Wallet, ArrowRight, 
  History, ArrowLeftRight, Check, X, ShieldAlert, Cpu, Lock, CheckCircle, 
  UserCheck, RefreshCw, AlertCircle, Info, MessageSquare, ThumbsUp, ThumbsDown, 
  PlusCircle, Send, Ban, User, Trash2
} from 'lucide-react';

import { getActiveUsers, formatNumber } from '@/lib/user-utils';

export default function ShiftsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
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
    onlineCashiers?: any[];
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
    pendingHandovers: [],
    onlineCashiers: []
  });

  // Peer Cash Transfers List
  const [transfers, setTransfers] = useState<any[]>([]);

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

  // Peer Cash Transfers Form State
  const [users, setUsers] = useState<any[]>([]);
  const [peerReceiverId, setPeerReceiverId] = useState<string>('');
  const [peerAmount, setPeerAmount] = useState<string>('');
  const [peerNote, setPeerNote] = useState<string>('');
  const [peerSubmitting, setPeerSubmitting] = useState(false);

  const fetchShiftsAndCustody = async () => {
    setLoading(true);
    try {
      const [sRes, cRes, uRes, tRes] = await Promise.all([
        fetch('/api/shifts?page=1&limit=10'),
        fetch('/api/custody/handover'),
        fetch('/api/users'),
        fetch('/api/transfers?type=active')
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
        setUsers(getActiveUsers(uData.users || []));
      }

      if (tRes.ok) {
        const tData = await tRes.json();
        setTransfers(tData.transfers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setCurrentUser(data.user))
      .catch(() => {});

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

  const activeShift = shifts.find((s) => !s.end_time && s.employee_id === currentUser?.id);

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
          receiverId: deliverReceiverId,
          actualBalance: actualBalanceInput ? parseFloat(actualBalanceInput) : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال التسليم');

      showToast(data.message || 'تم إرسال طلب التسليم بنجاح 👍');
      setDeliverModalItem(null);
      setDeliverReceiverId('');
      setActualBalanceInput('');
      fetchShiftsAndCustody();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDeliverSubmitting(false);
    }
  };

  // Submit Bulk Deliver All Items to Maspero Center (Single-Click Day Closing)
  const handleDeliverAllToMaspero = async () => {
    if (!confirm('تسليم كافة المحافظ والماكينات المسجلة في عهدتك مباشرة لـ (ماسـبيرو - المركز الرئيسي)؟')) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/custody/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deliver_all' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسليم العهدة');
      showToast(data.message || 'تم تسليم كافة العهد إلى المركز الرئيسي بنجاح 🏛️');
      fetchShiftsAndCustody();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
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

  // Send Peer-to-Peer Cash Transfer (Stacked Vertical Form)
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
      setPeerReceiverId('');
      setPeerAmount('');
      setPeerNote('');
      fetchShiftsAndCustody();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPeerSubmitting(false);
    }
  };

  // Respond to Peer Transfer (Accept / Reject)
  const handleRespondTransfer = async (transferId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond', transferId, status })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التفاعل مع التحويل');

      showToast(status === 'ACCEPTED' ? 'تم قبول استلام النقدية بنجاح 👍' : 'تم رفض التحويل');
      fetchShiftsAndCustody();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Cancel Peer Transfer (Sender cancels pending transfer)
  const handleCancelTransfer = async (transferId: string) => {
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', transferId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إلغاء التحويل');

      showToast('تم إلغاء طلب تحويل النقدية بنجاح 🚫');
      fetchShiftsAndCustody();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Helper for difference calculation in Dislike Modal
  const expectedVal = receiveModalItem ? Number(receiveModalItem.actual_balance || receiveModalItem.current_balance || 0) : 0;
  const actualVal = parseFloat(actualBalanceInput || '0');
  const diffVal = actualVal - expectedVal;

  let auditTag = { text: 'مطابق', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
  if (diffVal !== 0) {
    if (receiveModalItem?.wallet_type === 'محفظة' && diffVal <= -3 && diffVal >= -10) {
      auditTag = { text: 'عجز طبيعي (رسوم تحويلات)', color: 'text-amber-700 bg-amber-100 border-amber-300' };
    } else if (receiveModalItem?.wallet_type === 'ماكينة' && diffVal >= 20 && diffVal <= 30) {
      auditTag = { text: 'زيادة طبيعية (عمولات شركات)', color: 'text-blue-700 bg-blue-100 border-blue-300' };
    } else {
      auditTag = { text: 'الرجاء المراجعة ⚠️', color: 'text-red-700 bg-red-100 border-red-300' };
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header (Light Mode) */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Clock className="w-7 h-7 text-blue-600" />
            <span>إدارة الشفتات والعهدة</span>
          </h1>

          {/* Item 6 & 7: Online Cashiers Summary Bar (Brief & Concise, no EGP) */}
          {custodyData?.onlineCashiers && custodyData.onlineCashiers.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              <span className="text-xs text-slate-500 font-semibold shrink-0">الموظفون المتاحون:</span>
              {custodyData.onlineCashiers.map((c: any) => (
                <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{c.name}:</span>
                  <span className="font-mono text-emerald-700">{c.balance}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Item 9: Single-Click Bulk Handover to Maspero Center */}
          <button
            onClick={handleDeliverAllToMaspero}
            disabled={submitting}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>🏛️ تسليم جميع العهد لـ ماسـبيرو (المركز)</span>
          </button>

          <Link
            href="/shifts-history"
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-blue-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-2 transition-all shadow-sm"
          >
            <History className="w-4 h-4" />
            <span>سجل الشفتات بالكامل</span>
          </Link>
        </div>
      </div>

      {/* Inline Feedback Toast Banner */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all animate-in fade-in duration-200 ${
          feedbackMsg.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sales Lock Warning Banner */}
      {custodyData.isSalesLocked && (
        <div className="p-4 rounded-2xl border border-red-300 bg-red-50 text-red-800 flex items-start gap-3">
          <Lock className="w-5 h-5 text-red-600 shrink-0 mt-0.5 animate-bounce" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold text-red-700 block mb-0.5">⚠️ المبيعات مقفولة حالياً:</span>
            <span>{custodyData.lockReason}</span>
          </div>
        </div>
      )}

      {/* Active Shift Card & Peer Transfer Form (Equal Width & Height Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Active Shift Action Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 h-full flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>حالة الشفت الحالي</span>
            </h2>
            {activeShift && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 animate-pulse">
                ● نشط الآن
              </span>
            )}
          </div>

          {activeShift ? (
            <div className="flex-1 flex flex-col justify-between space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">نوع الشفت:</span>
                  <span className="text-sm font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                    {activeShift.shift_type || 'صباحي'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">وقت البداية:</span>
                  <span className="text-sm font-bold font-mono text-emerald-800 dir-ltr">
                    {new Date(activeShift.start_time).toLocaleTimeString('en-US')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">الموظف الحالي:</span>
                  <span className="text-sm font-bold text-slate-900">
                    {activeShift.employee_name || 'أنت'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات عند الإغلاق (اختياري)</label>
                  <input
                    type="text"
                    value={shiftNote}
                    onChange={(e) => setShiftNote(e.target.value)}
                    placeholder="أدخل أي ملاحظات قبل إغلاق الشفت..."
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-red-500 shadow-sm"
                  />
                </div>
                <button
                  onClick={() => handleEndShift(activeShift.id)}
                  disabled={submitting}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>إنهاء الشفت الحالي</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between space-y-4 pt-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع الشفت</label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="صباحي">صباحي (Morning)</option>
                    <option value="مسائي">مسائي (Evening)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات البداية</label>
                  <input
                    type="text"
                    value={shiftNote}
                    onChange={(e) => setShiftNote(e.target.value)}
                    placeholder="ملاحظات عند بدء الشفت..."
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={handleStartShift}
                disabled={submitting}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>بدء شفت جديد</span>
              </button>
            </div>
          )}
        </div>

        {/* Peer-to-Peer Cash Transfer Form (Equal Width & Height Layout) */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 h-full flex flex-col justify-between space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
            <span>تحويل نقدية مباشر لموظف آخر</span>
          </h2>

          <form onSubmit={handleSendPeerTransfer} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الموظف المستلم *</label>
              <select
                required
                value={peerReceiverId}
                onChange={(e) => setPeerReceiverId(e.target.value)}
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- اختر الموظف المستلم --</option>
                {users.filter(u => u.id !== activeShift?.employee_id).map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.job_title || 'كاشير'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المالي المراد تحويله *</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                required
                value={peerAmount}
                onChange={(e) => setPeerAmount(e.target.value)}
                placeholder="أدخل المبلغ"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">بيان التحويل / ملاحظات</label>
              <input
                type="text"
                value={peerNote}
                onChange={(e) => setPeerNote(e.target.value)}
                placeholder="سبب أو ملاحظات التحويل..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={peerSubmitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>إرسال تحويل النقدية</span>
            </button>
          </form>
        </div>

      </div>

      {/* ── CUSTODY TABLES (Wallets, Machines, Cash Drawers) ── */}

      {/* 1. WALLETS TABLE */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-600" />
          <span>جدول المحافظ الإلكترونية</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 table-auto">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">المحفظة</th>
                <th className="px-4 py-3 whitespace-nowrap">الرقم</th>
                <th className="px-4 py-3 whitespace-nowrap">الحالة</th>
                <th className="px-4 py-3 whitespace-nowrap">الرصيد</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {custodyData.wallets.map((item: any) => {
                const isCustodyOfUser = item.custodian_id === activeShift?.employee_id;

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{item.wallet_name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{item.wallet_number || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                        isCustodyOfUser
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : item.custodian_name && !item.custodian_name.includes('ماسـبيرو')
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}>
                        {isCustodyOfUser ? '🟡 في عهدتك' : item.custodian_name ? `🟣 ${item.custodian_name.split(' ')[0]}` : '🔵 ماسـبيرو (المركز)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                      {formatNumber(Number(item.actual_balance || item.current_balance || 0))}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {isCustodyOfUser ? (
                        <button
                          onClick={() => setDeliverModalItem(item)}
                          className="py-1.5 px-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-sm"
                        >
                          تسليم
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleFastLikeReceive(item)}
                            className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm"
                            title="مطابق واستلام بنقرة واحدة 👍"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>تأكيد</span>
                          </button>

                          <button
                            onClick={() => openDislikeReceiveModal(item)}
                            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 border border-slate-200"
                            title="تعديل الرصيد الفعلي 👎"
                          >
                            <ThumbsDown className="w-3.5 h-3.5 text-red-600" />
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
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-amber-600" />
          <span>جدول المكن والخدمات</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 table-auto">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">المكن</th>
                <th className="px-4 py-3 whitespace-nowrap">الحالة</th>
                <th className="px-4 py-3 whitespace-nowrap">الرصيد</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {custodyData.machines.map((item: any) => {
                const isCustodyOfUser = item.custodian_id === activeShift?.employee_id;

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{item.wallet_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                        isCustodyOfUser
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : item.custodian_name && !item.custodian_name.includes('ماسـبيرو')
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}>
                        {isCustodyOfUser ? '🟡 في عهدتك' : item.custodian_name ? `🟣 ${item.custodian_name.split(' ')[0]}` : '🔵 ماسـبيرو (المركز)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                      {formatNumber(Number(item.actual_balance || item.current_balance || 0))}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {isCustodyOfUser ? (
                        <button
                          onClick={() => setDeliverModalItem(item)}
                          className="py-1.5 px-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-sm"
                        >
                          تسليم
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleFastLikeReceive(item)}
                            className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm"
                            title="مطابق واستلام بنقرة واحدة 👍"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>تأكيد</span>
                          </button>

                          <button
                            onClick={() => openDislikeReceiveModal(item)}
                            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 border border-slate-200"
                            title="تعديل الرصيد الفعلي 👎"
                          >
                            <ThumbsDown className="w-3.5 h-3.5 text-red-600" />
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
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-600" />
          <span>جدول أدراج الكاشير</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 table-auto">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">الدرج</th>
                <th className="px-4 py-3 whitespace-nowrap">الحالة</th>
                <th className="px-4 py-3 whitespace-nowrap">الرصيد</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">الإجراءات والتحويل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {custodyData.drawers.map((item: any) => {
                const isCustodyOfUser = item.custodian_id === activeShift?.employee_id;

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{item.wallet_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                        isCustodyOfUser ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {isCustodyOfUser ? 'في عهدتك' : 'متاح'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                      {formatNumber(Number(item.actual_balance || item.current_balance || 0))}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {/* Deposit to Drawer Action Button */}
                        <button
                          onClick={() => {
                            setDrawerDepositItem(item);
                            setDepositAmountInput('');
                          }}
                          className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>إيداع بالدرج</span>
                        </button>

                        {isCustodyOfUser ? (
                          <button
                            onClick={() => setDeliverModalItem(item)}
                            className="py-1.5 px-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-sm"
                          >
                            تسليم
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleFastLikeReceive(item)}
                              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm"
                              title="مطابق واستلام 👍"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>تأكيد</span>
                            </button>

                            <button
                              onClick={() => openDislikeReceiveModal(item)}
                              className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200"
                              title="تعديل الرصيد 👎"
                            >
                              <ThumbsDown className="w-3.5 h-3.5 text-red-600" />
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

      {/* 4. PEER CASH TRANSFERS HISTORY TABLE (تحويلات النقدية بين الموظفين) */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
          <span>سجل تحويلات النقدية بين الموظفين</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-700 table-auto">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">التاريخ والوقت</th>
                <th className="px-4 py-3 whitespace-nowrap">المحوّل (المرسل)</th>
                <th className="px-4 py-3 whitespace-nowrap">المستلم</th>
                <th className="px-4 py-3 whitespace-nowrap">المبلغ</th>
                <th className="px-4 py-3 whitespace-nowrap">الحالة</th>
                <th className="px-4 py-3 whitespace-nowrap">ملاحظات</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    لا توجد تحويلات مسجلة
                  </td>
                </tr>
              ) : (
                transfers.map((t: any) => {
                  const isSender = t.sender_id === activeShift?.employee_id;
                  const isReceiver = t.receiver_id === activeShift?.employee_id;
                  const isPending = t.status === 'PENDING';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 font-mono whitespace-nowrap">
                        {t.created_at ? new Date(t.created_at).toLocaleString('en-US') : '-'}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{t.sender_name}</td>
                      <td className="px-4 py-3 font-semibold text-blue-700 whitespace-nowrap">{t.receiver_name}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                        {Number(t.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          t.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          t.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-300' :
                          t.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                          'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                        }`}>
                          {t.status === 'ACCEPTED' ? 'تم القبول' :
                           t.status === 'REJECTED' ? 'مرفوض' :
                           t.status === 'CANCELLED' ? 'ملغى' : 'قيد الانتظار ⏳'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate whitespace-nowrap" title={t.note || ''}>
                        {t.note || '-'}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {isPending && isSender && (
                            <button
                              onClick={() => handleCancelTransfer(t.id)}
                              className="py-1 px-3 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 font-bold rounded-xl text-xs flex items-center gap-1"
                              title="إلغاء التحويل المعلق"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>إلغاء</span>
                            </button>
                          )}

                          {isPending && isReceiver && (
                            <>
                              <button
                                onClick={() => handleRespondTransfer(t.id, 'ACCEPTED')}
                                className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>قبول</span>
                              </button>
                              <button
                                onClick={() => handleRespondTransfer(t.id, 'REJECTED')}
                                className="py-1 px-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>رفض</span>
                              </button>
                            </>
                          )}

                          {currentUser?.role === 'manager' && (
                            <button
                              onClick={async () => {
                                if (!confirm('هل أنت تأكد من رغبتك في حذف هذا التحويل؟')) return;
                                try {
                                  const res = await fetch(`/api/transfers?id=${t.id}`, { method: 'DELETE' });
                                  if (res.ok) {
                                    showToast('تم حذف التحويل بنجاح');
                                    fetchShiftsAndCustody();
                                  }
                                } catch (e) { console.error(e); }
                              }}
                              className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-200 transition-colors"
                              title="حذف التحويل"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISLIKE RECEIVE MODAL (For entering typed actual balance) */}
      {receiveModalItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmReceive} className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ThumbsDown className="w-5 h-5 text-red-600" />
                <span>تعديل رصيد ({receiveModalItem.wallet_name})</span>
              </h3>
              <button type="button" onClick={() => setReceiveModalItem(null)} className="p-1 text-slate-500 hover:text-slate-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-600">الرصيد المتوقع بالسيستم:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{formatNumber(expectedVal)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">أدخل المبلغ الفعلي بين يديك *</label>
                <input
                  type="number"
                  step="0.25"
                  required
                  value={actualBalanceInput}
                  onChange={(e) => setActualBalanceInput(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-lg font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">الفارق:</span>
                  <span className={`font-bold font-mono text-sm ${diffVal < 0 ? 'text-red-600' : diffVal > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                    {diffVal > 0 ? `+${formatNumber(diffVal)}` : formatNumber(diffVal)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-600">حالة التقييم:</span>
                  <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${auditTag.color}`}>
                    {auditTag.text}
                  </span>
                </div>
              </div>

              {diffVal !== 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-amber-700 flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>توضيح سبب الاختلاف (إجباري) *</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={discrepancyReasonInput}
                    onChange={(e) => setDiscrepancyReasonInput(e.target.value)}
                    placeholder="سبب الاختلاف..."
                    className="w-full p-3 bg-white border border-amber-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-200">
              <button
                type="submit"
                disabled={receiveSubmitting}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                تأكيد واستلام
              </button>
              <button
                type="button"
                onClick={() => setReceiveModalItem(null)}
                className="py-3 px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DEPOSIT TO CASH DRAWER MODAL */}
      {drawerDepositItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmDepositToDrawer} className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                <span>إيداع نقدية في ({drawerDepositItem.wallet_name})</span>
              </h3>
              <button type="button" onClick={() => setDrawerDepositItem(null)} className="p-1 text-slate-500 hover:text-slate-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                سيتم تحويل المبلغ المالي من عهدتك النقدية وإضافته مباشرة إلى رصيد {drawerDepositItem.wallet_name}.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">المبلغ المراد إيداعه *</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  required
                  value={depositAmountInput}
                  onChange={(e) => setDepositAmountInput(e.target.value)}
                  placeholder="المبلغ"
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-lg font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-200">
              <button
                type="submit"
                disabled={depositSubmitting}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                تأكيد الإيداع بالدرج
              </button>
              <button
                type="button"
                onClick={() => setDrawerDepositItem(null)}
                className="py-3 px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELIVER CUSTODY MODAL */}
      {deliverModalItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmDeliver} className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-amber-600" />
                <span>تسليم عهدة ({deliverModalItem.wallet_name})</span>
              </h3>
              <button type="button" onClick={() => setDeliverModalItem(null)} className="p-1 text-slate-500 hover:text-slate-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">اختر الموظف المستلم *</label>
                <select
                  required
                  value={deliverReceiverId}
                  onChange={(e) => setDeliverReceiverId(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- اختر الموظف المستلم أو المركز --</option>
                  <option value="maspero">🏢 ماسـبيرو (المركز نفسه)</option>
                  {users.filter(u => u.id !== activeShift?.employee_id).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الرصيد الفعلي المسلم (في حالة وجود عجز/زيادة)</label>
                <input
                  type="number"
                  step="0.25"
                  value={actualBalanceInput}
                  onChange={(e) => setActualBalanceInput(e.target.value)}
                  placeholder={Number(deliverModalItem.actual_balance || deliverModalItem.current_balance || 0).toString()}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-sm font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-200">
              <button
                type="submit"
                disabled={deliverSubmitting}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 disabled:opacity-50"
              >
                إرسال طلب التسليم
              </button>
              <button
                type="button"
                onClick={() => setDeliverModalItem(null)}
                className="py-3 px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl"
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
