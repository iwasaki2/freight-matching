import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import { cookies } from 'next/headers';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FreightMatch',
  description: '配車マッチングシステム',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const role     = cookieStore.get('fm_role')?.value ?? null;
  const userName = cookieStore.get('fm_name')?.value ?? null;

  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-noto-sans-jp)] antialiased">
        <Header userName={userName} role={role} />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
