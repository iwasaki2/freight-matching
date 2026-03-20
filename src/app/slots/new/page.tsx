'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Vehicle, User, CargoType } from '@/types';

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
  '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
  '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
  '熊本県','大分県','宮崎県','鹿児島県','沖縄県',
];

export default function NewSlotPage() {
  const router = useRouter();
  const supabase = createClient();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    vehicle_id: '',
    driver_id: '',
    prefecture: '',
    available_from: '',
    available_until: '',
    available_load_kg: '',
    note: '',
  });
  const [selectedCargo, setSelectedCargo] = useState<number[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('vehicles').select('*').eq('status', 'active'),
      supabase.from('users').select('*').eq('role', 'driver'),
      supabase.from('cargo_types').select('*'),
    ]).then(([v, d, c]) => {
      setVehicles((v.data ?? []) as Vehicle[]);
      setDrivers((d.data ?? []) as User[]);
      setCargoTypes((c.data ?? []) as CargoType[]);
    });
  }, [supabase]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function toggleCargo(id: number) {
    setSelectedCargo((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const toJst = (dt: string) => (dt ? `${dt}:00+09:00` : '');
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          available_from: toJst(form.available_from),
          available_until: toJst(form.available_until),
          available_load_kg: Number(form.available_load_kg),
          cargo_type_ids: selectedCargo,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'エラーが発生しました');
      }
      router.push('/slots');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">空車登録</h1>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <Field label="車両">
          <select name="vehicle_id" value={form.vehicle_id} onChange={handleChange} required className={selectCls}>
            <option value="">選択してください</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate_number} — {v.vehicle_type}</option>
            ))}
          </select>
        </Field>

        <Field label="ドライバー">
          <select name="driver_id" value={form.driver_id} onChange={handleChange} required className={selectCls}>
            <option value="">選択してください</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>

        <Field label="都道府県">
          <select name="prefecture" value={form.prefecture} onChange={handleChange} required className={selectCls}>
            <option value="">選択してください</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>

        <Field label="空車開始日時">
          <input type="datetime-local" name="available_from" value={form.available_from} onChange={handleChange} required className={inputCls} />
        </Field>

        <Field label="空車終了日時">
          <input type="datetime-local" name="available_until" value={form.available_until} onChange={handleChange} required className={inputCls} />
        </Field>

        <Field label="積載可能重量 (kg)">
          <input type="number" name="available_load_kg" value={form.available_load_kg} onChange={handleChange} required min={1} className={inputCls} />
        </Field>

        <Field label="対応可能な荷物種別">
          <div className="grid grid-cols-2 gap-2">
            {cargoTypes.map((ct) => (
              <label key={ct.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCargo.includes(ct.id)}
                  onChange={() => toggleCargo(ct.id)}
                  className="accent-blue-600"
                />
                {ct.icon} {ct.name}
              </label>
            ))}
          </div>
        </Field>

        <Field label="備考（任意）">
          <textarea name="note" value={form.note} onChange={handleChange} rows={3} className={inputCls} />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {submitting ? '登録中...' : '登録する'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';
const selectCls = inputCls;
