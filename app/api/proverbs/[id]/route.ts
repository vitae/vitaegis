import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { adminAuthedRequest } from '@/lib/admin-auth';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminAuthedRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const supabase = getSupabase();

  const { error } = await supabase.from('proverbs').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
