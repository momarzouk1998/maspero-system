'use client';

import Link from 'next/link';
import { 
  ShieldCheck, BarChart3, Wallet, Printer, StickyNote, Users, 
  Tags, ArrowLeft, Zap, Sparkles, ChevronLeft, ArrowRight
} from 'lucide-react';

export default function ManagerHubPage() {
  const MANAGER_TOOLS = [
    {
      id: 'reports',
      title: 'تقارير الأرباح والمبيعات',
      description: 'عرض تحليل الأرباح الصافية، مبيعات الطباعة، عمولات الماكينات وتكلفة المشتريات.',
      icon: BarChart3,
      href: '/manager/reports',
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:border-emerald-400',
      badge: 'إحصائيات كاملة'
    },
    {
      id: 'wallets',
      title: 'محافظ الموظفين والخزينة',
      description: 'متابعة العهد النقدية للشركاء والكاشيرية، الخزينة الرئيسية، ورصيد المحافظ الإلكترونية.',
      icon: Wallet,
      href: '/manager/wallets',
      color: 'bg-blue-500/10 text-blue-600 border-blue-200 hover:border-blue-400',
      badge: 'العهدة والنقدية'
    },
    {
      id: 'pricing',
      title: 'إدارة أسعار الطباعة',
      description: 'ضبط وتعريف شرائح أسعار الطباعة (أسود / ألوان / وجه واحد / وجهين).',
      icon: Printer,
      href: '/manager/pricing',
      color: 'bg-purple-500/10 text-purple-600 border-purple-200 hover:border-purple-400',
      badge: 'تسعير الورق'
    },
    {
      id: 'notes',
      title: 'ملاحظات المدير والعدادات',
      description: 'سجل قراءات عدادات الماكينات، أسعار المشتريات والحباك، وأرصدة أول وآخر المدة.',
      icon: StickyNote,
      href: '/manager/notes',
      color: 'bg-amber-500/10 text-amber-600 border-amber-200 hover:border-amber-400',
      badge: 'بيانات وقراءات'
    },
    {
      id: 'users',
      title: 'الموظفين والحسابات والأذونات',
      description: 'إضافة وتعديل بيانات الموظفين، الرواتب، وضبط صلاحيات الصفحات بمفاتيح الاختيار.',
      icon: Users,
      href: '/manager/users',
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 hover:border-indigo-400',
      badge: 'إدارة الصلاحيات'
    },
    {
      id: 'services',
      title: 'إدارة كود الخدمات والعمولات',
      description: 'إضافة وتعديل وحذف الخدمات ونسب عمولات الموظفين والأسعار.',
      icon: Printer,
      href: '/manager/services',
      color: 'bg-teal-500/10 text-teal-600 border-teal-200 hover:border-teal-400',
      badge: 'الخدمات والعمولات'
    },
    {
      id: 'categories',
      title: 'تصنيفات المصروفات',
      description: 'إدارة وتخصيص تصنيفات المصروفات والإيرادات والمشتريات للنظام.',
      icon: Tags,
      href: '/manager/categories',
      color: 'bg-rose-500/10 text-rose-600 border-rose-200 hover:border-rose-400',
      badge: 'البنود والتصنيف'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              <ShieldCheck className="w-6 h-6 text-purple-600" />
              <span>لوحة تحكم وإدارة النظام (Manager Hub)</span>
            </h1>
            <p className="text-slate-600 text-xs mt-0.5">
              مركز التحكم الرئيسي لإصدار التقارير وإدارة المحافظ، الأسعار، الملاحظات، والأذونات
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-full border border-purple-200 flex items-center gap-1.5 self-start md:self-auto">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>حساب مدير النظام</span>
        </span>
      </div>

      {/* Grid of Manager Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {MANAGER_TOOLS.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <Link
              key={tool.id}
              href={tool.href}
              className="glass-card p-6 rounded-3xl border border-slate-200 hover:border-slate-400 hover:shadow-xl transition-all group flex flex-col justify-between space-y-4 bg-white/60 hover:bg-white"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl border ${tool.color} transition-transform group-hover:scale-110`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                    {tool.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold text-slate-700 group-hover:text-purple-600 transition-colors">
                <span>فتح النافذة</span>
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
