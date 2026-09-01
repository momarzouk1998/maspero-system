'use client';

import { useState } from 'react';
import { Printer, Copy, Check, X, HelpCircle, Laptop, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';

interface KioskPrintGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KioskPrintGuideModal({ isOpen, onClose }: KioskPrintGuideModalProps) {
  const [copiedParam, setCopiedParam] = useState(false);
  const [copiedFullPath, setCopiedFullPath] = useState(false);

  if (!isOpen) return null;

  const paramText = '--kiosk-printing';
  const fullPathText = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing`;

  const handleCopyParam = () => {
    navigator.clipboard.writeText(paramText);
    setCopiedParam(true);
    setTimeout(() => setCopiedParam(false), 3000);
  };

  const handleCopyFullPath = () => {
    navigator.clipboard.writeText(fullPathText);
    setCopiedFullPath(true);
    setTimeout(() => setCopiedFullPath(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto safe-area-top safe-area-bottom">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200 modal-mobile-full">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Printer className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>الطباعة الفورية المباشرة بدون نافذة انتظار</span>
                <span className="text-[10px] bg-amber-400 text-slate-900 font-extrabold px-2 py-0.5 rounded-full">Kiosk Mode</span>
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">طباعة الفاتورة فوراً بنقرة واحدة دون ظهور نافذة خيارات الطباعة في Chrome</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-slate-800 text-xs leading-relaxed max-h-[75vh] overflow-y-auto">
          
          {/* Quick Explanation Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block mb-1 text-sm">ليه نفعل خاصية الطباعة الصامتة؟</span>
              <span>
                عند تفعيل خاصية <strong>Chrome Kiosk Printing</strong>، بمجرد الضغط على <strong>"حفظ وإصدار الفاتورة"</strong> سيقوم المتصفح بطباعة الفاتورة فوراً على طابعة الكاشير دون فتح شاشة المعاينة وطلب الإذن في كل مرة.
              </span>
            </div>
          </div>

          {/* Code Copy Boxes */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span>1. الأمر المطلوب إضافته لمسار جوجل كروم:</span>
            </h3>

            {/* Parameter Only Copy Box */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 flex items-center justify-between gap-3 border border-slate-800 font-mono">
              <span className="text-emerald-400 font-bold text-sm tracking-wide dir-ltr">{paramText}</span>
              <button
                onClick={handleCopyParam}
                className={`py-2 px-3.5 rounded-xl font-sans font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiedParam
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                }`}
              >
                {copiedParam ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedParam ? 'تم النسخ 👍' : 'نسخ الأمر'}</span>
              </button>
            </div>

            {/* Full Path Copy Box */}
            <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-700 border border-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">مثال المسار الكامل في خانة (Target / الهدف):</span>
                <button
                  onClick={handleCopyFullPath}
                  className={`py-1.5 px-3 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                    copiedFullPath
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  {copiedFullPath ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFullPath ? 'تم النسخ' : 'نسخ المسار الكامل'}</span>
                </button>
              </div>
              <p className="font-mono text-[11px] text-slate-800 dir-ltr bg-white p-2.5 rounded-xl border border-slate-200 break-all select-all">
                {fullPathText}
              </p>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-4 pt-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-2">
              <Laptop className="w-4 h-4 text-blue-600" />
              <span>خطوات الإعداد بالتفصيل (في الويندوز):</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              {/* Step 1 */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">1</span>
                  <span className="font-bold text-slate-900">الطابعة الافتراضية</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  افتح إعدادات الويندوز <strong>(Printers & Scanners)</strong> واجعل <strong>طابعة الفواتير الحرارية</strong> هي الطابعة الافتراضية <strong>(Set as Default)</strong>.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">2</span>
                  <span className="font-bold text-slate-900">خصائص اختصار كروم</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  اضغط كليك يمين (Right-Click) على أيقونة <strong>Google Chrome</strong> الموجودة على سطح المكتب واختر <strong>Properties (خصائص)</strong>.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">3</span>
                  <span className="font-bold text-slate-900">تعديل خانة Target (الهدف)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  في تبويب <strong>Shortcut</strong>، اذهب إلى آخر خانة <strong>Target</strong>، أضف <strong>مسافة واحدة</strong> ثم الصق الأمر: <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-blue-700 dir-ltr inline-block">--kiosk-printing</code>.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">4</span>
                  <span className="font-bold text-slate-900">التشغيل والتجربة</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  اضغط <strong>Apply</strong> ثم <strong>OK</strong>، أغلق المتصفح بالكامل وشغّله مجدداً من هذا الاختصار. ستعمل الطباعة الصامتة فوراً!
                </p>
              </div>

            </div>
          </div>

          {/* Warning / Note */}
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>ملاحظة: يمكنك في أي وقت إلغاء الطباعة الصامتة بمجرد حذف <code className="font-bold font-mono">--kiosk-printing</code> من مسار الاختصار.</span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
          >
            فهمت، إغلاق الدليل 👍
          </button>
        </div>

      </div>
    </div>
  );
}
