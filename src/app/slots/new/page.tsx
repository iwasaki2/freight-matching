'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Vehicle, User, CargoType } from '@/types';
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

export default function NewSlotPage() {
  const router = useRouter();
  const supabase = createClient();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
      setLoading(false);
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
      setSuccess(true);
      setTimeout(() => router.push('/slots'), 1200);
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
        <Link href="/slots" className="text-slate-400 hover:text-slate-600 transition-colors">
          ← 戻る
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">空車登録</h1>
          <p className="text-sm text-slate-500 mt-0.5">空きトラック情報を登録してマッチングを開始します</p>
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
          {/* Section: 車両・ドライバー */}
          <div className="p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">車両 / ドライバー</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="車両" required>
                <select name="vehicle_id" value={form.vehicle_id} onChange={handleChange} required className={selectCls}>
                  <option value="">選択してください</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.plate_number} — {v.vehicle_type}</option>
                  ))}
                </select>
                {vehicles.length === 0 && <p className="text-xs text-amber-600 mt-1">車両が登録されていません</p>}
              </Field>
              <Field label="ドライバー" required>
                <select name="driver_id" value={form.driver_id} onChange={handleChange} required className={selectCls}>
                  <option value="">選択してください</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {drivers.length === 0 && <p className="text-xs text-amber-600 mt-1">ドライバーが登録されていません</p>}
              </Field>
            </div>
          </div>

          {/* Section: 空き情報 */}
          <div className="p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">空き情報</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="都道府県" required>
                <select name="prefecture" value={form.prefecture} onChange={handleChange} required className={selectCls}>
                  <option value="">選択してください</option>
                  {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="積載可能重量 (kg)" required>
                <input type="number" name="available_load_kg" value={form.available_load_kg} onChange={handleChange} required min={1} placeholder="例: 2000" className={inputCls} />
              </Field>
              <Field label="空車開始日時" required>
                <input type="datetime-local" name="available_from" value={form.available_from} onChange={handleChange} required className={inputCls} />
              </Field>
              <Field label="空車終了日時" required>
                <input type="datetime-local" name="available_until" value={form.available_until} onChange={handleChange} required className={inputCls} />
              </Field>
            </div>
          </div>

          {/* Section: 荷物種別 */}
          <div className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">対応可能な荷物種別</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cargoTypes.map((ct) => (
                <label
                  key={ct.id}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCargo.includes(ct.id)
                      ? 'bg-blue-50 border-blue-400 text-blue-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCargo.includes(ct.id)}
                    onChange={() => toggleCargo(ct.id)}
                    className="accent-blue-600 w-4 h-4"
                  />
                  <span className="text-lg leading-none">{ct.icon}</span>
                  <span className="text-sm font-medium">{ct.name}</span>
                </label>
              ))}
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
              href="/slots"
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
