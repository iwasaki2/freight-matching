import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { findAndCreateMatches } from '@/lib/matching';
import { ShipmentFormInput } from '@/types';

export async function GET(req: NextRequest) {
  const supabase = createServiceRoleClient();
  const { searchParams } = req.nextUrl;

  let query = supabase
    .from('shipments')
    .select('*, shipper:shippers(*), cargo_type:cargo_types(*)')
    .order('pickup_time', { ascending: true });

  const status = searchParams.get('status');
  if (status) query = query.eq('status', status);

  const prefecture = searchParams.get('prefecture');
  if (prefecture) query = query.eq('prefecture', prefecture);

  const shipperId = searchParams.get('shipper_id');
  if (shipperId) query = query.eq('shipper_id', shipperId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServiceRoleClient();
  const body: ShipmentFormInput = await req.json();

  const { data: shipment, error } = await supabase
    .from('shipments')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Auto-match
  let matches: unknown[] = [];
  try {
    matches = await findAndCreateMatches(shipment.id);
  } catch {
    // Non-fatal — shipment is registered even if matching fails
  }

  return NextResponse.json({ shipment, matches }, { status: 201 });
}
