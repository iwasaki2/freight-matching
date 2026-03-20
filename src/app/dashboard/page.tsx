import { createServiceRoleClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Match } from '@/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

async function getStats() {
  const supabase = createServiceRoleClient();
  const [pendingMatches, waitingShipments, openSlots] = await Promise.all([
    supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('shipments').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
    supabase.from('available_slots').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);
  return {
    pendingCount: pendingMatches.count ?? 0,
    waitingCount: waitingShipments.count ?? 0,
    openCount: openSlots.count ?? 0,
  };
}

async function getPendingMatches(): Promise<Match[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('matches')
    .select(
      `*, slot:available_slots(*, driver:users(*), vehicle:vehicles(*)),
       shipment:shipments(*, cargo_type:cargo_types(*), shipper:shippers(*))`,
    )
    .eq('status', 'pending')
    .order('score', { ascending: false })
    .limit(20);
  return (data ?? []) as Match[];
}

export default async function DashboardPage() {
  const [stats, matches] = await Promise.all([getStats(), getPendingMatches()]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="確認待ちマッチング" value={stats.pendingCount} color="bg-yellow-50 border-yellow-300" />
        <StatCard label="未マッチ荷物" value={stats.waitingCount} color="bg-red-50 border-red-300" />
        <StatCard label="空車スロット" value={stats.openCount} color="bg-green-50 border-green-300" />
      </div>

      {/* Pending matches list */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">確認待ちマッチング一覧</h2>
        {matches.length === 0 ? (
          <p className="text-gray-500 text-sm">確認待ちのマッチングはありません。</p>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`rounded-lg border p-5 ${color}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const pickupTime = match.shipment?.pickup_time
    ? format(new Date(match.shipment.pickup_time), 'M/d HH:mm', { locale: ja })
    : '—';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
      <div className="space-y-0.5 text-sm">
        <p className="font-medium text-gray-800">
          {match.shipment?.cargo_type?.icon} {match.shipment?.cargo_type?.name ?? '—'} /{' '}
          {match.shipment?.prefecture} → {match.shipment?.destination}
        </p>
        <p className="text-gray-500">
          集荷: {pickupTime} ／ ドライバー: {match.slot?.driver?.name ?? '—'} ／ スコア:{' '}
          {match.score?.toFixed(1) ?? '—'}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <ActionButton matchId={match.id} action="confirm" label="確定" variant="primary" />
        <ActionButton matchId={match.id} action="cancel" label="却下" variant="danger" />
      </div>
    </div>
  );
}

function ActionButton({
  matchId,
  action,
  label,
  variant,
}: {
  matchId: string;
  action: string;
  label: string;
  variant: 'primary' | 'danger';
}) {
  const base = 'px-3 py-1.5 rounded text-sm font-medium transition-colors';
  const styles =
    variant === 'primary'
      ? `${base} bg-blue-600 text-white hover:bg-blue-700`
      : `${base} bg-red-100 text-red-700 hover:bg-red-200`;

  return (
    <form
      action={async () => {
        'use server';
        const { createServiceRoleClient } = await import('@/lib/supabase/server');
        const { confirmMatch, cancelMatch } = await import('@/lib/matching');
        if (action === 'confirm') await confirmMatch(matchId);
        if (action === 'cancel') await cancelMatch(matchId);
      }}
    >
      <button type="submit" className={styles}>
        {label}
      </button>
    </form>
  );
}
