import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export async function POST(req: Request) {
  const { pdfBase64, bookTitle, defaultTag } = await req.json();

  if (!pdfBase64) {
    return NextResponse.json({ error: 'PDF data is required' }, { status: 400 });
  }

  const anthropic = getAnthropic();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: `You are extracting powerful quotes, proverbs, and wisdom from this book for a personal oracle archive.

Extract the 15-25 most powerful, memorable, and standalone quotes or passages from this PDF.

Rules:
- Only extract quotes that work as standalone wisdom — no context required
- Prefer short, punchy lines (under 30 words ideally)
- Skip chapter summaries, table of contents, footnotes, or generic text
- Each quote must be exactly as written in the book

Respond ONLY with a JSON array. No preamble, no markdown, no backticks. Just raw JSON like this:
[
  { "text": "The quote here", "source": "${bookTitle || 'Unknown'}", "tag": "${defaultTag || 'Ancient'}" },
  { "text": "Another quote", "source": "${bookTitle || 'Unknown'}", "tag": "${defaultTag || 'Ancient'}" }
]`,
          },
        ],
      },
    ],
  });

  const raw =
    response.content[0].type === 'text' ? response.content[0].text : '[]';

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const quotes = JSON.parse(cleaned);
    return NextResponse.json({ quotes });
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse quotes from PDF', raw },
      { status: 500 }
    );
  }
}
