'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Printer,
  Train,
  Wallet,
  ArrowLeftRight,
  PlusCircle,
  Clock,
  TrendingUp,
  Cpu,
  Receipt
} from 'lucide-react';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meRes, entriesRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/service-entries?limit=10')
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
        }

        if (entriesRes.ok) {
          const entriesData = await entriesRes.json();
          setRecentEntries(entriesData.entries || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/60 bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-slate-900/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              مرحباً بك في لوحة تحكم ماسـبيرو 👋
            </h1>
            <p className="text-slate-400 text-sm">
              نظام إدارة المبيعات والمحافظ الرقمية والتسليم المباشر بين الموظفين
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/services">
              <button className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all">
                <PlusCircle className="w-4 h-4" />
                <span>تسجيل خدمة/طباعة</span>
              </button>
            </Link>
            <Link href="/wallet">
              <button className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all">
                <ArrowLeftRight className="w-4 h-4" />
                <span>تحويل رصيد لموظف</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Personal Wallet Card */}
        <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              محفظتك الشخصية
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-1">الرصيد النقدي في عهدتك الآن</p>
          <h3 className="text-2xl font-extrabold text-white">
            {Number(user?.wallet_balance || 0).toLocaleString('ar-EG')} <span className="text-sm font-normal text-emerald-400">ج.م</span>
          </h3>
        </div>

        {/* Quick Service Entry Card */}
        <Link href="/services" className="block">
          <div className="glass-card p-5 rounded-2xl border border-blue-500/20 hover:border-blue-500/40 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                الخدمات والطباعة
              </span>
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <Printer className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-1">تسجيل طباعة أوراق وخدمات أونلاين</p>
            <h3 className="text-sm font-bold text-white flex items-center gap-1">
              تسجيل فاتورة جديدة &rarr;
            </h3>
          </div>
        </Link>

        {/* Train Tickets Card */}
        <Link href="/tickets" className="block">
          <div className="glass-card p-5 rounded-2xl border border-purple-500/20 hover:border-purple-500/40 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg">
                تذاكر القطارات
              </span>
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                <Train className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-1">حجز تذاكر قطارات والعمولات</p>
            <h3 className="text-sm font-bold text-white flex items-center gap-1">
              حجز تذكرة قطار &rarr;
            </h3>
          </div>
        </Link>

        {/* Fawry Machines Card */}
        <Link href="/machines" className="block">
          <div className="glass-card p-5 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                الماكينات والفوري
              </span>
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-1">إيداع وسحب المحافظ والماكينات</p>
            <h3 className="text-sm font-bold text-white flex items-center gap-1">
              عملية ماكينة جديدة &rarr;
            </h3>
          </div>
        </Link>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span>آخر حركات الخدمات المسجلة</span>
          </h2>
          <Link href="/services" className="text-xs text-blue-400 hover:underline">
            عرض الكل
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
        ) : recentEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-500">لا توجد حركات مسجلة حديثاً</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">اسم الخدمة</th>
                  <th className="px-4 py-3">عدد الورق</th>
                  <th className="px-4 py-3">الوجه</th>
                  <th className="px-4 py-3">المبلغ</th>
                  <th className="px-4 py-3">الموظف</th>
                  <th className="px-4 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentEntries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{item.service_name}</td>
                    <td className="px-4 py-3">{item.paper_count}</td>
                    <td className="px-4 py-3">{item.face_type || 'وجه واحد'}</td>
                    <td className="px-4 py-3 font-bold text-emerald-400">{Number(item.amount).toLocaleString('ar-EG')} ج.م</td>
                    <td className="px-4 py-3 text-slate-400">{item.employee_name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(item.timestamp || item.date).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
