import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('proverbs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ proverbs: data });
}

export async function POST(req: Request) {
  const supabase = getSupabase();
  const { text, source, tag, note } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('proverbs')
    .insert([
      {
        text: text.trim(),
        source: source?.trim() || '',
        tag: tag || 'Personal',
        note: note?.trim() || '',
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ proverb: data });
}
