'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, Play, Square, CheckCircle2, AlertTriangle, Wallet, ArrowRight, 
  History, ArrowLeftRight, Check, X, ShieldAlert 
} from 'lucide-react';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [shiftType, setShiftType] = useState('صباحي');
  const [shiftNote, setShiftNote] = useState('');
  const [msg, setMsg] = useState('');

  // Cash / Wallet transfers state
  const [users, setUsers] = useState<any[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [transferReceiverId, setTransferReceiverId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  const fetchShifts = async () => {
    try {
      const res = await fetch(`/api/shifts?page=1&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfersData = async () => {
    try {
      const [tRes, uRes] = await Promise.all([
        fetch('/api/transfers?type=pending'),
        fetch('/api/users')
      ]);
      if (tRes.ok) {
        const tData = await tRes.json();
        setPendingTransfers(tData.transfers || []);
      }
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchTransfersData();
  }, []);

  const handleStartShift = async () => {
    setSubmitting(true);
    setMsg('');

    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', shiftType, shiftNote })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل بدء الشفت');

      setMsg('تم بدء الشفت بنجاح 🎉 يمكنك استلام العهدة والمحافظ مباشرة من الأسفل');
      setShiftNote('');
      fetchShifts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeShift = shifts.find((s) => !s.end_time);

  const handleEndShift = async (shiftId: string) => {
    setSubmitting(true);
    setMsg('');

    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', shiftId, shiftNote })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إنهاء الشفت');

      setMsg('تم إنهاء الشفت بنجاح ✅');
      fetchShifts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle send cash / custody transfer
  const handleSendTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferReceiverId || !transferAmount) return;

    setTransferSubmitting(true);
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          receiverId: transferReceiverId,
          amount: parseFloat(transferAmount),
          note: transferNote
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسليم العهدة');

      alert('تم إرسال العهدة بنجاح بانتظار موافقة المستلم 👍');
      setTransferAmount('');
      setTransferNote('');
      fetchTransfersData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Handle accept/reject transfer
  const handleRespondTransfer = async (transferId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond',
          transferId,
          status
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل معالجة الطلب');

      alert(status === 'ACCEPTED' ? 'تم استلام العهدة بنجاح ✅' : 'تم رفض التسليم ❌');
      fetchTransfersData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="w-7 h-7 text-cyan-400" />
          <span>إدارة الشفتات</span>
        </h1>

        <Link
          href="/shifts-history"
          className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
        >
          <History className="w-4 h-4" />
          <span>سجل الشفتات الكامل</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Start / End Current Shift */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span>حالة الشفت الحالي</span>
          </h2>

          {msg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          {activeShift ? (
            <div className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 space-y-4 text-right">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-lg">
                  شفت نشط الآن
                </span>
                <span className="text-xs text-slate-400">{activeShift.shift_type}</span>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-slate-300">
                  وقت البداية: <span className="font-bold text-white">{new Date(activeShift.start_time).toLocaleTimeString('ar-EG')}</span>
                </p>
                <p className="text-xs text-slate-400">
                  الموظف: <span className="text-slate-200">{activeShift.employee_name || 'أنت'}</span>
                </p>
              </div>

              <div className="pt-2">
                <input
                  type="text"
                  value={shiftNote}
                  onChange={(e) => setShiftNote(e.target.value)}
                  placeholder="ملاحظات عند إغلاق الشفت (اختياري)..."
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 mb-3"
                />
                <button
                  onClick={() => handleEndShift(activeShift.id)}
                  disabled={submitting}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Square className="w-4 h-4" />
                  <span>إنهاء الشفت الحالي</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">نوع الشفت</label>
                <select
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="صباحي">صباحي (Morning)</option>
                  <option value="مسائي">مسائي (Evening)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">ملاحظات البداية</label>
                <input
                  type="text"
                  value={shiftNote}
                  onChange={(e) => setShiftNote(e.target.value)}
                  placeholder="ملاحظات عند بدء الشفت..."
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                onClick={handleStartShift}
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>بدء شفت جديد</span>
              </button>
            </div>
          )}
        </div>

        {/* Card 2: Handover / Receive Custody & Cash Drawer */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
            <span>تسليم واستلام العهدة والمحافظ والدرج</span>
          </h2>

          {/* Pending Custody Requests to Accept */}
          {pendingTransfers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
                <span>طلبات استلام معلقة تنتظر موافقتك:</span>
              </h3>
              {pendingTransfers.map((t) => (
                <div key={t.id} className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white">من: {t.sender_name}</p>
                    <p className="text-amber-300 font-mono font-extrabold mt-0.5">المبلغ: {Number(t.amount).toFixed(2)} ج.م</p>
                    {t.sender_note && <p className="text-slate-400 text-[10px]">{t.sender_note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespondTransfer(t.id, 'ACCEPTED')}
                      className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1"
                      title="موافقة واستلام"
                    >
                      <Check className="w-4 h-4" />
                      <span>استلام</span>
                    </button>
                    <button
                      onClick={() => handleRespondTransfer(t.id, 'REJECTED')}
                      className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-bold flex items-center gap-1"
                      title="رفض"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form to Send/Handover Custody */}
          <form onSubmit={handleSendTransfer} className="space-y-4 pt-1 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-300">تسليم عهدة / ماكينة لموظف آخر:</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">الموظف المستلم</label>
                <select
                  required
                  value={transferReceiverId}
                  onChange={(e) => setTransferReceiverId(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- اختر الموظف --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role === 'manager' ? 'مدير' : 'موظف'})</option>
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
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="المبلغ ج.م"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">بيان العهدة / ملاحظات التسليم</label>
              <input
                type="text"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="مثال: تسليم عهدة ماكينة فوري أو كاش الدرج..."
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={transferSubmitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>إرسال طلب تسليم العهدة</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
