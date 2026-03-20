import { createServerClient } from '@/lib/supabase/server';
import { Shipment, ShipmentStatus } from '@/types';
import { format, toZonedTime } from 'date-fns-tz';
import { ja } from 'date-fns/locale';
import Link from 'next/link';

const JST = 'Asia/Tokyo';

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  waiting: '未マッチ', matched: 'マッチ済', completed: '完了', cancelled: 'キャンセル',
};
const STATUS_COLOR: Record<ShipmentStatus, { bg: string; text: string }> = {
  waiting:   { bg: '#451a03', text: '#f59e0b' },
  matched:   { bg: '#1e3a5f', text: '#60a5fa' },
  completed: { bg: '#064e3b', text: '#34d399' },
  cancelled: { bg: '#1e293b', text: '#94a3b8' },
};

export default async function MyShipmentsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // public.users → shippers → shipments の順で取得
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email ?? '')
    .single();

  if (!dbUser) {
    return (
      <div className="py-16 text-center" style={{ color: '#94a3b8' }}>
        ユーザー情報が見つかりません。管理者に連絡してください。
      </div>
    );
  }

  const { data: shipperRow } = await supabase
    .from('shippers')
    .select('id, company')
    .eq('user_id', dbUser.id)
    .single();

  const shipments: Shipment[] = shipperRow
    ? ((await supabase
        .from('shipments')
        .select('*, cargo_type:cargo_types(*), shipper:shippers(*)')
        .eq('shipper_id', shipperRow.id)
        .order('pickup_time', { ascending: false })
      ).data ?? []) as Shipment[]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">自分の荷物</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            {shipperRow?.company ?? '—'} の依頼一覧
          </p>
        </div>
        <Link
          href="/shipments/new"
          className="px-6 py-3 text-sm font-bold border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-slate-900 transition-colors"
        >
          ＋ 荷物登録
        </Link>
      </div>

      {!shipperRow && (
        <div className="px-4 py-3 text-sm" style={{ backgroundColor: '#451a03', color: '#f59e0b', border: '1px solid #78350f' }}>
          荷主情報が登録されていません。管理者に荷主アカウントの紐付けを依頼してください。
        </div>
      )}

      {shipments.length === 0 ? (
        <p className="text-base py-16 text-center" style={{ color: '#94a3b8', border: '1px solid #334155' }}>
          登録された荷物はありません
        </p>
      ) : (
        <div style={{ border: '1px solid #334155' }}>
          {/* Header row */}
          <div
            className="hidden md:grid gap-4 px-4 py-2 text-xs font-bold uppercase tracking-wider"
            style={{
              gridTemplateColumns: '1fr 1fr 1fr 100px 80px',
              backgroundColor: '#1e293b',
              color: '#64748b',
              borderBottom: '1px solid #334155',
            }}
          >
            <span>荷物種別</span>
            <span>集荷地 → 配送先</span>
            <span>集荷日時</span>
            <span>重量</span>
            <span>状態</span>
          </div>

          {shipments.map((s, i) => {
            const pickup = format(toZonedTime(new Date(s.pickup_time), JST), 'M/d(E) HH:mm', { locale: ja });
            const sc  = STATUS_COLOR[s.status];
            const last = i === shipments.length - 1;
            return (
              <div
                key={s.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_100px_80px] gap-3 md:gap-4 px-4 py-4"
                style={{ borderBottom: last ? 'none' : '1px solid #334155', backgroundColor: '#0f172a' }}
              >
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>荷物</p>
                  <p className="text-base font-semibold text-white">
                    {s.cargo_type?.icon} {s.cargo_type?.name ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>ルート</p>
                  <p className="text-base font-semibold text-white">{s.prefecture}</p>
                  <p className="text-sm" style={{ color: '#94a3b8' }}>→ {s.destination}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>集荷日時</p>
                  <p className="text-base font-bold text-white tabular-nums">{pickup}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>重量</p>
                  <p className="text-base font-bold text-white tabular-nums">
                    {s.weight_kg} <span className="text-sm font-normal" style={{ color: '#94a3b8' }}>kg</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>状態</p>
                  <span className="text-xs font-bold px-2 py-1 inline-block" style={{ backgroundColor: sc.bg, color: sc.text }}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
