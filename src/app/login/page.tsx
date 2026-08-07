'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, User, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [nameOrPhone, setNameOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameOrPhone, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-300/25 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-200 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white p-2 shadow-xl shadow-slate-300/60 mb-4 border border-slate-200">
            <Image
              src="/maspero-logo.png"
              alt="Maspero Logo"
              width={72}
              height={72}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-wide">ماسـبيرو للخدمات</h1>
          <p className="text-slate-600 text-sm mt-1">لخدمات الطباعة والإنترنت والمحافظ الإلكترونية</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-300 text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">اسم المستخدم / رقم الهاتف</label>
            <div className="relative">
              <User className="absolute right-3.5 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="text"
                required
                value={nameOrPhone}
                onChange={(e) => setNameOrPhone(e.target.value)}
                placeholder="أدخل اسمك أو رقم هاتفك"
                className="w-full pr-11 pl-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-3.5 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-11 pl-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <span>جاري تسجيل الدخول...</span>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>تسجيل الدخول</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 font-semibold tracking-wide">
          OPEN Apps (openappo) Enterprise System &copy; 2026
        </div>
      </div>
    </div>
  );
}
