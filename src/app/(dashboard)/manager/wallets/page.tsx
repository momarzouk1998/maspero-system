'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Wallet, ShieldCheck, Cpu, Archive, Edit3, Plus, Trash2, CheckCircle2, AlertCircle, Phone, Smartphone, ArrowRight } from 'lucide-react';

export default function ManagerWalletsPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [externalWallets, setExternalWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Wallet Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<any>(null);

  // Form Fields
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState('محفظة'); // "محفظة" | "ماكينة" | "درج كاش"
  const [walletNumber, setWalletNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [custodianName, setCustodianName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/wallets');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employeeWallets || []);
        setExternalWallets(data.externalWallets || []);
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

  const totalEmployeesCash = employees.reduce(
    (sum, emp) => sum + Number(emp.wallet_balance || 0),
    0
  );

  // Create or Update Wallet / Drawer
  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const isEditing = Boolean(editingWallet);
      const url = '/api/wallets';
      const method = isEditing ? 'PUT' : 'POST';

      const body = isEditing ? {
        walletId: editingWallet.id,
        walletName,
        walletType,
        walletNumber,
        initialBalance: Number(initialBalance || 0),
        custodianName
      } : {
        action: 'create',
        walletName,
        walletType,
        walletNumber,
        initialBalance: Number(initialBalance || 0)
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ المحفظة/الدرج');

      setMessage({ type: 'success', text: data.message || 'تم حفظ بيانات المحفظة/الدرج بنجاح 🎉' });
      setShowAddModal(false);
      setEditingWallet(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Wallet / Drawer
  const handleDeleteWallet = async (walletId: string, name: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف (${name})؟`)) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/wallets?id=${walletId}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف العنصر');

      setMessage({ type: 'success', text: data.message || 'تم الحذف بنجاح' });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setWalletName('');
    setWalletType('محفظة');
    setWalletNumber('');
    setInitialBalance('');
    setCustodianName('');
  };

  const openEditModal = (w: any) => {
    setEditingWallet(w);
    setWalletName(w.wallet_name || '');
    setWalletType(w.wallet_type || 'محفظة');
    setWalletNumber(w.wallet_number || '');
    setInitialBalance(String(w.current_balance || 0));
    setCustodianName(w.custodian_name || '');
    setShowAddModal(true);
  };

  const drawersList = externalWallets.filter((w) => w.wallet_type === 'درج كاش' || w.wallet_type === 'درج');
  const machinesList = externalWallets.filter((w) => w.wallet_type !== 'درج كاش' && w.wallet_type !== 'درج');

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
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
              <span>رقابة وإدارة المحافظ والماكينات (لوحة المدير)</span>
            </h1>
            <p className="text-slate-400 text-sm">
              إضافة، تعديل، وحذف <strong className="text-amber-400">الماكينات ومحافظ الكاش والأدراج</strong> ومراقبة عهد الموظفين
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetForm();
              setEditingWallet(null);
              setShowAddModal(true);
            }}
            className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة محفظة / درج / ماكينة جديدة</span>
          </button>

          {/* Total Cash with Employees */}
          <div className="glass-card px-6 py-3 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-400 text-left">
            <span className="text-xs text-slate-400 block font-medium">إجمالي عهدة الكاش</span>
            <span className="text-2xl font-black text-white">
              {totalEmployeesCash.toLocaleString('ar-EG')} <span className="text-xs font-normal text-indigo-400">ج.م</span>
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. External Machines & Wallets Management */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <span>ماكينات فوري ومحافظ كاش ({machinesList.length})</span>
          </h2>
          <span className="text-xs text-slate-400">يمكنك تعديل أي محفظة أو إضافتها أو حذفها</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {machinesList.map((w) => (
            <div key={w.id} className="glass-card p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {w.wallet_type}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(w)}
                    title="تعديل"
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWallet(w.id, w.wallet_name)}
                    title="حذف"
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-white text-lg">{w.wallet_name}</h3>
                {w.wallet_number && <p className="text-xs text-slate-400 font-mono mt-0.5">{w.wallet_number}</p>}
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                  {Number(w.current_balance).toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-400">ج.م</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">مسؤول العهدة: {w.custodian_name || 'غير محدد'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Cash Drawers Section (Now with Full Edit & Delete Support) */}
      <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-purple-950/10 space-y-4">
        <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-purple-400" />
            <span>أدراج الأمانات ({drawersList.length})</span>
          </h2>
          <span className="text-xs text-purple-300">يمكنك تعديل أي درج كاش أو حذفه بسهولة</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {drawersList.map((w) => (
            <div key={w.id} className="glass-card p-5 rounded-2xl border border-purple-500/30 bg-slate-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {w.wallet_type}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(w)}
                    title="تعديل الدرج"
                    className="p-1.5 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWallet(w.id, w.wallet_name)}
                    title="حذف الدرج"
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-white text-lg">{w.wallet_name}</h3>
                <p className="text-2xl font-extrabold text-purple-300 mt-1">
                  {Number(w.current_balance).toLocaleString('ar-EG')} <span className="text-xs font-normal text-slate-400">ج.م</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employees Wallets Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-indigo-400" />
          <span>أرصدة عهد الموظفين الكاش الحالية</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري تحميل المحافظ...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <div key={emp.id} className="glass-card p-5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white text-base">{emp.name}</h3>
                    {emp.role === 'manager' && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                        مدير
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{emp.job_title || 'موظف مبيعات'}</p>
                </div>

                <div className="text-left">
                  <span className="text-xs text-slate-500 block">رصيد العهدة الكاش</span>
                  <span className={`text-xl font-black ${Number(emp.wallet_balance || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {Number(emp.wallet_balance || 0).toLocaleString('ar-EG')} <span className="text-xs text-slate-300">ج.م</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Wallet / Drawer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/40 bg-slate-900 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <span>{editingWallet ? `تعديل (${editingWallet.wallet_name})` : 'إضافة محفظة / درج / ماكينة جديدة'}</span>
            </h3>

            <form onSubmit={handleSaveWallet} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الاسم</label>
                <input
                  type="text"
                  required
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="مثال: فودافون كاش 1 / درج كاش 4 / فوري 3"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">النوع</label>
                <select
                  value={walletType}
                  onChange={(e) => setWalletType(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="محفظة">محفظة إلكترونية (فودافون/اتصالات/أورنج)</option>
                  <option value="ماكينة">ماكينة دفع (فوري/بساطة)</option>
                  <option value="درج كاش">درج كاش (أمانات)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الرقم / الكود (اختياري)</label>
                <input
                  type="text"
                  value={walletNumber}
                  onChange={(e) => setWalletNumber(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الرصيد الافتتاحي (ج.م)</label>
                <input
                  type="number"
                  step="0.5"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="أدخل الرصيد الافتتاحي"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {editingWallet && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">اسم مسؤول العهدة (اختياري)</label>
                  <input
                    type="text"
                    value={custodianName}
                    onChange={(e) => setCustodianName(e.target.value)}
                    placeholder="اسم الموظف المسؤول"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingWallet(null);
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  <span>{editingWallet ? 'حفظ التعديلات' : 'إضافة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
