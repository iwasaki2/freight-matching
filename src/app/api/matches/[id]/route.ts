import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { confirmMatch, cancelMatch } from '@/lib/matching';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { action, note } = await req.json();

  try {
    switch (action) {
      case 'confirm': {
        const match = await confirmMatch(id);
        return NextResponse.json(match);
      }

      case 'cancel': {
        const match = await cancelMatch(id);
        return NextResponse.json(match);
      }

      case 'in_progress':
      case 'complete': {
        const supabase = createServiceRoleClient();
        const newStatus = action === 'in_progress' ? 'in_progress' : 'completed';
        const extra = action === 'complete' ? { completed_at: new Date().toISOString() } : {};

        const { data, error } = await supabase
          .from('matches')
          .update({ status: newStatus, ...extra })
          .eq('id', id)
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        // Log operation
        if (note) {
          await supabase.from('operations').insert({ match_id: id, action, note });
        }

        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
