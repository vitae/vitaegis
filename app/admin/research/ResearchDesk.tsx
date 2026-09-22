'use client';

// Research desk: feed in books, papers, videos and articles; browse what was pulled out;
// collate a topic brief; send it to the post queue. Sits behind the same admin key as
// the content review screen, and hands off to it.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const TOPICS = ['energy', 'mitochondria', 'brainwaves', 'meditation', 'fitness', 'recipes', 'travel', 'gear'] as const;
type Topic = (typeof TOPICS)[number];

const glass = 'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';
const input =
  'w-full rounded-lg border border-vitae-green/30 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-vitae-green focus:outline-none';
const pill = (on: boolean) =>
  `rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] transition-colors ${
    on ? 'border-vitae-green/60 bg-vitae-green/10 text-vitae-green' : 'border-white/15 text-white/40 hover:border-white/30'
  }`;
const btn = 'rounded-lg border border-vitae-green/50 px-4 py-2 text-sm text-vitae-green hover:bg-vitae-green/10 disabled:opacity-40';
const btnQuiet = 'rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-40';
const KEY_STORAGE = 'vitaegis-content-admin-key';

interface Source {
  id: string;
  kind: 'pdf' | 'youtube' | 'url' | 'text';
  title: string | null;
  author: string | null;
  url: string | null;
  note: string;
  topics: string[];
  status: string;
  summary: string | null;
  error: string | null;
  findings_count: number;
  created_at: string;
}

interface Finding {
  id: string;
  kind: 'quote' | 'finding';
  text: string;
  evidence: string | null;
  location: string | null;
  topic: string | null;
  strength: string | null;
  source: { id: string; title: string | null; author: string | null; kind: string; url: string | null } | null;
}

interface Brief {
  id: string;
  topic: string;
  title: string | null;
  hook: string | null;
  summary: string | null;
  key_findings: { claim: string; recurrence: number; sources: string[]; evidence: string }[];
  quotes: { text: string; author: string; source: string; location: string }[];
  takeaway: string | null;
  status: string;
  ingest_id: string | null;
  error: string | null;
  created_at: string;
}

const TONE: Record<string, string> = {
  queued: 'text-white/50',
  extracting: 'text-vitae-green',
  done: 'text-white',
  ready: 'text-vitae-green',
  posted: 'text-white',
  failed: 'text-red-400',
};

const KIND_LABEL: Record<Source['kind'], string> = { pdf: 'PDF', youtube: 'YouTube', url: 'Article', text: 'Text' };

export default function ResearchDesk() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const [sources, setSources] = useState<Source[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);

  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [note, setNote] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<'sources' | 'findings' | 'briefs'>('sources');
  const [filterTopic, setFilterTopic] = useState<Topic | ''>('');
  const [filterKind, setFilterKind] = useState<'' | 'quote' | 'finding'>('');
  const [briefTopic, setBriefTopic] = useState<Topic>('energy');

  const headers = useCallback((k: string) => ({ 'x-admin-key': k, 'Content-Type': 'application/json' }), []);

  const load = useCallback(
    async (k: string) => {
      if (!k) return;
      setError('');
      try {
        const [s, f, b] = await Promise.all([
          fetch('/api/research/sources', { headers: headers(k), cache: 'no-store' }),
          fetch(`/api/research/findings${filterTopic ? `?topic=${filterTopic}` : ''}`, { headers: headers(k), cache: 'no-store' }),
          fetch('/api/research/briefs', { headers: headers(k), cache: 'no-store' }),
        ]);
        if (s.status === 403) {
          setError('That key was rejected.');
          setAuthed(false);
          return;
        }
        if (!s.ok || !f.ok || !b.ok) throw new Error('load');
        setSources(((await s.json()) as { sources: Source[] }).sources);
        setFindings(((await f.json()) as { findings: Finding[] }).findings);
        setBriefs(((await b.json()) as { briefs: Brief[] }).briefs);
        setAuthed(true);
        try {
          localStorage.setItem(KEY_STORAGE, k);
        } catch {
          /* private mode */
        }
      } catch {
        setError('Could not load the desk.');
      }
    },
    [headers, filterTopic],
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY_STORAGE);
      if (saved) {
        setKey(saved);
        void load(saved);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authed) void load(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTopic]);

  // Extraction runs on the cron worker; poll while anything is in flight.
  useEffect(() => {
    if (!authed) return;
    const inFlight =
      sources.some((s) => s.status === 'queued' || s.status === 'extracting') || briefs.some((b) => b.status === 'queued');
    if (!inFlight) return;
    const t = setInterval(() => void load(key), 15_000);
    return () => clearInterval(t);
  }, [authed, sources, briefs, key, load]);

  const post = async (path: string, body: unknown) => {
    const res = await fetch(path, { method: 'POST', headers: headers(key), body: JSON.stringify(body) });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json;
  };

  const addSource = async () => {
    setBusy('add');
    setError('');
    try {
      let storage_path: string | undefined;
      if (file) {
        const sign = (await post('/api/research/upload', { name: file.name, size: file.size, type: file.type })) as {
          path: string;
          signedUrl: string;
        };
        const up = await fetch(sign.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'false' },
          body: file,
        });
        if (!up.ok) throw new Error(`Upload failed: ${up.status}`);
        storage_path = sign.path;
      }
      await post('/api/research/sources', {
        url: file ? undefined : url || undefined,
        text: file || url ? undefined : text || undefined,
        storage_path,
        mime_type: file ? 'application/pdf' : undefined,
        title,
        author,
        note: file || url ? note : undefined,
        topics,
      });
      setUrl('');
      setText('');
      setTitle('');
      setAuthor('');
      setNote('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await load(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the source.');
    } finally {
      setBusy(null);
    }
  };

  const act = async (path: string, body: Record<string, unknown>, id: string) => {
    setBusy(id);
    setError('');
    try {
      await post(path, body);
      await load(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.');
    } finally {
      setBusy(null);
    }
  };

  const canAdd = Boolean(file || url.trim() || text.trim()) && busy !== 'add';
  const shownFindings = findings.filter((f) => !filterKind || f.kind === filterKind);
  const when = (iso: string) => new Date(iso).toLocaleString('en-US', { timeZone: 'Pacific/Honolulu' });

  return (
    <main className="min-h-screen w-full bg-black text-left text-white">
      <div className="mx-auto max-w-5xl px-4 pb-32 pt-6 sm:px-6">
        <p className={label}>Vitaegis · admin</p>
        <h1 className="mt-3 text-4xl font-bold uppercase tracking-[0.12em] text-vitae-green">Research desk</h1>
        <p className="mt-3 max-w-2xl text-sm font-light text-white/60">
          Feed in books, papers, YouTube videos and articles. Gemini reads each one end to end and keeps the pertinent quotes
          and the scientific findings. Build a brief per topic to see what recurs across sources, then send it to the post
          queue: it lands in{' '}
          <Link href="/admin/content" className="text-vitae-green hover:underline">
            Content review
          </Link>{' '}
          as a branded carousel with copy for all five platforms.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(key)}
            placeholder="Admin key"
            className="w-64 rounded-lg border border-vitae-green/30 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-vitae-green focus:outline-none"
          />
          <button onClick={() => load(key)} className={btn}>
            {authed ? 'Refresh' : 'Open'}
          </button>
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>

        {authed && (
          <>
            {/* Add a source */}
            <section className={`${glass} mt-8 p-5 sm:p-7`}>
              <p className={label}>Add a source</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">YouTube, article or paper URL</span>
                  <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className={`mt-1 ${input}`} disabled={Boolean(file)} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">or a PDF (book, paper — up to 50 MB)</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border file:border-vitae-green/40 file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[0.15em] file:text-vitae-green"
                  />
                </label>
                {!file && !url.trim() && (
                  <label className="block sm:col-span-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">or paste text</span>
                    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className={`mt-1 ${input} resize-y`} />
                  </label>
                )}
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Title (optional)</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1 ${input}`} />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Author (optional)</span>
                  <input value={author} onChange={(e) => setAuthor(e.target.value)} className={`mt-1 ${input}`} />
                </label>
                {(file || url.trim()) && (
                  <label className="block sm:col-span-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">What to look for (optional)</span>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. anything on NAD+, cold exposure, or sleep and mitochondria"
                      className={`mt-1 ${input}`}
                    />
                  </label>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopics((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
                    className={pill(topics.includes(t))}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button disabled={!canAdd} onClick={addSource} className={btn}>
                  {busy === 'add' ? 'Uploading…' : 'Read it'}
                </button>
                <span className="text-xs text-white/40">Extraction runs in the background; this list refreshes itself.</span>
              </div>
            </section>

            {/* Tabs */}
            <div className="mt-8 flex flex-wrap gap-2">
              {(['sources', 'findings', 'briefs'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={pill(tab === t)}>
                  {t}
                  {t === 'sources' && ` · ${sources.length}`}
                  {t === 'findings' && ` · ${findings.length}`}
                  {t === 'briefs' && ` · ${briefs.length}`}
                </button>
              ))}
            </div>

            {tab === 'sources' && (
              <div className="mt-6 space-y-4">
                {sources.length === 0 && <p className="text-sm font-light text-white/50">Nothing read yet.</p>}
                {sources.map((s) => (
                  <article key={s.id} className={`${glass} p-5`}>
                    <header className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <span className={`${label} ${TONE[s.status] ?? 'text-white/50'}`}>{s.status}</span>
                        <span className="ml-3 text-[10px] uppercase tracking-[0.2em] text-white/40">{KIND_LABEL[s.kind]}</span>
                      </div>
                      <span className="text-xs text-white/40">{when(s.created_at)}</span>
                    </header>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      {s.title || s.url || (s.kind === 'text' ? 'Pasted text' : 'Untitled')}
                    </h3>
                    {s.author && <p className="text-sm text-white/60">{s.author}</p>}
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-vitae-green/70 hover:text-vitae-green">
                        {s.url}
                      </a>
                    )}
                    {s.summary && <p className="mt-3 text-sm text-white/70">{s.summary}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {s.topics.map((t) => (
                        <span key={t} className={pill(true)}>
                          {t}
                        </span>
                      ))}
                      {s.status === 'done' && (
                        <span className="text-xs text-white/50">{s.findings_count} items pulled</span>
                      )}
                    </div>
                    {s.error && <p className="mt-3 text-sm text-red-400">{s.error}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.status === 'done' && (
                        <button
                          onClick={() => {
                            setTab('findings');
                            setFilterTopic('');
                            setFindings([]);
                            void fetch(`/api/research/findings?source=${s.id}`, { headers: headers(key), cache: 'no-store' })
                              .then((r) => r.json())
                              .then((j: { findings: Finding[] }) => setFindings(j.findings));
                          }}
                          className={btnQuiet}
                        >
                          See what was pulled
                        </button>
                      )}
                      {(s.status === 'failed' || s.status === 'done') && (
                        <button disabled={busy === s.id} onClick={() => act('/api/research/sources', { action: 'retry', id: s.id }, s.id)} className={btnQuiet}>
                          {s.status === 'done' ? 'Read again' : 'Retry'}
                        </button>
                      )}
                      <button
                        disabled={busy === s.id}
                        onClick={() => confirm('Delete this source and everything pulled from it?') && act('/api/research/sources', { action: 'delete', id: s.id }, s.id)}
                        className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {tab === 'findings' && (
              <div className="mt-6">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFilterTopic('')} className={pill(filterTopic === '')}>
                    all topics
                  </button>
                  {TOPICS.map((t) => (
                    <button key={t} onClick={() => setFilterTopic(t)} className={pill(filterTopic === t)}>
                      {t}
                    </button>
                  ))}
                  <span className="mx-2 border-l border-white/10" />
                  {(['', 'quote', 'finding'] as const).map((k) => (
                    <button key={k || 'both'} onClick={() => setFilterKind(k)} className={pill(filterKind === k)}>
                      {k || 'quotes + findings'}
                    </button>
                  ))}
                </div>
                <div className="mt-6 space-y-3">
                  {shownFindings.length === 0 && <p className="text-sm font-light text-white/50">Nothing here yet.</p>}
                  {shownFindings.map((f) => (
                    <article key={f.id} className={`${glass} p-4`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`${label} ${f.kind === 'quote' ? 'text-white/70' : ''}`}>{f.kind}</span>
                        {f.topic && <span className={pill(true)}>{f.topic}</span>}
                        {f.strength && <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">{f.strength}</span>}
                        {f.location && <span className="text-[10px] tracking-[0.1em] text-white/40">{f.location}</span>}
                      </div>
                      <p className={`mt-2 text-sm ${f.kind === 'quote' ? 'italic text-white' : 'text-white/90'}`}>
                        {f.kind === 'quote' ? `“${f.text}”` : f.text}
                      </p>
                      {f.evidence && <p className="mt-1 text-xs text-white/55">{f.evidence}</p>}
                      {f.source && (
                        <p className="mt-2 text-xs text-vitae-green/70">
                          — {f.source.title || f.source.url || 'Untitled'}
                          {f.source.author ? `, ${f.source.author}` : ''}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}

            {tab === 'briefs' && (
              <div className="mt-6">
                <div className={`${glass} p-5`}>
                  <p className={label}>Build a brief</p>
                  <p className="mt-2 text-xs text-white/50">
                    Collates every quote and finding tagged with the topic, ranks what recurs across sources, keeps the best quotes.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {TOPICS.map((t) => (
                      <button key={t} onClick={() => setBriefTopic(t)} className={pill(briefTopic === t)}>
                        {t}
                      </button>
                    ))}
                    <button
                      disabled={busy === 'build'}
                      onClick={() => act('/api/research/briefs', { action: 'build', topic: briefTopic }, 'build')}
                      className={`${btn} ml-2`}
                    >
                      {busy === 'build' ? 'Queued…' : `Build ${briefTopic} brief`}
                    </button>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {briefs.length === 0 && <p className="text-sm font-light text-white/50">No briefs yet.</p>}
                  {briefs.map((b) => (
                    <article key={b.id} className={`${glass} p-5 sm:p-7`}>
                      <header className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <span className={`${label} ${TONE[b.status] ?? 'text-white/50'}`}>{b.status}</span>
                          <span className="ml-3 text-[10px] uppercase tracking-[0.2em] text-white/40">{b.topic}</span>
                        </div>
                        <span className="text-xs text-white/40">{when(b.created_at)}</span>
                      </header>
                      {b.title && <h3 className="mt-3 text-2xl font-bold text-white">{b.title}</h3>}
                      {b.hook && <p className="mt-1 text-sm text-vitae-green">{b.hook}</p>}
                      {b.summary && <p className="mt-3 text-sm text-white/80">{b.summary}</p>}
                      {b.key_findings?.length > 0 && (
                        <ol className="mt-4 space-y-2">
                          {b.key_findings.map((f, i) => (
                            <li key={i} className="text-sm text-white/90">
                              <span className="text-vitae-green">{i + 1}.</span> {f.claim}{' '}
                              <span className="text-xs text-white/50">
                                · {f.recurrence} source{f.recurrence === 1 ? '' : 's'} · {f.evidence}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                      {b.quotes?.length > 0 && (
                        <div className="mt-4 space-y-2 border-l border-vitae-green/30 pl-4">
                          {b.quotes.map((q, i) => (
                            <p key={i} className="text-sm italic text-white">
                              “{q.text}” <span className="not-italic text-xs text-white/50">— {q.author || q.source}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      {b.takeaway && <p className="mt-4 text-sm text-white/70">Do this week: {b.takeaway}</p>}
                      {b.error && <p className="mt-3 text-sm text-red-400">{b.error}</p>}
                      <div className="mt-5 flex flex-wrap gap-2">
                        {b.status === 'ready' && (
                          <button disabled={busy === b.id} onClick={() => act('/api/research/briefs', { action: 'post', id: b.id }, b.id)} className={btn}>
                            Send to post queue
                          </button>
                        )}
                        {b.status === 'posted' && (
                          <Link href="/admin/content" className={btn}>
                            In content review →
                          </Link>
                        )}
                        {b.status !== 'queued' && (
                          <button disabled={busy === b.id} onClick={() => act('/api/research/briefs', { action: 'rebuild', id: b.id }, b.id)} className={btnQuiet}>
                            Rebuild
                          </button>
                        )}
                        <button
                          disabled={busy === b.id}
                          onClick={() => confirm('Delete this brief?') && act('/api/research/briefs', { action: 'delete', id: b.id }, b.id)}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
