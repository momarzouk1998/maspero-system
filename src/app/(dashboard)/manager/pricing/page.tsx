'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Settings, Save, CheckCircle2, AlertTriangle, Printer, Palette, 
  RefreshCw, ArrowRight, Plus, Trash2, Layers, PlusCircle, X
} from 'lucide-react';

interface PrintPrice {
  id: string;
  print_type: string;
  face_type: string;
  key_name: string;
  min_qty: number;
  max_qty: number | null;
  price: string | number;
}

export default function ManagerPricingPage() {
  const [prices, setPrices] = useState<PrintPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit states per row
  const [editValues, setEditValues] = useState<Record<string, { price: string; minQty: string; maxQty: string; keyName: string }>>({});

  // Modal state for adding a new dynamic tier ("إضافة شريحة سعرية جديدة")
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrintType, setNewPrintType] = useState('طباعة أسود');
  const [newFaceType, setNewFaceType] = useState('وجه واحد');
  const [newMinQty, setNewMinQty] = useState('1');
  const [newMaxQty, setNewMaxQty] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const fetchPrices = async () => {
    try {
      const res = await fetch('/api/print-prices');
      if (res.ok) {
        const data = await res.json();
        setPrices(data.prices || []);
        
        // Seed edit state
        const initial: Record<string, { price: string; minQty: string; maxQty: string; keyName: string }> = {};
        for (const p of data.prices || []) {
          initial[p.id] = {
            price: String(p.price),
            minQty: String(p.min_qty || 1),
            maxQty: p.max_qty !== null && p.max_qty !== undefined ? String(p.max_qty) : '',
            keyName: p.key_name || ''
          };
        }
        setEditValues(initial);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const handleSaveRow = async (row: PrintPrice) => {
    const editState = editValues[row.id] || {
      price: String(row.price),
      minQty: String(row.min_qty || 1),
      maxQty: row.max_qty ? String(row.max_qty) : '',
      keyName: row.key_name
    };

    const numPrice = parseFloat(editState.price);
    if (isNaN(numPrice) || numPrice < 0) {
      setMessage({ type: 'error', text: 'يرجى إدخال سعر صحيح' });
      return;
    }

    setSavingId(row.id);
    setMessage(null);

    try {
      const res = await fetch('/api/print-prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: row.id,
          price: numPrice,
          minQty: parseInt(editState.minQty) || 1,
          maxQty: editState.maxQty ? parseInt(editState.maxQty) : null,
          keyName: editState.keyName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث الشريحة');

      setMessage({ type: 'success', text: data.message });
      fetchPrices();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteRow = async (id: string, name: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف الشريحة السعرية (${name})؟`)) return;

    setDeletingId(id);
    setMessage(null);

    try {
      const res = await fetch(`/api/print-prices?id=${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الشريحة');

      setMessage({ type: 'success', text: data.message });
      fetchPrices();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateNewTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrice || parseFloat(newPrice) < 0) {
      setMessage({ type: 'error', text: 'يرجى إدخال سعر صحيح للشريحة الجديدة' });
      return;
    }

    setAddLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/print-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printType: newPrintType,
          faceType: newFaceType,
          minQty: parseInt(newMinQty) || 1,
          maxQty: newMaxQty ? parseInt(newMaxQty) : null,
          price: parseFloat(newPrice),
          keyName: newKeyName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إضافة الشريحة السعرية');

      setMessage({ type: 'success', text: data.message });
      setShowAddModal(false);
      setNewMinQty('1');
      setNewMaxQty('');
      setNewPrice('');
      setNewKeyName('');
      fetchPrices();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setAddLoading(false);
    }
  };

  const bwPrices = prices.filter((p) => p.print_type === 'طباعة أسود');
  const colorPrices = prices.filter((p) => p.print_type === 'طباعة ألوان');

  const PriceGroup = ({
    title,
    icon: Icon,
    color,
    rows
  }: {
    title: string;
    icon: any;
    color: string;
    rows: PrintPrice[];
  }) => (
    <div className={`glass-panel p-6 rounded-3xl border border-slate-200 bg-white space-y-4 shadow-sm`}>
      <div className="flex items-center justify-between border-b pb-3 border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${color.includes('blue') ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">{title}</h3>
            <p className="text-xs text-slate-500">الشرائح الديناميكية المحددة لحجم ورق الطباعة</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">لا توجد شرائح سعرية معرفة لهذا النوع</div>
        ) : (
          rows.map((row) => {
            const edit = editValues[row.id] || {
              price: String(row.price),
              minQty: String(row.min_qty || 1),
              maxQty: row.max_qty ? String(row.max_qty) : '',
              keyName: row.key_name
            };

            return (
              <div
                key={row.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[11px] font-bold">
                      {row.face_type}
                    </span>
                    <span className="text-xs font-bold text-slate-900 mr-2">
                      {row.key_name}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    النطاق الحالي: من {row.min_qty} إلى {row.max_qty ? `${row.max_qty} ورقة` : 'فأكثر'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  {/* Min Qty */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">الكمية تبدأ من</label>
                    <input
                      type="number"
                      min="1"
                      value={edit.minQty}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [row.id]: { ...edit, minQty: e.target.value }
                        }))
                      }
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs font-bold"
                    />
                  </div>

                  {/* Max Qty */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تنتهي عند (أو فارغ لـ أكثر)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="فأكثر"
                      value={edit.maxQty}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [row.id]: { ...edit, maxQty: e.target.value }
                        }))
                      }
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs font-bold"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">السعر لكل ورقة (ج.م)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={edit.price}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [row.id]: { ...edit, price: e.target.value }
                          }))
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-sm focus:border-blue-500"
                      />

                      <button
                        onClick={() => handleSaveRow(row)}
                        disabled={savingId === row.id}
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center shrink-0 transition-all shadow"
                        title="حفظ الشريحة"
                      >
                        {savingId === row.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteRow(row.id, row.key_name)}
                        disabled={deletingId === row.id}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 transition-all"
                        title="حذف الشريحة"
                      >
                        {deletingId === row.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/manager"
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span>لوحة المدير</span>
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-0.5 flex items-center gap-2">
              <Printer className="w-7 h-7 text-blue-600" />
              <span>إدارة الشرائح السعرية للطباعة</span>
            </h1>
            <p className="text-xs text-slate-500">تحديد وتخصيص شرائح الكميات والأسعار الديناميكية</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة شريحة سعرية جديدة</span>
          </button>

          <button
            onClick={fetchPrices}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shrink-0"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
          message.type === 'success'
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
            : 'bg-red-50 border border-red-300 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dynamic Tier Explanation */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5 leading-relaxed">
        <Layers className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
        <div>
          <span className="font-bold block mb-0.5">💡 الشرائح السعرية الديناميكية:</span>
          <span>
            تتيح لك إضافة وإنشاء أي عدد من الشرائح حسب كمية الأوراق (مثال: من 1 إلى 50 بسعر 2.00ج، ومن 51 إلى 200 بسعر 1.50ج، و 201 فأكثر بسعر 1.00ج). يتم احتساب السعر تلقائياً في صفحة المبيعات فور إدخال عدد الورق.
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-2" />
          <span>جاري تحميل الشرائح السعرية...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PriceGroup
            title="شرائح طباعة أسود (Black & White)"
            icon={Printer}
            color="border-blue-200"
            rows={bwPrices}
          />
          <PriceGroup
            title="شرائح طباعة ألوان (Color Printing)"
            icon={Palette}
            color="border-amber-200"
            rows={colorPrices}
          />
        </div>
      )}

      {/* MODAL: ADD NEW DYNAMIC PRICE TIER */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                إضافة شريحة سعرية جديدة
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-500 hover:text-slate-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTier} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الطباعة</label>
                  <select
                    value={newPrintType}
                    onChange={(e) => setNewPrintType(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold"
                  >
                    <option value="طباعة أسود">طباعة أسود</option>
                    <option value="طباعة ألوان">طباعة ألوان</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الوجه</label>
                  <select
                    value={newFaceType}
                    onChange={(e) => setNewFaceType(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold"
                  >
                    <option value="وجه واحد">وجه واحد</option>
                    <option value="وجهين">وجهين</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الكمية من (ورقة)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newMinQty}
                    onChange={(e) => setNewMinQty(e.target.value)}
                    placeholder="1"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الكمية إلى (ورقة)</label>
                  <input
                    type="number"
                    min="1"
                    value={newMaxQty}
                    onChange={(e) => setNewMaxQty(e.target.value)}
                    placeholder="اتركه فارغاً لـ أكثر"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">السعر لكل ورقة (ج.م)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="مثال: 1.50"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم/وصف الشريحة (اختياري)</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="مثال: شريحة الجملة الأولى"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  {addLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  حفظ وإضافة الشريحة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
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
