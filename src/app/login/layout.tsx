// ログインページはヘッダー・main ラッパーを使わない独自レイアウト
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
