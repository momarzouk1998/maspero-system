'use client';

import { useState, useEffect } from 'react';
import { FolderTree, Plus, Edit, Trash2, Save, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ExpenseCategory {
  id: string;
  category_type: string;
  item_name: string;
  description: string | null;
  sort: number;
  is_active: boolean;
}

export default function ManagerCategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    category_type: 'مصروفات',
    item_name: '',
    description: '',
    sort: 0,
  });

  const categoryTypes = ['إيرادات', 'مصروفات', 'مشتريات', 'دعم', 'سلفة', 'قبض'];

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/expense-categories');
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

  const handleAdd = async () => {
    if (!formData.item_name) {
      setMessage({ type: 'error', text: 'اسم العنصر مطلوب' });
      return;
    }

    try {
      const res = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الإضافة');

      setMessage({ type: 'success', text: 'تم إضافة التصنيف بنجاح' });
      setFormData({ category_type: 'مصروفات', item_name: '', description: '', sort: 0 });
      setShowAddForm(false);
      fetchCategories();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const category = categories.find(c => c.id === id);
      if (!category) return;

      const res = await fetch(`/api/expense-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التحديث');

      setMessage({ type: 'success', text: 'تم تحديث التصنيف بنجاح' });
      setEditingId(null);
      fetchCategories();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;

    try {
      const res = await fetch(`/api/expense-categories/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحذف');

      setMessage({ type: 'success', text: 'تم حذف التصنيف بنجاح' });
      fetchCategories();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const groupedCategories = categoryTypes.reduce((acc, type) => {
    acc[type] = categories.filter(c => c.category_type === type);
    return acc;
  }, {} as Record<string, ExpenseCategory[]>);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <FolderTree className="w-7 h-7 text-blue-400" />
            <span>إدارة تصنيفات المصروفات والإيرادات</span>
          </h1>
          <p className="text-slate-400 text-sm">
            إدارة أنواع المصروفات والإيرادات المستخدمة في النظام
          </p>
        </div>

        <button
          onClick={fetchCategories}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تحديث</span>
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white">إضافة تصنيف جديد</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">نوع التصنيف</label>
              <select
                value={formData.category_type}
                onChange={(e) => setFormData({ ...formData, category_type: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                {categoryTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">اسم العنصر</label>
              <input
                type="text"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                placeholder="مثال: ورق، فايلات"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">الوصف (اختياري)</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                placeholder="وصف التصنيف"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة</span>
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full glass-panel p-4 rounded-2xl border border-dashed border-slate-700 text-slate-400 text-sm font-medium flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-400 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة تصنيف جديد</span>
        </button>
      )}

      {/* Categories by Type */}
      {loading ? (
        <div className="p-8 text-center text-slate-400">جاري تحميل التصنيفات...</div>
      ) : (
        <div className="space-y-6">
          {categoryTypes.map(type => (
            groupedCategories[type] && groupedCategories[type].length > 0 && (
              <div key={type} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-white">{type}</h3>
                <div className="space-y-3">
                  {groupedCategories[type].map(category => (
                    <div
                      key={category.id}
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      {editingId === category.id ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <select
                            value={category.category_type}
                            onChange={(e) => {
                              const updated = categories.map(c => 
                                c.id === category.id ? { ...c, category_type: e.target.value } : c
                              );
                              setCategories(updated);
                            }}
                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                          >
                            {categoryTypes.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={category.item_name}
                            onChange={(e) => {
                              const updated = categories.map(c => 
                                c.id === category.id ? { ...c, item_name: e.target.value } : c
                              );
                              setCategories(updated);
                            }}
                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={category.description || ''}
                            onChange={(e) => {
                              const updated = categories.map(c => 
                                c.id === category.id ? { ...c, description: e.target.value } : c
                              );
                              setCategories(updated);
                            }}
                            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                            placeholder="الوصف"
                          />
                        </div>
                      ) : (
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white">{category.item_name}</p>
                          {category.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{category.description}</p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {editingId === category.id ? (
                          <>
                            <button
                              onClick={() => handleUpdate(category.id)}
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>حفظ</span>
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                            >
                              إلغاء
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingId(category.id)}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>
                            <button
                              onClick={() => handleDelete(category.id)}
                              className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
