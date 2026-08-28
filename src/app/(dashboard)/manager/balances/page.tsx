'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, Banknote, Wallet, Building2, User, Users, Archive, Zap, RefreshCw, AlertCircle
} from 'lucide-react';

export default function ManagerBalancesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/financial');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const formatNumberLocale = (num: number, locale = 'en-US') => {
    const formatted = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
    return formatted;
  };

  const isExcludedFromTotal = (name: string) => {
    if (!name) return false;
    return name.includes('سحب فوري') || name.includes('الصياد') || name.includes('الكوماندا');
  };

  const walletsTotals = data?.walletsTotals || { محافظ: 0, ماكينات: 0, أدراج: 0 };
  const walletsByType = data?.walletsByType || { محافظ: [], ماكينات: [], أدراج: [] };
  const employeeCustody = data?.employeeCustody || [];
  const totalEmployeeCustody = data?.totalEmployeeCustody || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title & Navigation */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm bg-white">
        <div className="flex items-center gap-3">
          <Link
            href="/manager"
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span>لوحة المدير</span>
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Banknote className="w-7 h-7 text-amber-600" />
              <span>الأرصدة الحالية اللحظية</span>
            </h1>
          </div>
        </div>

        <button
          onClick={fetchBalances}
          disabled={loading}
          className="py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث الأرصدة اللحظية</span>
        </button>
      </div>

      {/* Notice Banner for Excluded Accounts */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3 shadow-sm">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <div className="text-xs font-bold leading-relaxed">
          <span className="font-extrabold text-amber-950">تنبيه المجموع الإجمالي: </span>
          حسابات <span className="text-rose-700 font-extrabold underline decoration-rose-400 decoration-2">(سحب فوري 1 و 2)</span>، <span className="text-rose-700 font-extrabold underline decoration-rose-400 decoration-2">(محفظة الصياد)</span>، و <span className="text-rose-700 font-extrabold underline decoration-rose-400 decoration-2">(ماكينة الكوماندا)</span> غير مجمعة بالإجمالي ومُعلمة باللون الأحمر بالجدول إشارة لعدم جمعها.
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-600" />
          <span className="font-bold text-sm">جاري تحميل الأرصدة اللحظية الحالية...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Table 1: Wallets & Machines Table */}
          <div className="glass-panel rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col">
            {/* Header Banner - Light Theme */}
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">جدول أرصدة المحافظ والماكينات</h3>
              </div>
              <span className="text-sm font-extrabold font-mono text-indigo-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm dir-ltr">
                {formatNumberLocale(Number(walletsTotals.محافظ + walletsTotals.ماكينات), 'en-US')}
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-center text-xs text-slate-700 table-fixed">
                <tbody className="divide-y divide-slate-200 font-semibold">
                  {/* Sub-total 1: Wallets Header Row */}
                  <tr className="bg-indigo-50/90 border-y border-indigo-200">
                    <td colSpan={3} className="px-4 py-2.5 bg-indigo-50/90 text-indigo-950 font-extrabold">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-indigo-650" />
                          <span>إجمالي المحافظ الإلكترونية ({walletsByType.محافظ.length} محفظة)</span>
                        </div>
                        <span className="font-mono text-indigo-900 text-sm font-extrabold dir-ltr">
                          {formatNumberLocale(Number(walletsTotals.محافظ), 'en-US')}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Wallet Rows */}
                  {walletsByType.محافظ.map((w: any) => {
                    const excluded = isExcludedFromTotal(w.wallet_name);
                    return (
                      <tr key={w.id} className={`transition-colors ${excluded ? 'bg-rose-50/70 border-y border-rose-100 hover:bg-rose-100/70' : 'hover:bg-slate-50'}`}>
                        <td className="w-1/3 px-3 py-3 font-bold text-slate-900 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${excluded ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                            <span className={excluded ? 'text-rose-700 font-extrabold' : ''}>{w.wallet_name}</span>
                            {excluded && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-extrabold border border-rose-200">
                                غير مجمع
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`w-1/3 px-3 py-3 font-medium text-center ${excluded ? 'text-rose-700' : 'text-slate-600'}`}>{w.custodian_name || '-'}</td>
                        <td className={`w-1/3 px-3 py-3 font-bold font-mono text-center text-sm ${excluded ? 'text-rose-600 font-black' : Number(w.current_balance) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {formatNumberLocale(Number(w.current_balance), 'en-US')}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Sub-total 2: Machines Header Row */}
                  <tr className="bg-slate-100 border-y border-slate-300">
                    <td colSpan={3} className="px-4 py-2.5 bg-slate-100 text-slate-900 font-extrabold">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-700" />
                          <span>إجمالي ماكينات الدفع ({walletsByType.ماكينات.length} ماكينة)</span>
                        </div>
                        <span className="font-mono text-slate-900 text-sm font-extrabold dir-ltr">
                          {formatNumberLocale(Number(walletsTotals.ماكينات), 'en-US')}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Machine Rows */}
                  {walletsByType.ماكينات.map((w: any) => {
                    const excluded = isExcludedFromTotal(w.wallet_name);
                    return (
                      <tr key={w.id} className={`transition-colors ${excluded ? 'bg-rose-50/70 border-y border-rose-100 hover:bg-rose-100/70' : 'hover:bg-slate-50'}`}>
                        <td className="w-1/3 px-3 py-3 font-bold text-slate-900 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${excluded ? 'bg-rose-500' : 'bg-slate-500'}`} />
                            <span className={excluded ? 'text-rose-700 font-extrabold' : ''}>{w.wallet_name}</span>
                            {excluded && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-extrabold border border-rose-200">
                                غير مجمع
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`w-1/3 px-3 py-3 font-medium text-center ${excluded ? 'text-rose-700' : 'text-slate-600'}`}>{w.custodian_name || '-'}</td>
                        <td className={`w-1/3 px-3 py-3 font-bold font-mono text-center text-sm ${excluded ? 'text-rose-600 font-black' : Number(w.current_balance) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {formatNumberLocale(Number(w.current_balance), 'en-US')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Employee Cash Custody & Drawers Table */}
          <div className="glass-panel rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col">
            {/* Header Banner - Light Theme */}
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
                  <Banknote className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">جدول النقدية (عهد الموظفين والأدراج)</h3>
              </div>
              <span className="text-sm font-extrabold font-mono text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm dir-ltr">
                {formatNumberLocale(Number(totalEmployeeCustody + walletsTotals.أدراج), 'en-US')}
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-center text-xs text-slate-700 table-fixed">
                <tbody className="divide-y divide-slate-200 font-semibold">
                  {/* Sub-total 1: Employee Cash Custody Header Row */}
                  <tr className="bg-emerald-50/90 border-y border-emerald-200">
                    <td colSpan={2} className="px-4 py-2.5 bg-emerald-50/90 text-emerald-950 font-extrabold">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-700" />
                          <span>إجمالي عهدة الكاش للموظفين ({employeeCustody.length} موظف)</span>
                        </div>
                        <span className="font-mono text-emerald-900 text-sm font-extrabold dir-ltr">
                          {formatNumberLocale(Number(totalEmployeeCustody), 'en-US')}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Employee Rows */}
                  {employeeCustody.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="w-1/2 px-3 py-3 font-bold text-slate-900 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>{emp.name}</span>
                        </div>
                      </td>
                      <td className={`w-1/2 px-3 py-3 font-bold font-mono text-center text-sm ${emp.walletBalance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatNumberLocale(Number(emp.walletBalance), 'en-US')}
                      </td>
                    </tr>
                  ))}

                  {/* Sub-total 2: Cashier Drawers Header Row */}
                  <tr className="bg-amber-50/90 border-y border-amber-200">
                    <td colSpan={2} className="px-4 py-2.5 bg-amber-50/90 text-amber-950 font-extrabold">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Archive className="w-4 h-4 text-amber-700" />
                          <span>إجمالي أدراج الكاشير ({walletsByType.أدراج.length} درج)</span>
                        </div>
                        <span className="font-mono text-amber-900 text-sm font-extrabold dir-ltr">
                          {formatNumberLocale(Number(walletsTotals.أدراج), 'en-US')}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Drawer Rows */}
                  {walletsByType.أدراج.map((w: any) => (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                      <td className="w-1/2 px-3 py-3 font-bold text-slate-900 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <span>{w.wallet_name}</span>
                        </div>
                      </td>
                      <td className={`w-1/2 px-3 py-3 font-bold font-mono text-center text-sm ${Number(w.current_balance) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatNumberLocale(Number(w.current_balance), 'en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
