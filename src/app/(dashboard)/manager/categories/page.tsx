'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Tags, ArrowRight, Plus, Edit3, Trash2, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck
} from 'lucide-react';

export default function ManagerCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('مصروفات');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [type, setType] = useState('مصروفات');
  const [itemName, setItemName] = useState('');
  const [sort, setSort] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setType(selectedType);
    setItemName('');
    setSort('0');
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setType(item.type);
    setItemName(item.item_name);
    setSort((item.sort || 0).toString());
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const isEditing = Boolean(editingItem);
      const url = '/api/categories';
      const method = isEditing ? 'PUT' : 'POST';

      const body = isEditing
        ? { id: editingItem.id, type, itemName, sort: parseInt(sort) || 0 }
        : { type, itemName, sort: parseInt(sort) || 0 };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء حفظ التغيرات');

      showToast(isEditing ? 'تم تعديل البند بنجاح 🎉' : 'تم إضافة البند بنجاح 🎉');
      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف البند (${name})؟`)) return;

    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`تم حذف البند (${name}) بنجاح`);
        fetchCategories();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredCategories = categories.filter(c => c.type === selectedType);
  const TYPE_OPTIONS = ['مصروفات', 'مشتريات', 'دعم مالي', 'مسحوبات', 'سلفة', 'قبض'];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
              <Tags className="w-6 h-6 text-rose-600" />
              <span>تصنيفات المصروفات</span>
            </h1>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة بند جديد</span>
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

      {/* Category Type Filter Pills */}
      <div className="flex flex-wrap gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
        {TYPE_OPTIONS.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedType === t
                ? 'bg-white text-rose-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t} ({categories.filter(c => c.type === t).length})
          </button>
        ))}
      </div>

      {/* Items Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            بنود تصنيف ({selectedType})
          </h3>
          <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            إجمالي {filteredCategories.length} بند
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3"># الترتيب</th>
                <th className="px-4 py-3">النوع</th>
                <th className="px-4 py-3">اسم البند / البيان</th>
                <th className="px-4 py-3 text-center">إجراءات المدير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                    <span>جاري تحميل البنود...</span>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500">
                    لا توجد بنود مسجلة لهذا التصنيف
                  </td>
                </tr>
              ) : (
                filteredCategories.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-600 text-xs font-bold">#{item.sort || 0}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.item_name}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg border border-blue-200 transition-colors"
                          title="تعديل"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.item_name)}
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-200 transition-colors"
                          title="حذف"
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
                <Tags className="w-5 h-5 text-rose-600" />
                <span>{editingItem ? 'تعديل بند' : 'إضافة بند جديد'}</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع التصنيف *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-500"
                >
                  {TYPE_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم البند / البيان *</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="مثال: شحن انترنت، فكة، ورق..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الترتيب</label>
                <input
                  type="number"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
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
