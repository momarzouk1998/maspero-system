'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, Play, Square, CheckCircle2, AlertTriangle, Wallet, ArrowRight, 
  History, ArrowLeftRight, Check, X, ShieldAlert, Cpu, Lock, CheckCircle, 
  UserCheck, RefreshCw, AlertCircle, Info, MessageSquare
} from 'lucide-react';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [shiftType, setShiftType] = useState('صباحي');
  const [shiftNote, setShiftNote] = useState('');
  const [msg, setMsg] = useState('');

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

  // Modal State for Receiving Custody Item
  const [receiveModalItem, setReceiveModalItem] = useState<any | null>(null);
  const [actualBalanceInput, setActualBalanceInput] = useState<string>('');
  const [discrepancyReasonInput, setDiscrepancyReasonInput] = useState<string>('');
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);

  // Modal State for Delivering Custody Item
  const [deliverModalItem, setDeliverModalItem] = useState<any | null>(null);
  const [deliverReceiverId, setDeliverReceiverId] = useState<string>('');
  const [deliverSubmitting, setDeliverSubmitting] = useState(false);

  // Users List for Peer Transfers / Handovers
  const [users, setUsers] = useState<any[]>([]);

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

      setMsg('تم بدء الشفت بنجاح 🎉 برجاء استلام العهدة والمحافظ المطلوبة من الجدول أدناه للبدء.');
      setShiftNote('');
      fetchShiftsAndCustody();
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
      fetchShiftsAndCustody();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Receive Modal
  const openReceiveModal = (item: any) => {
    setReceiveModalItem(item);
    const expected = Number(item.actual_balance || item.current_balance || 0);
    setActualBalanceInput(expected.toString());
    setDiscrepancyReasonInput('');
  };

  // Submit Receive Custody Form
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

      alert(data.message || 'تم استلام العهدة بنجاح ✅');
      setReceiveModalItem(null);
      fetchShiftsAndCustody();
    } catch (err: any) {
      alert(err.message);
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

      alert(data.message || 'تم إرسال طلب التسليم بنجاح 👍');
      setDeliverModalItem(null);
      setDeliverReceiverId('');
      fetchShiftsAndCustody();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeliverSubmitting(false);
    }
  };

  // Helper for difference calculation in Receive Modal
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

  // Render Table Component for a section (Wallets, Machines, Drawers)
  const CustodyTableSection = ({ title, icon: Icon, items, badgeColor }: any) => (
    <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Icon className={`w-5 h-5 ${badgeColor}`} />
          <span>{title}</span>
          <span className="text-xs font-mono font-normal text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
            {items.length}
          </span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs text-slate-300">
          <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase border-b border-slate-800">
            <tr>
              <th className="px-3.5 py-2.5">العنصر</th>
              <th className="px-3.5 py-2.5">المستلم الحالي</th>
              <th className="px-3.5 py-2.5">الرصيد الفعلي الحالي</th>
              <th className="px-3.5 py-2.5 text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {items.map((item: any) => {
              const isCustodyOfUser = item.custodian_id === activeShift?.employee_id;

              return (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-3.5 py-3 font-bold text-white flex items-center gap-2">
                    <span>{item.wallet_name}</span>
                    {item.wallet_number && (
                      <span className="text-[10px] text-slate-400 font-mono">({item.wallet_number})</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3">
                    {item.custodian_name ? (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        isCustodyOfUser ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {isCustodyOfUser ? 'في عهدتك ✅' : item.custodian_name}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">غير مستلم</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 font-mono font-bold text-white">
                    {Number(item.actual_balance || item.current_balance || 0).toFixed(2)} ج.م
                  </td>
                  <td className="px-3.5 py-3 text-center">
                    {isCustodyOfUser ? (
                      <button
                        onClick={() => setDeliverModalItem(item)}
                        className="py-1.5 px-3 bg-amber-600/80 hover:bg-amber-500 text-white font-bold rounded-lg transition-all"
                      >
                        تسليم لزميل
                      </button>
                    ) : (
                      <button
                        onClick={() => openReceiveModal(item)}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md shadow-emerald-600/20 transition-all"
                      >
                        استلام الآن
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
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

      {/* Sales Lock Warning Banner */}
      {custodyData.isSalesLocked && (
        <div className="p-4 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-300 flex items-start gap-3">
          <Lock className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="text-xs leading-relaxed">
            <span className="font-extrabold text-red-400 block mb-0.5">⚠️ المبيعات مقفولة حالياً:</span>
            <span>{custodyData.lockReason}</span>
          </div>
        </div>
      )}

      {/* Active Shift Card & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Shift Action Card */}
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

        {/* Instructions & System Rules Panel */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 text-xs leading-relaxed text-slate-300">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>ضوابط استلام وتسليم العهدة والشفتات</span>
          </h3>

          <ul className="list-disc list-inside space-y-2 text-slate-300">
            <li><strong className="text-white">الشفت الصباحي / المنفرد:</strong> يتطلب استلام جميع المحافظ والماكينات ودرج الكاش لتأكيد فتح المبيعات.</li>
            <li><strong className="text-white">الشفت المتداخل:</strong> يتطلب استلام درج الكاش فقط، وتستمر المحافظ والماكينات بالعمل مع الزميل المتواجد.</li>
            <li><strong className="text-white">فروق الأرصدة:</strong> يجب إدخال المبلغ الفعلي في يدك بدقة. إذا وجد فارق، يلزم كتابة سبب الاختلاف للمراجعة.</li>
            <li><strong className="text-amber-400">إغلاق اليوم (آخر موظف):</strong> يرفض النظام إنهاء الشفت لآخر موظف حتى يقوم بتسليم وتأكيد أرصدة جميع المحافظ والماكينات للشفت التالي.</li>
          </ul>
        </div>

      </div>

      {/* Custody Sections Tables */}
      <div className="space-y-6">
        <CustodyTableSection
          title="أدراج الكاشير (Cash Drawers)"
          icon={Wallet}
          items={custodyData.drawers}
          badgeColor="text-emerald-400"
        />

        <CustodyTableSection
          title="المحافظ الإلكترونية (Wallets)"
          icon={Wallet}
          items={custodyData.wallets}
          badgeColor="text-blue-400"
        />

        <CustodyTableSection
          title="الماكينات (Fawry / Basata / Aman)"
          icon={Cpu}
          items={custodyData.machines}
          badgeColor="text-amber-400"
        />
      </div>

      {/* RECEIVE CUSTODY MODAL */}
      {receiveModalItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmReceive} className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span>استلام عهدة ({receiveModalItem.wallet_name})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">نوع العهدة: {receiveModalItem.wallet_type}</p>
              </div>
              <button type="button" onClick={() => setReceiveModalItem(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Expected Balance Display */}
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">الرصيد المتوقع في النظام:</span>
                <span className="font-bold text-white font-mono text-sm">{expectedVal.toFixed(2)} ج.م</span>
              </div>

              {/* Actual Balance Input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">أدخل المبلغ الفعلي بين يديك الآن *</label>
                <input
                  type="number"
                  step="0.25"
                  required
                  value={actualBalanceInput}
                  onChange={(e) => setActualBalanceInput(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-lg font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Difference & Audit Status Evaluation */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">الفارق بين الفعلي والمتوقع:</span>
                  <span className={`font-bold font-mono ${diffVal < 0 ? 'text-red-400' : diffVal > 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                    {diffVal > 0 ? `+${diffVal.toFixed(2)}` : diffVal.toFixed(2)} ج.م
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
                  <span className="text-slate-400">تقييم المراجعة الآلي:</span>
                  <span className={`px-2.5 py-0.5 rounded border text-[11px] font-bold ${auditTag.color}`}>
                    {auditTag.text}
                  </span>
                </div>
              </div>

              {/* Reason for Discrepancy (Mandatory if diff != 0) */}
              {diffVal !== 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-amber-400 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>توضيح سبب الاختلاف (إجباري) *</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={discrepancyReasonInput}
                    onChange={(e) => setDiscrepancyReasonInput(e.target.value)}
                    placeholder="مثال: رسوم تحويلات سابقة، أو عمولة شبكة..."
                    className="w-full p-3 bg-slate-900 border border-amber-500/40 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button
                type="submit"
                disabled={receiveSubmitting}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                تأكيد واستلام العهدة
              </button>
              <button
                type="button"
                onClick={() => setReceiveModalItem(null)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
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
          <form onSubmit={handleConfirmDeliver} className="glass-panel w-full max-w-md p-6 rounded-3xl border border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-amber-400" />
                <span>تسليم عهدة ({deliverModalItem.wallet_name})</span>
              </h3>
              <button type="button" onClick={() => setDeliverModalItem(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">اختر الموظف المستلم *</label>
                <select
                  required
                  value={deliverReceiverId}
                  onChange={(e) => setDeliverReceiverId(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- اختر الموظف --</option>
                  {users.filter(u => u.id !== activeShift?.employee_id).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button
                type="submit"
                disabled={deliverSubmitting}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/20 disabled:opacity-50"
              >
                إرسال طلب التسليم
              </button>
              <button
                type="button"
                onClick={() => setDeliverModalItem(null)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
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
