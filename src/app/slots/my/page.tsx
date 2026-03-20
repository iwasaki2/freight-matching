import { createServerClient } from '@/lib/supabase/server';
import { AvailableSlot, SlotStatus, Match, MatchStatus } from '@/types';
import { format, toZonedTime } from 'date-fns-tz';
import { ja } from 'date-fns/locale';
import Link from 'next/link';

const JST = 'Asia/Tokyo';

const SLOT_STATUS_COLOR: Record<SlotStatus, { bg: string; text: string }> = {
  open:    { bg: '#064e3b', text: '#34d399' },
  matched: { bg: '#1e3a5f', text: '#60a5fa' },
  expired: { bg: '#1e293b', text: '#94a3b8' },
  closed:  { bg: '#3b0000', text: '#f87171' },
};
const SLOT_STATUS_LABEL: Record<SlotStatus, string> = {
  open: '空車', matched: 'マッチ済', expired: '期限切れ', closed: 'クローズ',
};

const MATCH_STATUS_COLOR: Record<MatchStatus, { bg: string; text: string }> = {
  pending:     { bg: '#451a03', text: '#f59e0b' },
  confirmed:   { bg: '#1e3a5f', text: '#60a5fa' },
  in_progress: { bg: '#14532d', text: '#86efac' },
  completed:   { bg: '#064e3b', text: '#34d399' },
  cancelled:   { bg: '#1e293b', text: '#94a3b8' },
  expired:     { bg: '#1e293b', text: '#64748b' },
};
const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  pending: '確認待ち', confirmed: '確定', in_progress: '運搬中',
  completed: '完了', cancelled: 'キャンセル', expired: '期限切れ',
};

type SlotWithMatches = AvailableSlot & { matches: Match[] };

export default async function MySlotsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // public.users からドライバーIDを取得
  const { data: dbUser } = await supabase
    .from('users')
    .select('id, name')
    .eq('email', user.email ?? '')
    .single();

  if (!dbUser) {
    return (
      <div className="py-16 text-center" style={{ color: '#94a3b8' }}>
        ユーザー情報が見つかりません。管理者に連絡してください。
      </div>
    );
  }

  // 自分のスロットをマッチング情報付きで取得
  const { data: slotsRaw } = await supabase
    .from('available_slots')
    .select(`
      *,
      vehicle:vehicles(*),
      cargo_types:slot_cargo_types(cargo_type:cargo_types(*)),
      matches(*, shipment:shipments(*, cargo_type:cargo_types(*), shipper:shippers(*)))
    `)
    .eq('driver_id', dbUser.id)
    .order('available_from', { ascending: false });

  const slots: SlotWithMatches[] = ((slotsRaw ?? []) as Record<string, unknown>[]).map((s) => ({
    ...s,
    cargo_types: ((s.cargo_types as { cargo_type: unknown }[]) ?? []).map((r) => r.cargo_type),
    matches: (s.matches as Match[]) ?? [],
  })) as SlotWithMatches[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">自分の空車・マッチング</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{dbUser.name} のスロット一覧</p>
        </div>
        <Link
          href="/slots/new"
          className="px-6 py-3 text-sm font-bold border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-slate-900 transition-colors"
        >
          ＋ 空車登録
        </Link>
      </div>

      {slots.length === 0 ? (
        <p className="text-base py-16 text-center" style={{ color: '#94a3b8', border: '1px solid #334155' }}>
          登録されたスロットはありません
        </p>
      ) : (
        <div className="space-y-4">
          {slots.map((slot) => {
            const from  = format(toZonedTime(new Date(slot.available_from),  JST), 'M/d HH:mm', { locale: ja });
            const until = format(toZonedTime(new Date(slot.available_until), JST), 'M/d HH:mm', { locale: ja });
            const sc = SLOT_STATUS_COLOR[slot.status];

            // 表示するマッチ（confirmed/in_progress/completed を優先、なければ pending）
            const activeMatches = slot.matches.filter(
              (m) => ['confirmed', 'in_progress', 'completed'].includes(m.status)
            );
            const pendingMatches = slot.matches.filter((m) => m.status === 'pending');
            const visibleMatches = activeMatches.length > 0 ? activeMatches : pendingMatches;

            return (
              <div key={slot.id} style={{ border: '1px solid #334155' }}>
                {/* Slot header */}
                <div
                  className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 px-4 py-4"
                  style={{ backgroundColor: '#1e293b', borderBottom: slot.matches.length > 0 ? '1px solid #334155' : 'none' }}
                >
                  <div>
                    <p className="text-base font-bold text-white">
                      {slot.vehicle?.plate_number ?? '—'} · {slot.vehicle?.vehicle_type ?? '—'}
                    </p>
                    <p className="text-sm tabular-nums" style={{ color: '#94a3b8' }}>
                      {slot.prefecture} ／ {from} 〜 {until}
                    </p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-white tabular-nums">
                      {slot.available_load_kg} kg
                    </p>
                    {slot.cargo_types && slot.cargo_types.length > 0 && (
                      <p className="text-sm" style={{ color: '#64748b' }}>
                        {slot.cargo_types.map((ct) => ct.name).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs font-bold px-2 py-1" style={{ backgroundColor: sc.bg, color: sc.text }}>
                      {SLOT_STATUS_LABEL[slot.status]}
                    </span>
                  </div>
                </div>

                {/* Matches */}
                {visibleMatches.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5" style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b' }}>
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
                        マッチング ({visibleMatches.length}件)
                      </span>
                    </div>
                    {visibleMatches.map((match, i) => {
                      const mc = MATCH_STATUS_COLOR[match.status];
                      const pickupTime = match.shipment?.pickup_time
                        ? format(toZonedTime(new Date(match.shipment.pickup_time), JST), 'M/d HH:mm', { locale: ja })
                        : '—';
                      const last = i === visibleMatches.length - 1;
                      return (
                        <div
                          key={match.id}
                          className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 px-4 py-3"
                          style={{ backgroundColor: '#0f172a', borderBottom: last ? 'none' : '1px solid #1e293b' }}
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {match.shipment?.cargo_type?.icon} {match.shipment?.cargo_type?.name ?? '—'}
                            </p>
                            <p className="text-xs" style={{ color: '#64748b' }}>
                              {match.shipment?.shipper?.company ?? '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{match.shipment?.prefecture}</p>
                            <p className="text-xs" style={{ color: '#94a3b8' }}>→ {match.shipment?.destination}</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white tabular-nums">{pickupTime}</p>
                            <p className="text-xs" style={{ color: '#64748b' }}>
                              {match.shipment?.weight_kg} kg
                            </p>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs font-bold px-2 py-1" style={{ backgroundColor: mc.bg, color: mc.text }}>
                              {MATCH_STATUS_LABEL[match.status]}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
