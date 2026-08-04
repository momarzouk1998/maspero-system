'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone, Laptop, CheckCircle2, HelpCircle } from 'lucide-react';

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowGuideModal(true);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold">
        <CheckCircle2 className="w-4 h-4" />
        <span>تطبيق ماسبيرو مثبّت على جهازك 📱</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer border border-blue-400/30"
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span>تثبيت التطبيق على الجهاز (PWA)</span>
      </button>

      {/* Guide Modal for iOS / Browser Manual Installation */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-blue-500/40 bg-slate-900 w-full max-w-md space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <span>طريقة تثبيت تطبيق ماسبيرو كـ PWA</span>
              </h3>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="font-bold text-blue-400 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4" />
                  <span>تثبيت من الكمبيوتر (Chrome / Edge):</span>
                </p>
                <p>اضغط على إيقونة <strong>التثبيت (Install)</strong> الموجودة أعلى المتصفح في شريط العنوان أو خيارات القائمة، واختر <strong>"Install Maspero"</strong>.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>تثبيت من أجهزة الآيفون (iOS Safari):</span>
                </p>
                <p>اضغط على زر <strong>مشاركة (Share)</strong> أسفل الشاشة، ثم اختر <strong>"إضافة إلى الشاشة الرئيسية (Add to Home Screen)"</strong>.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>تثبيت من أجهزة الأندرويد (Android Chrome):</span>
                </p>
                <p>اضغط على القائمة الثلاثية (⋮) أعلى اليمين ثم اختر <strong>"تثبيت التطبيق (Install App)"</strong>.</p>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs"
            >
              فهمت ذلك 👍
            </button>
          </div>
        </div>
      )}
    </>
  );
}
