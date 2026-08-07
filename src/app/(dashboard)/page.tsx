'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, Clock, ShoppingCart, History, FileSpreadsheet, 
  Zap, Printer, Train, ArrowLeft, Wallet, ShieldCheck, ArrowRight
} from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold border border-blue-200">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>نظام ماسبيرو لإدارة خدمات الطباعة والإنترنت</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            أهلاً بك، <span className="text-blue-600">{user?.name || 'الكاشير'}</span> 👋
          </h1>
          <p className="text-slate-600 text-xs md:text-sm max-w-xl">
            اختر السجل أو الخدمة المطلوبة من الكروت أدناه للانتقال السريع والمباشر
          </p>
        </div>

        {/* User Custody Cash Pill */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-right shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>عهدة الكاش بين يديك</span>
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900">
            {Number(user?.wallet_balance || 0).toLocaleString('ar-EG')}
          </p>
        </div>
      </div>

      {/* Primary Actions Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-blue-600" />
          <span>الوصول السريع للعمليات</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/pos" className="group">
            <div className="glass-panel p-6 rounded-3xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 hover:border-emerald-400 transition-all shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                  <ShoppingCart className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">صفحة البيع (POS)</h3>
                  <p className="text-xs text-slate-600 mt-0.5">تسجيل الفواتير المباشرة والطباعة للعملاء</p>
                </div>
              </div>
              <ArrowLeft className="w-5 h-5 text-emerald-600 group-hover:-translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/shifts" className="group">
            <div className="glass-panel p-6 rounded-3xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 hover:border-blue-400 transition-all shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-800 transition-colors">إدارة الشفتات والعهد</h3>
                  <p className="text-xs text-slate-600 mt-0.5">بدء الشفت واستلام وتأكيد المحافظ والأدراج والتحويلات</p>
                </div>
              </div>
              <ArrowLeft className="w-5 h-5 text-blue-600 group-hover:-translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* The 5 Main Logs Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          <span>سجلات العمليات والحركات</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. سجل الشفتات */}
          <Link href="/shifts-history" className="group">
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xl transition-all h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <History className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                    سجل مخصص
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">سجل الشفتات</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  عرض وتتبع شفتات الموظفين وساعات العمل مع إمكانية التصفية المتقدمة.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:underline">
                <span>فتح السجل</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* 2. سجل الفواتير */}
          <Link href="/invoices" className="group">
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xl transition-all h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    سجل مخصص
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">سجل الفواتير</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  سجل كامل بالفواتير الصادرة وتفاصيل كل فاتورة وإعادة طباعتها عند الحاجة.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:underline">
                <span>فتح السجل</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* 3. سجل عمليات الشحن */}
          <Link href="/charge-history" className="group">
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 bg-white hover:border-amber-300 hover:shadow-xl transition-all h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                    سجل مخصص
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">سجل عمليات الشحن</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  عرض جميع عمليات الإيداع والسحب الخاصة بالمحافظ والماكينات والعمولات.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:underline">
                <span>فتح السجل</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* 4. سجل الخدمات */}
          <Link href="/services" className="group">
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xl transition-all h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Printer className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                    سجل مخصص
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">سجل الخدمات والطباعة</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  تتبع عمليات طباعة الأوراق وخدمات الأونلاين المسجلة بالنظام.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:underline">
                <span>فتح السجل</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* 5. سجل التذاكر */}
          <Link href="/tickets" className="group">
            <div className="glass-panel p-6 rounded-3xl border border-slate-200 bg-white hover:border-purple-300 hover:shadow-xl transition-all h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Train className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                    سجل مخصص
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">سجل حجز التذاكر</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  سجل عمليات حجز تذاكر القطارات وأسعار التذاكر والعمولات المحصلة.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600 group-hover:underline">
                <span>فتح السجل</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
