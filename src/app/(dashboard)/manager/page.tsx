'use client';

import Link from 'next/link';
import { 
  ShieldCheck, BarChart3, Wallet, Printer, StickyNote, Users, 
  Tags, ArrowLeft, ArrowRight, Banknote
} from 'lucide-react';

export default function ManagerHubPage() {
  const MANAGER_TOOLS = [
    { id: 'reports', title: 'تقارير الماليات', href: '/manager/reports', icon: BarChart3, color: 'text-emerald-700 bg-emerald-100 hover:border-emerald-400' },
    { id: 'payroll', title: 'مستحقات الموظفين', href: '/manager/payroll', icon: Users, color: 'text-indigo-700 bg-indigo-100 hover:border-indigo-400' },
    { id: 'balances', title: 'الأرصدة الحالية اللحظية', href: '/manager/balances', icon: Banknote, color: 'text-amber-700 bg-amber-100 hover:border-amber-400' },
    { id: 'wallets', title: 'إدارة المحافظ والماكينات', href: '/manager/wallets', icon: Wallet, color: 'text-blue-700 bg-blue-100 hover:border-blue-400' },
    { id: 'pricing', title: 'إدارة أسعار الطباعة', href: '/manager/pricing', icon: Printer, color: 'text-purple-700 bg-purple-100 hover:border-purple-400' },
    { id: 'services', title: 'إدارة الخدمات', href: '/manager/services', icon: Printer, color: 'text-teal-700 bg-teal-100 hover:border-teal-400' },
    { id: 'notes', title: 'ملاحظات المدير', href: '/manager/notes', icon: StickyNote, color: 'text-amber-700 bg-amber-100 hover:border-amber-400' },
    { id: 'users', title: 'إدارة المستخدمين', href: '/manager/users', icon: Users, color: 'text-indigo-700 bg-indigo-100 hover:border-indigo-400' },
    { id: 'categories', title: 'تصنيفات المصروفات', href: '/manager/categories', icon: Tags, color: 'text-rose-700 bg-rose-100 hover:border-rose-400' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-white flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[11px] font-bold border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>لوحة التحكم الخاصة بالمدير</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
              لوحة المدير
            </h1>
          </div>
        </div>
      </div>

      {/* Manager Tools Compact Cards */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-600" />
          <span>أدوات وإعدادات لوحة المدير</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MANAGER_TOOLS.map((card) => {
            const IconComp = card.icon;
            return (
              <Link key={card.id} href={card.href} className="group">
                <div className={`glass-panel p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-all flex items-center justify-between gap-3 ${card.color}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${card.color}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      {card.title}
                    </h3>
                  </div>

                  <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:-translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
