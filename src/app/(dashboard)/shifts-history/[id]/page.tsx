'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, FileText, Clock, User, CheckCircle2, AlertTriangle, 
  Printer, Train, Wallet, DollarSign, Receipt, RefreshCw, Handshake, ArrowLeftRight, HelpCircle
} from 'lucide-react';
import { formatNumberLocale } from '@/lib/user-utils';

export default function ShiftAuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const shiftId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAuditData();
  }, [shiftId]);

  const fetchAuditData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/shifts/audit?shiftId=${shiftId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'فشل جلب تقرير الشفت');
      setData(json);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل كشف حساب الشفت');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-3 text-cyan-600" />
        <p className="font-bold text-sm">جاري جلب وتجميع تقرير الشفت التفصيلي والتسليم والتسلم...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-red-50 border border-red-200 rounded-3xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-600 mx-auto" />
        <h2 className="text-lg font-bold text-red-900">{error || 'لم يتم العثور على التقرير'}</h2>
        <Link
          href="/shifts-history"
          className="inline-flex items-center gap-2 py-2.5 px-5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لسجل الشفتات</span>
        </Link>
      </div>
    );
  }

  const { shift, employee, summary, details } = data;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/shifts-history"
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span>سجل الشفتات</span>
          </Link>

          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-700" />
              <span>تقرير الشفت التفصيلي (كشف حساب العمليات)</span>
              <span className="text-xs bg-cyan-100 text-cyan-800 px-2.5 py-0.5 rounded-lg border border-cyan-300 font-bold">
                {shift.shift_type || 'صباحي'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              الموظف المسؤول: <span className="text-slate-900 font-bold">{shift.employee_name || 'موظف'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={fetchAuditData}
          className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تحديث التقرير</span>
        </button>
      </div>

      {/* 1. Shift Metadata Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-slate-500 text-xs block mb-1">توقيت بداية الشفت:</span>
          <span className="font-bold font-mono text-slate-900 text-xs dir-ltr block">
            {shift.start_time ? new Date(shift.start_time).toLocaleString('en-US') : '-'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-xs block mb-1">توقيت الإغلاق:</span>
          <span className="font-bold font-mono text-slate-900 text-xs dir-ltr block">
            {shift.end_time ? new Date(shift.end_time).toLocaleString('en-US') : 'نشط الآن'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-xs block mb-1">إجمالي ساعات العمل:</span>
          <span className="font-bold text-cyan-700 font-mono text-xs block">
            {formatNumberLocale(Number(shift.total_hours || 0), 'en-US')} ساعة
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-xs block mb-1">ملاحظات الإغلاق:</span>
          <span className="font-semibold text-slate-800 text-xs block">
            {shift.shift_note || 'لا توجد ملاحظات'}
          </span>
        </div>
      </div>

      {/* 2. Key Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Cash Custody Card */}
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-3xl space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>عهدة الكاش الحالية</span>
          </div>
          <span className="text-lg font-black font-mono text-emerald-900 block">
            {formatNumberLocale(summary.currentCashCustody, 'en-US')} ج
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold block">رصيد عهدة الكاش والشفت المسجل</span>
        </div>

        {/* Services & Print */}
        <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-3xl space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs">
            <Printer className="w-4 h-4 text-blue-600" />
            <span>الخدمات والطباعة</span>
          </div>
          <span className="text-lg font-black font-mono text-blue-900 block">
            {formatNumberLocale(summary.totalServicesAmount, 'en-US')} ج
          </span>
          <span className="text-[10px] text-blue-700 font-semibold block">
            عدد الورق: {summary.totalPaperCount} ورقة | عمولات: {formatNumberLocale(summary.totalServiceCommission || 0, 'en-US')} ج
          </span>
        </div>

        {/* Train Tickets */}
        <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-3xl space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-purple-800 font-bold text-xs">
            <Train className="w-4 h-4 text-purple-600" />
            <span>حركة التذاكر</span>
          </div>
          <span className="text-lg font-black font-mono text-purple-900 block">
            {formatNumberLocale(summary.totalTicketsAmount, 'en-US')} ج
          </span>
          <span className="text-[10px] text-purple-700 font-semibold block">عدد: {summary.totalTicketsCount} | عمولات: {formatNumberLocale(summary.totalTicketCommission, 'en-US')} ج</span>
        </div>

        {/* Wallets & Machines */}
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-3xl space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
            <Wallet className="w-4 h-4 text-amber-600" />
            <span>المحافظ والماكينات</span>
          </div>
          <span className="text-xs font-black font-mono text-amber-900 block">
            إيداع: {formatNumberLocale(summary.walletDeposits, 'en-US')} | سحب: {formatNumberLocale(summary.walletWithdrawals, 'en-US')}
          </span>
          <span className="text-[10px] text-amber-700 font-semibold block">عمولات المحافظ: {formatNumberLocale(summary.walletCommissions, 'en-US')} ج</span>
        </div>

        {/* Expenses & Advances */}
        <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-3xl space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
            <Receipt className="w-4 h-4 text-rose-600" />
            <span>المصروفات والسلف</span>
          </div>
          <span className="text-lg font-black font-mono text-rose-900 block">
            {formatNumberLocale(summary.totalExpenses + summary.totalAdvances, 'en-US')} ج
          </span>
          <span className="text-[10px] text-rose-700 font-semibold block">مصروفات: {formatNumberLocale(summary.totalExpenses, 'en-US')} | سلف: {formatNumberLocale(summary.totalAdvances, 'en-US')}</span>
        </div>
      </div>

      {/* ── SECTION 1: CUSTODY HANDOVERS & RECEIPT AUDIT (التسليم والتسلم وتفاصيل العهد) ── */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-emerald-600" />
            <span>🤝 حركة التسليم والتسلم وتفاصيل العهد بالشفت ({details.handovers.length})</span>
          </div>
        </h2>

        {details.handovers.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold">
            لا توجد حركات تسليم وتسلم مسجلة خلال فترة هذا الشفت
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs text-slate-700 table-auto">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">اسم العهدة / المحفظة</th>
                  <th className="px-4 py-3 whitespace-nowrap">المسلّم (من)</th>
                  <th className="px-4 py-3 whitespace-nowrap">المستلم (إلى)</th>
                  <th className="px-4 py-3 whitespace-nowrap">الرصيد المتوقع (قبل الاستلام)</th>
                  <th className="px-4 py-3 whitespace-nowrap">الرصيد الفعلي المستلم</th>
                  <th className="px-4 py-3 whitespace-nowrap">الفارق (عجز / زيادة)</th>
                  <th className="px-4 py-3 whitespace-nowrap">حالة المراجعة</th>
                  <th className="px-4 py-3 whitespace-nowrap">توقيت الحركة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {details.handovers.map((h: any) => {
                  const expected = Number(h.expected_balance || h.balance_at_time || 0);
                  const actual = Number(h.actual_balance || 0);
                  const diff = Number(h.difference || (actual - expected));

                  return (
                    <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{h.wallet_name}</td>
                      <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">{h.sender_name || 'المركز'}</td>
                      <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">{h.receiver_name || 'المركز'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatNumberLocale(expected, 'en-US')} ج
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatNumberLocale(actual, 'en-US')} ج
                      </td>
                      <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">
                        {diff === 0 ? (
                          <span className="text-emerald-600 font-bold">طبيعي (0)</span>
                        ) : diff > 0 ? (
                          <span className="text-blue-600 font-bold">+{formatNumberLocale(diff, 'en-US')} ج (زيادة)</span>
                        ) : (
                          <span className="text-red-600 font-bold">{formatNumberLocale(diff, 'en-US')} ج (عجز)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          h.review_status === 'تم المطابقة' || diff === 0
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {h.review_status || (diff === 0 ? 'تم المطابقة' : 'الرجاء المراجعة')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs whitespace-nowrap">
                        {h.created_at ? new Date(h.created_at).toLocaleString('en-US') : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 2: TRAIN TICKET BOOKINGS (حركة التذاكر) ── */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Train className="w-5 h-5 text-purple-600" />
          <span>🎟️ حركة حجز التذاكر المنفذة بالشفت ({details.tickets.length})</span>
        </h2>

        {details.tickets.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold">
            لا توجد حجوزات تذاكر مسجلة خلال فترة هذا الشفت
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs text-slate-700 table-auto">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">نوع الخدمة</th>
                  <th className="px-4 py-3 whitespace-nowrap">عدد التذاكر</th>
                  <th className="px-4 py-3 whitespace-nowrap">سعر التذكرة</th>
                  <th className="px-4 py-3 whitespace-nowrap">المبلغ الإجمالي</th>
                  <th className="px-4 py-3 whitespace-nowrap">العمولة</th>
                  <th className="px-4 py-3 whitespace-nowrap">كود الفاتورة</th>
                  <th className="px-4 py-3 whitespace-nowrap">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {details.tickets.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{t.service_name || 'قطار'}</td>
                    <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">{t.item_count || 1}</td>
                    <td className="px-4 py-3 font-mono font-semibold whitespace-nowrap">{formatNumberLocale(Number(t.ticket_price || 0), 'en-US')} ج</td>
                    <td className="px-4 py-3 font-mono font-bold text-purple-700 whitespace-nowrap">{formatNumberLocale(Number(t.amount || 0), 'en-US')} ج</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700 whitespace-nowrap">{formatNumberLocale(Number(t.ticket_commission || 0), 'en-US')} ج</td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs whitespace-nowrap">{t.invoice_code || '-'}</td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs whitespace-nowrap">{t.timestamp ? new Date(t.timestamp).toLocaleTimeString('en-US') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 3: EXPENSES & ADVANCES (حركة المصروفات والسلف) ── */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-rose-600" />
          <span>💸 حركة المصروفات والسلف بالشفت ({details.expenses.length})</span>
        </h2>

        {details.expenses.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold">
            لا توجد مصروفات أو سلف مسجلة خلال هذا الشفت
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs text-slate-700 table-auto">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">النوع الرئيسي</th>
                  <th className="px-4 py-3 whitespace-nowrap">طريقة الصرف / التصنيف</th>
                  <th className="px-4 py-3 whitespace-nowrap">المبلغ</th>
                  <th className="px-4 py-3 whitespace-nowrap">المستلم / البيان</th>
                  <th className="px-4 py-3 whitespace-nowrap">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {details.expenses.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{e.main_type}</td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{e.expense_type || '-'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-700 whitespace-nowrap">{formatNumberLocale(Number(e.amount || 0), 'en-US')} ج</td>
                    <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">{e.notes || e.items || '-'}</td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs whitespace-nowrap">{e.timestamp ? new Date(e.timestamp).toLocaleTimeString('en-US') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 4: SERVICES & PRINTING (حركة الخدمات والطباعة) ── */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Printer className="w-5 h-5 text-blue-600" />
          <span>🖨️ حركة الخدمات والطباعة المنفذة بالشفت ({details.services.length})</span>
        </h2>

        {details.services.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold">
            لا توجد مبيعات خدمات أو طباعة مسجلة خلال هذا الشفت
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs text-slate-700 table-auto">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">اسم الخدمة</th>
                  <th className="px-4 py-3 whitespace-nowrap">عدد الورق</th>
                  <th className="px-4 py-3 whitespace-nowrap">النوع</th>
                  <th className="px-4 py-3 whitespace-nowrap">المبلغ</th>
                  <th className="px-4 py-3 whitespace-nowrap">عمولة الموظف</th>
                  <th className="px-4 py-3 whitespace-nowrap">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {details.services.map((svc: any) => (
                  <tr key={svc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{svc.service_name}</td>
                    <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">{svc.paper_count || svc.page_count || 1}</td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{svc.face_type || '-'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">{formatNumberLocale(Number(svc.amount || 0), 'en-US')} ج</td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-800 whitespace-nowrap">
                      {Number(svc.employee_commission || 0) > 0 ? (
                        <span className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                          +{formatNumberLocale(Number(svc.employee_commission || 0), 'en-US')} ج
                        </span>
                      ) : (
                        <span className="text-slate-400">0 ج</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs whitespace-nowrap">{svc.timestamp ? new Date(svc.timestamp).toLocaleTimeString('en-US') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 5: WALLET & MACHINE TRANSACTIONS (حركة المحافظ والماكينات) ── */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-amber-600" />
          <span>💳 حركة المحافظ والماكينات بالشفت ({details.walletTx.length})</span>
        </h2>

        {details.walletTx.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold">
            لا توجد حركات محافظ أو ماكينات مسجلة خلال هذا الشفت
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs text-slate-700 table-auto">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">المحفظة / الماكينة</th>
                  <th className="px-4 py-3 whitespace-nowrap">نوع الحركة</th>
                  <th className="px-4 py-3 whitespace-nowrap">المبلغ</th>
                  <th className="px-4 py-3 whitespace-nowrap">العمولة</th>
                  <th className="px-4 py-3 whitespace-nowrap">البيان / الوصف</th>
                  <th className="px-4 py-3 whitespace-nowrap">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {details.walletTx.map((w: any) => (
                  <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{w.wallet_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                        w.transaction_type === 'إيداع' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'
                      }`}>
                        {w.transaction_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{formatNumberLocale(Number(w.amount || 0), 'en-US')} ج</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700 whitespace-nowrap">{formatNumberLocale(Number(w.wallet_commission || 0), 'en-US')} ج</td>
                    <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">{w.description || '-'}</td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs whitespace-nowrap">{w.timestamp ? new Date(w.timestamp).toLocaleTimeString('en-US') : '-'}</td>
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
