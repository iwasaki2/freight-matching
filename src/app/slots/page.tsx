import { createServiceRoleClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { AvailableSlot, SlotStatus } from '@/types';
import { format, toZonedTime } from 'date-fns-tz';
import { ja } from 'date-fns/locale';

const JST = 'Asia/Tokyo';

const TABS: { label: string; value: SlotStatus | 'all'; icon: string }[] = [
  { label: 'すべて',   value: 'all',     icon: '📋' },
  { label: '空車',     value: 'open',    icon: '🟢' },
  { label: 'マッチ済', value: 'matched', icon: '🔵' },
  { label: '期限切れ', value: 'expired', icon: '⚪' },
  { label: 'クローズ', value: 'closed',  icon: '🔴' },
];

const STATUS_LABELS: Record<SlotStatus, string> = {
  open:    '空車',
  matched: 'マッチ済',
  expired: '期限切れ',
  closed:  'クローズ',
};

const STATUS_STYLES: Record<SlotStatus, string> = {
  open:    'bg-green-100 text-green-800 border border-green-200',
  matched: 'bg-blue-100 text-blue-800 border border-blue-200',
  expired: 'bg-slate-100 text-slate-500 border border-slate-200',
  closed:  'bg-red-100 text-red-700 border border-red-200',
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
    .select('*, vehicle:vehicles(*), driver:users(*), cargo_types:slot_cargo_types(cargo_type:cargo_types(*))')
    .order('available_from', { ascending: true });

  if (status && status !== 'all') query = query.eq('status', status as SlotStatus);

  const { data, error } = await query;
  const slots: AvailableSlot[] = ((data ?? []) as Record<string, unknown>[]).map((s) => ({
    ...s,
    cargo_types: ((s.cargo_types as { cargo_type: unknown }[]) ?? []).map((r) => r.cargo_type),
  })) as AvailableSlot[];

  const activeTab = status ?? 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">空車管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">登録中の空車スロット一覧</p>
        </div>
        <Link
          href="/slots/new"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
        >
          ＋ 空車を登録
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/slots?status=${tab.value}`}
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
      {slots.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">🚛</p>
          <p className="text-slate-600 font-medium">空車スロットがありません</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">空車を登録してマッチングを開始しましょう</p>
          <Link
            href="/slots/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            ＋ 空車を登録
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {slots.map((slot) => {
            const from  = format(toZonedTime(new Date(slot.available_from),  JST), 'M/d HH:mm', { locale: ja });
            const until = format(toZonedTime(new Date(slot.available_until), JST), 'M/d HH:mm', { locale: ja });
            return (
              <div key={slot.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Status bar */}
                <div className={`h-1 w-full ${slot.status === 'open' ? 'bg-green-500' : slot.status === 'matched' ? 'bg-blue-500' : 'bg-slate-300'}`} />

                <div className="p-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-800">{slot.driver?.name ?? '—'}</p>
                      <p className="text-sm text-slate-500">
                        {slot.vehicle?.plate_number ?? '—'} · {slot.vehicle?.vehicle_type ?? '—'}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[slot.status]}`}>
                      {STATUS_LABELS[slot.status]}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <InfoItem icon="📍" label="都道府県" value={slot.prefecture} />
                    <InfoItem icon="⚖️" label="積載可能" value={`${slot.available_load_kg} kg`} />
                    <InfoItem icon="🕐" label="開始" value={from} />
                    <InfoItem icon="🕔" label="終了" value={until} />
                  </div>

                  {/* Cargo types */}
                  {slot.cargo_types && slot.cargo_types.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {slot.cargo_types.map((ct) => (
                        <span key={ct.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {ct.icon} {ct.name}
                        </span>
                      ))}
                    </div>
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
        <p className="font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}
