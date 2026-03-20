'use client';

import { useActionState } from 'react';
import { loginAction } from './actions';

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, { error: '' });

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0f172a' }}>
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center space-y-2">
          <p className="text-3xl font-black tracking-widest uppercase" style={{ color: '#f59e0b' }}>
            FreightMatch
          </p>
          <p className="text-sm" style={{ color: '#64748b' }}>配車マッチングシステム</p>
        </div>

        {/* Form */}
        <form action={formAction} className="space-y-0" style={{ border: '1px solid #334155' }}>

          {/* Error */}
          {state.error && (
            <div className="px-4 py-3 text-sm flex items-center gap-2" style={{ backgroundColor: '#1c0a0a', color: '#f87171', borderBottom: '1px solid #7f1d1d' }}>
              <span>⚠</span>
              <span>{state.error}</span>
            </div>
          )}

          {/* Email */}
          <div className="grid grid-cols-[100px_1fr]" style={{ borderBottom: '1px solid #334155' }}>
            <div className="px-4 py-4 flex items-center" style={{ backgroundColor: '#131e2e', borderRight: '1px solid #334155' }}>
              <label htmlFor="email" className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                メール
              </label>
            </div>
            <div className="px-4 py-1" style={{ backgroundColor: '#0f172a' }}>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="user@example.com"
                className="w-full py-3 text-base bg-transparent focus:outline-none"
                style={{ color: '#f1f5f9' }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="grid grid-cols-[100px_1fr]">
            <div className="px-4 py-4 flex items-center" style={{ backgroundColor: '#131e2e', borderRight: '1px solid #334155' }}>
              <label htmlFor="password" className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                パスワード
              </label>
            </div>
            <div className="px-4 py-1" style={{ backgroundColor: '#0f172a' }}>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full py-3 text-base bg-transparent focus:outline-none"
                style={{ color: '#f1f5f9' }}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="p-4" style={{ backgroundColor: '#1e293b', borderTop: '1px solid #334155' }}>
            <button
              type="submit"
              disabled={pending}
              className="w-full inline-flex items-center justify-center gap-2 py-3 text-base font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-slate-900"
            >
              {pending && <Spinner />}
              {pending ? 'ログイン中…' : 'ログイン'}
            </button>
          </div>
        </form>

        <p className="text-xs text-center" style={{ color: '#475569' }}>
          ※ アカウントは管理者が発行します
        </p>
      </div>
    </div>
  );
}
