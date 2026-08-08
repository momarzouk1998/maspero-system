'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  StickyNote, Plus, Search, Filter, Calendar, Edit3, Trash2, 
  X, CheckCircle2, ArrowRight, BookOpen, Printer, DollarSign, Network, RefreshCw
} from 'lucide-react';

const CATEGORIES = [
  { key: 'الكل', label: 'جميع الملاحظات' },
  { key: 'عدادات وطابعات', label: 'عدادات وطابعات 🖨️' },
  { key: 'أسعار المشتريات', label: 'أسعار المشتريات 🛍️' },
  { key: 'أرصدة وحسابات', label: 'أرصدة وحسابات 📊' },
  { key: 'شبكة وIP', label: 'شبكة وIP 🌐' },
  { key: 'عام', label: 'ملاحظات عامة 📝' },
];

export default function ManagerNotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('عام');
  const [color, setColor] = useState('blue');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/manager/notes');
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

  const openAddModal = () => {
    setEditingNote(null);
    setTitle('');
    setCategory('عام');
    setColor('blue');
    setContent('');
    setShowModal(true);
  };

  const openEditModal = (note: any) => {
    setEditingNote(note);
    setTitle(note.title);
    setCategory(note.category || 'عام');
    setColor(note.color || 'blue');
    setContent(note.content || '');
    setShowModal(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    setSubmitting(true);
    try {
      const url = '/api/manager/notes';
      const method = editingNote ? 'PUT' : 'POST';
      const body = editingNote ? { id: editingNote.id, title, category, color, content } : { title, category, color, content };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowModal(false);
        fetchNotes();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('هل أنت تأكد من رغبتك في حذف هذه الملاحظة؟')) return;
    try {
      const res = await fetch(`/api/manager/notes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchNotes();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredNotes = notes.filter((n) => {
    const matchesCat = selectedCategory === 'الكل' || n.category === selectedCategory;
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
                          n.content.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

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
              <StickyNote className="w-6 h-6 text-amber-600" />
              <span>ملاحظات المدير</span>
            </h1>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="py-3 px-5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة ملاحظة جديدة</span>
        </button>
      </div>

      {/* Controls & Search */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Categories Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setSelectedCategory(c.key)}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                selectedCategory === c.key
                  ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الملاحظات..."
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Grid of Notes */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-slate-500 rounded-3xl">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-600" />
          <span>جاري تحميل الملاحظات...</span>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-500 rounded-3xl">
          لا توجد ملاحظات تطابق البحث
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map((n) => (
            <div
              key={n.id}
              className="glass-card p-5 rounded-3xl border border-slate-200 bg-white/70 hover:bg-white hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{n.title}</span>
                  </h3>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                    {n.category || 'عام'}
                  </span>
                </div>

                <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-mono bg-slate-50 p-3 rounded-2xl border border-slate-200/60 max-h-60 overflow-y-auto">
                  {n.content}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {n.created_at ? new Date(n.created_at).toLocaleDateString('ar-EG') : '-'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(n)}
                    className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg border border-amber-200 transition-colors"
                    title="تعديل الملاحظة"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(n.id)}
                    className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-200 transition-colors"
                    title="حذف الملاحظة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-600" />
                <span>{editingNote ? 'تعديل ملاحظة' : 'إضافة ملاحظة جديدة'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الملاحظة *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: أسعار ورق 80 جرام، عداد كيوسيرا..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="عدادات وطابعات">عدادات وطابعات 🖨️</option>
                  <option value="أسعار المشتريات">أسعار المشتريات 🛍️</option>
                  <option value="أرصدة وحسابات">أرصدة وحسابات 📊</option>
                  <option value="شبكة وIP">شبكة وIP 🌐</option>
                  <option value="عام">عام 📝</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المحتوى والتفاصيل *</label>
                <textarea
                  rows={6}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="أدخل نص الملاحظة التفصيلي هنا..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {editingNote ? 'حفظ التعديلات' : 'إضافة الملاحظة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
