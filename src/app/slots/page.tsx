import { createServiceRoleClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { AvailableSlot, SlotStatus } from '@/types';
import { format, toZonedTime } from 'date-fns-tz';
import { ja } from 'date-fns/locale';

const JST = 'Asia/Tokyo';

const TABS: { label: string; value: SlotStatus | 'all' }[] = [
  { label: 'すべて',   value: 'all' },
  { label: '空車',     value: 'open' },
  { label: 'マッチ済', value: 'matched' },
  { label: '期限切れ', value: 'expired' },
  { label: 'クローズ', value: 'closed' },
];

const STATUS_LABEL: Record<SlotStatus, string> = {
  open: '空車', matched: 'マッチ済', expired: '期限切れ', closed: 'クローズ',
};
const STATUS_COLOR: Record<SlotStatus, { bg: string; text: string }> = {
  open:    { bg: '#064e3b', text: '#34d399' },
  matched: { bg: '#1e3a5f', text: '#60a5fa' },
  expired: { bg: '#1e293b', text: '#94a3b8' },
  closed:  { bg: '#3b0000', text: '#f87171' },
};

export default async function SlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeTab = status ?? 'all';
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('available_slots')
    .select('*, vehicle:vehicles(*), driver:users(*), cargo_types:slot_cargo_types(cargo_type:cargo_types(*))')
    .order('available_from', { ascending: true });
  if (activeTab !== 'all') query = query.eq('status', activeTab as SlotStatus);

  const { data, error } = await query;
  const slots: AvailableSlot[] = ((data ?? []) as Record<string, unknown>[]).map((s) => ({
    ...s,
    cargo_types: ((s.cargo_types as { cargo_type: unknown }[]) ?? []).map((r) => r.cargo_type),
  })) as AvailableSlot[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">空車管理</h1>
        <Link
          href="/slots/new"
          className="px-6 py-3 text-sm font-bold border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-slate-900 transition-colors"
        >
          ＋ 空車登録
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 overflow-x-auto" style={{ borderBottom: '1px solid #334155' }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/slots?status=${tab.value}`}
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
      {slots.length === 0 ? (
        <p className="text-base py-16 text-center" style={{ color: '#94a3b8', border: '1px solid #334155' }}>
          スロットがありません
        </p>
      ) : (
        <div style={{ border: '1px solid #334155' }}>
          {/* Header row */}
          <div
            className="hidden md:grid gap-4 px-4 py-2 text-xs font-bold uppercase tracking-wider"
            style={{
              gridTemplateColumns: '1fr 1fr 140px 80px 1fr',
              backgroundColor: '#1e293b',
              color: '#64748b',
              borderBottom: '1px solid #334155',
            }}
          >
            <span>ドライバー / 車両</span>
            <span>都道府県 / 日時</span>
            <span>積載可能</span>
            <span>ステータス</span>
            <span>対応荷物</span>
          </div>

          {slots.map((slot, i) => {
            const from  = format(toZonedTime(new Date(slot.available_from),  JST), 'M/d HH:mm', { locale: ja });
            const until = format(toZonedTime(new Date(slot.available_until), JST), 'M/d HH:mm', { locale: ja });
            const sc = STATUS_COLOR[slot.status];
            const last = i === slots.length - 1;
            return (
              <div
                key={slot.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_80px_1fr] gap-3 md:gap-4 px-4 py-4 hover:opacity-90"
                style={{ borderBottom: last ? 'none' : '1px solid #334155', backgroundColor: '#0f172a' }}
              >
                {/* Driver / Vehicle */}
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>ドライバー</p>
                  <p className="text-base font-semibold text-white">{slot.driver?.name ?? '—'}</p>
                  <p className="text-sm" style={{ color: '#94a3b8' }}>
                    {slot.vehicle?.plate_number ?? '—'} · {slot.vehicle?.vehicle_type ?? '—'}
                  </p>
                </div>

                {/* Prefecture / Time */}
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>場所 / 日時</p>
                  <p className="text-base font-semibold text-white">{slot.prefecture}</p>
                  <p className="text-sm tabular-nums" style={{ color: '#94a3b8' }}>{from} 〜 {until}</p>
                </div>

                {/* Load */}
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>積載</p>
                  <p className="text-base font-bold text-white tabular-nums">{slot.available_load_kg} <span className="text-sm font-normal" style={{ color: '#94a3b8' }}>kg</span></p>
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>状態</p>
                  <span className="text-xs font-bold px-2 py-1 inline-block" style={{ backgroundColor: sc.bg, color: sc.text }}>
                    {STATUS_LABEL[slot.status]}
                  </span>
                </div>

                {/* Cargo types */}
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1 md:hidden" style={{ color: '#64748b' }}>対応荷物</p>
                  {slot.cargo_types && slot.cargo_types.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {slot.cargo_types.map((ct) => (
                        <span key={ct.id} className="text-xs px-1.5 py-0.5" style={{ backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }}>
                          {ct.icon} {ct.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm" style={{ color: '#64748b' }}>指定なし</span>
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
