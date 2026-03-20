import Link from 'next/link';
import { cookies } from 'next/headers';

function roleHome(role: string): string {
  if (role === 'driver')  return '/slots/my';
  if (role === 'shipper') return '/shipments/my';
  return '/dashboard';
}

export default async function ForbiddenPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get('fm_role')?.value ?? 'staff';
  const home = roleHome(role);

  return (
    <div className="flex flex-col items-center justify-center py-32 space-y-6 text-center">
      <p className="text-7xl font-black tabular-nums" style={{ color: '#334155' }}>403</p>
      <div>
        <p className="text-xl font-bold text-white">アクセス権限がありません</p>
        <p className="text-sm mt-2" style={{ color: '#64748b' }}>
          このページを表示する権限がありません。
        </p>
      </div>
      <Link
        href={home}
        className="px-6 py-3 text-sm font-bold border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-slate-900 transition-colors"
      >
        ホームへ戻る
      </Link>
    </div>
  );
}
