'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, UserPlus, ShieldCheck, Key, Edit3, Lock, Unlock, Phone, DollarSign, Wallet, Clock, Search, CheckCircle2, AlertCircle, Shield, Check, X, ArrowRight, Trash2, HelpCircle } from 'lucide-react';
import { formatNumberLocale } from '@/lib/user-utils';

const FEATURES_LIST = [
  { key: 'services', label: 'تسجيل الخدمات والطباعة' },
  { key: 'tickets', label: 'حجوزات التذاكر' },
  { key: 'machines', label: 'الخدمات المالية والماكينات (فوري)' },
  { key: 'expenses', label: 'المصروفات والسلف' },
  { key: 'shifts', label: 'الشفتات والعهدة النقدية' },
  { key: 'invoices', label: 'سجل الفواتير' },
  { key: 'charge_history', label: 'سجل عمليات الشحن' },
];

const DEFAULT_PERMISSIONS: Record<string, { read: boolean; create: boolean; update: boolean; delete: boolean }> = {
  services: { read: true, create: true, update: false, delete: false },
  tickets: { read: true, create: true, update: false, delete: false },
  machines: { read: true, create: true, update: true, delete: false },
  expenses: { read: true, create: true, update: false, delete: false },
  shifts: { read: true, create: true, update: false, delete: false },
  invoices: { read: true, create: false, update: false, delete: false },
  charge_history: { read: true, create: true, update: false, delete: false },
};

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
  const [shortName, setShortName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [jobTitle, setJobTitle] = useState('كاشير مبيعات');
  const [salary, setSalary] = useState('');

  // Permissions Modal State
  const [permissionUser, setPermissionUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, { read: boolean; create: boolean; update: boolean; delete: boolean }>>(DEFAULT_PERMISSIONS);

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
        shortName,
        phone,
        password,
        role,
        jobTitle,
        salary: Number(salary || 0)
      } : {
        name,
        shortName,
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
      if (!res.ok) throw new Error(data.error || 'فشل حفظ الموظف');

      setMessage({ type: 'success', text: isEditing ? 'تم تحديث بيانات الموظف بنجاح' : 'تم إضافة الموظف الجديد بنجاح' });
      setShowModal(false);
      setEditingUser(null);
      resetUserForm();
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const resetUserForm = () => {
    setName('');
    setShortName('');
    setPhone('');
    setPassword('');
    setRole('user');
    setJobTitle('كاشير مبيعات');
    setSalary('');
  };

  const openEditUser = (u: any) => {
    setEditingUser(u);
    setName(u.name || '');
    setShortName(u.short_name || '');
    setPhone(u.phone || '');
    setPassword('');
    setRole(u.role || 'user');
    setJobTitle(u.job_title || 'كاشير مبيعات');
    setSalary((u.salary || 0).toString());
    setShowModal(true);
  };

  const handleToggleActive = async (u: any) => {
    const nextStatus = !u.is_active;
    const confirmMsg = nextStatus
      ? `هل أنت تأكد من تفعيل حساب الموظف (${u.name})؟`
      : `هل أنت تأكد من تعطيل/حذف حساب الموظف (${u.name})؟ سيع منعه من دخول النظام.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, isActive: nextStatus })
      });

      if (res.ok) {
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Permissions Handler
  const openPermissionsModal = (u: any) => {
    setPermissionUser(u);
    let parsed: Record<string, { read: boolean; create: boolean; update: boolean; delete: boolean }> = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));

    if (u.permissions && typeof u.permissions === 'object') {
      FEATURES_LIST.forEach(feat => {
        const p = u.permissions[feat.key];
        if (p && typeof p === 'object') {
          parsed[feat.key] = {
            read: Boolean(p.read ?? true),
            create: Boolean(p.create ?? true),
            update: Boolean(p.update ?? false),
            delete: Boolean(p.delete ?? false),
          };
        } else if (p === 'READ_ONLY') {
          parsed[feat.key] = { read: true, create: false, update: false, delete: false };
        } else if (p === 'FULL_ACCESS') {
          parsed[feat.key] = { read: true, create: true, update: true, delete: true };
        }
      });
    }

    setUserPermissions(parsed);
  };

  const togglePermissionCheckbox = (featKey: string, actionKey: 'read' | 'create' | 'update' | 'delete') => {
    setUserPermissions(prev => ({
      ...prev,
      [featKey]: {
        ...prev[featKey],
        [actionKey]: !prev[featKey]?.[actionKey]
      }
    }));
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionUser) return;

    setSubmitting(true);
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

      setMessage({ type: 'success', text: `تم تحديث أذونات الموظف (${permissionUser.name}) بنجاح` });
      setPermissionUser(null);
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                          (u.phone && u.phone.includes(search)) ||
                          (u.job_title && u.job_title.includes(search));
    if (activeTab === 'active') return matchesSearch && u.is_active;
    if (activeTab === 'inactive') return matchesSearch && !u.is_active;
    return matchesSearch;
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
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-blue-600" />
              <span>إدارة الموظفين</span>
            </h1>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingUser(null);
            resetUserForm();
            setShowModal(true);
          }}
          className="py-3 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700">إغلاق</button>
        </div>
      )}

      {/* Controls & Search */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'active' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الموظفين النشطين ({users.filter(u => u.is_active).length})
          </button>
          <button
            onClick={() => setActiveTab('inactive')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'inactive' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المعطلين/المحذوفين ({users.filter(u => !u.is_active).length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الكل ({users.length})
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، الهاتفي، الوظيفة..."
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-700 table-auto">
            <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">الموظف</th>
                <th className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>الاسم المختصر</span>
                    <div className="relative group cursor-pointer">
                      <HelpCircle className="w-4 h-4 text-blue-500 hover:text-blue-700 transition-colors" />
                      <div className="absolute right-0 top-6 hidden group-hover:block bg-slate-900 text-white text-[11px] font-normal p-3 rounded-xl shadow-2xl w-64 z-50 leading-relaxed normal-case">
                        الاسم المختصر الذي يظهر في شريط العهد والموظفين الأونلاين وشرائط التنبيه والجداول (مثال: إبراهيم بدلاً من أ/ إبراهيم).
                      </div>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">الوظيفة / الدور</th>
                <th className="px-4 py-3 whitespace-nowrap">رقم الهاتف</th>
                <th className="px-4 py-3 whitespace-nowrap">الراتب الشهرى</th>
                <th className="px-4 py-3 whitespace-nowrap">عهدة الكاش</th>
                <th className="px-4 py-3 whitespace-nowrap">الحالة</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">إجراءات الأذونات والحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">جاري التحميل...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">لا يوجد موظفين تطابق البحث</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{u.name}</td>
                    <td className="px-4 py-3 text-xs font-bold text-blue-700 whitespace-nowrap">
                      {u.short_name ? (
                        <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg">{u.short_name}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        u.role === 'manager'
                          ? 'bg-purple-100 text-purple-700 border-purple-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                      }`}>
                        {u.job_title || (u.role === 'manager' ? 'مدير نظام' : 'كاشير')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dir-ltr text-right whitespace-nowrap">{u.phone || '-'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {formatNumberLocale(Number(u.salary || 0), 'en-US')}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatNumberLocale(Number(u.wallet_balance || 0), 'en-US')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        u.is_active ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {u.is_active ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openPermissionsModal(u)}
                          className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 flex items-center gap-1 transition-colors"
                          title="ضبط الأذونات والصفحات"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>الأذونات</span>
                        </button>

                        <button
                          onClick={() => openEditUser(u)}
                          className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg border border-blue-200 transition-colors"
                          title="تعديل الموظف"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            u.is_active ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-200' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-200'
                          }`}
                          title={u.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                        >
                          {u.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={async () => {
                            if (!confirm(`هل أنت تأكد من رغبتك في حذف الموظف (${u.name})؟`)) return;
                            try {
                              const res = await fetch(`/api/users?id=${u.id}`, { method: 'DELETE' });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || 'فشل حذف الموظف');
                              setMessage({ type: 'success', text: `تم حذف الموظف (${u.name}) بنجاح` });
                              fetchUsers();
                            } catch (err: any) {
                              setMessage({ type: 'error', text: err.message });
                            }
                          }}
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-200 transition-colors"
                          title="حذف الموظف"
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

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <span>{editingUser ? `تعديل موظف: (${editingUser.name})` : 'إضافة موظف جديد'}</span>
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الموظف الثلاثي *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد محمود علي"
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>الاسم المختصر للعرض</span>
                    <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">(يظهر في شريط العهد والموظفين الأونلاين)</span>
                </label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="مثال: إبراهيم أو أحمد"
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingUser ? 'تغيير كلمة المرور (اختياري)' : 'كلمة المرور'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? 'كلمة سر جديدة...' : 'افتراضي: 123456'}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الصلاحية</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="user">كاشير / موظف مبيعات</option>
                    <option value="manager">مدير نظام (Manager)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="كاشير / مدير"
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الراتب الشهرى</label>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="4000"
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  <span>{editingUser ? 'حفظ التعديلات' : 'إضافة الموظف'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                  }}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Checkboxes Modal */}
      {permissionUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span>ضبط صلاحيات الموظف: ({permissionUser.name})</span>
              </h3>
              <button onClick={() => setPermissionUser(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              حدد الصلاحيات المتاحة بدقة لكل صفحة عبر مفاتيح الاختيار (Checkboxes):
            </p>

            <form onSubmit={handleSavePermissions} className="space-y-4">
              <div className="space-y-3">
                {FEATURES_LIST.map((feat) => {
                  const perm = userPermissions[feat.key] || { read: true, create: true, update: false, delete: false };

                  return (
                    <div key={feat.key} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <span className="text-xs font-bold text-slate-900 block">{feat.label}</span>

                      <div className="grid grid-cols-4 gap-2 pt-1">
                        <label className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          perm.read ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-500'
                        }`}>
                          <input
                            type="checkbox"
                            checked={perm.read}
                            onChange={() => togglePermissionCheckbox(feat.key, 'read')}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded flex items-center justify-center border ${perm.read ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                            {perm.read && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>عرض</span>
                        </label>

                        <label className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          perm.create ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-500'
                        }`}>
                          <input
                            type="checkbox"
                            checked={perm.create}
                            onChange={() => togglePermissionCheckbox(feat.key, 'create')}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded flex items-center justify-center border ${perm.create ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'}`}>
                            {perm.create && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>إضافة</span>
                        </label>

                        <label className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          perm.update ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-500'
                        }`}>
                          <input
                            type="checkbox"
                            checked={perm.update}
                            onChange={() => togglePermissionCheckbox(feat.key, 'update')}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded flex items-center justify-center border ${perm.update ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300'}`}>
                            {perm.update && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>تعديل</span>
                        </label>

                        <label className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          perm.delete ? 'bg-red-50 border-red-300 text-red-800' : 'bg-white border-slate-200 text-slate-500'
                        }`}>
                          <input
                            type="checkbox"
                            checked={perm.delete}
                            onChange={() => togglePermissionCheckbox(feat.key, 'delete')}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded flex items-center justify-center border ${perm.delete ? 'bg-red-600 border-red-600 text-white' : 'border-slate-300'}`}>
                            {perm.delete && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>حذف</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  حفظ الأذونات والصلاحيات
                </button>
                <button
                  type="button"
                  onClick={() => setPermissionUser(null)}
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
