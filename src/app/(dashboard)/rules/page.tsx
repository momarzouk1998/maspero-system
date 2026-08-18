'use client';

import {
  ShieldCheck, Lock, Play, Square, LogOut, ArrowLeftRight,
  Wallet, CheckCircle2, XCircle, AlertTriangle, Info, Clock,
  Trash2, UserCheck, Crown
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
          <h1 className="text-2xl font-bold text-slate-900">شرح القيود والصلاحيات</h1>
        </div>
        <p className="text-sm text-slate-500">
          مرجع شامل لكل القيود المبرمجة في النظام — يوضح متى يُسمح بكل إجراء ومتى يُمنع، وما الفرق بين صلاحيات الموظف والمدير.
        </p>
      </div>

      {/* ─── ١. قيود البيع ─── */}
      <RuleCard
        icon={<Lock className="w-5 h-5" />}
        title="١. قيود البيع وتسجيل الخدمات"
        color="text-red-700"
        borderColor="border-red-200"
        bgColor="bg-red-50"
      >
        <p className="text-xs text-slate-500 pb-1">النظام يفحص الشروط التالية بالترتيب قبل أي عملية بيع أو حجز:</p>

        <RuleRow
          status="blocked"
          label="مقفول — لا يوجد شفت نشط"
          desc="الموظف لا يستطيع تسجيل أي بيعة أو خدمة قبل أن يبدأ شفته من صفحة إدارة الشفتات."
        />
        <RuleRow
          status="blocked"
          label="مقفول — لم يستلم درج الكاشير"
          desc="حتى لو بدأ الشفت، لا يُسمح بالبيع إلا بعد استلام عهدة درج الكاشير الخاص به."
        />
        <RuleRow
          status="blocked"
          label="مقفول — شفت صباحي/منفرد بدون استلام المحافظ والماكينات"
          desc="لو الموظف هو الوحيد الذي شفته مفتوح (لا يوجد زميل آخر)، يجب عليه استلام وتأكيد أرصدة كل المحافظ والماكينات قبل البيع."
        />
        <RuleRow
          status="allowed"
          label="مسموح — كل الشروط متحققة"
          desc="يُفتح البيع تلقائياً بمجرد بدء الشفت واستلام الدرج (وفي الشفت الصباحي: استلام كل المحافظ والماكينات)."
        />
        <RuleRow
          status="info"
          label="المدير — بلا قيود على البيع"
          desc="المدير معفى من كل قيود البيع ويستطيع تسجيل أي خدمة في أي وقت بغض النظر عن حالة الشفت."
        />
      </RuleCard>

      {/* ─── ٢. بدء الشفت ─── */}
      <RuleCard
        icon={<Play className="w-5 h-5" />}
        title="٢. قيود بدء الشفت"
        color="text-blue-700"
        borderColor="border-blue-200"
        bgColor="bg-blue-50"
      >
        <RuleRow
          status="blocked"
          label="ممنوع — يوجد شفت مفتوح بالفعل"
          desc="لا يستطيع الموظف بدء شفت جديد وعنده شفت لا يزال مفتوحاً. يجب إنهاء الشفت الحالي أولاً."
        />
        <RuleRow
          status="allowed"
          label="مسموح — لا يوجد شفت مفتوح"
          desc="يُسمح ببدء شفت جديد في أي وقت طالما الموظف ليس لديه شفت نشط حالياً."
        />
        <RuleRow
          status="info"
          label="ملاحظة — بدون حد لعدد الشفتات"
          desc="لا يوجد حد لعدد الشفتات التي يمكن للموظف فتحها في اليوم الواحد — يمكنه فتح شفت جديد بعد كل مرة يغلق فيها."
        />
      </RuleCard>

      {/* ─── ٣. إنهاء الشفت ─── */}
      <RuleCard
        icon={<Square className="w-5 h-5" />}
        title="٣. قيود إنهاء الشفت"
        color="text-orange-700"
        borderColor="border-orange-200"
        bgColor="bg-orange-50"
      >
        <RuleRow
          status="blocked"
          label="ممنوع — درج الكاشير لا يزال في العهدة"
          desc="يجب تسليم عهدة درج الكاشير أولاً قبل إنهاء الشفت — هذا الشرط ينطبق على كل الموظفين بدون استثناء."
        />
        <RuleRow
          status="blocked"
          label="ممنوع — آخر موظف ولا يزال يحمل محافظ أو ماكينات"
          desc="إذا كان الموظف آخر شفت مفتوح في اليوم، يجب عليه تسليم كل المحافظ والماكينات قبل إنهاء شفته (ضماناً لأرصدة الشفت الصباحي التالي)."
        />
        <RuleRow
          status="allowed"
          label="مسموح — سلّم الدرج وليس آخر موظف"
          desc="الموظف العادي (وليس الأخير) يقدر يغلق شفته بعد تسليم درجه فقط، حتى لو لا يزال يحمل محافظ أو ماكينات."
        />
        <RuleRow
          status="info"
          label="المدير — يستطيع حذف أي شفت"
          desc="المدير يستطيع حذف أي شفت من سجل الشفتات، وعند حذف شفت مفتوح يتم تحرير العهد المرتبطة به تلقائياً."
        />
      </RuleCard>

      {/* ─── ٤. تسجيل الخروج ─── */}
      <RuleCard
        icon={<LogOut className="w-5 h-5" />}
        title="٤. قيود تسجيل الخروج"
        color="text-rose-700"
        borderColor="border-rose-200"
        bgColor="bg-rose-50"
      >
        <RuleRow
          status="blocked"
          label="ممنوع — يوجد شفت نشط"
          desc="النظام يمنع تسجيل الخروج إذا كان الموظف لديه شفت مفتوح، ويظهر له تنبيه يطلب منه إنهاء الشفت وتصفية العهد أولاً."
        />
        <RuleRow
          status="allowed"
          label="مسموح — لا يوجد شفت نشط"
          desc="يُسمح بتسجيل الخروج بعد إنهاء الشفت وتسليم كل العهد."
        />
        <RuleRow
          status="warning"
          label="تنبيه — القيد على الشاشة فقط"
          desc="قيد تسجيل الخروج موجود على واجهة المستخدم. يُنصح بإضافة نفس التحقق على الخادم لمنع تجاوزه."
        />
      </RuleCard>

      {/* ─── ٥. الاستلام والتسليم ─── */}
      <RuleCard
        icon={<Wallet className="w-5 h-5" />}
        title="٥. قيود الاستلام والتسليم (العهدة)"
        color="text-emerald-700"
        borderColor="border-emerald-200"
        bgColor="bg-emerald-50"
      >
        <p className="text-xs text-slate-500 pb-1">خمسة أنواع من عمليات التسليم والاستلام:</p>

        <RuleRow
          status="allowed"
          label="استلام فوري (موافقة مباشرة)"
          desc="الموظف يوافق على العهدة بأرصادها كما هي في النظام دون إدخال أي أرقام — بدون أي قيود على من يستلم."
        />
        <RuleRow
          status="info"
          label="استلام مع إدخال الرصيد الفعلي"
          desc="إذا كان المبلغ الفعلي يختلف عن المتوقع، يجب إدخال سبب الفرق وإلا يُمنع الاستلام."
        />
        <RuleRow
          status="blocked"
          label="تسليم عهدة — الموظف لا يملكها"
          desc="لا يمكن تسليم عهدة لشخص آخر إلا إذا كنت أنت المسجل كحارس لها في النظام. المدير استثناء."
        />
        <RuleRow
          status="allowed"
          label="تسليم جميع العهد لماسبيرو (إغلاق اليوم)"
          desc="يتيح تسليم كل ما في عهدة الموظف لمركز ماسبيرو دفعة واحدة بضغطة واحدة — مخصص لإغلاق اليوم."
        />
        <RuleRow
          status="blocked"
          label="تسليم الكاش بالدرج — لا يوجد رصيد"
          desc="لا يمكن تحويل عهدة الكاش للدرج إذا كان رصيد الموظف النقدي صفراً أو أقل."
        />
      </RuleCard>

      {/* ─── ٦. التحويلات المالية ─── */}
      <RuleCard
        icon={<ArrowLeftRight className="w-5 h-5" />}
        title="٦. قيود التحويلات المالية بين الموظفين"
        color="text-violet-700"
        borderColor="border-violet-200"
        bgColor="bg-violet-50"
      >
        <RuleRow
          status="info"
          label="الإرسال — بدون قيد على الشفت"
          desc="الموظف يستطيع إرسال تحويل نقدي لزميله في أي وقت بغض النظر عن حالة الشفت."
        />
        <RuleRow
          status="info"
          label="الخصم فوري عند الإرسال"
          desc="المبلغ يُخصم من رصيد المرسل فور إرسال الطلب قبل أن يقبله المستلم."
        />
        <RuleRow
          status="allowed"
          label="قبول التحويل — يُضاف للمستلم فوراً"
          desc="عند قبول المستلم، يُضاف المبلغ لرصيده النقدي مباشرة."
        />
        <RuleRow
          status="allowed"
          label="رفض أو إلغاء — يُعاد المبلغ للمرسل"
          desc="عند الرفض أو الإلغاء (قبل القبول)، يعود المبلغ لرصيد المرسل تلقائياً."
        />
        <RuleRow
          status="blocked"
          label="إلغاء التحويل — بعد القبول"
          desc="لا يمكن إلغاء تحويل تمت الموافقة عليه أو رفضه بالفعل."
        />
      </RuleCard>

      {/* ─── ٧. حذف العمليات المالية ─── */}
      <RuleCard
        icon={<Trash2 className="w-5 h-5" />}
        title="٧. قيود حذف العمليات المالية"
        color="text-slate-700"
        borderColor="border-slate-200"
        bgColor="bg-slate-100"
      >
        <RuleRow
          status="allowed"
          label="شفت مفتوح — الموظف أو المدير"
          desc="يمكن للموظف نفسه أو المدير حذف أي عملية تمت خلال الشفت الحالي المفتوح — مع إعادة الأرصدة لحالتها."
        />
        <RuleRow
          status="blocked"
          label="شفت مغلق — الموظف لا يستطيع الحذف"
          desc="بعد إغلاق الشفت، لا يملك الموظف صلاحية حذف أي عملية من الشفتات السابقة."
        />
        <RuleRow
          status="info"
          label="شفت مغلق — المدير فقط يستطيع الحذف"
          desc="المدير يستطيع حذف عمليات الشفتات المغلقة، لكن بدون إعادة الأرصدة (للحفاظ على دقة السجلات التاريخية)."
        />
      </RuleCard>

      {/* ─── ٨. ملخص صلاحيات المدير ─── */}
      <RuleCard
        icon={<Crown className="w-5 h-5" />}
        title="٨. ملخص صلاحيات المدير"
        color="text-yellow-700"
        borderColor="border-yellow-200"
        bgColor="bg-yellow-50"
      >
        <p className="text-xs text-slate-500 pb-1">المدير له صلاحيات موسعة تتجاوز القيود العادية:</p>

        <RuleRow
          status="allowed"
          label="البيع بدون شفت"
          desc="المدير معفى من قيود البيع كلها — يستطيع تسجيل خدمات وحجوزات في أي وقت."
        />
        <RuleRow
          status="allowed"
          label="حذف أي شفت (حتى المفتوح)"
          desc="يستطيع حذف أي شفت لأي موظف، وعند حذف شفت مفتوح تُحرر العهد المرتبطة به تلقائياً."
        />
        <RuleRow
          status="allowed"
          label="حذف عمليات الشفتات المغلقة"
          desc="يستطيع حذف أي عملية مالية من أي شفت سابق، مع العلم أن الأرصدة لن تُعاد."
        />
        <RuleRow
          status="allowed"
          label="تعديل بيانات الشفت"
          desc="يستطيع تعديل نوع الشفت وملاحظاته وعدد الساعات الإجمالية لأي شفت."
        />
        <RuleRow
          status="allowed"
          label="تسليم عهدة موظف آخر"
          desc="يستطيع تسليم عهدة أي موظف حتى لو لم يكن هو المسجل كحارس لها."
        />
        <RuleRow
          status="allowed"
          label="حذف أي تحويل مالي"
          desc="يستطيع حذف سجل أي تحويل مالي بين الموظفين."
        />
        <RuleRow
          status="allowed"
          label="الوصول للوحة المدير"
          desc="لوحة المدير متاحة في القائمة الجانبية للمدير فقط — تتيح إدارة الموظفين والسجلات والتقارير."
        />
      </RuleCard>

      {/* ─── تذييل ─── */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-200 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <Clock className="w-4 h-4" />
          <p className="text-xs">
            هذه الصفحة مرجع مبرمج — القيود المذكورة هنا هي ما يطبقه النظام فعلياً.
          </p>
        </div>
      </div>

    </div>
  );
}
