import { createServiceRoleClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Shipment, ShipmentStatus } from '@/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  waiting: '未マッチ',
  matched: 'マッチ済',
  completed: '完了',
  cancelled: 'キャンセル',
};

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  waiting: 'bg-yellow-100 text-yellow-800',
  matched: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

export default async function ShipmentsPage() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('shipments')
    .select('*, shipper:shippers(*), cargo_type:cargo_types(*)')
    .order('pickup_time', { ascending: true });

  const shipments: Shipment[] = (data ?? []) as Shipment[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">荷物一覧</h1>
        <Link
          href="/shipments/new"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 荷物登録
        </Link>
      </div>

      {error && <p className="text-red-600 text-sm">{error.message}</p>}

      {shipments.length === 0 ? (
        <p className="text-gray-500 text-sm">荷物がありません。</p>
      ) : (
        <div className="space-y-3">
          {shipments.map((shipment) => {
            const pickup = format(new Date(shipment.pickup_time), 'M/d HH:mm', { locale: ja });
            return (
              <div
                key={shipment.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <p className="font-medium text-gray-800">
                    {shipment.cargo_type?.icon} {shipment.cargo_type?.name ?? '—'} /{' '}
                    {shipment.prefecture} → {shipment.destination}
                  </p>
                  <p className="text-sm text-gray-500">
                    集荷: {pickup} ／ {shipment.weight_kg} kg ／ 荷主:{' '}
                    {shipment.shipper?.company ?? '—'}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[shipment.status]}`}
                >
                  {STATUS_LABELS[shipment.status]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
