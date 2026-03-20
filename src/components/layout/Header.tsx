'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/slots',     label: '空車管理' },
  { href: '/shipments', label: '荷物管理' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-blue-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-wide hover:opacity-90 transition-opacity">
            <span className="text-xl">🚛</span>
            <span>FreightMatch</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-100 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile nav */}
        <nav className="sm:hidden flex border-t border-blue-600">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 text-center py-2 text-xs font-medium transition-colors ${
                  active ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-600'
                }`}
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
