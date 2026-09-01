'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  History, FileSpreadsheet, Zap, Printer, Train, ArrowLeft, ShieldCheck, 
  ArrowLeftRight, Receipt, Gift
} from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(() => {});
  }, []);

  const HISTORY_CARDS = [
    { title: 'سجل التسليم', href: '/handover-history', icon: ArrowLeftRight, color: 'text-emerald-700 bg-emerald-100 hover:border-emerald-400' },
    { title: 'سجل المصروفات', href: '/expenses-history', icon: Receipt, color: 'text-rose-700 bg-rose-100 hover:border-rose-400' },
    { title: 'سجل الشفتات', href: '/shifts-history', icon: History, color: 'text-indigo-700 bg-indigo-100 hover:border-indigo-400' },
    { title: 'سجل الحوافز والخصومات', href: '/hr-history', icon: Gift, color: 'text-violet-700 bg-violet-100 hover:border-violet-400' },
    { title: 'سجل الفواتير', href: '/invoices', icon: FileSpreadsheet, color: 'text-teal-700 bg-teal-100 hover:border-teal-400' },
    { title: 'سجل الشحن', href: '/charge-history', icon: Zap, color: 'text-amber-700 bg-amber-100 hover:border-amber-400' },
    { title: 'سجل الخدمات', href: '/services', icon: Printer, color: 'text-blue-700 bg-blue-100 hover:border-blue-400' },
    { title: 'سجل التذاكر', href: '/tickets', icon: Train, color: 'text-purple-700 bg-purple-100 hover:border-purple-400' },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Compact Header Banner */}
      <div className="glass-panel px-4 py-3.5 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white shadow-sm">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-bold border border-blue-200 mb-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>ماسـبيرو لخدمات الطباعة والإنترنت</span>
        </div>
        <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
          أهلاً، <span className="text-blue-600">{user?.name?.split(' ')[0] || 'الكاشير'}</span> 👋
        </h1>
      </div>

      {/* History Cards Grid */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 px-0.5">
          <History className="w-4 h-4 text-indigo-600" />
          <span>سجلات العمليات</span>
        </h2>

        {/* 2-col on mobile → 2-col md → 3-col lg */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {HISTORY_CARDS.map((card, idx) => {
            const IconComp = card.icon;
            return (
              <Link key={idx} href={card.href} className="group active:scale-95 transition-transform">
                <div className={`glass-panel p-3 md:p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-all flex items-center justify-between gap-2 ${card.color}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                      <IconComp className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                      {card.title}
                    </h3>
                  </div>
                  <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 group-hover:text-indigo-600 group-hover:-translate-x-1 transition-all shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
