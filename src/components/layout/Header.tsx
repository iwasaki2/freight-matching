'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions/auth';

// ロールごとのナビゲーション
const NAV_BY_ROLE: Record<string, { href: string; label: string }[]> = {
  staff: [
    { href: '/dashboard',     label: 'ダッシュボード' },
    { href: '/slots',         label: '空車管理' },
    { href: '/shipments',     label: '荷物管理' },
  ],
  admin: [
    { href: '/dashboard',     label: 'ダッシュボード' },
    { href: '/slots',         label: '空車管理' },
    { href: '/shipments',     label: '荷物管理' },
  ],
  driver: [
    { href: '/slots/my',  label: '自分の空車' },
    { href: '/slots/new', label: '空車登録' },
  ],
  shipper: [
    { href: '/shipments/my',  label: '自分の荷物' },
    { href: '/shipments/new', label: '荷物登録' },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  staff: 'オペレーター', admin: '管理者', driver: 'ドライバー', shipper: '荷主',
};

export default function Header({
  userName,
  role,
}: {
  userName: string | null;
  role: string | null;
}) {
  const pathname = usePathname();
  const isLogin  = pathname.startsWith('/login');
  const navLinks = role ? (NAV_BY_ROLE[role] ?? NAV_BY_ROLE.staff) : [];

  return (
    <header style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-6 h-14">
        {/* Logo */}
        <Link
          href={role ? (navLinks[0]?.href ?? '/') : '/login'}
          className="text-base font-black tracking-widest uppercase shrink-0"
          style={{ color: '#f59e0b' }}
        >
          FreightMatch
        </Link>

        {/* Nav links */}
        {!isLogin && navLinks.length > 0 && (
          <nav className="flex items-center gap-0 overflow-x-auto">
            {navLinks.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors"
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
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User info + logout */}
        {!isLogin && userName && (
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-white leading-none">{userName}</span>
              <span className="text-xs leading-none mt-0.5" style={{ color: '#64748b' }}>
                {role ? (ROLE_LABEL[role] ?? role) : ''}
              </span>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-bold transition-colors border"
                style={{ borderColor: '#334155', color: '#64748b' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#94a3b8';
                  (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#334155';
                  (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                }}
              >
                ログアウト
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
