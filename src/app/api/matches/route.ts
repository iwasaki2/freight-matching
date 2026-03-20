import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createServiceRoleClient();
  const { searchParams } = req.nextUrl;

  let query = supabase
    .from('matches')
    .select(
      `*,
      slot:available_slots(*, vehicle:vehicles(*), driver:users(*)),
      shipment:shipments(*, shipper:shippers(*), cargo_type:cargo_types(*))`,
    )
    .order('created_at', { ascending: false });

  const status = searchParams.get('status');
  if (status) query = query.eq('status', status);

  const slotId = searchParams.get('slot_id');
  if (slotId) query = query.eq('slot_id', slotId);

  const shipmentId = searchParams.get('shipment_id');
  if (shipmentId) query = query.eq('shipment_id', shipmentId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
