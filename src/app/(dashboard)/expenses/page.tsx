'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Receipt, DollarSign, Gift, Calendar, User, Clock, Plus, Minus, 
  CheckCircle2, AlertCircle, RefreshCw, Trash2, ArrowRight, ShieldCheck,
  Building2, Wallet, ArrowDownLeft, ArrowUpRight, Plane, XSquare
} from 'lucide-react';
import { getActiveUsers } from '@/lib/user-utils';

export default function FinancialAndHROperationsPage() {
  const [activeTab, setActiveTab] = useState<'financial' | 'hr'>('financial');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  // --- Financial Form State ---
  const [finCategory, setFinCategory] = useState<'سلفة' | 'قبض' | 'مصروفات' | 'دعم مالي' | 'مشتريات' | 'إيرادات'>('سلفة');
  const [paymentMethod, setPaymentMethod] = useState('نقدي');
  const [finDate, setFinDate] = useState(new Date().toISOString().split('T')[0]);
  const [finEmployeeId, setFinEmployeeId] = useState('');
  const [finAmount, setFinAmount] = useState('0');
  const [finNotes, setFinNotes] = useState('');
  const [finStats, setFinStats] = useState({ baseSalary: 0, totalDrawnThisMonth: 0, remainingSalary: 0 });

  // --- HR Form State ---
  const [hrDate, setHrDate] = useState(new Date().toISOString().split('T')[0]);
  const [hrEmployeeId, setHrEmployeeId] = useState('');
  const [hrType, setHrType] = useState<'خصم' | 'مكافأة' | 'طلب إذن' | 'طلب إجازة'>('مكافأة');
  const [hrHours, setHrHours] = useState('1.00');
  const [hrNotes, setHrNotes] = useState('');

  // --- Common & Log Table State ---
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [hrList, setHrList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setCurrentUser(data.user))
      .catch(() => {});

    fetch('/api/users')
      .then(r => r.json())
      .then(d => {
        const active = getActiveUsers(d.users || []);
        setEmployees(active);
        if (active.length > 0) {
          setFinEmployeeId(active[0].id);
          setHrEmployeeId(active[0].id);
        }
      })
      .catch(console.error);

    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resFin, resHr] = await Promise.all([
        fetch('/api/expenses?limit=50'),
        fetch('/api/hr?limit=50')
      ]);

      if (resFin.ok) {
        const d = await resFin.json();
        setExpensesList(d.expenses || []);
      }
      if (resHr.ok) {
        const d = await resHr.json();
        setHrList(d.hrItems || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employee salary stats when employee changes in financial form
  useEffect(() => {
    if (!finEmployeeId) return;
    fetch(`/api/expenses?employeeId=${finEmployeeId}`)
      .then(r => r.json())
      .then(d => {
        if (d.baseSalary !== undefined) {
          setFinStats({
            baseSalary: d.baseSalary,
            totalDrawnThisMonth: d.totalDrawnThisMonth,
            remainingSalary: d.remainingSalary
          });
        }
      })
      .catch(console.error);
  }, [finEmployeeId, finCategory]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Submit Financial Transaction
  const handleFinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(finAmount);
    if (!amt || amt <= 0) {
      showToast('برجاء أدخال مبلغ صحيح أكبر من 0', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainType: finCategory,
          paymentMethod,
          date: finDate,
          targetEmployeeId: finEmployeeId,
          amount: amt,
          notes: finNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ المعاملة المالية');

      showToast(`تم تسجيل معاملة (${finCategory}) بمبلغ ${amt} بنجاح 🎉`);
      setFinAmount('0');
      setFinNotes('');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit HR Request
  const handleHrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hrs = parseFloat(hrHours);
    if (!hrs || hrs <= 0) {
      showToast('برجاء إدخال عدد ساعات صحيح', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/hr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmployeeId: hrEmployeeId,
          requestType: hrType,
          hours: hrs,
          date: hrDate,
          notes: hrNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إضافة طلب الحوافز/الإجازات');

      showToast(`تم تسجيل طلب (${hrType}) لـ ${hrs} ساعة بنجاح 🎉`);
      setHrHours('1.00');
      setHrNotes('');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Adjust numeric steppers
  const adjustFinAmount = (delta: number) => {
    const curr = parseFloat(finAmount || '0');
    const next = Math.max(0, curr + delta);
    setFinAmount(next.toString());
  };

  const adjustHrHours = (delta: number) => {
    const curr = parseFloat(hrHours || '0');
    const next = Math.max(0.5, curr + delta);
    setHrHours(next.toFixed(2));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
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
              <Receipt className="w-6 h-6 text-emerald-600" />
              <span>التعاملات المالية والحوافز والإجازات</span>
            </h1>
            <p className="text-slate-600 text-xs mt-0.5">
              إدارة المصروفات والسلف والقبض والحوافز والإجازات بالساعات
            </p>
          </div>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200">
          <button
            onClick={() => setActiveTab('financial')}
            className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'financial'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>التعاملات المالية والرواتب</span>
          </button>
          <button
            onClick={() => setActiveTab('hr')}
            className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'hr'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gift className="w-4 h-4 text-indigo-600" />
            <span>الحوافز والإجازات بالساعات</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toast && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* MODULE A: التعاملات المالية (Financial Operations) */}
      {activeTab === 'financial' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>التعاملات المالية والمصروفات</span>
            </h2>
            <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              تسجيل قيود الخزينة والنقدية
            </span>
          </div>

          {/* Categories Selector Pills */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">التصنيف *</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'سلفة', label: 'سلفة 💰', color: 'bg-amber-100 text-amber-800 border-amber-300' },
                { key: 'قبض', label: 'قبض 💵', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
                { key: 'مصروفات', label: 'مصروفات 📉', color: 'bg-red-100 text-red-800 border-red-300' },
                { key: 'دعم مالي', label: 'دعم مالي 💸', color: 'bg-blue-100 text-blue-800 border-blue-300' },
                { key: 'مشتريات', label: 'مشتريات 🛒', color: 'bg-purple-100 text-purple-800 border-purple-300' },
                { key: 'إيرادات', label: 'إيرادات 📈', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setFinCategory(c.key as any)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    finCategory === c.key
                      ? `${c.color} shadow-sm ring-2 ring-emerald-400`
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleFinSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Payment Method / Fund */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">البند / طريقة الصرف *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="نقدي">نقدي (عهدة الكاشير الحالية)</option>
                  <option value="محفظة">محفظة إلكترونية</option>
                  <option value="خزينة">خزينة رئيسية</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">التاريخ *</label>
                <input
                  type="date"
                  required
                  value={finDate}
                  onChange={(e) => setFinDate(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Target Employee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الموظف المعني *</label>
                <select
                  required
                  value={finEmployeeId}
                  onChange={(e) => setFinEmployeeId(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.job_title || 'كاشير'})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount Stepper */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">المبلغ المطلوب *</label>
              <div className="flex items-center gap-2 max-w-md">
                <button
                  type="button"
                  onClick={() => adjustFinAmount(-50)}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold border border-slate-300 shrink-0"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={finAmount}
                  onChange={(e) => setFinAmount(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-base font-bold font-mono text-center focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => adjustFinAmount(50)}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold border border-slate-300 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات / سبب الصرف</label>
              <input
                type="text"
                value={finNotes}
                onChange={(e) => setFinNotes(e.target.value)}
                placeholder="أدخل أي تفاصيل إضافية..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Monthly Salary Drawn Stats Display (Readonly) */}
            {['سلفة', 'قبض'].includes(finCategory) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <div>
                  <span className="text-xs text-amber-800 font-semibold block mb-0.5">الراتب الأساسي:</span>
                  <span className="text-sm font-bold font-mono text-slate-900">
                    {finStats.baseSalary.toLocaleString('ar-EG')}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-amber-800 font-semibold block mb-0.5">المسحوب خلال الشهر:</span>
                  <span className="text-sm font-bold font-mono text-amber-900">
                    {finStats.totalDrawnThisMonth.toLocaleString('ar-EG')}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-amber-800 font-semibold block mb-0.5">المتبقي من الراتب:</span>
                  <span className="text-sm font-bold font-mono text-emerald-800">
                    {finStats.remainingSalary.toLocaleString('ar-EG')}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>حفظ وإضافة المعاملة المالية</span>
            </button>
          </form>
        </div>
      )}

      {/* MODULE B: الحوافز والإجازات بالساعات (HR Operations) */}
      {activeTab === 'hr' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Gift className="w-5 h-5 text-indigo-600" />
              <span>الحوافز والخصومات والإجازات بالساعات</span>
            </h2>
            <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              حساب كامل بالساعات
            </span>
          </div>

          <form onSubmit={handleHrSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">التاريخ *</label>
                <input
                  type="date"
                  required
                  value={hrDate}
                  onChange={(e) => setHrDate(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Target Employee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الموظف *</label>
                <select
                  required
                  value={hrEmployeeId}
                  onChange={(e) => setHrEmployeeId(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.job_title || 'كاشير'})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Request Type Pills */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">نوع الطلب *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { key: 'مكافأة', label: 'مكافأة 🎁', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
                  { key: 'خصم', label: 'خصم ❌', color: 'bg-red-100 text-red-800 border-red-300' },
                  { key: 'طلب إذن', label: 'طلب إذن 🕒', color: 'bg-amber-100 text-amber-800 border-amber-300' },
                  { key: 'طلب إجازة', label: 'طلب إجازة 🏖️', color: 'bg-blue-100 text-blue-800 border-blue-300' },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setHrType(t.key as any)}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      hrType === t.key
                        ? `${t.color} shadow-sm ring-2 ring-indigo-400`
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours Stepper */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">عدد الساعات *</label>
              <div className="flex items-center gap-2 max-w-md">
                <button
                  type="button"
                  onClick={() => adjustHrHours(-0.5)}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold border border-slate-300 shrink-0"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={hrHours}
                  onChange={(e) => setHrHours(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-base font-bold font-mono text-center focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => adjustHrHours(0.5)}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold border border-slate-300 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات الطلب</label>
              <input
                type="text"
                value={hrNotes}
                onChange={(e) => setHrNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات إضافية..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل طلب الحوافز/الإجازة</span>
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
