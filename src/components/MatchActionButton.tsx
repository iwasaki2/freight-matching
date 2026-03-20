'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export function MatchActionButton({
  matchId,
  action,
  label,
  variant,
}: {
  matchId: string;
  action: 'confirm' | 'cancel';
  label: string;
  variant: 'primary' | 'danger';
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'エラーが発生しました');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラー');
      setLoading(false);
    }
  }

  const base = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[88px]';
  const styles = variant === 'primary'
    ? `${base} border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-slate-900`
    : `${base} border border-slate-600 text-slate-400 hover:border-red-500 hover:text-red-400`;

  return (
    <div>
      <button onClick={handleClick} disabled={loading} className={styles}>
        {loading && <Spinner />}
        {loading ? (action === 'confirm' ? '処理中' : '処理中') : label}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
