'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  History, FileSpreadsheet, Zap, Printer, Train, ArrowLeft, ShieldCheck, 
  ArrowLeftRight, Receipt
} from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Compact Header Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white flex items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1 text-right">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-bold border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>نظام ماسبيرو لإدارة خدمات الطباعة والإنترنت</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            أهلاً بك، <span className="text-blue-600">{user?.name || 'الكاشير'}</span> 👋
          </h1>
          <p className="text-slate-500 text-xs">
            اختر السجل المطلوب أدناه للانتقال المباشر
          </p>
        </div>
      </div>

      {/* The 7 Main Logs Section */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          <span>سجلات العمليات والحركات المباشرة</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. سجل التسليم والتسلم */}
          <Link href="/handover-history" className="group">
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    سجل موحد
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">سجل التسليم والتسلم والتحويلات</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  متابعة جميع حركات تسليم العهد النقدية، المحافظ، والتحويلات بين الموظفين.
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:underline">
                <span>فتح السجل</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* 2. سجل المصروفات */}
          <Link href="/expenses-history" className="group">
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white hover:border-rose-300 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                    سجل موحد
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition-colors">سجل المصروفات والقيود المالية</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  تتبع المصروفات، السلف، المشتريات والإيرادات اليومية في جدول مخصص.
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-600 group-hover:underline">
                <span>فتح السجل</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* 3. سجل الشفتات */}
          <Link href="/shifts-history" className="group">
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <History className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    سجل مخصص
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">سجل الشفتات وساعات العمل</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  عرض وتتبع شفتات الموظفين وساعات العمل مع إمكانية التصفية والتعديل.
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:underline">
                <span>فتح السجل</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* 4. سجل الفواتير */}
          <Link href="/invoices" className="group">
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                    سجل مخصص
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 transition-colors">سجل الفواتير الصادرة</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  سجل كامل بالفواتير الصادرة وتفاصيل كل فاتورة وإعادة طباعتها عند الحاجة.
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-600 group-hover:underline">
                <span>فتح السجل</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* 5. سجل عمليات الشحن */}
          <Link href="/charge-history" className="group">
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white hover:border-amber-300 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                    سجل مخصص
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">سجل عمليات الشحن</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  عرض جميع عمليات الإيداع والسحب الخاصة بالمحافظ والماكينات والعمولات.
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:underline">
                <span>فتح السجل</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* 6. سجل الخدمات والطباعة */}
          <Link href="/services" className="group">
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Printer className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    سجل مخصص
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">سجل الخدمات والطباعة</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  تتبع عمليات طباعة الأوراق وخدمات الأونلاين المسجلة بالنظام.
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:underline">
                <span>فتح السجل</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* 7. سجل حجز التذاكر */}
          <Link href="/tickets" className="group">
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 hover:shadow-md transition-all h-full flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Train className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                    سجل مخصص
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">سجل حجز التذاكر</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  سجل عمليات حجز تذاكر القطارات وأسعار التذاكر والعمولات المحصلة.
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600 group-hover:underline">
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
