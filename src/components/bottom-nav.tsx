'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Clock, ShoppingCart, Receipt } from 'lucide-react';

const items = [
  { name: 'الرئيسية', href: '/', icon: LayoutDashboard },
  { name: 'الشفتات', href: '/shifts', icon: Clock, badgeKey: 'shifts' as const },
  { name: 'البيع', href: '/pos', icon: ShoppingCart },
  { name: 'المالية', href: '/expenses', icon: Receipt },
];

export default function BottomNav({ pendingTransfers = 0 }: { pendingTransfers?: number }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-slate-200 flex items-stretch justify-around"
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
      aria-label="التنقل السريع"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        const showBadge = item.badgeKey === 'shifts' && pendingTransfers > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] pt-1.5 text-[11px] font-semibold transition-colors active:bg-slate-100 ${
              active ? 'text-blue-700' : 'text-slate-500'
            }`}
          >
            <span
              className={`relative flex items-center justify-center w-10 h-6 rounded-full transition-colors ${
                active ? 'bg-blue-100' : ''
              }`}
            >
              <Icon className="w-5 h-5" />
              {showBadge && (
                <span className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {pendingTransfers}
                </span>
              )}
            </span>
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
