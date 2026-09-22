// Research desk: read a book, paper, video or article; keep the quotes worth quoting and
// the findings that keep showing up; collate a topic brief; hand it to the content
// pipeline as a note so the usual caption + carousel + review + publish path runs.

import { supabaseAdmin } from './supabase';
import { deleteFile, interactJson, uploadFile, waitForFile, type InteractionPart } from './google-ai';

const BUCKET = 'content';

/** What the channel is about. Sources and findings are tagged with these. */
export const TOPICS = [
  'energy',
  'mitochondria',
  'brainwaves',
  'meditation',
  'fitness',
  'recipes',
  'travel',
  'gear',
] as const;
export type Topic = (typeof TOPICS)[number];

export type SourceKind = 'pdf' | 'youtube' | 'url' | 'text';

export interface ResearchSource {
  id: string;
  kind: SourceKind;
  title: string | null;
  author: string | null;
  url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  note: string;
  topics: string[];
  status: string;
  summary: string | null;
}

export interface Extraction {
  title: string;
  author: string;
  summary: string;
  quotes: { text: string; location: string; topic: string; why: string }[];
  findings: { claim: string; evidence: string; location: string; topic: string; strength: 'strong' | 'moderate' | 'weak' }[];
}

export interface Brief {
  title: string;
  hook: string;
  summary: string;
  keyFindings: { claim: string; recurrence: number; sources: string[]; evidence: string }[];
  quotes: { text: string; author: string; source: string; location: string }[];
  takeaway: string;
}

function db() {
  const client = supabaseAdmin();
  if (!client) throw new Error('Supabase is not configured');
  return client;
}

const topicList = TOPICS.join(', ');

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    author: { type: 'string' },
    summary: { type: 'string', description: 'Three sentences on what this source argues and who it is for.' },
    quotes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Verbatim, exactly as written or spoken. Never paraphrase.' },
          location: { type: 'string', description: 'Page or chapter for documents, MM:SS for video.' },
          topic: { type: 'string', enum: [...TOPICS] },
          why: { type: 'string', description: 'One line on why this quote lands.' },
        },
        required: ['text', 'location', 'topic', 'why'],
      },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claim: { type: 'string', description: 'One sentence, plain, specific, no hedging words.' },
          evidence: { type: 'string', description: 'The study, mechanism, sample size, dose or numbers behind it.' },
          location: { type: 'string' },
          topic: { type: 'string', enum: [...TOPICS] },
          strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
        },
        required: ['claim', 'evidence', 'location', 'topic', 'strength'],
      },
    },
  },
  required: ['title', 'author', 'summary', 'quotes', 'findings'],
};

const EXTRACTION_PROMPT = (source: ResearchSource) => `You are the research editor for VITAEGIS, a health and wellness channel about maximizing human energy: mitochondria, brainwaves, meditation, fitness, recipes, travel, and camping and hiking gear.

Read this source end to end and pull out two things.

1. QUOTES: the 8 to 20 most pertinent lines, verbatim. Standalone wisdom or a sharp statement of a finding. Under 40 words each. Exact wording only; if you cannot quote it exactly, leave it out. Give the page, chapter or timestamp.

2. FINDINGS: every distinct scientific or practical finding the source makes about the topics above. One plain sentence per claim, then the evidence behind it (study type, population, sample size, dose, effect size, mechanism) and how strong it is. Skip anecdotes and marketing. 5 to 25 findings.

Tag each item with one topic from: ${topicList}.
${source.note ? `\nWhat I am looking for in particular: ${source.note}` : ''}
${source.title ? `\nKnown title: ${source.title}` : ''}${source.author ? `\nKnown author: ${source.author}` : ''}`;

const YT = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\//i;
export const isYouTube = (url: string) => YT.test(url.trim());

/** Fetch an article and reduce it to readable text so the model reads the piece, not the chrome. */
async function fetchArticle(url: string): Promise<{ text: string; pdf?: Buffer }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VitaegisResearch/1.0)', Accept: 'text/html,application/pdf,*/*' },
    redirect: 'follow',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Could not fetch ${url}: ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (type.includes('application/pdf')) return { text: '', pdf: Buffer.from(await res.arrayBuffer()) };
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|br|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
  if (text.length < 200) throw new Error('The page had no readable text (paywall or script-rendered)');
  return { text: text.slice(0, 400_000) };
}

/** Build the model input for one source. Uploaded files go through the Files API; YouTube goes by URL. */
async function partsFor(source: ResearchSource): Promise<{ parts: InteractionPart[]; cleanup: () => Promise<void> }> {
  const noop = async () => {};
  if (source.kind === 'youtube') {
    if (!source.url) throw new Error('YouTube source has no URL');
    return { parts: [{ type: 'video', uri: source.url, processing: 'agentic' }], cleanup: noop };
  }
  if (source.kind === 'text') {
    return { parts: [{ type: 'text', text: `SOURCE TEXT:\n\n${source.note}` }], cleanup: noop };
  }

  let bytes: Buffer | undefined;
  let mimeType = source.mime_type ?? 'application/pdf';
  if (source.kind === 'pdf') {
    if (!source.storage_path) throw new Error('PDF source has no file');
    const { data, error } = await db().storage.from(BUCKET).download(source.storage_path);
    if (error || !data) throw new Error(error?.message ?? 'Could not read the uploaded file');
    bytes = Buffer.from(await data.arrayBuffer());
    mimeType = data.type || mimeType;
  } else {
    if (!source.url) throw new Error('URL source has no URL');
    const fetched = await fetchArticle(source.url);
    if (!fetched.pdf) {
      return { parts: [{ type: 'text', text: `ARTICLE (${source.url}):\n\n${fetched.text}` }], cleanup: noop };
    }
    bytes = fetched.pdf;
    mimeType = 'application/pdf';
  }

  if (bytes.byteLength > 50 * 1024 * 1024) throw new Error('PDFs are capped at 50 MB by Gemini; split the book');
  const uploaded = await waitForFile(await uploadFile(bytes, mimeType, source.title || source.url || 'source'));
  return {
    parts: [{ type: 'document', uri: uploaded.uri, mime_type: uploaded.mimeType }],
    cleanup: () => deleteFile(uploaded.name),
  };
}

/** Stage: read one source and store its quotes and findings. */
export async function extractSource(sourceId: string) {
  const { data: source, error } = await db().from('research_sources').select('*').eq('id', sourceId).single();
  if (error || !source) throw new Error('Source row is gone');
  await db().from('research_sources').update({ status: 'extracting', updated_at: new Date().toISOString() }).eq('id', sourceId);

  const { parts, cleanup } = await partsFor(source as ResearchSource);
  let result: Extraction;
  try {
    result = await interactJson<Extraction>(
      [...parts, { type: 'text', text: EXTRACTION_PROMPT(source as ResearchSource) }],
      EXTRACTION_SCHEMA,
      { temperature: 0.2 },
    );
  } finally {
    await cleanup();
  }

  // Re-runs replace rather than duplicate.
  await db().from('research_findings').delete().eq('source_id', sourceId);
  const rows = [
    ...result.quotes.map((q) => ({
      source_id: sourceId,
      kind: 'quote',
      text: q.text.trim(),
      evidence: q.why,
      location: q.location,
      topic: q.topic,
      strength: null,
    })),
    ...result.findings.map((f) => ({
      source_id: sourceId,
      kind: 'finding',
      text: f.claim.trim(),
      evidence: f.evidence,
      location: f.location,
      topic: f.topic,
      strength: f.strength,
    })),
  ].filter((r) => r.text.length > 0);
  if (rows.length) {
    const { error: insErr } = await db().from('research_findings').insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  await db()
    .from('research_sources')
    .update({
      status: 'done',
      title: source.title || result.title || null,
      author: source.author || result.author || null,
      summary: result.summary,
      findings_count: rows.length,
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId);
}

const BRIEF_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Under 60 characters. A claim, not a label.' },
    hook: { type: 'string', description: 'One line that earns the next slide.' },
    summary: { type: 'string', description: 'Under 120 words. The state of the evidence on this topic across the sources.' },
    keyFindings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          recurrence: { type: 'integer', description: 'How many distinct sources support this claim.' },
          sources: { type: 'array', items: { type: 'string' }, description: 'Source titles.' },
          evidence: { type: 'string', description: 'The strongest evidence in one line: numbers where they exist.' },
        },
        required: ['claim', 'recurrence', 'sources', 'evidence'],
      },
    },
    quotes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          author: { type: 'string' },
          source: { type: 'string' },
          location: { type: 'string' },
        },
        required: ['text', 'author', 'source', 'location'],
      },
    },
    takeaway: { type: 'string', description: 'One practical thing to do this week.' },
  },
  required: ['title', 'hook', 'summary', 'keyFindings', 'quotes', 'takeaway'],
};

/** Stage: collate every finding on a topic into a brief, ranking what recurs across sources. */
export async function buildBrief(briefId: string) {
  const { data: brief, error } = await db().from('research_briefs').select('*').eq('id', briefId).single();
  if (error || !brief) throw new Error('Brief row is gone');

  let q = db()
    .from('research_findings')
    .select('kind, text, evidence, location, topic, strength, source:research_sources(id, title, author, kind, url)')
    .eq('topic', brief.topic);
  const ids: string[] = brief.source_ids ?? [];
  if (ids.length) q = q.in('source_id', ids);
  const { data: findings, error: fErr } = await q.limit(400);
  if (fErr) throw new Error(fErr.message);
  if (!findings?.length) throw new Error(`No findings tagged "${brief.topic}" yet. Extract some sources first.`);

  type Row = {
    kind: string;
    text: string;
    evidence: string | null;
    location: string | null;
    strength: string | null;
    source: { id: string; title: string | null; author: string | null; kind: string; url: string | null } | null;
  };
  const rows = findings as unknown as Row[];
  const name = (s: Row['source']) => s?.title || s?.url || 'Untitled source';
  const material = rows
    .map((r) =>
      r.kind === 'quote'
        ? `QUOTE | ${name(r.source)} | ${r.source?.author ?? ''} | ${r.location ?? ''}\n"${r.text}"`
        : `FINDING | ${name(r.source)} | ${r.location ?? ''} | ${r.strength ?? ''}\n${r.text}\nEvidence: ${r.evidence ?? ''}`,
    )
    .join('\n\n');
  const sourceCount = new Set(rows.map((r) => r.source?.id)).size;

  const result = await interactJson<Brief>(
    [
      {
        type: 'text',
        text: `You are the research editor for VITAEGIS (Health, Stealth, Wealth): calm, precise, a little cyberpunk, never hype.

Below are quotes and findings on the topic "${brief.topic}", extracted from ${sourceCount} sources. Collate them into one succinct brief.

- keyFindings: merge findings that say the same thing, count how many distinct sources back each one, and rank by recurrence then strength. Keep 3 to 6. Lead with numbers where the evidence has them.
- quotes: the 3 to 5 best verbatim quotes. Do not edit the wording.
- Contradictions between sources are worth a sentence in the summary.
- Write for a smart reader in a hurry.

MATERIAL:

${material}`,
      },
    ],
    BRIEF_SCHEMA,
    { temperature: 0.3 },
  );

  await db()
    .from('research_briefs')
    .update({
      title: result.title,
      hook: result.hook,
      summary: result.summary,
      key_findings: result.keyFindings,
      quotes: result.quotes,
      takeaway: result.takeaway,
      status: 'ready',
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', briefId);
}

/**
 * Turn a ready brief into the note the caption stage reads. The word "carousel" is what
 * makes runCaption pick the branded slide deck over a clip.
 */
export function briefNote(brief: {
  topic: string;
  title: string | null;
  hook: string | null;
  summary: string | null;
  key_findings: Brief['keyFindings'] | null;
  quotes: Brief['quotes'] | null;
}) {
  const findings = (brief.key_findings ?? [])
    .map((f, i) => `${i + 1}. ${f.claim} (${f.recurrence} source${f.recurrence === 1 ? '' : 's'}; ${f.evidence})`)
    .join('\n');
  const quotes = (brief.quotes ?? []).map((q) => `"${q.text}" — ${q.author || q.source}`).join('\n');
  return `Format: carousel. Research brief on ${brief.topic}.

Title: ${brief.title ?? ''}
Hook: ${brief.hook ?? ''}

${brief.summary ?? ''}

Key findings (ranked by how many sources agree):
${findings}

Quotes to use verbatim:
${quotes}

Slides: slide 1 the hook, slides 2-3 the top findings with their numbers, slide 4 the best quote as the takeaway. Cite the source names in small type.`;
}
