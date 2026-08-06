'use client';

import { useState, useEffect } from 'react';
import { Train, Plus, CheckCircle2, Ticket } from 'lucide-react';

export default function TicketsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [itemCount, setItemCount] = useState(1);
  const [ticketPrice, setTicketPrice] = useState('');
  const [ticketCommission, setTicketCommission] = useState('');
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchBookings = async (page = 1) => {
    try {
      const res = await fetch(`/api/tickets?page=${page}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(1);
  }, []);

  const totalAmount = Number(ticketPrice || 0) + Number(ticketCommission || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCount,
          ticketPrice,
          ticketCommission,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ حجز التذكرة');

      setSuccessMsg(`تم حفظ حجز القطار بمبلغ ${totalAmount} ج.م وإضافتها لمحفظتك بنجاح 🎉`);
      setTicketPrice('');
      setTicketCommission('');
      setNotes('');
      fetchBookings(1);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Train className="w-7 h-7 text-purple-400" />
            <span>سجل التذاكر</span>
          </h1>
          <p className="text-slate-400 text-sm">
            تسجيل حجوزات القطارات وحساب العمولات وتحديث رصيد المحفظة النقدية
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Booking Form */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-400" />
            <span>حجز تذكرة جديد</span>
          </h2>

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">عدد التذاكر</label>
              <input
                type="number"
                min="1"
                required
                value={itemCount}
                onChange={(e) => setItemCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">سعر التذكرة (ج.م)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">العمولة (ج.م)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={ticketCommission}
                  onChange={(e) => setTicketCommission(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Total Amount Preview */}
            <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">إجمالي النقدية المستلمة:</span>
              <span className="text-2xl font-extrabold text-purple-400">
                {totalAmount.toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-300">ج.م</span>
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">ملاحظات / الدرجة / المحطة</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="محطة الوصول / درجة الركوب..."
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Ticket className="w-5 h-5" />
              <span>حجز وإضافة للمحفظة</span>
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Train className="w-5 h-5 text-purple-400" />
            <span>سجل حجوزات التذاكر ({pagination.total})</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">العدد</th>
                  <th className="px-4 py-3">سعر التذكرة</th>
                  <th className="px-4 py-3">العمولة</th>
                  <th className="px-4 py-3">الإجمالي</th>
                  <th className="px-4 py-3">الموظف</th>
                  <th className="px-4 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bookings.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-white">{item.item_count}</td>
                    <td className="px-4 py-3">{Number(item.ticket_price).toLocaleString('ar-EG')} ج.م</td>
                    <td className="px-4 py-3 text-purple-400 font-bold">{Number(item.ticket_commission).toLocaleString('ar-EG')} ج.م</td>
                    <td className="px-4 py-3 text-emerald-400 font-bold">{Number(item.amount).toLocaleString('ar-EG')} ج.م</td>
                    <td className="px-4 py-3 text-slate-400">{item.employee_name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(item.timestamp || item.date).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
            <span>الصفحة {pagination.page} من {pagination.totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchBookings(pagination.page - 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 cursor-pointer"
              >
                السابق
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchBookings(pagination.page + 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 cursor-pointer"
              >
                التالي
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
