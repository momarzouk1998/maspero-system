'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, ShieldCheck, Key, Edit3, Lock, Unlock, Phone, DollarSign, Wallet, Clock, Printer, Receipt, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ManagerUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [jobTitle, setJobTitle] = useState('كاشير مبيعات');
  const [salary, setSalary] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const isEditing = Boolean(editingUser);
      const url = '/api/users';
      const method = isEditing ? 'PUT' : 'POST';

      const body = isEditing ? {
        userId: editingUser.id,
        name,
        phone,
        password,
        role,
        jobTitle,
        salary: Number(salary || 0)
      } : {
        name,
        phone,
        password: password || '123456',
        role,
        jobTitle,
        salary: Number(salary || 0)
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ بيانات الموظف');

      setMessage({ type: 'success', text: data.message || 'تم حفظ الموظف بنجاح 🎉' });
      setShowModal(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: any) => {
    const action = user.is_active ? 'إيقاف' : 'تفعيل';
    if (!confirm(`هل أنت تأكد من رغبتك في ${action} حساب الموظف (${user.name})؟`)) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          isActive: !user.is_active
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التعديل');

      setMessage({ type: 'success', text: data.message || `تم ${action} الحساب بنجاح` });
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setPassword('');
    setRole('user');
    setJobTitle('كاشير مبيعات');
    setSalary('');
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setName(u.name || '');
    setPhone(u.phone || '');
    setPassword('');
    setRole(u.role || 'user');
    setJobTitle(u.job_title || 'كاشير مبيعات');
    setSalary(String(u.salary || 0));
    setShowModal(true);
  };

  const filteredUsers = users.filter(
    (u) => u.name?.includes(search) || u.phone?.includes(search) || u.job_title?.includes(search)
  );

  const activeUsers = users.filter((u) => u.is_active);
  const inactiveUsers = users.filter((u) => !u.is_active);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-400" />
            <span>إدارة الموظفين والمستخدمين (لوحة التحكم)</span>
          </h1>
          <p className="text-slate-400 text-sm">
            عرض الموظفين، إضافة حسابات جديدة، وتغيير كلمات السر وتقارير الحركات والعهدة
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setEditingUser(null);
            setShowModal(true);
          }}
          className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all shrink-0"
        >
          <UserPlus className="w-5 h-5" />
          <span>إضافة موظف جديد</span>
        </button>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-blue-500/30 bg-slate-900/60">
          <span className="text-xs text-slate-400 font-medium">إجمالي الموظفين المكتشفين</span>
          <p className="text-3xl font-black text-blue-400 mt-1">{users.length} <span className="text-xs text-slate-400">حساب</span></p>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-slate-900/60">
          <span className="text-xs text-slate-400 font-medium">الموظفين المفعلين للشفتات</span>
          <p className="text-3xl font-black text-emerald-400 mt-1">{activeUsers.length} <span className="text-xs text-slate-400">موظف نشط</span></p>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60">
          <span className="text-xs text-slate-400 font-medium">الموظفين السابقين (للمراجعة التاريخية)</span>
          <p className="text-3xl font-black text-slate-400 mt-1">{inactiveUsers.length} <span className="text-xs text-slate-400">حساب سابق</span></p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 absolute right-4 top-3.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم الموظف، الهاتف، أو المسمى الوظيفي..."
          className="w-full pr-12 pl-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUsers.map((u) => (
          <div key={u.id} className={`glass-card p-5 rounded-3xl border space-y-4 transition-all ${
            u.is_active
              ? 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
              : 'border-slate-800/40 bg-slate-950/40 opacity-75'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-base">
                  {u.name?.charAt(0) || 'م'}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <span>{u.name}</span>
                    {u.role === 'manager' && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                        مدير
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">{u.job_title || 'موظف'}</p>
                </div>
              </div>

              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                u.is_active
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {u.is_active ? 'نشط' : 'سابق'}
              </span>
            </div>

            {/* Employee Details & Wallet */}
            <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
              <div>
                <span className="text-slate-500 block">الهاتف:</span>
                <span className="text-white font-mono">{u.phone || 'غير مسجل'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">الراتب الأساسي:</span>
                <span className="text-white font-bold">{Number(u.salary || 0).toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">العهدة الكاش الحالية:</span>
                <span className={`text-sm font-black ${Number(u.wallet_balance || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {Number(u.wallet_balance || 0).toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            </div>

            {/* Counts & Activity Summary */}
            <div className="flex items-center justify-around text-center text-slate-400 text-xs py-1">
              <div>
                <span className="text-white font-bold block">{u._count?.service_entries || 0}</span>
                <span>خدمات ومبيعات</span>
              </div>
              <div className="border-r border-slate-800 h-6" />
              <div>
                <span className="text-white font-bold block">{u._count?.expenses || 0}</span>
                <span>مصروفات وسلف</span>
              </div>
              <div className="border-r border-slate-800 h-6" />
              <div>
                <span className="text-white font-bold block">{u._count?.shifts || 0}</span>
                <span>شفتات عمل</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => openEditModal(u)}
                className="flex-1 py-2 px-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل الحساب</span>
              </button>

              <button
                onClick={() => handleToggleActive(u)}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border ${
                  u.is_active
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {u.is_active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{u.is_active ? 'إيقاف' : 'تفعيل'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-blue-500/40 bg-slate-900 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-400" />
              <span>{editingUser ? `تعديل حساب (${editingUser.name})` : 'إضافة موظف جديد'}</span>
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">اسم الموظف الثلاثي</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسم الموظف"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">رقم الهاتف (يُستخدم لتسجيل الدخول)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {editingUser ? 'تغيير كلمة المرور (اتركها فارغة إذا لم ترد تغييرها)' : 'كلمة المرور'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? 'كلمة سر جديدة...' : 'افتراضي: 123456'}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">الصلاحية</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="user">كاشير / موظف مبيعات</option>
                    <option value="manager">مدير نظام (Manager)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="كاشير / مدير"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الراتب الشهرى (ج.م)</label>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="4000"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                >
                  <span>{editingUser ? 'حفظ التعديلات' : 'إضافة الموظف'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
