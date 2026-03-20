'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

  const base = 'px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5';
  const styles =
    variant === 'primary'
      ? `${base} bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50`
      : `${base} bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50`;

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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={handleClick} disabled={loading} className={styles}>
        {loading && (
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {label}
      </button>
      {error && <p className="text-xs text-red-600 max-w-[160px] text-right">{error}</p>}
    </div>
  );
}
