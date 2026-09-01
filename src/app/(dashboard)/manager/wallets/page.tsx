'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Wallet, Cpu, Archive, Edit3, Plus, Trash2, CheckCircle2, AlertCircle, 
  RefreshCw, X, ArrowRight, Settings2, Save, Percent
} from 'lucide-react';
import { getActiveUsers, formatNumberLocale } from '@/lib/user-utils';

export default function ManagerWalletsPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState('محفظة');
  const [walletNumber, setWalletNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [custodianName, setCustodianName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ── إعداد نسبة خصم مشتريات فوري ────────────────────────────
  const [fawryRate, setFawryRate] = useState<string>('1.8');
  const [fawryRateSaving, setFawryRateSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wRes, uRes, sRes] = await Promise.all([
        fetch('/api/wallets'),
        fetch('/api/users'),
        fetch('/api/settings?key=fawry_purchase_deduction_rate'),
      ]);

      if (wRes.ok) {
        const wData = await wRes.json();
        setWallets(wData.externalWallets || []);
      }
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(getActiveUsers(uData.users || []));
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.value !== null && sData.value !== undefined) {
          setFawryRate(String(sData.value));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveFawryRate = async () => {
    const num = parseFloat(fawryRate);
    if (isNaN(num) || num < 0 || num > 100) {
      showToast('القيمة يجب أن تكون رقماً بين 0 و 100', 'error');
      return;
    }
    setFawryRateSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'fawry_purchase_deduction_rate', value: num }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');
      showToast(`تم حفظ نسبة الخصم (${num}%) بنجاح ✅`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFawryRateSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setWalletName('');
    setWalletType('محفظة');
    setWalletNumber('');
    setInitialBalance('0');
    setCustodianName('');
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setWalletName(item.wallet_name || '');
    setWalletType(item.wallet_type || 'محفظة');
    setWalletNumber(item.wallet_number || '');
    setInitialBalance((item.current_balance || 0).toString());
    setCustodianName(item.custodian_name || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const isEditing = Boolean(editingItem);
      const url = '/api/wallets';
      const method = isEditing ? 'PUT' : 'POST';

      const body = isEditing ? {
        walletId: editingItem.id,
        walletName,
        walletType,
        walletNumber,
        initialBalance: parseFloat(initialBalance || '0'),
        custodianName
      } : {
        walletName,
        walletType,
        walletNumber,
        initialBalance: parseFloat(initialBalance || '0'),
        custodianName
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء حفظ المحفظة');

      showToast(isEditing ? 'تم تعديل بيانات المحفظة بنجاح 🎉' : 'تم إضافة المحفظة بنجاح 🎉');
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف (${name})؟`)) return;

    try {
      const res = await fetch(`/api/wallets?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`تم حذف (${name}) بنجاح`);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 safe-area-top">
      {/* Header */}
      <div className="glass-panel p-4 md:p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              <Wallet className="w-6 h-6 text-blue-600" />
              <span>إدارة المحافظ والأدراج</span>
            </h1>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة محفظة / ماكينة جديدة</span>
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

      {/* ── إعدادات ماكينة فوري ──────────────────────────────── */}
      <div className="glass-panel p-5 rounded-3xl border border-amber-200 bg-amber-50/40 space-y-3">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-amber-600" />
          <h2 className="text-sm font-bold text-slate-900">إعدادات ماكينة فوري — سحب مشتريات (كريدت)</h2>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          عمليات نوع <strong className="text-amber-700">مشتريات</strong> على ماكينات سحب فوري تُخصم الشبكة نسبةً من المبلغ قبل إيداعه في الماكينة.
          هذه النسبة تُطبَّق تلقائياً على <strong>رصيد الماكينة</strong> والعمولة المحتسبة، ما يجعل مطابقة الرصيد صحيحة والأرباح حقيقية.
        </p>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[160px] max-w-[240px]">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              نسبة خصم الشبكة <span className="text-slate-400 font-normal">(% من المبلغ)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={fawryRate}
                onChange={(e) => setFawryRate(e.target.value)}
                className="w-full p-2.5 pl-8 bg-white border border-amber-300 rounded-xl text-slate-900 font-mono text-sm font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-300"
              />
              <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={handleSaveFawryRate}
            disabled={fawryRateSaving}
            className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            {fawryRateSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>حفظ النسبة</span>
          </button>

          {/* معاينة حية */}
          {(() => {
            const r = parseFloat(fawryRate);
            if (isNaN(r) || r <= 0) return null;
            const ex = 1000;
            const cost = ex * (r / 100);
            const net = ex - cost;
            const commExample = 30;
            const realComm = commExample - cost;
            return (
              <div className="flex-1 min-w-[220px] bg-white border border-amber-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <span>📊</span> معاينة على مثال 1000 جنيه:
                </p>
                <div className="flex justify-between"><span>خصم الشبكة:</span><span className="font-mono text-red-600 font-bold">- {cost.toFixed(2)} ج</span></div>
                <div className="flex justify-between"><span>يُضاف لرصيد الماكينة:</span><span className="font-mono text-emerald-700 font-bold">{net.toFixed(2)} ج</span></div>
                <div className="border-t border-amber-100 pt-1 flex justify-between"><span>عمولة {commExample}ج → ربح صافي:</span><span className="font-mono text-blue-700 font-bold">{realComm.toFixed(2)} ج</span></div>
              </div>
            );
          })()}
        </div>
      </div>
      {/* ─────────────────────────────────────────────────────── */}

      {/* Wallets & Machines Simple Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-700 table-auto">
            <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">اسم العهدة / المحفظة</th>
                <th className="px-4 py-3 whitespace-nowrap">النوع</th>
                <th className="px-4 py-3 whitespace-nowrap">رقم الهاتف / الكود</th>
                <th className="px-4 py-3 whitespace-nowrap">الرصيد الحالي</th>
                <th className="px-4 py-3 whitespace-nowrap">المسؤول الحالي</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">إجراءات المدير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>جاري تحميل المحافظ والماكينات...</span>
                  </td>
                </tr>
              ) : wallets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    لا توجد محافظ أو ماكينات مسجلة
                  </td>
                </tr>
              ) : (
                wallets.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                      {item.wallet_type === 'ماكينة' ? (
                        <Cpu className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : item.wallet_type === 'درج كاشير' ? (
                        <Archive className="w-4 h-4 text-purple-600 shrink-0" />
                      ) : (
                        <Wallet className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                      <span>{item.wallet_name}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        item.wallet_type === 'ماكينة'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : item.wallet_type === 'درج كاشير'
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}>
                        {item.wallet_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-600 whitespace-nowrap">{item.wallet_number || '-'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-base whitespace-nowrap">
                      {formatNumberLocale(Number(item.current_balance || 0), 'en-US')}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800 whitespace-nowrap">{item.custodian_name || 'ماسـبيرو (المركز)'}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg border border-blue-200 transition-colors"
                          title="تعديل"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.wallet_name)}
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
                <Wallet className="w-5 h-5 text-blue-600" />
                <span>{editingItem ? 'تعديل بيانات المحفظة / الماكينة' : 'إضافة محفظة أو ماكينة جديدة'}</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم العهدة / المحفظة *</label>
                <input
                  type="text"
                  required
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="مثال: فوري 1، ماس 1، درج كاشير 1..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع العهدة *</label>
                <select
                  value={walletType}
                  onChange={(e) => setWalletType(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-500"
                >
                  <option value="محفظة">محفظة إلكترونية 💳</option>
                  <option value="ماكينة">ماكينة (فوري / بساطة) 🖥️</option>
                  <option value="درج كاشير">درج كاشير 📥</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / كود الحساب (اختياري)</label>
                <input
                  type="text"
                  value={walletNumber}
                  onChange={(e) => setWalletNumber(e.target.value)}
                  placeholder="رقم المحفظة..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الرصيد الافتتاحي *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-sm font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المسؤول عن العهدة</label>
                <select
                  value={custodianName}
                  onChange={(e) => setCustodianName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="">ماسـبيرو (المركز نفسه)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
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
