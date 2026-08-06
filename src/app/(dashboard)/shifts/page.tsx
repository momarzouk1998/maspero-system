'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Play, Square, CheckCircle2, Wallet, ArrowRight, AlertCircle, Archive, ArrowUpRight, ArrowDownLeft, Send, CheckCircle, XCircle } from 'lucide-react';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [shiftType, setShiftType] = useState('صباحي');
  const [shiftNote, setShiftNote] = useState('');
  const [msg, setMsg] = useState('');

  // Wallet & Handovers State
  const [user, setUser] = useState<any>(null);
  const [externalWallets, setExternalWallets] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Drawer Modal
  const [drawerAction, setDrawerAction] = useState<'deposit' | 'claim' | null>(null);
  const [selectedDrawer, setSelectedDrawer] = useState<any>(null);
  const [drawerAmount, setDrawerAmount] = useState('');
  const [drawerNotes, setDrawerNotes] = useState('');
  
  // Send Transfer
  const [receiverId, setReceiverId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');

  const fetchData = async () => {
    try {
      const [shiftsRes, meRes, empRes, transferRes] = await Promise.all([
        fetch('/api/shifts?page=1&limit=5'),
        fetch('/api/auth/me'),
        fetch('/api/wallets'),
        fetch('/api/transfers?type=all')
      ]);

      if (shiftsRes.ok) {
        const data = await shiftsRes.json();
        setShifts(data.shifts || []);
        setActiveShift(data.shifts?.find((s: any) => !s.end_time) || null);
      }
      if (meRes.ok) {
        const data = await meRes.json();
        setUser(data.user);
      }
      if (empRes.ok) {
        const data = await empRes.json();
        setExternalWallets(data.externalWallets || []);
        setEmployees(data.employeeWallets || []);
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

      setMsg('تم بدء الشفت بنجاح 🎉 يمكنك الآن استلام العهدة');
      setShiftNote('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndShift = async (shiftId: string) => {
    if(!confirm("هل أنت متأكد من إنهاء الشفت؟ تأكد من تسليم عهدتك النقدية أولاً.")) return;
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
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Drawer Submit
  const handleDrawerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrawer || !drawerAction || !drawerAmount || Number(drawerAmount) <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }
    setSubmitting(true);
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
      if (!res.ok) throw new Error(data.error || 'فشل العملية');
      alert(data.message || 'تمت العملية بنجاح 🎉');
      setDrawerAction(null);
      setSelectedDrawer(null);
      setDrawerAmount('');
      setDrawerNotes('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Send Cash
  const handleSendTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId || !transferAmount || Number(transferAmount) <= 0) {
      alert('يرجى إدخال مبلغ صحيح واختيار موظف');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', receiverId, amount: Number(transferAmount), note: transferNote })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الإرسال');
      alert('تم إرسال العهدة بنجاح بانتظار القبول');
      setTransferAmount('');
      setTransferNote('');
      setReceiverId('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Accept/Reject Transfer
  const handleTransferAction = async (transferId: string, action: 'accept' | 'reject') => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, transferId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الإجراء');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const drawersList = externalWallets.filter((w) => w.wallet_type === 'درج كاش' || w.wallet_type === 'درج');
  const pendingIncoming = transfers.filter((t) => t.receiver_id === user?.id && t.status === 'PENDING');

  if (loading) return <div className="text-center p-10 text-slate-400">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-7 h-7 text-cyan-400" />
            <span>إدارة الشفتات والعهد</span>
          </h1>
        </div>
        <div className="text-left">
          <p className="text-sm text-slate-400">عهدتك الحالية</p>
          <p className={`text-2xl font-extrabold ${Number(user?.wallet_balance || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {Number(user?.wallet_balance || 0).toLocaleString('ar-EG')} <span className="text-xs">ج.م</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Shift & Actions Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span>حالة الشفت</span>
          </h2>

          {msg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          {activeShift ? (
            <div className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 space-y-3 text-right">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg">شفت نشط الآن</span>
                <span className="text-xs text-slate-400">{activeShift.shift_type}</span>
              </div>
              <p className="text-sm text-slate-300">
                البداية: <span className="font-bold text-white">{new Date(activeShift.start_time).toLocaleTimeString('ar-EG')}</span>
              </p>
              <button
                onClick={() => handleEndShift(activeShift.id)}
                disabled={submitting}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                <span>إنهاء الشفت</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">نوع الشفت</label>
                <select value={shiftType} onChange={(e) => setShiftType(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm">
                  <option value="صباحي">صباحي (Morning)</option>
                  <option value="مسائي">مسائي (Evening)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">ملاحظات الشفت</label>
                <input type="text" value={shiftNote} onChange={(e) => setShiftNote(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm" />
              </div>
              <button
                onClick={handleStartShift}
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>بدء الشفت</span>
              </button>
            </div>
          )}
        </div>

        {/* Wallets & Drawer Handovers */}
        <div className="lg:col-span-2 space-y-6">
          {pendingIncoming.length > 0 && (
            <div className="glass-panel p-5 rounded-3xl border border-amber-500/40 bg-amber-500/5 space-y-3">
              <h3 className="text-amber-400 font-bold text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 animate-pulse" />
                طلبات استلام عهدة مرسلة إليك
              </h3>
              {pendingIncoming.map((t) => (
                <div key={t.id} className="p-3 bg-slate-900/80 rounded-xl border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">من: <span className="text-white">{t.sender_name}</span></p>
                    <p className="text-xl font-bold text-emerald-400">{Number(t.amount)} ج</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleTransferAction(t.id, 'accept')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle className="w-4 h-4"/> قبول</button>
                    <button onClick={() => handleTransferAction(t.id, 'reject')} className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-xs font-bold border border-red-500/30">رفض</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
             <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-400" />
                <span>تسليم نقدية (لموظف آخر)</span>
              </h2>
              <form onSubmit={handleSendTransfer} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select required value={receiverId} onChange={(e) => setReceiverId(e.target.value)} className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm">
                  <option value="">-- اختر الموظف --</option>
                  {employees.filter(emp => emp.id !== user?.id).map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                <input required type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="المبلغ" className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm" />
                <button type="submit" disabled={submitting} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">إرسال العهدة</button>
              </form>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-purple-500/20 bg-purple-950/10 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Archive className="w-5 h-5 text-purple-400" />
              <span>استلام وتسليم أدراج الكاش</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {drawersList.map((drawer) => (
                <div key={drawer.id} className="p-4 rounded-xl border border-purple-500/30 bg-slate-900/80 space-y-3">
                  <div className="text-center">
                    <h3 className="font-bold text-white text-sm">{drawer.wallet_name}</h3>
                    <p className="text-lg font-extrabold text-purple-300">{Number(drawer.current_balance)} <span className="text-xs font-normal">ج</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setSelectedDrawer(drawer); setDrawerAction('deposit'); }} className="flex-1 py-1.5 bg-purple-600/30 text-purple-300 rounded-lg text-xs font-bold">تسليم (إيداع)</button>
                    <button onClick={() => { setSelectedDrawer(drawer); setDrawerAction('claim'); }} className="flex-1 py-1.5 bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-bold">استلام (سحب)</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Action Modal */}
      {drawerAction && selectedDrawer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-purple-500/40 bg-slate-900 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Archive className="w-5 h-5 text-purple-400" />
              <span>{drawerAction === 'deposit' ? 'تسليم بدرج' : 'استلام من'} {selectedDrawer.wallet_name}</span>
            </h3>
            <form onSubmit={handleDrawerSubmit} className="space-y-4">
              <input type="number" required value={drawerAmount} onChange={(e) => setDrawerAmount(e.target.value)} placeholder="المبلغ" className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white" />
              <textarea value={drawerNotes} onChange={(e) => setDrawerNotes(e.target.value)} placeholder="ملاحظات..." className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white resize-none" />
              <div className="flex gap-3">
                <button type="button" onClick={() => { setDrawerAction(null); setSelectedDrawer(null); }} className="flex-1 py-2.5 text-slate-400">إلغاء</button>
                <button type="submit" disabled={submitting} className={`flex-1 py-2.5 rounded-xl text-white font-bold ${drawerAction === 'deposit' ? 'bg-purple-600' : 'bg-emerald-600'}`}>تأكيد</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
