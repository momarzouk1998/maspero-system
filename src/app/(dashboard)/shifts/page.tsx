'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Play, Square, CheckCircle2, AlertTriangle, Wallet, ArrowRight } from 'lucide-react';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [shiftType, setShiftType] = useState('صباحي');
  const [shiftNote, setShiftNote] = useState('');
  const [msg, setMsg] = useState('');

  const fetchShifts = async (page = 1) => {
    try {
      const res = await fetch(`/api/shifts?page=${page}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts(1);
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

      setMsg('تم بدء الشفت بنجاح 🎉 برجاء استلام المحافظ والعهدة للبدء');
      setShiftNote('');
      fetchShifts(1);
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
      fetchShifts(1);
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
            <Clock className="w-7 h-7 text-cyan-400" />
            <span>إدارة الشفتات والورديات</span>
          </h1>
          <p className="text-slate-400 text-sm">
            تسجيل الحضور والانصراف، احتساب ساعات العمل، ومتابعة شفتات الموظفين
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Shift & Actions Card */}
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

          {/* Prominent Custody & Wallet Reminder Banner when Shift is Active */}
          {activeShift && (
            <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-300 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce text-amber-400" />
                <span>⚠️ تذكير هام باستلام العهدة والمحافظ:</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">
                برجاء التوجه فوراً لشاشة <strong>المحافظ</strong> لاستلام عهدة ماكينات فوري وفودافون كاش أو أدراج الكاش لبدء العمل وتسجيل الخدمات.
              </p>
              <Link
                href="/wallet"
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>الانتقال فوراً لاستلام المحافظ والعهدة 🚀</span>
              </Link>
            </div>
          )}

          {activeShift ? (
            <div className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 space-y-3 text-right">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg">
                  شفت نشط الآن
                </span>
                <span className="text-xs text-slate-400">{activeShift.shift_type}</span>
              </div>
              <p className="text-sm text-slate-300">
                وقت البداية: <span className="font-bold text-white">{new Date(activeShift.start_time).toLocaleTimeString('ar-EG')}</span>
              </p>
              <button
                onClick={() => handleEndShift(activeShift.id)}
                disabled={submitting}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                <span>إنهاء الشفت الحالي</span>
              </button>
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
                <label className="block text-xs font-medium text-slate-300 mb-1.5">ملاحظات الشفت</label>
                <input
                  type="text"
                  value={shiftNote}
                  onChange={(e) => setShiftNote(e.target.value)}
                  placeholder="ملاحظات بداية الشفت..."
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

        {/* Shifts Log Table */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span>سجل الشفتات ({pagination.total})</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">الموظف</th>
                  <th className="px-4 py-3">النوع</th>
                  <th className="px-4 py-3">البداية</th>
                  <th className="px-4 py-3">النهاية</th>
                  <th className="px-4 py-3">الساعات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {shifts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-white">{item.employee_name || '-'}</td>
                    <td className="px-4 py-3 text-cyan-400">{item.shift_type || 'صباحي'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {item.start_time ? new Date(item.start_time).toLocaleTimeString('ar-EG') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {item.end_time ? new Date(item.end_time).toLocaleTimeString('ar-EG') : 'نشط الآن'}
                    </td>
                    <td className="px-4 py-3 font-bold text-white">
                      {Number(item.total_hours || 0).toFixed(2)} س
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
