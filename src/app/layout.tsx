import type { Metadata, Viewport } from "next";
import "./globals.css";

async function checkSubscription(): Promise<{ active: boolean; status?: string; message?: string }> {
  try {
    const adminUrl = process.env.ADMIN_API_URL || "https://admin.openappo.com";
    const systemName = process.env.SYSTEM_NAME || "Maspero";
    const res = await fetch(`${adminUrl}/api/subscription/verify?system=${encodeURIComponent(systemName)}`, {
      cache: "no-store",
    });
    if (!res.ok) return { active: true };
    return await res.json();
  } catch (error) {
    console.error("Subscription check failed:", error);
    return { active: true };
  }
}

export const metadata: Metadata = {
  title: "ماسـبيرو للخدمات الرقمية والمحافظ",
  description: "نظام إدارة الخدمات الإلكترونية والطباعة وتذاكر القطارات والمحافظ الرقمية",
  applicationName: "ماسـبيرو",
  appleWebApp: {
    capable: true,
    title: "ماسـبيرو",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ]
  },
  manifest: '/manifest.json'
};

export const viewport: Viewport = {
  themeColor: "#0b1329",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const subStatus = await checkSubscription();

  if (!subStatus.active) {
    return (
      <html lang="ar" dir="rtl">
        <head>
          <title>System Blocked</title>
        </head>
        <body className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-red-500">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">انتهت صلاحية الاشتراك</h1>
            <p className="text-gray-600 mb-6">
              {subStatus.message || "عفواً، لقد انتهت صلاحية اشتراك هذا النظام. يرجى التواصل مع الإدارة لتجديد الاشتراك واستعادة الوصول."}
            </p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-rose-600 selection:text-white">
        {subStatus.status === "expiring_soon" && (
          <div className="no-print print:hidden bg-yellow-500 text-black px-4 py-2 text-center text-sm font-bold w-full shadow-sm">
            {subStatus.message}
          </div>
        )}
        {subStatus.status === "grace_period" && (
          <div className="no-print print:hidden bg-red-500 text-white px-4 py-2 text-center text-sm font-bold w-full shadow-sm">
            {subStatus.message}
          </div>
        )}
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('Maspero PWA SW registered:', registration.scope);
                    },
                    function(err) {
                      console.log('Maspero PWA SW registration failed:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
