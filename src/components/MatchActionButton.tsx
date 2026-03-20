'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
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

  const base =
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 min-w-[72px]';
  const styles =
    variant === 'primary'
      ? `${base} bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm`
      : `${base} bg-white text-red-600 border border-red-300 hover:bg-red-50 active:scale-95`;

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
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button onClick={handleClick} disabled={loading} className={styles}>
        {loading ? <Spinner /> : null}
        {loading ? (action === 'confirm' ? '確定中...' : 'キャンセル中...') : label}
      </button>
      {error && (
        <p className="text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
