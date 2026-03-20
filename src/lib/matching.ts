import { createServiceRoleClient } from './supabase/server';
import { Match, AvailableSlot, Shipment } from '@/types';
import { addMinutes, subMinutes } from 'date-fns';

const MATCH_WINDOW_MINUTES = 30;
const TOP_MATCHES = 3;

/**
 * Score a slot against a shipment (higher = better).
 * Criteria:
 *  - Time proximity  (0–50): how close available_from is to pickup_time
 *  - Load margin     (0–30): (available_load_kg - weight_kg) / weight_kg
 *  - Cargo type exact (20):  bonus when slot explicitly accepts the cargo type
 */
function scoreSlot(slot: AvailableSlot, shipment: Shipment): number {
  const pickupMs = new Date(shipment.pickup_time).getTime();
  const fromMs = new Date(slot.available_from).getTime();
  const diffMin = Math.abs(pickupMs - fromMs) / 60_000;
  const timePart = Math.max(0, 50 - (diffMin / MATCH_WINDOW_MINUTES) * 50);

  const margin = (slot.available_load_kg - shipment.weight_kg) / shipment.weight_kg;
  const loadPart = Math.min(30, Math.max(0, margin * 30));

  const hasCargoType = slot.cargo_types?.some((ct) => ct.id === shipment.cargo_type_id) ?? false;
  const cargoPart = hasCargoType ? 20 : 0;

  return timePart + loadPart + cargoPart;
}

export async function findAndCreateMatches(shipmentId: string): Promise<Match[]> {
  console.log('[matching] findAndCreateMatches called:', shipmentId);
  const supabase = createServiceRoleClient();

  // Fetch shipment
  const { data: shipment, error: shipmentErr } = await supabase
    .from('shipments')
    .select('*, cargo_type:cargo_types(*)')
    .eq('id', shipmentId)
    .single();

  if (shipmentErr || !shipment) {
    console.error('[matching] Shipment fetch error:', shipmentErr?.message);
    throw new Error(`Shipment not found: ${shipmentId}`);
  }
  console.log('[matching] Shipment:', {
    id: shipment.id,
    prefecture: shipment.prefecture,
    pickup_time: shipment.pickup_time,
    weight_kg: shipment.weight_kg,
    cargo_type_id: shipment.cargo_type_id,
  });

  const pickupTime = new Date(shipment.pickup_time);
  const windowStart = subMinutes(pickupTime, MATCH_WINDOW_MINUTES).toISOString();
  const windowEnd = addMinutes(pickupTime, MATCH_WINDOW_MINUTES).toISOString();
  console.log('[matching] Time window:', { windowStart, windowEnd });

  // Fetch candidate slots
  const { data: slots, error: slotsErr } = await supabase
    .from('available_slots')
    .select('*, vehicle:vehicles(*), driver:users(*), cargo_types:slot_cargo_types(cargo_type:cargo_types(*))')
    .eq('status', 'open')
    .eq('prefecture', shipment.prefecture)
    .gte('available_load_kg', shipment.weight_kg)
    .gte('available_from', windowStart)
    .lte('available_from', windowEnd);

  if (slotsErr) {
    console.error('[matching] Slot query error:', slotsErr.message);
    throw new Error(`Slot query failed: ${slotsErr.message}`);
  }
  console.log(`[matching] Candidate slots found: ${slots?.length ?? 0}`);
  console.log('[matching] Raw slots:', JSON.stringify(slots, null, 2));

  if (!slots || slots.length === 0) return [];

  // Normalize cargo_types nested structure from join
  const normalizedSlots: AvailableSlot[] = slots.map((s: Record<string, unknown>) => ({
    ...s,
    cargo_types: ((s.cargo_types as { cargo_type: unknown }[]) ?? []).map((r) => r.cargo_type),
  })) as AvailableSlot[];

  // Score and sort
  const scored = normalizedSlots
    .map((slot) => ({ slot, score: scoreSlot(slot, shipment as Shipment) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_MATCHES);

  console.log('[matching] Scores:', scored.map(({ slot, score }) => ({
    slot_id: slot.id,
    driver: slot.driver?.name,
    score,
  })));

  // Insert pending matches
  const inserts = scored.map(({ slot, score }) => ({
    slot_id: slot.id,
    shipment_id: shipmentId,
    score,
    status: 'pending' as const,
  }));

  const { data: created, error: insertErr } = await supabase
    .from('matches')
    .insert(inserts)
    .select();

  if (insertErr) {
    console.error('[matching] Match insert error:', insertErr.message);
    throw new Error(`Match insert failed: ${insertErr.message}`);
  }
  console.log(`[matching] Matches created: ${created?.length ?? 0}`);
  return created as Match[];
}

export async function confirmMatch(matchId: string): Promise<Match> {
  const supabase = createServiceRoleClient();

  // Fetch match to get slot/shipment ids
  const { data: match, error: fetchErr } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (fetchErr || !match) throw new Error(`Match not found: ${matchId}`);

  // Confirm this match
  const { data: confirmed, error: confirmErr } = await supabase
    .from('matches')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', matchId)
    .select()
    .single();

  if (confirmErr) throw new Error(`Confirm failed: ${confirmErr.message}`);

  // Cancel other pending matches for same shipment or slot
  await supabase
    .from('matches')
    .update({ status: 'cancelled' })
    .neq('id', matchId)
    .eq('status', 'pending')
    .or(`shipment_id.eq.${match.shipment_id},slot_id.eq.${match.slot_id}`);

  // Update shipment and slot status
  await Promise.all([
    supabase.from('shipments').update({ status: 'matched' }).eq('id', match.shipment_id),
    supabase.from('available_slots').update({ status: 'matched' }).eq('id', match.slot_id),
  ]);

  return confirmed as Match;
}

export async function cancelMatch(matchId: string): Promise<Match> {
  const supabase = createServiceRoleClient();

  const { data: match, error: fetchErr } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (fetchErr || !match) throw new Error(`Match not found: ${matchId}`);

  const { data: cancelled, error: cancelErr } = await supabase
    .from('matches')
    .update({ status: 'cancelled' })
    .eq('id', matchId)
    .select()
    .single();

  if (cancelErr) throw new Error(`Cancel failed: ${cancelErr.message}`);

  // Restore slot/shipment to open/waiting
  await Promise.all([
    supabase.from('available_slots').update({ status: 'open' }).eq('id', match.slot_id),
    supabase.from('shipments').update({ status: 'waiting' }).eq('id', match.shipment_id),
  ]);

  // Trigger re-matching
  await findAndCreateMatches(match.shipment_id);

  return cancelled as Match;
}
