import { createServiceRoleClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { AvailableSlot, SlotStatus } from '@/types';
import { format, toZonedTime } from 'date-fns-tz';
import { ja } from 'date-fns/locale';

const JST = 'Asia/Tokyo';

const TABS: { label: string; value: SlotStatus | 'all' }[] = [
  { label: 'すべて', value: 'all' },
  { label: '空車', value: 'open' },
  { label: 'マッチ済', value: 'matched' },
  { label: '期限切れ', value: 'expired' },
  { label: 'クローズ', value: 'closed' },
];

const STATUS_LABELS: Record<SlotStatus, string> = {
  open: '空車',
  matched: 'マッチ済',
  expired: '期限切れ',
  closed: 'クローズ',
};

const STATUS_COLORS: Record<SlotStatus, string> = {
  open: 'bg-green-100 text-green-800',
  matched: 'bg-blue-100 text-blue-800',
  expired: 'bg-gray-100 text-gray-600',
  closed: 'bg-red-100 text-red-700',
};

export default async function SlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('available_slots')
    .select(
      '*, vehicle:vehicles(*), driver:users(*), cargo_types:slot_cargo_types(cargo_type:cargo_types(*))',
    )
    .order('available_from', { ascending: true });

  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  const slots: AvailableSlot[] = ((data ?? []) as Record<string, unknown>[]).map((s) => ({
    ...s,
    cargo_types: ((s.cargo_types as { cargo_type: unknown }[]) ?? []).map((r) => r.cargo_type),
  })) as AvailableSlot[];

  const activeTab = status ?? 'all';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">空車一覧</h1>
        <Link
          href="/slots/new"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 空車登録
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/slots?status=${tab.value}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm">{error.message}</p>}

      {slots.length === 0 ? (
        <p className="text-gray-500 text-sm">スロットがありません。</p>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => {
            const from = format(toZonedTime(new Date(slot.available_from), JST), 'M/d HH:mm', { locale: ja });
            const until = format(toZonedTime(new Date(slot.available_until), JST), 'M/d HH:mm', { locale: ja });
            return (
              <div
                key={slot.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="font-medium text-gray-800">
                      {slot.driver?.name ?? '—'} ／ {slot.vehicle?.plate_number ?? '—'} (
                      {slot.vehicle?.vehicle_type ?? '—'})
                    </p>
                    <p className="text-sm text-gray-500">
                      {slot.prefecture} ／ {from} 〜 {until} ／ 積載可能:{' '}
                      {slot.available_load_kg} kg
                    </p>
                    <p className="text-xs text-gray-400">
                      対応荷物:{' '}
                      {slot.cargo_types && slot.cargo_types.length > 0
                        ? slot.cargo_types.map((ct) => ct.name).join(', ')
                        : '指定なし'}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[slot.status]}`}
                  >
                    {STATUS_LABELS[slot.status]}
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
