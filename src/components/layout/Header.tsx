'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/slots',     label: '空車' },
  { href: '/shipments', label: '荷物' },
];

export default function Header() {
  const pathname = usePathname();
  return (
    <header style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-8 h-14">
        <Link href="/dashboard" className="text-base font-bold tracking-widest uppercase" style={{ color: '#f59e0b' }}>
          FreightMatch
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  color: active ? '#f59e0b' : '#94a3b8',
                  borderBottom: active ? '2px solid #f59e0b' : '2px solid transparent',
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
