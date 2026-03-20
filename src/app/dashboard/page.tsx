import { createServiceRoleClient } from '@/lib/supabase/server';
import { Match } from '@/types';
import { MatchActionButton } from '@/components/MatchActionButton';
import { format, toZonedTime } from 'date-fns-tz';
import { ja } from 'date-fns/locale';
import Link from 'next/link';

const JST = 'Asia/Tokyo';

async function getStats() {
  const supabase = createServiceRoleClient();
  const [a, b, c] = await Promise.all([
    supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('shipments').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
    supabase.from('available_slots').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);
  return { pending: a.count ?? 0, waiting: b.count ?? 0, open: c.count ?? 0 };
}

async function getPendingMatches(): Promise<Match[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('matches')
    .select(`*, slot:available_slots(*, driver:users(*), vehicle:vehicles(*)),
             shipment:shipments(*, cargo_type:cargo_types(*), shipper:shippers(*))`)
    .eq('status', 'pending')
    .order('score', { ascending: false })
    .limit(30);
  return (data ?? []) as Match[];
}

export default async function DashboardPage() {
  const [stats, matches] = await Promise.all([getStats(), getPendingMatches()]);

  return (
    <div className="space-y-10">
      {/* ─── KPI bar ─── */}
      <div className="grid grid-cols-3 divide-x" style={{ border: '1px solid #334155', divideColor: '#334155' }}>
        <KpiCell label="確認待ち" value={stats.pending} accent href="/dashboard" />
        <KpiCell label="未マッチ荷物" value={stats.waiting} href="/shipments?status=waiting" />
        <KpiCell label="空車スロット" value={stats.open} href="/slots?status=open" />
      </div>

      {/* ─── Quick actions ─── */}
      <div className="flex gap-3">
        <Link href="/slots/new" className="px-6 py-3 text-sm font-bold border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-slate-900 transition-colors">
          ＋ 空車登録
        </Link>
        <Link href="/shipments/new" className="px-6 py-3 text-sm font-bold border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white transition-colors">
          ＋ 荷物登録
        </Link>
      </div>

      {/* ─── Pending matches ─── */}
      <section>
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-lg font-bold text-white">確認待ちマッチング</h2>
          {matches.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5" style={{ backgroundColor: '#78350f', color: '#f59e0b' }}>
              {matches.length} 件
            </span>
          )}
        </div>

        {matches.length === 0 ? (
          <p className="text-base py-10 text-center" style={{ color: '#94a3b8', border: '1px solid #334155' }}>
            確認待ちのマッチングはありません
          </p>
        ) : (
          <div style={{ border: '1px solid #334155' }}>
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_120px_140px] gap-4 px-4 py-2 text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: '#1e293b', color: '#64748b', borderBottom: '1px solid #334155' }}>
              <span>荷物情報</span>
              <span>ルート</span>
              <span>ドライバー / 車両</span>
              <span>集荷日時</span>
              <span>アクション</span>
            </div>
            {matches.map((match, i) => (
              <MatchRow key={match.id} match={match} last={i === matches.length - 1} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCell({ label, value, accent, href }: { label: string; value: number; accent?: boolean; href: string }) {
  return (
    <Link href={href} className="block px-6 py-5 hover:opacity-80 transition-opacity" style={{ backgroundColor: '#1e293b' }}>
      <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>{label}</p>
      <p className="text-5xl font-black tabular-nums" style={{ color: accent ? '#f59e0b' : '#f1f5f9' }}>
        {value}
      </p>
    </Link>
  );
}

function MatchRow({ match, last }: { match: Match; last: boolean }) {
  const pickupTime = match.shipment?.pickup_time
    ? format(toZonedTime(new Date(match.shipment.pickup_time), JST), 'M/d HH:mm', { locale: ja })
    : '—';

  const score = match.score ?? 0;
  const scoreColor = score >= 70 ? '#4ade80' : score >= 40 ? '#f59e0b' : '#94a3b8';

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_120px_140px] gap-3 md:gap-4 px-4 py-4 hover:opacity-90 transition-opacity"
      style={{
        borderBottom: last ? 'none' : '1px solid #334155',
        backgroundColor: '#0f172a',
      }}
    >
      {/* 荷物情報 */}
      <div>
        <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>荷物</p>
        <p className="text-base font-semibold text-white">
          {match.shipment?.cargo_type?.icon} {match.shipment?.cargo_type?.name ?? '—'}
        </p>
        <p className="text-sm" style={{ color: '#94a3b8' }}>{match.shipment?.shipper?.company ?? '—'}</p>
        <p className="text-xs mt-1 font-mono" style={{ color: scoreColor }}>
          スコア {score.toFixed(0)}
        </p>
      </div>

      {/* ルート */}
      <div>
        <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>ルート</p>
        <p className="text-base font-semibold text-white">
          {match.shipment?.prefecture}
        </p>
        <p className="text-sm" style={{ color: '#94a3b8' }}>→ {match.shipment?.destination}</p>
      </div>

      {/* ドライバー */}
      <div>
        <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>ドライバー</p>
        <p className="text-base font-semibold text-white">{match.slot?.driver?.name ?? '—'}</p>
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          {match.slot?.vehicle?.plate_number ?? '—'} · {match.slot?.vehicle?.vehicle_type ?? '—'}
        </p>
      </div>

      {/* 集荷日時 */}
      <div>
        <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>集荷</p>
        <p className="text-base font-bold text-white tabular-nums">{pickupTime}</p>
      </div>

      {/* Actions */}
      <div className="flex items-start gap-2 flex-wrap">
        <MatchActionButton matchId={match.id} action="confirm" label="確定" variant="primary" />
        <MatchActionButton matchId={match.id} action="cancel" label="却下" variant="danger" />
      </div>
    </div>
  );
}
