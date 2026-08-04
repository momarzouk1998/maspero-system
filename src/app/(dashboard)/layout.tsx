'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Printer,
  Train,
  Cpu,
  Receipt,
  Clock,
  BarChart3,
  Users,
  LogOut,
  ArrowLeftRight
} from 'lucide-react';
import PwaInstallButton from '@/components/pwa-install-button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingTransfers, setPendingTransfers] = useState(0);

  const fetchUserAndPending = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);

      const transferRes = await fetch('/api/transfers?type=pending');
      if (transferRes.ok) {
        const transferData = await transferRes.json();
        setPendingTransfers(transferData.pendingCount || 0);
      }
    } catch (e) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndPending();
    const interval = setInterval(fetchUserAndPending, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1329]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">جاري تحميل نظام ماسبيرو...</p>
        </div>
      </div>
    );
  }

  const isManager = user?.role === 'manager';

  const navItems = [
    { name: 'الرئيسية', href: '/', icon: LayoutDashboard },
    { name: 'محفظتي والتحويلات', href: '/wallet', icon: Wallet, badge: pendingTransfers },
    { name: 'تسجيل الخدمات والطباعة', href: '/services', icon: Printer },
    { name: 'حجوزات التذاكر', href: '/tickets', icon: Train },
    { name: 'الخدمات المالية والماكينات', href: '/machines', icon: Cpu },
    { name: 'المصروفات والسلف', href: '/expenses', icon: Receipt },
    { name: 'الشفتات وساعات العمل', href: '/shifts', icon: Clock },
    ...(isManager ? [
      { name: 'تقارير الأرباح واللوج', href: '/manager/reports', icon: BarChart3 },
      { name: 'محافظ الموظفين والخزينة', href: '/manager/wallets', icon: Users },
    ] : [])
  ];

  return (
    <div className="min-h-screen flex bg-[#0b1329] text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-l border-slate-800 flex flex-col justify-between hidden md:flex sticky top-0 h-screen z-20">
        <div>
          {/* Logo Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center gap-3 bg-slate-900/40">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-white p-1 shadow-md shadow-slate-950/50 flex items-center justify-center shrink-0">
              <Image
                src="/maspero-logo.png"
                alt="Maspero Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-wide text-lg">ماسـبيرو</h1>
              <p className="text-[11px] text-pink-400 font-semibold">لخدمات الطباعة والإنترنت</p>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-slate-950 rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & PWA Install Button bottom sidebar */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <PwaInstallButton />

          <div className="glass-card p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm">
                {user?.name?.charAt(0) || 'م'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-blue-400 truncate font-semibold">
                  {isManager ? 'مدير النظام' : 'موظف مبيعات'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 glass-panel border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-300">
              أهلاً بك، <span className="text-white font-bold">{user?.name}</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Top Bar PWA Install Button */}
            <div className="hidden sm:block">
              <PwaInstallButton />
            </div>

            {/* Live Employee Wallet Balance Badge */}
            <Link href="/wallet">
              <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <div className="text-xs">
                  <span className="text-slate-400 block text-[10px]">عهدة الكاش</span>
                  <span className="font-extrabold text-sm">{Number(user?.wallet_balance || 0).toLocaleString('ar-EG')} ج.م</span>
                </div>
              </div>
            </Link>

            {/* Pending P2P Transfers Notification Badge */}
            <Link href="/wallet">
              <div className={`p-2.5 rounded-xl border relative transition-all cursor-pointer ${
                pendingTransfers > 0
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-bounce'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400'
              }`}>
                <ArrowLeftRight className="w-4 h-4" />
                {pendingTransfers > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center">
                    {pendingTransfers}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Header */}
        <div className="md:hidden glass-panel border-b border-slate-800 p-3 flex items-center justify-between overflow-x-auto gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`p-2.5 rounded-xl text-xs font-medium shrink-0 flex items-center gap-1.5 ${
                  active ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 bg-slate-900/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Main View Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
