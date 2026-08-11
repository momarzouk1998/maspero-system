'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Printer, ArrowRight, Plus, Edit3, Trash2, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck, Percent
} from 'lucide-react';
import ServiceIcon from '@/components/ServiceIcon';
import { formatNumberLocale } from '@/lib/user-utils';

export default function ManagerServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [serviceName, setServiceName] = useState('');
  const [isCommissionable, setIsCommissionable] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState('0');
  const [price, setPrice] = useState('0');
  const [description, setDescription] = useState('');
  const [sort, setSort] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/services');
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setServiceName('');
    setIsCommissionable(false);
    setCommissionPercent('0');
    setPrice('0');
    setDescription('');
    setSort((services.length + 1).toString());
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setServiceName(item.service_name || '');
    setIsCommissionable(Boolean(item.is_commissionable));
    setCommissionPercent((item.commission_percent || 0).toString());
    setPrice((item.price || 0).toString());
    setDescription(item.description || '');
    setSort((item.sort || 0).toString());
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        id: editingItem?.id,
        service_name: serviceName,
        is_commissionable: isCommissionable,
        commission_percent: parseFloat(commissionPercent),
        price: parseFloat(price),
        description,
        sort: parseInt(sort)
      };

      const res = await fetch('/api/services', {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء حفظ الخدمة');

      showToast(editingItem ? 'تم تعديل الخدمة بنجاح 🎉' : 'تم إضافة الخدمة بنجاح 🎉');
      setModalOpen(false);
      fetchServices();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت تأكد من رغبتك في حذف هذه الخدمة؟')) return;

    try {
      const res = await fetch(`/api/services?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('تم حذف الخدمة بنجاح');
        fetchServices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/manager"
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span>لوحة المدير</span>
          </Link>

          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-6 h-6 text-blue-600" />
              <span>إدارة الخدمات</span>
            </h1>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة خدمة جديدة</span>
        </button>
      </div>

      {toast && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Services Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-700 table-auto">
            <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">الترتيب</th>
                <th className="px-4 py-3 whitespace-nowrap">اسم الخدمة</th>
                <th className="px-4 py-3 whitespace-nowrap">نوع العمولة</th>
                <th className="px-4 py-3 whitespace-nowrap">نسبة العمولة</th>
                <th className="px-4 py-3 whitespace-nowrap">السعر المبدئي</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">إجراءات المدير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>جاري تحميل الخدمات...</span>
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    لا توجد خدمات مسجلة
                  </td>
                </tr>
              ) : (
                services.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-600 text-xs font-bold whitespace-nowrap">#{item.sort || 0}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                      <ServiceIcon name={item.service_name} className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{item.service_name}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        item.is_commissionable ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {item.is_commissionable ? 'عمولة 💰' : 'بدون عمولة'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-700 text-sm whitespace-nowrap">
                      {item.is_commissionable ? `${Number(item.commission_percent)}%` : '0%'}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                      {formatNumberLocale(Number(item.price || 0), 'ar-EG')}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg border border-blue-200 transition-colors"
                          title="تعديل الخدمة"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-200 transition-colors"
                          title="حذف الخدمة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <span>{editingItem ? 'تعديل بيانات الخدمة' : 'إضافة خدمة جديدة'}</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الخدمة *</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="مثال: طباعة ألوان، خدمات أونلاين..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-slate-800">هل الخدمة تخضع لعمولة للموظف؟</span>
                <input
                  type="checkbox"
                  checked={isCommissionable}
                  onChange={(e) => setIsCommissionable(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                />
              </div>

              {isCommissionable && (
                <div>
                  <label className="block text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5" />
                    <span>نسبة العمولة (%) *</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    required
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-slate-900 font-mono text-sm font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السعر المبدئي</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الترتيب</label>
                  <input
                    type="number"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  حفظ البيانات
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
