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
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              مرحباً بك في لوحة تحكم ماسـبيرو 👋
            </h1>
            <p className="text-slate-600 text-sm">
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
        <div className="glass-card p-5 rounded-2xl border border-emerald-300 bg-emerald-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
              محفظتك الشخصية
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-600 mb-1">الرصيد النقدي في عهدتك الآن</p>
          <h3 className="text-2xl font-extrabold text-slate-900">
            {Number(user?.wallet_balance || 0).toLocaleString('ar-EG')} <span className="text-sm font-normal text-emerald-700">ج.م</span>
          </h3>
        </div>

        {/* Quick Service Entry Card */}
        <Link href="/services" className="block">
          <div className="glass-card p-5 rounded-2xl border border-blue-200 hover:border-blue-400 cursor-pointer hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg">
                الخدمات والطباعة
              </span>
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <Printer className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-1">تسجيل طباعة أوراق وخدمات أونلاين</p>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1">
              تسجيل فاتورة جديدة &rarr;
            </h3>
          </div>
        </Link>

        {/* Train Tickets Card */}
        <Link href="/tickets" className="block">
          <div className="glass-card p-5 rounded-2xl border border-purple-200 hover:border-purple-400 cursor-pointer hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg">
                تذاكر القطارات
              </span>
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Train className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-1">حجز تذاكر قطارات والعمولات</p>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1">
              حجز تذكرة قطار &rarr;
            </h3>
          </div>
        </Link>

        {/* Fawry Machines Card */}
        <Link href="/machines" className="block">
          <div className="glass-card p-5 rounded-2xl border border-amber-200 hover:border-amber-400 cursor-pointer hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">
                الماكينات والفوري
              </span>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-1">إيداع وسحب المحافظ والماكينات</p>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1">
              عملية ماكينة جديدة &rarr;
            </h3>
          </div>
        </Link>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>آخر حركات الخدمات المسجلة</span>
          </h2>
          <Link href="/services" className="text-xs text-blue-600 hover:underline">
            عرض الكل
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
        ) : recentEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-500">لا توجد حركات مسجلة حديثاً</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-slate-700">
              <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">اسم الخدمة</th>
                  <th className="px-4 py-3">عدد الورق</th>
                  <th className="px-4 py-3">الوجه</th>
                  <th className="px-4 py-3">المبلغ</th>
                  <th className="px-4 py-3">الموظف</th>
                  <th className="px-4 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentEntries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.service_name}</td>
                    <td className="px-4 py-3">{item.paper_count}</td>
                    <td className="px-4 py-3">{item.face_type || 'وجه واحد'}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">{Number(item.amount).toLocaleString('ar-EG')} ج.م</td>
                    <td className="px-4 py-3 text-slate-600">{item.employee_name || '-'}</td>
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
