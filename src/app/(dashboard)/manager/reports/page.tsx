'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Printer, Train, Cpu, Receipt } from 'lucide-react';

export default function ManagerReportsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/reports/financial');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">جاري تحميل التقارير المالية...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-400" />
            <span>لوحة التقارير المالية والأرباح العامة</span>
          </h1>
          <p className="text-slate-400 text-sm">
            إحصائيات الإيرادات الشاملة، العمولات، المصروفات، وصافي الربح للمؤسسة
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-400">إجمالي الإيرادات</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            {Number(metrics?.totalRevenue || 0).toLocaleString('ar-EG')} <span className="text-sm font-normal text-emerald-400">ج.م</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">خدمات + عمولات التذاكر</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-blue-500/30 bg-blue-500/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-400">إيرادات الطباعة والخدمات</span>
            <Printer className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            {Number(metrics?.serviceValue || 0).toLocaleString('ar-EG')} <span className="text-sm font-normal text-blue-400">ج.م</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">من إجمالي {metrics?.totalServiceEntries} عملية</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-purple-500/30 bg-purple-500/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-400">عمولات التذاكر</span>
            <Train className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            {Number(metrics?.ticketCommission || 0).toLocaleString('ar-EG')} <span className="text-sm font-normal text-purple-400">ج.م</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">من {metrics?.totalTicketBookings} حجز قطار</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-rose-500/30 bg-rose-500/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-400">إجمالي المصروفات والسلف</span>
            <Receipt className="w-5 h-5 text-rose-400" />
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            {Number(metrics?.expensesValue || 0).toLocaleString('ar-EG')} <span className="text-sm font-normal text-rose-400">ج.م</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">خصم تشغيلي</p>
        </div>
      </div>

      {/* Net Profit Big Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 to-slate-900/80 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
            النتيجة المالية النهائية
          </span>
          <h2 className="text-xl font-bold text-white mt-2">صافي الربح الإجمالي للمؤسسة</h2>
          <p className="text-slate-400 text-sm">الإيرادات بعد خصم كافة المصروفات التشغيلية</p>
        </div>
        <div className="text-left">
          <span className="text-4xl font-black text-emerald-400">
            {Number(metrics?.netProfit || 0).toLocaleString('ar-EG')} <span className="text-lg font-normal text-white">ج.م</span>
          </span>
        </div>
      </div>
    </div>
  );
}
