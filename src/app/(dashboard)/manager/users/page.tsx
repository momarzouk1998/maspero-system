'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, ShieldCheck, Key, Edit3, Lock, Unlock, Phone, DollarSign, Wallet, Clock, Search, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

export default function ManagerUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive' | 'all'>('active');

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [jobTitle, setJobTitle] = useState('كاشير مبيعات');
  const [salary, setSalary] = useState('');

  // Permissions Modal State
  const [permissionUser, setPermissionUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<any>({
    services: 'FULL_ACCESS',
    tickets: 'FULL_ACCESS',
    machines: 'READ_WRITE',
    expenses: 'READ_WRITE',
    shifts: 'READ_WRITE',
    wallet: 'FULL_ACCESS',
  });

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

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionUser) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: permissionUser.id,
          permissions: userPermissions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ الأذونات');

      setMessage({ type: 'success', text: data.message || 'تم تحديث أذونات الموظف بنجاح 🎉' });
      setPermissionUser(null);
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

  const openPermissionsModal = (u: any) => {
    setPermissionUser(u);
    try {
      const parsed = u.permissions ? JSON.parse(u.permissions) : {};
      setUserPermissions({
        services: parsed.services || 'FULL_ACCESS',
        tickets: parsed.tickets || 'FULL_ACCESS',
        machines: parsed.machines || 'READ_WRITE',
        expenses: parsed.expenses || 'READ_WRITE',
        shifts: parsed.shifts || 'READ_WRITE',
        wallet: parsed.wallet || 'FULL_ACCESS',
      });
    } catch (e) {
      setUserPermissions({
        services: 'FULL_ACCESS',
        tickets: 'FULL_ACCESS',
        machines: 'READ_WRITE',
        expenses: 'READ_WRITE',
        shifts: 'READ_WRITE',
        wallet: 'FULL_ACCESS',
      });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.includes(search) || u.phone?.includes(search) || u.job_title?.includes(search);

    if (activeTab === 'active') return matchesSearch && u.is_active;
    if (activeTab === 'inactive') return matchesSearch && !u.is_active;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-400" />
            <span>إدارة الموظفين وتحديد الأذونات (لوحة المدير)</span>
          </h1>
          <p className="text-slate-400 text-sm">
            إضافة موظفين جدد، تحديث كلمات السر، وتحديد أذونات الوصول للقرارات والصفحات (<strong className="text-blue-400">عرض / تعديل / حذف</strong>)
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

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم الموظف، الهاتف، أو الوظيفة..."
            className="w-full pr-10 pl-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            الموظفين الحاليين ({users.filter((u) => u.is_active).length})
          </button>
          <button
            onClick={() => setActiveTab('inactive')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'inactive'
                ? 'bg-slate-700 text-white shadow-md shadow-slate-700/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            الموظفين السابقين ({users.filter((u) => !u.is_active).length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            الكل ({users.length})
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري تحميل الموظفين...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">الموظف</th>
                  <th className="px-4 py-3.5">الصلاحية والوظيفة</th>
                  <th className="px-4 py-3.5">الهاتف</th>
                  <th className="px-4 py-3.5">العهدة الكاش</th>
                  <th className="px-4 py-3.5">النشاط والتاريخ</th>
                  <th className="px-4 py-3.5 text-center">الإجراءات والأذونات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-800/40 transition-colors ${!u.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                          {u.name?.charAt(0) || 'م'}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{u.name}</span>
                          <span className="text-[11px] text-slate-400">راتب: {Number(u.salary || 0).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-xs font-bold text-slate-200">{u.job_title || 'كاشير'}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          u.role === 'manager'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {u.role === 'manager' ? 'مدير نظام' : 'موظف مبيعات'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-300">
                      {u.phone || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`font-extrabold text-sm ${Number(u.wallet_balance || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {Number(u.wallet_balance || 0).toLocaleString('ar-EG')} ج.م
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      <span>{u._count?.service_entries || 0} مبيعات | {u._count?.shifts || 0} شفتات</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          title="تعديل الحساب"
                          className="py-1.5 px-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        <button
                          onClick={() => openPermissionsModal(u)}
                          title="ضبط الأذونات والصفحات"
                          className="py-1.5 px-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>الأذونات</span>
                        </button>

                        <button
                          onClick={() => handleToggleActive(u)}
                          title={u.is_active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                          className={`p-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                            u.is_active
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {u.is_active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                <label className="block text-xs font-medium text-slate-300 mb-1.5">رقم الهاتف (تسجيل الدخول)</label>
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
                  {editingUser ? 'تغيير كلمة المرور (اختياري)' : 'كلمة المرور'}
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

      {/* Permissions Modal (أذونات وصفحات الموظف) */}
      {permissionUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-purple-500/40 bg-slate-900 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <span>ضبط أذونات وتراخيص الصفحات لـ ({permissionUser.name})</span>
              </h3>
              <span className="text-xs text-purple-300 font-semibold bg-purple-500/10 px-2.5 py-0.5 rounded-md border border-purple-500/20">
                {permissionUser.job_title || 'موظف'}
              </span>
            </div>

            <form onSubmit={handleSavePermissions} className="space-y-4">
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {[
                  { key: 'services', label: 'تسجيل الخدمات والطباعة' },
                  { key: 'tickets', label: 'حجوزات التذاكر' },
                  { key: 'machines', label: 'الخدمات المالية والماكينات (فوري)' },
                  { key: 'expenses', label: 'المصروفات والسلف' },
                  { key: 'shifts', label: 'الشفتات وساعات العمل' },
                  { key: 'wallet', label: 'التحويلات والعهدة النقدية' },
                ].map((item) => (
                  <div key={item.key} className="glass-card p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{item.label}</span>

                    <select
                      value={userPermissions[item.key] || 'READ_WRITE'}
                      onChange={(e) => setUserPermissions({ ...userPermissions, [item.key]: e.target.value })}
                      className="p-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                    >
                      <option value="READ_ONLY">عرض فقط (Read Only)</option>
                      <option value="READ_WRITE">عرض وتعديل (Read + Write)</option>
                      <option value="FULL_ACCESS">عرض وتعديل وحذف (Full Access)</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPermissionUser(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 cursor-pointer disabled:opacity-50"
                >
                  <span>حفظ الأذونات والتراخيص</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
