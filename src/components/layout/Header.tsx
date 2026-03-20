import Link from 'next/link';

const NAV_LINKS = [
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/slots', label: '空車一覧' },
  { href: '/shipments', label: '荷物一覧' },
];

export default function Header() {
  return (
    <header className="bg-blue-700 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-bold tracking-wide hover:opacity-80">
          FreightMatch
        </Link>
        <nav className="flex gap-6 text-sm font-medium">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:underline hover:opacity-90">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
