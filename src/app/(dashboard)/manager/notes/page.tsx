'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash2, Save, RefreshCw, CheckCircle2, AlertTriangle, Bell } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string | null;
  category: string;
  priority: string;
  is_active: boolean;
  created_at: string;
  creator: {
    id: string;
    name: string;
  } | null;
}

export default function ManagerNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'عام',
    priority: 'متوسط',
  });

  const categories = ['عام', 'مالي', 'موظفين', 'عمليات'];
  const priorities = ['عالي', 'متوسط', 'منخفض'];

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleAdd = async () => {
    if (!formData.title) {
      setMessage({ type: 'error', text: 'العنوان مطلوب' });
      return;
    }

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الإضافة');

      setMessage({ type: 'success', text: 'تم إضافة الملاحظة بنجاح' });
      setFormData({ title: '', content: '', category: 'عام', priority: 'متوسط' });
      setShowAddForm(false);
      fetchNotes();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const note = notes.find(n => n.id === id);
      if (!note) return;

      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التحديث');

      setMessage({ type: 'success', text: 'تم تحديث الملاحظة بنجاح' });
      setEditingId(null);
      fetchNotes();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;

    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحذف');

      setMessage({ type: 'success', text: 'تم حذف الملاحظة بنجاح' });
      fetchNotes();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'عالي': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'متوسط': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'منخفض': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      default: return 'bg-slate-500/10 border-slate-500/30 text-slate-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'مالي': return '💰';
      case 'موظفين': return '👥';
      case 'عمليات': return '⚙️';
      default: return '📝';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-400" />
            <span>الملاحظات</span>
          </h1>
          <p className="text-slate-400 text-sm">
            إدارة الملاحظات والتذكيرات الداخلية - للمدير فقط
          </p>
        </div>

        <button
          onClick={fetchNotes}
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
          <h3 className="text-lg font-bold text-white">إضافة ملاحظة جديدة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">العنوان *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                placeholder="عنوان الملاحظة"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">التصنيف</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">الأولوية</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                {priorities.map(prio => (
                  <option key={prio} value={prio}>{prio}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">المحتوى</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none min-h-[100px] resize-none"
                placeholder="تفاصيل الملاحظة"
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
          <span>إضافة ملاحظة جديدة</span>
        </button>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400">جاري تحميل الملاحظات...</div>
      ) : notes.length === 0 ? (
        <div className="p-8 text-center text-slate-400">لا توجد ملاحظات</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map(note => (
            <div
              key={note.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getCategoryIcon(note.category)}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${getPriorityColor(note.priority)}`}>
                      {note.priority}
                    </span>
                  </div>
                  {editingId === note.id ? (
                    <input
                      type="text"
                      value={note.title}
                      onChange={(e) => {
                        const updated = notes.map(n => 
                          n.id === note.id ? { ...n, title: e.target.value } : n
                        );
                        setNotes(updated);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-sm font-bold focus:border-blue-500 focus:outline-none mb-2"
                    />
                  ) : (
                    <h4 className="text-sm font-bold text-white">{note.title}</h4>
                  )}
                </div>
                <div className="flex gap-1">
                  {editingId === note.id ? (
                    <>
                      <button
                        onClick={() => handleUpdate(note.id)}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer transition-all"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg cursor-pointer transition-all"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingId(note.id)}
                        className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg cursor-pointer transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === note.id ? (
                <textarea
                  value={note.content || ''}
                  onChange={(e) => {
                    const updated = notes.map(n => 
                      n.id === note.id ? { ...n, content: e.target.value } : n
                    );
                    setNotes(updated);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:border-blue-500 focus:outline-none min-h-[60px] resize-none"
                  placeholder="المحتوى"
                />
              ) : (
                <p className="text-xs text-slate-400 line-clamp-3">{note.content || 'لا يوجد محتوى'}</p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-500">{note.category}</span>
                <span className="text-xs text-slate-500">
                  {new Date(note.created_at).toLocaleDateString('ar-EG')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
