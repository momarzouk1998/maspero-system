'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, Lock, Shield, Phone, KeyRound, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Wallet
} from 'lucide-react';
import { formatNumberLocale } from '@/lib/user-utils';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast('كلمة المرور الجديدة وتأكيدها غير متطابقين', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير كلمة المرور');

      showToast('تم تغيير كلمة المرور بنجاح 🎉');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto safe-area-top">
      {/* Header Banner */}
      <div className="glass-panel p-4 md:p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>

          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              <span>الملف الشخصي</span>
            </h1>
          </div>
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Info Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 font-bold text-2xl flex items-center justify-center border border-blue-200 shadow-inner">
              {user?.name?.charAt(0) || 'م'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
                {user?.role === 'manager' ? 'مدير النظام' : user?.job_title || 'موظف مبيعات'}
              </span>
            </div>
          </div>

          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>رقم الهاتف:</span>
              </span>
              <span className="font-bold font-mono text-slate-900">{user?.phone || 'غير مسجل'}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-slate-400" />
                <span>الدور بالمنظومة:</span>
              </span>
              <span className="font-bold text-slate-900">{user?.role === 'manager' ? 'مدير عام' : 'كاشير / مبيعات'}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
              <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>عهدة الكاش الحالية:</span>
              </span>
              <span className="font-black font-mono text-sm text-emerald-700">
                {formatNumberLocale(Number(user?.wallet_balance || 0), 'en-US')}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-5">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">تغيير كلمة المرور</h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور الحالية *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور الجديدة *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">تأكيد كلمة المرور الجديدة *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد كتابة كلمة المرور الجديدة..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>حفظ كلمة المرور الجديدة</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
