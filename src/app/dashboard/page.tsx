import { createServiceRoleClient } from '@/lib/supabase/server';
import { Match } from '@/types';
import { MatchActionButton } from '@/components/MatchActionButton';
import { format, toZonedTime } from 'date-fns-tz';
import { ja } from 'date-fns/locale';
import Link from 'next/link';

const JST = 'Asia/Tokyo';

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
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-1">配車マッチングの状況を確認できます</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="確認待ちマッチング"
          value={stats.pendingCount}
          icon="🔔"
          color="bg-amber-50 border-amber-200"
          valueColor="text-amber-700"
          href="/dashboard"
        />
        <StatCard
          label="未マッチ荷物"
          value={stats.waitingCount}
          icon="📦"
          color="bg-red-50 border-red-200"
          valueColor="text-red-700"
          href="/shipments?status=waiting"
        />
        <StatCard
          label="空車スロット"
          value={stats.openCount}
          icon="🚛"
          color="bg-green-50 border-green-200"
          valueColor="text-green-700"
          href="/slots?status=open"
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/slots/new"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
        >
          <span>＋</span> 空車を登録
        </Link>
        <Link
          href="/shipments/new"
          className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
        >
          <span>＋</span> 荷物を登録
        </Link>
      </div>

      {/* Pending matches */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-700">確認待ちマッチング</h2>
          {matches.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {matches.length} 件
            </span>
          )}
        </div>

        {matches.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-slate-600 font-medium">確認待ちのマッチングはありません</p>
            <p className="text-slate-400 text-sm mt-1">新しい荷物・空車を登録するとマッチングが始まります</p>
          </div>
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
  label, value, icon, color, valueColor, href,
}: {
  label: string; value: number; icon: string;
  color: string; valueColor: string; href: string;
}) {
  return (
    <Link href={href} className={`block rounded-xl border p-5 hover:shadow-md transition-shadow ${color}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-4xl font-bold mt-2 ${valueColor}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">タップして一覧を見る</p>
    </Link>
  );
}

function MatchCard({ match }: { match: Match }) {
  const pickupTime = match.shipment?.pickup_time
    ? format(toZonedTime(new Date(match.shipment.pickup_time), JST), 'M月d日 HH:mm', { locale: ja })
    : '—';

  const score = match.score ?? 0;
  const scoreColor =
    score >= 70 ? 'text-green-600 bg-green-50' :
    score >= 40 ? 'text-amber-600 bg-amber-50' :
                  'text-slate-500 bg-slate-100';

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span>{match.shipment?.cargo_type?.icon}</span>
          <span>{match.shipment?.cargo_type?.name ?? '—'}</span>
          <span className="text-slate-400 font-normal">|</span>
          <span className="text-slate-500 font-normal text-xs">集荷: {pickupTime}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor}`}>
          スコア {score.toFixed(0)}
        </span>
      </div>

      {/* Card body */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {/* Route */}
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">ルート</p>
            <p className="font-semibold text-slate-800">
              {match.shipment?.prefecture} → {match.shipment?.destination}
            </p>
            <p className="text-slate-500 text-xs">荷主: {match.shipment?.shipper?.company ?? '—'}</p>
          </div>
          {/* Driver */}
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">ドライバー / 車両</p>
            <p className="font-semibold text-slate-800">{match.slot?.driver?.name ?? '—'}</p>
            <p className="text-slate-500 text-xs">
              {match.slot?.vehicle?.plate_number ?? '—'} ({match.slot?.vehicle?.vehicle_type ?? '—'})
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
          <MatchActionButton matchId={match.id} action="confirm" label="確定する" variant="primary" />
          <MatchActionButton matchId={match.id} action="cancel" label="却下する" variant="danger" />
        </div>
      </div>
    </div>
  );
}
