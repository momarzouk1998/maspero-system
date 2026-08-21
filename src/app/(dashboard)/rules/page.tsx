'use client';

import {
  ShieldCheck, Lock, Play, Square, LogOut, ArrowLeftRight,
  Wallet, CheckCircle2, XCircle, AlertTriangle, Info, Clock,
  Trash2, UserCheck, Crown, Cpu, DollarSign
} from 'lucide-react';

interface RuleCardProps {
  icon: React.ReactNode;
  title: string;
  color: string;
  borderColor: string;
  bgColor: string;
  children: React.ReactNode;
}

function RuleCard({ icon, title, color, borderColor, bgColor, children }: RuleCardProps) {
  return (
    <div className={`glass-panel rounded-3xl border ${borderColor} overflow-hidden`}>
      <div className={`${bgColor} px-6 py-4 flex items-center gap-3 border-b ${borderColor}`}>
        <div className={`${color}`}>{icon}</div>
        <h2 className={`font-bold text-base ${color}`}>{title}</h2>
      </div>
      <div className="p-6 space-y-3">
        {children}
      </div>
    </div>
  );
}

interface RuleRowProps {
  status: 'allowed' | 'blocked' | 'warning' | 'info';
  label: string;
  desc: string;
}

function RuleRow({ status, label, desc }: RuleRowProps) {
  const styles = {
    allowed: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
      labelClass: 'text-emerald-800 bg-emerald-100 border-emerald-300',
    },
    blocked: {
      icon: <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />,
      labelClass: 'text-red-800 bg-red-100 border-red-300',
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
      labelClass: 'text-amber-800 bg-amber-100 border-amber-300',
    },
    info: {
      icon: <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />,
      labelClass: 'text-blue-800 bg-blue-100 border-blue-300',
    },
  };

  const s = styles[status];

  return (
    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
      {s.icon}
      <div className="flex-1 space-y-0.5">
        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-lg border ${s.labelClass}`}>
          {label}
        </span>
        <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function RulesPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* رأس الصفحة */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">دليل قواعد وقيود النظام الموحدة</h1>
        </div>
        <p className="text-sm text-slate-500">
          مرجع شامل للقواعد الـ 8 المبرمجة بدقة في النظام — المطبقة موحدة على جميع المستخدمين (المدير والموظفين).
        </p>
      </div>

      {/* ─── ١. فتح وقفل صفحة البيع ─── */}
      <RuleCard
        icon={<Lock className="w-5 h-5" />}
        title="١. قيود فتح وقفل صفحة البيع (POS)"
        color="text-red-700"
        borderColor="border-red-200"
        bgColor="bg-red-50"
      >
        <RuleRow
          status="blocked"
          label="مقفول — لحين بدء الشفت"
          desc="صفحة البيع مغلقة تماماً حتى يتم بدء شفت عمل نشط من صفحة إدارة الشفتات والعهدة."
        />
        <RuleRow
          status="blocked"
          label="مقفول — رصيد عهدة الكاش يساوي صفر"
          desc="بعد بدء الشفت، تظل صفحة البيع مغلقة إذا كان رصيد عهدة الكاش = 0 (تظهر رسالة: برجاء استلام عهدة كاش للبدء في البيع)."
        />
        <RuleRow
          status="allowed"
          label="مفتوح — الخدمات والتذاكر"
          desc="عندما يكون رصيد عهدة الكاش أكبر من صفر (Cash > 0) والشفت مفتوح، تفتح تابة الخدمات وتابة التذاكر للبيع فوراً."
        />
      </RuleCard>

      {/* ─── ٢. المحافظ والماكينات ─── */}
      <RuleCard
        icon={<Cpu className="w-5 h-5" />}
        title="٢. قيود المحافظ والماكينات"
        color="text-amber-700"
        borderColor="border-amber-200"
        bgColor="bg-amber-50"
      >
        <RuleRow
          status="allowed"
          label="محتويات مستلمة فقط"
          desc="تابة المحافظ وتابة الماكينات تتاح للمستخدم فقط للمحافظ والماكينات التي استلم عهدتها فعلياً (تظهر وتعمل العناصر المستلمة فقط)."
        />
        <RuleRow
          status="blocked"
          label="يمنع الكاش بالسالب"
          desc="يمنع منعاً باتاً أن يصبح رصيد عهدة الكاش بالسالب في أي عملية مبيعات أو تحويل أو مصروفات."
        />
      </RuleCard>

      {/* ─── ٣. إنهاء الشفت ─── */}
      <RuleCard
        icon={<Square className="w-5 h-5" />}
        title="٣. قيود إنهاء الشفت"
        color="text-indigo-700"
        borderColor="border-indigo-200"
        bgColor="bg-indigo-50"
      >
        <RuleRow
          status="blocked"
          label="ممنوع — وجود رصيد في عهدة الكاش"
          desc="يمنع إنهاء الشفت في حالة وجود أي رصيد بعهدة الكاش (Cash > 0). يجب تسليم العهدة النقدية للمركز/المدير أولاً لتصبح صفراً."
        />
        <RuleRow
          status="blocked"
          label="ممنوع — وجود محافظ أو ماكينات مستلمة"
          desc="يمنع إنهاء الشفت إذا كان لدى المستخدم أي محافظ أو ماكينات مستلمة في عهدته. يجب تسليم عهدتها أولاً."
        />
        <RuleRow
          status="allowed"
          label="مسموح — الكاش صفر ولا توجد عهدة مستلمة"
          desc="يسمح بإنهاء الشفت فقط عند وصول رصيد عهدة الكاش إلى صفر وعدم وجود أي محافظ أو ماكينات مستلمة."
        />
      </RuleCard>

      {/* ─── ٤. تسجيل الخروج (Logout) ─── */}
      <RuleCard
        icon={<LogOut className="w-5 h-5" />}
        title="٤. قيود تسجيل الخروج وتبديل المكاتب"
        color="text-rose-700"
        borderColor="border-rose-200"
        bgColor="bg-rose-50"
      >
        <RuleRow
          status="blocked"
          label="ممنوع — وجود رصيد في عهدة الكاش"
          desc="يمنع تسجيل الخروج من البرنامج فقط في حالة وجود رصيد في عهدة الكاش > 0."
        />
        <RuleRow
          status="allowed"
          label="مسموح — رصيد عهدة الكاش صفر"
          desc="يسمح بتسجيل الخروج بمجرد تسليم عهدة الكاش لتصل صفر حتى يتمكن موظف آخر من تسجيل الدخول وتبديل المكان."
        />
      </RuleCard>

      {/* ─── ٥. تطبيق موحد ─── */}
      <RuleCard
        icon={<Crown className="w-5 h-5" />}
        title="٥. التطبيق الموحد على الجميع"
        color="text-emerald-700"
        borderColor="border-emerald-200"
        bgColor="bg-emerald-50"
      >
        <RuleRow
          status="info"
          label="تطبيق شامل"
          desc="تطبق كافة القواعد والقيود أعلاه على جميع مستخدمي النظام (المدير والموظفين) بنفس الصرامة والدقة."
        />
      </RuleCard>
    </div>
  );
}
