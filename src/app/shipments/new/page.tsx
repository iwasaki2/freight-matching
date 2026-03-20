'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Shipper, CargoType } from '@/types';

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
  '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
  '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
  '熊本県','大分県','宮崎県','鹿児島県','沖縄県',
];

export default function NewShipmentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    shipper_id: '',
    cargo_type_id: '',
    prefecture: '',
    pickup_time: '',
    weight_kg: '',
    destination: '',
    note: '',
  });

  useEffect(() => {
    Promise.all([
      supabase.from('shippers').select('*'),
      supabase.from('cargo_types').select('*'),
    ]).then(([s, c]) => {
      setShippers((s.data ?? []) as Shipper[]);
      setCargoTypes((c.data ?? []) as CargoType[]);
    });
  }, [supabase]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      // datetime-local の値はTZなし文字列なのでJST (+09:00) として解釈させる
      const pickupTimeJst = form.pickup_time ? `${form.pickup_time}:00+09:00` : '';
      const payload = {
        ...form,
        pickup_time: pickupTimeJst,
        cargo_type_id: Number(form.cargo_type_id),
        weight_kg: Number(form.weight_kg),
      };
      console.log('[shipments/new] POST /api/shipments', payload);
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'エラーが発生しました');
      }
      router.push('/shipments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">荷物登録</h1>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">{error}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
      >
        <Field label="荷主">
          <select
            name="shipper_id"
            value={form.shipper_id}
            onChange={handleChange}
            required
            className={selectCls}
          >
            <option value="">選択してください</option>
            {shippers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.company}
              </option>
            ))}
          </select>
        </Field>

        <Field label="荷物種別">
          <select
            name="cargo_type_id"
            value={form.cargo_type_id}
            onChange={handleChange}
            required
            className={selectCls}
          >
            <option value="">選択してください</option>
            {cargoTypes.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.icon} {ct.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="集荷都道府県">
          <select
            name="prefecture"
            value={form.prefecture}
            onChange={handleChange}
            required
            className={selectCls}
          >
            <option value="">選択してください</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>

        <Field label="集荷予定日時">
          <input
            type="datetime-local"
            name="pickup_time"
            value={form.pickup_time}
            onChange={handleChange}
            required
            className={inputCls}
          />
        </Field>

        <Field label="重量 (kg)">
          <input
            type="number"
            name="weight_kg"
            value={form.weight_kg}
            onChange={handleChange}
            required
            min={1}
            className={inputCls}
          />
        </Field>

        <Field label="配送先">
          <input
            type="text"
            name="destination"
            value={form.destination}
            onChange={handleChange}
            required
            placeholder="例：大阪府大阪市北区"
            className={inputCls}
          />
        </Field>

        <Field label="備考（任意）">
          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            rows={3}
            className={inputCls}
          />
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

const inputCls =
  'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';
const selectCls = inputCls;
