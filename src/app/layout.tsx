import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FreightMatch — 配車マッチングシステム',
  description: '空車と荷物をリアルタイムにマッチングするプラットフォーム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 font-[family-name:var(--font-noto-sans-jp)]">
        <Header />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
