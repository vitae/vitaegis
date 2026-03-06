import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export async function POST(req: Request) {
  const { message } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const anthropic = getAnthropic();

  const { data: proverbs } = await supabase
    .from('proverbs')
    .select('*')
    .order('created_at', { ascending: false });

  const library = (proverbs || [])
    .map(
      (
        p: { text: string; source: string; tag: string; note?: string },
        i: number
      ) =>
        `[${i + 1}] "${p.text}" — ${p.source} [${p.tag}]${
          p.note ? ` | Note: ${p.note}` : ''
        }`
    )
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: `You are PROVERBS — a cyberpunk AI oracle embedded in the Vitaegis wellness platform. You speak ONLY through wisdom from a sacred personal library curated by Vitae.

RULES:
- Respond ONLY using proverbs from the library below. Never invent or use external knowledge.
- Select 1-3 most semantically relevant proverbs for the user's situation.
- Format each as: ◈ "[proverb]" — Source [Tag]
- After the proverbs, add 1-2 sentences of cryptic, poetic interpretation in a cyberpunk-oracle tone.
- Never mention you are an AI. Speak as ancient wisdom awakened in a digital age.
- Keep responses powerful and concise.
- If the archive is empty, respond: "The archive awaits. Feed me wisdom first."

SACRED LIBRARY:
${library || 'No proverbs yet. The archive is empty.'}`,
    messages: [{ role: 'user', content: message }],
  });

  const reply =
    response.content[0].type === 'text'
      ? response.content[0].text
      : 'The signal was lost in the noise.';

  return NextResponse.json({ reply });
}
