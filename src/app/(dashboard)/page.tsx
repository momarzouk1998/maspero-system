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

  const HISTORY_CARDS = [
    { title: 'سجل التسليم', href: '/handover-history', icon: ArrowLeftRight, color: 'text-emerald-700 bg-emerald-100 hover:border-emerald-400' },
    { title: 'سجل المصروفات', href: '/expenses-history', icon: Receipt, color: 'text-rose-700 bg-rose-100 hover:border-rose-400' },
    { title: 'سجل الشفتات', href: '/shifts', icon: History, color: 'text-indigo-700 bg-indigo-100 hover:border-indigo-400' },
    { title: 'سجل الفواتير', href: '/invoices', icon: FileSpreadsheet, color: 'text-teal-700 bg-teal-100 hover:border-teal-400' },
    { title: 'سجل الشحن', href: '/charge-history', icon: Zap, color: 'text-amber-700 bg-amber-100 hover:border-amber-400' },
    { title: 'سجل الخدمات', href: '/services', icon: Printer, color: 'text-blue-700 bg-blue-100 hover:border-blue-400' },
    { title: 'سجل التذاكر', href: '/tickets', icon: Train, color: 'text-purple-700 bg-purple-100 hover:border-purple-400' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Compact Header Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white flex items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1 text-right">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-bold border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>ماسـبيرو لخدمات الطباعة والإنترنت</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            أهلاً بك، <span className="text-blue-600">{user?.name || 'الكاشير'}</span> 👋
          </h1>
        </div>
      </div>

      {/* The 7 Compact History Cards Section */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          <span>سجلات العمليات</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {HISTORY_CARDS.map((card, idx) => {
            const IconComp = card.icon;
            return (
              <Link key={idx} href={card.href} className="group">
                <div className={`glass-panel p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-all flex items-center justify-between gap-3 ${card.color}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${card.color}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {card.title}
                    </h3>
                  </div>

                  <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:-translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
