import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

// ロールごとのトップページ
function roleHome(role: string): string {
  if (role === 'driver')  return '/slots/my';
  if (role === 'shipper') return '/shipments/my';
  return '/dashboard';
}

// ロールがそのパスにアクセスできるか
function canAccess(role: string, pathname: string): boolean {
  if (role === 'staff' || role === 'admin') return true;
  if (role === 'driver') {
    return pathname.startsWith('/slots/new') || pathname.startsWith('/slots/my');
  }
  if (role === 'shipper') {
    return pathname.startsWith('/shipments/new') || pathname.startsWith('/shipments/my');
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });

  // 静的アセット・API は素通り
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return response;
  }

  const supabase = createMiddlewareClient(request, response);
  const { data: { user } } = await supabase.auth.getUser();

  // ─── /login ───────────────────────────────────────────────
  if (pathname.startsWith('/login')) {
    // ログイン済みなら適切なページへ
    if (user) {
      const role = request.cookies.get('fm_role')?.value ?? 'staff';
      return NextResponse.redirect(new URL(roleHome(role), request.url));
    }
    return response;
  }

  // ─── 未認証 → /login ──────────────────────────────────────
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ─── ロール取得 ───────────────────────────────────────────
  let role = request.cookies.get('fm_role')?.value;

  if (!role) {
    // cookie がない場合（セッション復帰時など）DB から取得して cookie に保存
    const { data: dbUser } = await supabase
      .from('users')
      .select('role, name')
      .eq('email', user.email ?? '')
      .single();

    role = dbUser?.role ?? 'staff';
    response.cookies.set('fm_role', role, { path: '/', httpOnly: true, sameSite: 'lax' });
    if (dbUser?.name) {
      response.cookies.set('fm_name', dbUser.name, { path: '/', httpOnly: true, sameSite: 'lax' });
    }
  }

  // ─── / → ロールのトップページ ──────────────────────────────
  if (pathname === '/') {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  // ─── /403 は全員通過 ───────────────────────────────────────
  if (pathname.startsWith('/403')) return response;

  // ─── アクセス制御 ─────────────────────────────────────────
  if (!canAccess(role, pathname)) {
    return NextResponse.redirect(new URL('/403', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.svg$).*)'],
};
