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
  ArrowLeftRight,
  Menu,
  X,
  Settings,
  FolderTree,
  FileText,
  History,
  ShoppingCart,
  FileSpreadsheet,
  Zap,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import PwaInstallButton from '@/components/pwa-install-button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingTransfers, setPendingTransfers] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 text-sm">جاري تحميل نظام ماسبيرو...</p>
        </div>
      </div>
    );
  }

  const isManager = user?.role === 'manager';

  const navItems = [
    { name: 'الرئيسية', href: '/', icon: LayoutDashboard },
    { name: 'إدارة الشفتات', href: '/shifts', icon: Clock },
    { name: 'صفحة البيع', href: '/pos', icon: ShoppingCart },
    { name: 'سجل الشفتات', href: '/shifts-history', icon: History },
    { name: 'سجل الفواتير', href: '/invoices', icon: FileSpreadsheet },
    { name: 'سجل عمليات الشحن', href: '/charge-history', icon: Zap },
    { name: 'سجل الخدمات', href: '/services', icon: Printer },
    { name: 'سجل التذاكر', href: '/tickets', icon: Train },
    { name: 'محفظتي والتحويلات', href: '/wallet', icon: Wallet, badge: pendingTransfers },
    { name: 'المصروفات والسلف', href: '/expenses', icon: Receipt },
    { name: 'الخدمات المالية والماكينات', href: '/machines', icon: Cpu },
    ...(isManager ? [
      { name: 'إدارة الموظفين والحسابات', href: '/manager/users', icon: Users },
      { name: 'إدارة أسعار الطباعة', href: '/manager/pricing', icon: Settings },
      { name: 'تصنيفات المصروفات', href: '/manager/categories', icon: FolderTree },
      { name: 'الملاحظات', href: '/manager/notes', icon: FileText },
      { name: 'تقارير الأرباح واللوج', href: '/manager/reports', icon: BarChart3 },
      { name: 'محافظ الموظفين والخزينة', href: '/manager/wallets', icon: Users },
    ] : [])
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} glass-panel border-l border-slate-200 flex flex-col justify-between fixed md:sticky top-0 h-screen z-50 transition-all duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
      }`}>
        <div>
          {/* Logo Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-100">
            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
              <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-white p-1 shadow-md shadow-slate-300/50 flex items-center justify-center shrink-0">
                <Image
                  src="/maspero-logo.png"
                  alt="Maspero Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              {!isSidebarCollapsed && (
                <div>
                  <h1 className="font-bold text-slate-900 tracking-wide text-lg">ماسـبيرو</h1>
                  <p className="text-[11px] text-pink-600 font-semibold">لخدمات الطباعة والإنترنت</p>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-slate-600 hover:text-slate-900 p-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Desktop Collapse Toggle Button */}
            {!isMobileMenuOpen && (
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden md:block text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                title={isSidebarCollapsed ? 'فتح القائمة' : 'طي القائمة'}
              >
                {isSidebarCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            )}
          </div>

          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-230px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  title={isSidebarCollapsed ? item.name : ''}
                  className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-100 text-blue-700 border border-blue-300 font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className={`flex items-center ${isSidebarCollapsed ? '' : 'gap-3'}`}>
                    <Icon className={`w-5 h-5 ${active ? 'text-blue-700' : 'text-slate-600'}`} />
                    {!isSidebarCollapsed && <span>{item.name}</span>}
                  </div>
                  {!isSidebarCollapsed && item.badge && item.badge > 0 ? (
                    <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}
                  {isSidebarCollapsed && item.badge && item.badge > 0 ? (
                    <span className="absolute top-1 left-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & PWA Install Button bottom sidebar */}
        <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-100">
          {!isSidebarCollapsed && <PwaInstallButton />}

          <div className={`glass-card p-3 rounded-xl flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} border border-slate-200`}>
            {isSidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-sm">
                  {user?.name?.charAt(0) || 'م'}
                </div>
                <button
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                  className="text-slate-600 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-sm">
                    {user?.name?.charAt(0) || 'م'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-blue-600 truncate font-semibold">
                      {isManager ? 'مدير النظام' : 'موظف مبيعات'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                  className="text-slate-600 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 glass-panel border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Mobile 3-Bars Hamburger Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-slate-700 hover:text-slate-900 p-2 rounded-xl bg-slate-100 border border-slate-200 cursor-pointer"
              aria-label="فتح القائمة الجانبية"
            >
              <Menu className="w-6 h-6" />
            </button>

            <h2 className="text-sm font-semibold text-slate-600">
              أهلاً بك، <span className="text-slate-900 font-bold">{user?.name}</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Employee Wallet Balance Badge */}
            <Link href="/wallet">
              <div className="glass-card px-3 md:px-4 py-2 rounded-xl flex items-center gap-2.5 border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer">
                <Wallet className="w-4 h-4 text-emerald-700" />
                <div className="text-xs">
                  <span className="text-slate-600 block text-[10px]">عهدة الكاش</span>
                  <span className="font-extrabold text-sm">{Number(user?.wallet_balance || 0).toLocaleString('ar-EG')} ج.م</span>
                </div>
              </div>
            </Link>

            {/* Pending P2P Transfers Notification Badge */}
            <Link href="/wallet">
              <div className={`p-2.5 rounded-xl border relative transition-all cursor-pointer ${
                pendingTransfers > 0
                  ? 'bg-amber-100 border-amber-400 text-amber-700 animate-bounce'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                <ArrowLeftRight className="w-4 h-4" />
                {pendingTransfers > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                    {pendingTransfers}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
