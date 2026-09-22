// Google AI helpers: Gemini text, Nano Banana Pro images, Veo video.
// Verified against ai.google.dev/gemini-api/docs (text, image-generation, veo).
// Model ids move fast, so every one is overridable by env. Checked against the live
// models list on 2026-09-20: gemini-2.0-flash and gemini-2.5-flash are both retired.
// Cheaper video options if Veo cost bites: veo-3.1-fast-generate-preview, veo-3.1-lite-generate-preview.

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash';
/** Long-context reading model for books, papers and full videos. */
export const RESEARCH_MODEL = process.env.GEMINI_RESEARCH_MODEL || 'gemini-3.8-flash';
export const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image';
export const VIDEO_MODEL = process.env.GEMINI_VIDEO_MODEL || 'veo-3.1-generate-preview';

export const googleAiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

function key() {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error('GEMINI_API_KEY is not set');
  return k;
}

async function call(path: string, body: unknown, method: 'POST' | 'GET' = 'POST') {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'x-goog-api-key': key(), 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Gemini ${path} failed: ${res.status} ${(await res.text()).slice(0, 500)}`);
  return res.json();
}

interface Part { text?: string; inlineData?: { mimeType: string; data: string } }

/** A source item the model should look at: the captured photo, clip, or voice note. */
export interface Source { mimeType: string; base64: string }

// ── text ────────────────────────────────────────────────────────────────────

export interface CaptionSet {
  default: string;
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
  twitter: string;
  imagePrompt: string;
  videoPrompt: string;
  slidePrompts: string[];
}

const CAPTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    default: { type: 'STRING' },
    instagram: { type: 'STRING' },
    facebook: { type: 'STRING' },
    youtube: { type: 'STRING' },
    tiktok: { type: 'STRING' },
    twitter: { type: 'STRING' },
    imagePrompt: { type: 'STRING' },
    videoPrompt: { type: 'STRING' },
    slidePrompts: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'default', 'instagram', 'facebook', 'youtube', 'tiktok', 'twitter',
    'imagePrompt', 'videoPrompt', 'slidePrompts',
  ],
};

const BRAND = `You write for VITAEGIS, a wellness brand whose line is "Health, Stealth, Wealth".
Voice: calm, precise, a little cyberpunk. Ancient practice meets modern technology.
Never hype, never emoji spam, never hashtag walls. At most three hashtags, and only where they earn their place.
Visual identity: black, white, red and neon green #00FF41, Matrix rain, glassmorphic panels, Jost type.`;

/** Turn one captured item into per-platform copy plus prompts for the image and video models. */
export async function writeCaptions(note: string, source?: Source): Promise<CaptionSet> {
  const parts: Part[] = [];
  if (source) parts.push({ inlineData: { mimeType: source.mimeType, data: source.base64 } });
  parts.push({
    text: `${BRAND}

Here is something I captured today. Note from me: ${note || '(none)'}

Write social copy about it. Rules per platform:
- instagram: up to 4 short lines, at most 3 hashtags.
- facebook: 2 to 3 sentences, conversational, no hashtags.
- youtube: a Shorts title under 70 characters, then a blank line, then 2 sentences of description.
- tiktok: one punchy line, at most 2 hashtags.
- twitter: under 260 characters, no hashtags.
- default: a neutral version for anywhere else.
Also write prompts for the media models:
- videoPrompt: the main one. A prompt for a video model for a 6 to 8 second vertical 9:16 clip on this subject. Describe the camera move, the lighting, the palette and the sound. Make it something worth watching on its own, not a slideshow.
- imagePrompt: a prompt for an image model to make a single branded still on this subject, naming the palette and the glassmorphic Matrix look.
- slidePrompts: exactly 4 prompts for a square 1:1 Instagram carousel that teaches this subject across four slides, in order. Slide 1 is the hook, slides 2 and 3 carry the substance, slide 4 is the takeaway. Each prompt must name the exact short text to render on that slide, keep the same palette and layout across all four so they read as one deck, and stay legible at thumbnail size.`,
  });

  const json = await call(`/models/${TEXT_MODEL}:generateContent`, {
    contents: [{ parts }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: CAPTION_SCHEMA, temperature: 0.8 },
  });
  const text = json?.candidates?.[0]?.content?.parts?.map((p: Part) => p.text ?? '').join('') ?? '';
  return JSON.parse(text) as CaptionSet;
}

// ── image: Nano Banana Pro ──────────────────────────────────────────────────

/** Generate or edit an image. Returns raw bytes plus the mime type the model used. */
export async function generateImage(
  prompt: string,
  opts: { source?: Source; size?: '1K' | '2K' | '4K' } = {},
): Promise<{ bytes: Buffer; mimeType: string }> {
  const parts: Part[] = [];
  if (opts.source) parts.push({ inlineData: { mimeType: opts.source.mimeType, data: opts.source.base64 } });
  parts.push({ text: prompt });

  const json = await call(`/models/${IMAGE_MODEL}:generateContent`, {
    contents: [{ parts }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { imageSize: opts.size ?? '2K' } },
  });
  const out: Part[] = json?.candidates?.[0]?.content?.parts ?? [];
  const img = out.find((p) => p.inlineData)?.inlineData;
  if (!img) throw new Error(`No image in ${IMAGE_MODEL} response`);
  return { bytes: Buffer.from(img.data, 'base64'), mimeType: img.mimeType || 'image/png' };
}

// ── video: Veo ──────────────────────────────────────────────────────────────

/**
 * Veo is long-running: this kicks it off and returns the operation name. The worker
 * polls with pollVideo on later cron ticks rather than blocking a request.
 */
export async function startVideo(prompt: string): Promise<string> {
  const json = await call(`/models/${VIDEO_MODEL}:predictLongRunning`, { instances: [{ prompt }] });
  const name = json?.name;
  if (!name) throw new Error(`Veo did not return an operation name: ${JSON.stringify(json).slice(0, 300)}`);
  return name as string;
}

export async function pollVideo(operationName: string): Promise<{ done: boolean; uri?: string; error?: string }> {
  const json = await call(`/${operationName}`, undefined, 'GET');
  if (!json?.done) return { done: false };
  if (json.error) return { done: true, error: JSON.stringify(json.error).slice(0, 500) };
  const uri = json?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!uri) return { done: true, error: 'Veo finished with no video uri' };
  return { done: true, uri };
}

/** The Veo download URI still needs the API key, and it redirects. */
export async function downloadVideo(uri: string): Promise<Buffer> {
  const res = await fetch(uri, { headers: { 'x-goog-api-key': key() }, redirect: 'follow', cache: 'no-store' });
  if (!res.ok) throw new Error(`Veo download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── files + interactions (research) ─────────────────────────────────────────
// Verified against ai.google.dev/gemini-api/docs (files, video-understanding,
// document-processing, structured-output) on 2026-09-22. The Interactions API takes
// a flat `input` list of typed parts and returns `output_text` / `steps[]`.

export interface GeminiFile { name: string; uri: string; mimeType: string; state?: string }

/**
 * Resumable upload to the Files API. Needed for anything over the inline limit
 * (PDFs are capped at 50 MB either way); files live 48 hours, which covers one
 * extraction pass. The upload URL comes back in a response header.
 */
export async function uploadFile(bytes: Buffer, mimeType: string, displayName: string): Promise<GeminiFile> {
  const start = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': key(),
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.byteLength),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: displayName.slice(0, 120) } }),
    cache: 'no-store',
  });
  if (!start.ok) throw new Error(`Files API start failed: ${start.status} ${(await start.text()).slice(0, 300)}`);
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Files API returned no upload URL');

  const finish = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(bytes.byteLength),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: new Uint8Array(bytes),
    cache: 'no-store',
  });
  if (!finish.ok) throw new Error(`Files API upload failed: ${finish.status} ${(await finish.text()).slice(0, 300)}`);
  const json = await finish.json();
  const file = json?.file;
  if (!file?.uri) throw new Error(`Files API returned no uri: ${JSON.stringify(json).slice(0, 300)}`);
  return { name: file.name, uri: file.uri, mimeType: file.mimeType ?? mimeType, state: file.state };
}

/** Videos and big PDFs are processed after upload; wait until the file is usable. */
export async function waitForFile(file: GeminiFile, timeoutMs = 120_000): Promise<GeminiFile> {
  const deadline = Date.now() + timeoutMs;
  let current = file;
  while (current.state === 'PROCESSING' && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000));
    const json = await call(`/${current.name}`, undefined, 'GET');
    current = { name: json.name, uri: json.uri, mimeType: json.mimeType ?? current.mimeType, state: json.state };
  }
  if (current.state === 'FAILED') throw new Error('Gemini could not process the uploaded file');
  if (current.state === 'PROCESSING') throw new Error('Gemini is still processing the file; retry later');
  return current;
}

export async function deleteFile(name: string) {
  try {
    await fetch(`${BASE}/${name}`, { method: 'DELETE', headers: { 'x-goog-api-key': key() }, cache: 'no-store' });
  } catch {
    /* 48-hour expiry cleans up anyway */
  }
}

/** One typed input part for the Interactions API. */
export type InteractionPart =
  | { type: 'text'; text: string }
  | { type: 'document'; uri?: string; data?: string; mime_type: string }
  | { type: 'video'; uri: string; mime_type?: string; processing?: 'agentic' | 'static' }
  | { type: 'audio'; uri?: string; data?: string; mime_type: string };

/** Run one interaction and parse the JSON the schema forced. */
export async function interactJson<T>(
  parts: InteractionPart[],
  schema: Record<string, unknown>,
  opts: { model?: string; temperature?: number } = {},
): Promise<T> {
  const json = await call('/interactions', {
    model: opts.model ?? RESEARCH_MODEL,
    input: parts,
    response_format: { type: 'text', mime_type: 'application/json', schema },
    ...(opts.temperature !== undefined ? { generation_config: { temperature: opts.temperature } } : {}),
  });
  let text: string = json?.output_text ?? '';
  if (!text) {
    // REST shape: the model's answer is the last model_output step.
    const steps: { type?: string; content?: { type?: string; text?: string }[] }[] = json?.steps ?? [];
    const out = [...steps].reverse().find((s) => s.type === 'model_output');
    text = (out?.content ?? []).map((c) => (c.type === 'text' ? c.text ?? '' : '')).join('');
  }
  if (!text) throw new Error(`Empty interaction response: ${JSON.stringify(json).slice(0, 300)}`);
  return JSON.parse(text.replace(/^```json|```$/g, '').trim()) as T;
}
