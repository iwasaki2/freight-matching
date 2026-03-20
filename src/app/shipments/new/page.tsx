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
    <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

const inputCls = 'w-full px-3 py-2.5 text-base text-white bg-transparent focus:outline-none focus:ring-0 placeholder:text-slate-600';
const wrapCls = 'border border-slate-600 focus-within:border-amber-500 transition-colors';
const selectCls = `${inputCls} appearance-none`;

export default function NewShipmentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [shippers, setShippers]     = useState<Shipper[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);

  const [form, setForm] = useState({
    shipper_id: '', cargo_type_id: '', prefecture: '',
    pickup_time: '', weight_kg: '', destination: '', note: '',
  });

  useEffect(() => {
    Promise.all([
      supabase.from('shippers').select('*'),
      supabase.from('cargo_types').select('*'),
    ]).then(([s, c]) => {
      setShippers((s.data ?? []) as Shipper[]);
      setCargoTypes((c.data ?? []) as CargoType[]);
      setDataLoading(false);
    });
  }, [supabase]);

  function set(name: string, value: string) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const pickupTimeJst = form.pickup_time ? `${form.pickup_time}:00+09:00` : '';
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          pickup_time: pickupTimeJst,
          cargo_type_id: Number(form.cargo_type_id),
          weight_kg: Number(form.weight_kg),
        }),
      });
      if (!res.ok) { const b = await res.json(); throw new Error(b.error ?? 'エラー'); }
      setSuccess(true);
      setTimeout(() => router.push('/shipments'), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
        <Spinner /><span>読み込み中…</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-4" style={{ borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
        <Link href="/shipments" className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}>
          ← 荷物一覧
        </Link>
        <h1 className="text-2xl font-bold text-white">荷物登録</h1>
      </div>

      {/* Feedback */}
      {success && (
        <div className="px-4 py-3 text-sm font-bold" style={{ backgroundColor: '#064e3b', color: '#34d399', border: '1px solid #065f46' }}>
          ✓ 登録完了。一覧へ移動します…
        </div>
      )}
      {error && (
        <div className="px-4 py-3 text-sm" style={{ backgroundColor: '#1c0a0a', color: '#f87171', border: '1px solid #7f1d1d' }}>
          ⚠ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-0" style={{ border: '1px solid #334155' }}>

        {/* ── 依頼情報 ── */}
        <Section title="依頼情報">
          <Row label="荷主" required>
            <div className={wrapCls}>
              <select name="shipper_id" value={form.shipper_id} onChange={(e) => set('shipper_id', e.target.value)} required className={selectCls} style={{ backgroundColor: '#0f172a' }}>
                <option value="">選択してください</option>
                {shippers.map((s) => <option key={s.id} value={s.id}>{s.company}</option>)}
              </select>
            </div>
          </Row>
          <Row label="荷物種別" required>
            <div className={wrapCls}>
              <select name="cargo_type_id" value={form.cargo_type_id} onChange={(e) => set('cargo_type_id', e.target.value)} required className={selectCls} style={{ backgroundColor: '#0f172a' }}>
                <option value="">選択してください</option>
                {cargoTypes.map((ct) => <option key={ct.id} value={ct.id}>{ct.icon} {ct.name}</option>)}
              </select>
            </div>
          </Row>
        </Section>

        {/* ── 配送情報 ── */}
        <Section title="配送情報">
          <Row label="集荷都道府県" required>
            <div className={wrapCls}>
              <select name="prefecture" value={form.prefecture} onChange={(e) => set('prefecture', e.target.value)} required className={selectCls} style={{ backgroundColor: '#0f172a' }}>
                <option value="">選択してください</option>
                {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </Row>
          <Row label="集荷予定日時" required>
            <div className={wrapCls}>
              <input type="datetime-local" value={form.pickup_time} onChange={(e) => set('pickup_time', e.target.value)} required className={inputCls} />
            </div>
          </Row>
          <Row label="配送先" required>
            <div className={wrapCls}>
              <input type="text" value={form.destination} onChange={(e) => set('destination', e.target.value)} required placeholder="例：大阪府大阪市北区" className={inputCls} />
            </div>
          </Row>
          <Row label="重量 (kg)" required>
            <div className={wrapCls}>
              <input type="number" value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} required min={1} placeholder="例: 500" className={inputCls} />
            </div>
          </Row>
        </Section>

        {/* ── 備考 ── */}
        <Section title="備考（任意）">
          <div className="px-4 py-3">
            <div className={wrapCls}>
              <textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={3} placeholder="特記事項があれば入力（任意）" className={inputCls} />
            </div>
          </div>
        </Section>

        {/* Submit */}
        <div className="flex gap-3 px-4 py-4" style={{ backgroundColor: '#1e293b', borderTop: '1px solid #334155' }}>
          <button
            type="submit"
            disabled={submitting || success}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 text-base font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-slate-900"
          >
            {submitting && <Spinner />}
            {submitting ? '登録中…' : '登録する'}
          </button>
          <Link href="/shipments" className="px-6 py-3 text-sm font-medium transition-colors text-center" style={{ border: '1px solid #475569', color: '#94a3b8' }}>
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid #334155' }}>
      <div className="px-4 py-2" style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-center" style={{ borderBottom: '1px solid #1e293b' }}>
      <div className="px-4 py-3 self-stretch flex items-center" style={{ backgroundColor: '#131e2e', borderRight: '1px solid #334155' }}>
        <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
          {label}
          {required && <span style={{ color: '#f59e0b' }} className="ml-1">*</span>}
        </span>
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}
