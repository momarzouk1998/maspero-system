'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, Save, CheckCircle2, AlertTriangle, Printer, Palette, RefreshCw, ArrowRight } from 'lucide-react';

interface PrintPrice {
  id: string;
  print_type: string;
  face_type: string;
  key_name: string;
  price: string | number;
}

export default function ManagerPricingPage() {
  const [prices, setPrices] = useState<PrintPrice[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPrices = async () => {
    try {
      const res = await fetch('/api/print-prices');
      if (res.ok) {
        const data = await res.json();
        setPrices(data.prices || []);
        // Seed edit state
        const initial: Record<string, string> = {};
        for (const p of data.prices || []) {
          initial[p.id] = String(p.price);
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

  const handleSave = async (priceRow: PrintPrice) => {
    const newPrice = parseFloat(editValues[priceRow.id] || '0');
    if (isNaN(newPrice) || newPrice < 0) {
      setMessage({ type: 'error', text: 'يرجى إدخال سعر صحيح' });
      return;
    }

    setSaving(priceRow.id);
    setMessage(null);

    try {
      const res = await fetch('/api/print-prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: priceRow.id, price: newPrice })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التحديث');

      setMessage({ type: 'success', text: data.message });
      fetchPrices();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(null);
    }
  };

  // Group prices by print type
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
    <div className={`glass-panel p-6 rounded-3xl border space-y-4 ${color}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl bg-opacity-20 ${color.includes('blue') ? 'bg-blue-500' : 'bg-amber-500'}`}>
          <Icon className={`w-5 h-5 ${color.includes('blue') ? 'text-blue-400' : 'text-amber-400'}`} />
        </div>
        <div>
          <h3 className="font-bold text-white text-base">{title}</h3>
          <p className="text-xs text-slate-400">اضغط حفظ بعد تعديل أي سعر</p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
          >
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{row.face_type}</p>
              <p className="text-xs text-slate-400 mt-0.5">{row.key_name}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 focus-within:border-blue-500 transition-colors">
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={editValues[row.id] ?? String(row.price)}
                  onChange={(e) =>
                    setEditValues((prev) => ({ ...prev, [row.id]: e.target.value }))
                  }
                  className="w-20 bg-transparent text-white font-mono font-bold text-base focus:outline-none text-left"
                />
                <span className="text-slate-400 text-xs font-medium shrink-0">/ ورقة</span>
              </div>

              <button
                onClick={() => handleSave(row)}
                disabled={saving === row.id}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20"
              >
                {saving === row.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>حفظ</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/manager"
            className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span>لوحة المدير</span>
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <Settings className="w-7 h-7 text-blue-400" />
              <span>أسعار الطباعة</span>
            </h1>
          </div>
        </div>

        <button
          onClick={fetchPrices}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تحديث الأسعار الحالية</span>
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

      {/* Price Warning Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>تنبيه مهم:</strong> أي تغيير في الأسعار هنا سيؤثر على الفواتير الجديدة فور الحفظ. الفواتير السابقة لن تتأثر وتبقى كما هي.
        </span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">جاري تحميل الأسعار...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PriceGroup
            title="طباعة أسود (Black & White)"
            icon={Printer}
            color="border-blue-500/30"
            rows={bwPrices}
          />
          <PriceGroup
            title="طباعة ألوان (Color Printing)"
            icon={Palette}
            color="border-amber-500/30"
            rows={colorPrices}
          />
        </div>
      )}
    </div>
  );
}
