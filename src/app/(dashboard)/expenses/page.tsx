'use client';

import { useState, useEffect } from 'react';
import { Receipt, Plus, CheckCircle2 } from 'lucide-react';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [mainType, setMainType] = useState('مصروفات');
  const [expenseType, setExpenseType] = useState('مصروفات');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchExpenses = async (page = 1) => {
    try {
      const res = await fetch(`/api/expenses?page=${page}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses(1);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setSubmitting(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainType,
          expenseType,
          amount: Number(amount),
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ المصروف');

      setSuccessMsg(`تم تسجيل المصروف بمبلغ ${amount} ج.م وتحديث المحفظة بنجاح 🎉`);
      setAmount('');
      setNotes('');
      fetchExpenses(1);
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
            <Receipt className="w-7 h-7 text-rose-400" />
            <span>المصروفات والسلف والمستحقات</span>
          </h1>
          <p className="text-slate-400 text-sm">
            تسجيل المصروفات والسلف اليومية وخصمها من المحفظة النقدية
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Form */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-rose-400" />
            <span>تسجيل بند جديد</span>
          </h2>

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">النوع الرئيسي</label>
              <select
                value={mainType}
                onChange={(e) => setMainType(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500"
              >
                <option value="مصروفات">مصروفات (صادر من المحفظة)</option>
                <option value="إيرادات">إيرادات (وارد للمحفظة)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">تصنيف البند</label>
              <select
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500"
              >
                <option value="مصروفات">مصروفات تشغيلية</option>
                <option value="سلفة">سلفة موظف</option>
                <option value="قبض">قبض راتب</option>
                <option value="دعم">دعم وخزينة</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">المبلغ (ج.م)</label>
              <input
                type="number"
                step="0.5"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">البيان / ملاحظات</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="تفاصيل البند والملاحظات..."
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Receipt className="w-5 h-5" />
              <span>تسجيل وخصم من المحفظة</span>
            </button>
          </form>
        </div>

        {/* Expenses Log Table */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-400" />
            <span>سجل المصروفات ({pagination.total})</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">النوع</th>
                  <th className="px-4 py-3">البند</th>
                  <th className="px-4 py-3">المبلغ</th>
                  <th className="px-4 py-3">الملاحظات</th>
                  <th className="px-4 py-3">الموظف</th>
                  <th className="px-4 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {expenses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-white">{item.main_type}</td>
                    <td className="px-4 py-3 text-slate-400">{item.expense_type || '-'}</td>
                    <td className="px-4 py-3 font-bold text-rose-400">{Number(item.amount).toLocaleString('ar-EG')} ج.م</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{item.notes || '-'}</td>
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
                onClick={() => fetchExpenses(pagination.page - 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 cursor-pointer"
              >
                السابق
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchExpenses(pagination.page + 1)}
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
