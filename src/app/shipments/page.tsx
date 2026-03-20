import { createServiceRoleClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Shipment, ShipmentStatus } from '@/types';
import { format, toZonedTime } from 'date-fns-tz';
import { ja } from 'date-fns/locale';

const JST = 'Asia/Tokyo';

const TABS: { label: string; value: ShipmentStatus | 'all' }[] = [
  { label: 'すべて',     value: 'all' },
  { label: '未マッチ',   value: 'waiting' },
  { label: 'マッチ済',   value: 'matched' },
  { label: '完了',       value: 'completed' },
  { label: 'キャンセル', value: 'cancelled' },
];

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  waiting: '未マッチ', matched: 'マッチ済', completed: '完了', cancelled: 'キャンセル',
};
const STATUS_COLOR: Record<ShipmentStatus, { bg: string; text: string }> = {
  waiting:   { bg: '#451a03', text: '#f59e0b' },
  matched:   { bg: '#1e3a5f', text: '#60a5fa' },
  completed: { bg: '#064e3b', text: '#34d399' },
  cancelled: { bg: '#1e293b', text: '#94a3b8' },
};

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const activeTab = params?.status ?? 'all';
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('shipments')
    .select('*, shipper:shippers(*), cargo_type:cargo_types(*)')
    .order('pickup_time', { ascending: true });
  if (activeTab !== 'all') query = query.eq('status', activeTab as ShipmentStatus);

  const { data, error } = await query;
  const shipments: Shipment[] = (data ?? []) as Shipment[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">荷物管理</h1>
        <Link
          href="/shipments/new"
          className="px-6 py-3 text-sm font-bold border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-slate-900 transition-colors"
        >
          ＋ 荷物登録
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 overflow-x-auto" style={{ borderBottom: '1px solid #334155' }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/shipments?status=${tab.value}`}
              className="px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                color: active ? '#f59e0b' : '#94a3b8',
                borderBottom: active ? '2px solid #f59e0b' : '2px solid transparent',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm px-4 py-3 text-red-400" style={{ border: '1px solid #7f1d1d', backgroundColor: '#1c0a0a' }}>
          エラー: {error.message}
        </p>
      )}

      {/* Table */}
      {shipments.length === 0 ? (
        <p className="text-base py-16 text-center" style={{ color: '#94a3b8', border: '1px solid #334155' }}>
          荷物がありません
        </p>
      ) : (
        <div style={{ border: '1px solid #334155' }}>
          {/* Header row */}
          <div
            className="hidden md:grid gap-4 px-4 py-2 text-xs font-bold uppercase tracking-wider"
            style={{
              gridTemplateColumns: '1fr 1fr 1fr 120px 80px',
              backgroundColor: '#1e293b',
              color: '#64748b',
              borderBottom: '1px solid #334155',
            }}
          >
            <span>荷物 / 荷主</span>
            <span>集荷地 → 配送先</span>
            <span>集荷日時</span>
            <span>重量</span>
            <span>ステータス</span>
          </div>

          {shipments.map((shipment, i) => {
            const pickup = format(toZonedTime(new Date(shipment.pickup_time), JST), 'M/d(E) HH:mm', { locale: ja });
            const sc = STATUS_COLOR[shipment.status];
            const last = i === shipments.length - 1;
            return (
              <div
                key={shipment.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_120px_80px] gap-3 md:gap-4 px-4 py-4 hover:opacity-90 transition-opacity"
                style={{ borderBottom: last ? 'none' : '1px solid #334155', backgroundColor: '#0f172a' }}
              >
                {/* Cargo / Shipper */}
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>荷物</p>
                  <p className="text-base font-semibold text-white">
                    {shipment.cargo_type?.icon} {shipment.cargo_type?.name ?? '—'}
                  </p>
                  <p className="text-sm" style={{ color: '#94a3b8' }}>{shipment.shipper?.company ?? '—'}</p>
                </div>

                {/* Route */}
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>ルート</p>
                  <p className="text-base font-semibold text-white">{shipment.prefecture}</p>
                  <p className="text-sm" style={{ color: '#94a3b8' }}>→ {shipment.destination}</p>
                </div>

                {/* Pickup time */}
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>集荷日時</p>
                  <p className="text-base font-bold text-white tabular-nums">{pickup}</p>
                </div>

                {/* Weight */}
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>重量</p>
                  <p className="text-base font-bold text-white tabular-nums">
                    {shipment.weight_kg} <span className="text-sm font-normal" style={{ color: '#94a3b8' }}>kg</span>
                  </p>
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>状態</p>
                  <span className="text-xs font-bold px-2 py-1 inline-block" style={{ backgroundColor: sc.bg, color: sc.text }}>
                    {STATUS_LABEL[shipment.status]}
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
