'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Shipper, CargoType } from '@/types';
import Link from 'next/link';

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
  '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
  '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
  '熊本県','大分県','宮崎県','鹿児島県','沖縄県',
];

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function NewShipmentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
      setLoading(false);
    });
  }, [supabase]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const pickupTimeJst = form.pickup_time ? `${form.pickup_time}:00+09:00` : '';
      const payload = {
        ...form,
        pickup_time: pickupTimeJst,
        cargo_type_id: Number(form.cargo_type_id),
        weight_kg: Number(form.weight_kg),
      };
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'エラーが発生しました');
      }
      setSuccess(true);
      setTimeout(() => router.push('/shipments'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/shipments" className="text-slate-400 hover:text-slate-600 transition-colors">
          ← 戻る
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">荷物登録</h1>
          <p className="text-sm text-slate-500 mt-0.5">配送依頼を登録してドライバーとマッチングします</p>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-800">
          <span className="text-xl">✅</span>
          <p className="font-semibold">登録完了！一覧ページへ移動します…</p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700">
          <span className="text-xl shrink-0">⚠️</span>
          <div>
            <p className="font-semibold">登録に失敗しました</p>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 flex items-center justify-center gap-3 text-slate-500">
          <Spinner /><span>読み込み中…</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
          {/* Section: 依頼情報 */}
          <div className="p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">依頼情報</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="荷主" required>
                <select name="shipper_id" value={form.shipper_id} onChange={handleChange} required className={selectCls}>
                  <option value="">選択してください</option>
                  {shippers.map((s) => (
                    <option key={s.id} value={s.id}>{s.company}</option>
                  ))}
                </select>
                {shippers.length === 0 && <p className="text-xs text-amber-600 mt-1">荷主が登録されていません</p>}
              </Field>
              <Field label="荷物種別" required>
                <select name="cargo_type_id" value={form.cargo_type_id} onChange={handleChange} required className={selectCls}>
                  <option value="">選択してください</option>
                  {cargoTypes.map((ct) => (
                    <option key={ct.id} value={ct.id}>{ct.icon} {ct.name}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Section: 配送情報 */}
          <div className="p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">配送情報</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="集荷都道府県" required>
                <select name="prefecture" value={form.prefecture} onChange={handleChange} required className={selectCls}>
                  <option value="">選択してください</option>
                  {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="集荷予定日時" required>
                <input type="datetime-local" name="pickup_time" value={form.pickup_time} onChange={handleChange} required className={inputCls} />
              </Field>
              <Field label="配送先" required>
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
              <Field label="重量 (kg)" required>
                <input
                  type="number"
                  name="weight_kg"
                  value={form.weight_kg}
                  onChange={handleChange}
                  required
                  min={1}
                  placeholder="例: 500"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* Section: 備考 */}
          <div className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">備考</h2>
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              rows={3}
              placeholder="特記事項があれば入力してください（任意）"
              className={inputCls}
            />
          </div>

          {/* Submit */}
          <div className="p-6 bg-slate-50 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={submitting || success}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {submitting ? <><Spinner />登録中…</> : '登録する'}
            </button>
            <Link
              href="/shipments"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-slate-100 transition-colors"
            >
              キャンセル
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors placeholder:text-slate-400';
const selectCls = inputCls;
