import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { adminAuthedRequest } from '@/lib/admin-auth';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: Request) {
  if (!adminAuthedRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const supabase = getSupabase();

  const { data: logs, error } = await supabase
    .from('oracle_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: logs || [] });
}
