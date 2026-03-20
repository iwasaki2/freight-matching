'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

function roleHome(role: string): string {
  if (role === 'driver')  return '/slots/my';
  if (role === 'shipper') return '/shipments/my';
  return '/dashboard';
}

export async function loginAction(_prev: { error: string }, formData: FormData) {
  const email    = formData.get('email')    as string;
  const password = formData.get('password') as string;

  const supabase = await createServerClient();

  // Supabase Auth でサインイン
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    return { error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  // public.users からロールと名前を取得
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('role, name')
    .eq('email', email)
    .single();

  if (dbError || !dbUser) {
    return { error: 'ユーザー情報が見つかりません。管理者に連絡してください。' };
  }

  // ロール・名前を cookie に保存
  const cookieStore = await cookies();
  cookieStore.set('fm_role', dbUser.role, { path: '/', httpOnly: true, sameSite: 'lax' });
  cookieStore.set('fm_name', dbUser.name,  { path: '/', httpOnly: true, sameSite: 'lax' });

  redirect(roleHome(dbUser.role));
}
