'use client';

import { useState, useEffect } from 'react';
import { Printer, Plus, Search, FileText, CheckCircle2, ChevronRight, ChevronLeft, Info, Tag } from 'lucide-react';
import { calculatePrintPrice } from '@/lib/print-pricing';
import type { PrintPriceResult } from '@/lib/print-pricing';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [dbPrices, setDbPrices] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceName, setServiceName] = useState('طباعة أسود');
  const [paperCount, setPaperCount] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [faceType, setFaceType] = useState('وجه واحد');
  const [unitPrice, setUnitPrice] = useState(1.0);
  const [tierLabel, setTierLabel] = useState('');
  const [calculatedAmount, setCalculatedAmount] = useState(1.0);
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchCatalogAndEntries = async (page = 1) => {
    try {
      const [catRes, pricesRes, entriesRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/print-prices'),
        fetch(`/api/service-entries?page=${page}&limit=25`)
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setServices(catData.services || []);
      }

      if (pricesRes.ok) {
        const pricesData = await pricesRes.json();
        setDbPrices(pricesData.prices || []);
      }

      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        setEntries(entriesData.entries || []);
        setPagination(entriesData.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogAndEntries(1);
  }, []);

  // Modern Dynamic Pricing Engine Calculation
  useEffect(() => {
    const isPrintService = serviceName.includes('طباعة');
    if (isPrintService) {
      const result = calculatePrintPrice(serviceName, faceType, paperCount, dbPrices);
      setUnitPrice(result.unitPrice);
      setTierLabel(result.tierLabel);
      setCalculatedAmount(result.totalAmount);
    } else {
      setUnitPrice(calculatedAmount / (paperCount || 1));
      setTierLabel('خدمة مباشرة');
    }
  }, [serviceName, paperCount, faceType, dbPrices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/api/service-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          serviceName,
          paperCount,
          pageCount,
          faceType,
          amount: calculatedAmount,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ عملية الخدمة');

      setSuccessMsg(`تم تسجيل عملية ${serviceName} (${paperCount} ورقة - ${faceType}) بمبلغ ${calculatedAmount} ج.م وإضافتها لمحفظتك بنجاح 🎉`);
      setNotes('');
      fetchCatalogAndEntries(1);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Printer className="w-7 h-7 text-blue-400" />
            <span>سجل الخدمات</span>
          </h1>
          <p className="text-slate-400 text-sm">
            حساب السعر التلقائي الذكي حسب شرائح الورق وخصومات الكميات والوجهين
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Form */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-400" />
            <span>فاتورة خدمة جديدة</span>
          </h2>

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">الخدمة المطلوبة</label>
              <select
                value={serviceName}
                onChange={(e) => {
                  setServiceName(e.target.value);
                  const found = services.find((s) => s.service_name === e.target.value);
                  if (found) setSelectedServiceId(found.id);
                }}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="طباعة أسود">طباعة أسود (أوراق مستندات)</option>
                <option value="طباعة ألوان">طباعة ألوان (ألوان غامقة / صور)</option>
                {services.map((s) => (
                  <option key={s.id} value={s.service_name}>
                    {s.service_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">عدد الورق (Paper Count)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paperCount}
                  onChange={(e) => setPaperCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 font-mono text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">نوع الطباعة (Face Type)</label>
                <select
                  value={faceType}
                  onChange={(e) => setFaceType(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="وجه واحد">وجه واحد</option>
                  <option value="وجهين">وجهين (Double Face)</option>
                </select>
              </div>
            </div>

            {/* Modern Price Breakdown Card */}
            <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">سعر الورقة / الوجه:</span>
                <span className="text-sm font-bold text-blue-300 font-mono">{unitPrice} ج.م</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-blue-500/20">
                <span className="text-xs font-bold text-white">الإجمالي المحسوب (Amount):</span>
                <span className="text-2xl font-extrabold text-blue-400 font-mono">
                  {calculatedAmount} <span className="text-xs font-normal text-slate-300 font-sans">ج.م</span>
                </span>
              </div>

              {tierLabel && (
                <div className="text-[11px] text-slate-300 flex items-center gap-1.5 pt-1.5 border-t border-blue-500/10">
                  <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate font-medium">{tierLabel}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">ملاحظات / اسم العميل</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات اختيارية..."
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-5 h-5" />
              <span>حفظ وإضافة للمحفظة</span>
            </button>
          </form>
        </div>

        {/* Entries Table */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <span>سجل خدمات الطباعة ({pagination.total})</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">اسم الخدمة</th>
                  <th className="px-4 py-3">الورق</th>
                  <th className="px-4 py-3">الوجه</th>
                  <th className="px-4 py-3">المبلغ</th>
                  <th className="px-4 py-3">الموظف</th>
                  <th className="px-4 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {entries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-white">{item.service_name}</td>
                    <td className="px-4 py-3 font-mono">{item.paper_count}</td>
                    <td className="px-4 py-3">{item.face_type || 'وجه واحد'}</td>
                    <td className="px-4 py-3 font-bold text-emerald-400 font-mono">{Number(item.amount).toLocaleString('ar-EG')} ج.م</td>
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
                onClick={() => fetchCatalogAndEntries(pagination.page - 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 cursor-pointer"
              >
                السابق
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchCatalogAndEntries(pagination.page + 1)}
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
