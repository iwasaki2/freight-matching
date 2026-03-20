import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { findAndCreateMatches } from '@/lib/matching';
import { SlotFormInput } from '@/types';

export async function GET(req: NextRequest) {
  const supabase = createServiceRoleClient();
  const { searchParams } = req.nextUrl;

  let query = supabase
    .from('available_slots')
    .select(
      '*, vehicle:vehicles(*), driver:users(*), cargo_types:slot_cargo_types(cargo_type:cargo_types(*))',
    )
    .order('available_from', { ascending: true });

  const status = searchParams.get('status');
  if (status) query = query.eq('status', status);

  const prefecture = searchParams.get('prefecture');
  if (prefecture) query = query.eq('prefecture', prefecture);

  const driverId = searchParams.get('driver_id');
  if (driverId) query = query.eq('driver_id', driverId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServiceRoleClient();
  const body: SlotFormInput = await req.json();

  const { cargo_type_ids, ...slotData } = body;

  // Insert slot
  const { data: slot, error: slotErr } = await supabase
    .from('available_slots')
    .insert(slotData)
    .select()
    .single();

  if (slotErr) return NextResponse.json({ error: slotErr.message }, { status: 400 });

  // Insert cargo type associations
  if (cargo_type_ids && cargo_type_ids.length > 0) {
    const rows = cargo_type_ids.map((id) => ({ slot_id: slot.id, cargo_type_id: id }));
    const { error: ctErr } = await supabase.from('slot_cargo_types').insert(rows);
    if (ctErr) return NextResponse.json({ error: ctErr.message }, { status: 400 });
  }

  // Auto-match: find waiting shipments in same prefecture and try to match
  const { data: waitingShipments } = await supabase
    .from('shipments')
    .select('id')
    .eq('status', 'waiting')
    .eq('prefecture', slot.prefecture);

  const matchResults = await Promise.allSettled(
    (waitingShipments ?? []).map((s: { id: string }) => findAndCreateMatches(s.id)),
  );

  const newMatches = matchResults
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => (r as PromiseFulfilledResult<unknown[]>).value);

  return NextResponse.json({ slot, matches: newMatches }, { status: 201 });
}
