'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export async function logout() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete('fm_role');
  cookieStore.delete('fm_name');

  redirect('/login');
}
