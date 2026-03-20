import { createServiceRoleClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Shipment, ShipmentStatus } from '@/types';
import { format, toZonedTime } from 'date-fns-tz';
import { ja } from 'date-fns/locale';

const JST = 'Asia/Tokyo';

const TABS: { label: string; value: ShipmentStatus | 'all'; icon: string }[] = [
  { label: 'すべて',   value: 'all',       icon: '📋' },
  { label: '未マッチ', value: 'waiting',   icon: '🟡' },
  { label: 'マッチ済', value: 'matched',   icon: '🔵' },
  { label: '完了',     value: 'completed', icon: '✅' },
  { label: 'キャンセル', value: 'cancelled', icon: '❌' },
];

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  waiting:   '未マッチ',
  matched:   'マッチ済',
  completed: '完了',
  cancelled: 'キャンセル',
};

const STATUS_STYLES: Record<ShipmentStatus, string> = {
  waiting:   'bg-amber-100 text-amber-800 border border-amber-200',
  matched:   'bg-blue-100 text-blue-800 border border-blue-200',
  completed: 'bg-green-100 text-green-800 border border-green-200',
  cancelled: 'bg-slate-100 text-slate-500 border border-slate-200',
};

const STATUS_BAR: Record<ShipmentStatus, string> = {
  waiting:   'bg-amber-400',
  matched:   'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-slate-300',
};

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params?.status;

  const supabase = createServiceRoleClient();
  let query = supabase
    .from('shipments')
    .select('*, shipper:shippers(*), cargo_type:cargo_types(*)')
    .order('pickup_time', { ascending: true });

  if (status && status !== 'all') query = query.eq('status', status as ShipmentStatus);

  const { data, error } = await query;
  const shipments: Shipment[] = (data ?? []) as Shipment[];
  const activeTab = status ?? 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">荷物管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">登録中の荷物一覧</p>
        </div>
        <Link
          href="/shipments/new"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
        >
          ＋ 荷物を登録
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/shipments?status=${tab.value}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          エラー: {error.message}
        </div>
      )}

      {/* List */}
      {shipments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-slate-600 font-medium">荷物がありません</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">荷物を登録してマッチングを開始しましょう</p>
          <Link
            href="/shipments/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            ＋ 荷物を登録
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shipments.map((shipment) => {
            const pickup = format(toZonedTime(new Date(shipment.pickup_time), JST), 'M月d日(E) HH:mm', { locale: ja });
            return (
              <div key={shipment.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Status bar */}
                <div className={`h-1 w-full ${STATUS_BAR[shipment.status]}`} />

                <div className="p-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{shipment.cargo_type?.icon}</span>
                      <div>
                        <p className="font-bold text-slate-800">{shipment.cargo_type?.name ?? '—'}</p>
                        <p className="text-xs text-slate-500">{shipment.shipper?.company ?? '—'}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[shipment.status]}`}>
                      {STATUS_LABELS[shipment.status]}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <InfoItem icon="📍" label="集荷地" value={shipment.prefecture} />
                    <InfoItem icon="🏁" label="配送先" value={shipment.destination} />
                    <InfoItem icon="🕐" label="集荷予定" value={pickup} />
                    <InfoItem icon="⚖️" label="重量" value={`${shipment.weight_kg} kg`} />
                  </div>

                  {shipment.note && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                      📝 {shipment.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-base leading-tight">{icon}</span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-medium text-slate-700 text-sm">{value}</p>
      </div>
    </div>
  );
}
