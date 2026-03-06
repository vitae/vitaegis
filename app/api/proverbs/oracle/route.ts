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

async function logConsultation(
  supabase: ReturnType<typeof getSupabase>,
  question: string,
  reply: string | null,
  error: string | null
) {
  try {
    await supabase.from('oracle_logs').insert({
      question,
      reply,
      error,
    });
  } catch {
    // Logging should never block the response
  }
}

export const maxDuration = 30;

export async function POST(req: Request) {
  const { message } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const anthropic = getAnthropic();

  try {
    const { data: proverbs, error: dbError } = await supabase
      .from('proverbs')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) {
      await logConsultation(supabase, message, null, `Supabase error: ${dbError.message}`);
      return NextResponse.json(
        { reply: 'ARCHIVE OFFLINE. The vaults are sealed — try again shortly.' },
        { status: 200 }
      );
    }

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

    await logConsultation(supabase, message, reply, null);

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await logConsultation(supabase, message, null, errorMessage);
    return NextResponse.json(
      { reply: 'TRANSMISSION FAILED. The oracle could not decode the signal — try again.' },
      { status: 200 }
    );
  }
}
