'use client';

import { useEffect, useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const isIOS =
    typeof window !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSHint(true);
    }
  }

  // If already installed, hide button or show installed status
  if (installed) return null;

  return (
    <>
      <button
        onClick={handleInstall}
        className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer border border-blue-400/30"
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span>تثبيت البرنامج</span>
      </button>

      {/* iOS Safari Only Hint Modal */}
      {showIOSHint && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowIOSHint(false)}
        >
          <div
            className="glass-panel p-6 rounded-3xl border border-blue-500/40 bg-slate-900 w-full max-w-sm text-right space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-base text-white">📱 تثبيت البرنامج على iPhone</h3>
            <ol className="space-y-2 text-xs text-slate-300 list-decimal pr-4">
              <li>اضغط على زر <strong>مشاركة (Share)</strong> أسفل صفحة Safari.</li>
              <li>اختر <strong>"إضافة إلى الشاشة الرئيسية (Add to Home Screen)"</strong>.</li>
            </ol>
            <button
              onClick={() => setShowIOSHint(false)}
              className="w-full py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
            >
              تم
            </button>
          </div>
        </div>
      )}
    </>
  );
}
