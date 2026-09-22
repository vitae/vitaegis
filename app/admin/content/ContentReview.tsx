'use client';

// Content: the review gate plus the full record of everything that went out.
// Nothing reaches a social account without a human pressing approve here.

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminShell, { ui } from '@/components/admin/AdminShell';

const PLATFORMS = ['instagram', 'facebook', 'youtube', 'tiktok', 'twitter'] as const;
type Platform = (typeof PLATFORMS)[number];

type Filter = 'needs' | 'all' | 'published' | 'failed' | 'rejected';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'needs', label: 'Needs review' },
  { id: 'published', label: 'Published' },
  { id: 'failed', label: 'Failed' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'Everything' },
];

interface Job {
  id: string;
  kind: string;
  state: string;
  attempts: number;
  max_attempts: number;
  error: string | null;
  run_after: string;
  updated_at: string;
}

interface Post {
  id: string;
  status: string;
  captions: Partial<Record<Platform | 'default', string>>;
  media_kind: string;
  media_urls: string[];
  platforms: Platform[];
  ai_disclosure: boolean;
  results: Record<string, { url?: string; id?: string }> | null;
  error: string | null;
  created_at: string;
  approved_at: string | null;
  published_at: string | null;
  source: { id: string; kind: string; note: string; captured_at: string } | null;
  jobs: Job[];
}

const TONE: Record<string, string> = {
  draft: 'text-white/50',
  ready: 'text-vitae-green',
  approved: 'text-vitae-green',
  publishing: 'text-vitae-green',
  published: 'text-white',
  rejected: 'text-white/40',
  failed: 'text-red-400',
};

const hst = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-US', { timeZone: 'Pacific/Honolulu' }) : '';

export default function ContentReview() {
  return (
    <AdminShell
      title="Content"
      blurb="Everything the pipeline generated and everything that went out. Nothing posts until you approve it."
      probe="/api/content/review?status=needs"
      wide
    >
      {(key) => (
        <Suspense fallback={null}>
          <Body adminKey={key} />
        </Suspense>
      )}
    </AdminShell>
  );
}

function Body({ adminKey }: { adminKey: string }) {
  const params = useSearchParams();
  const [filter, setFilter] = useState<Filter>((params.get('status') as Filter) || 'needs');
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [posts, setPosts] = useState<Post[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<{ platform: string; name: string | null }[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<Platform | 'default', string>>>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const query = useCallback(
    (before?: string | null) => {
      const sp = new URLSearchParams({ status: filter, counts: '1' });
      if (platform) sp.set('platform', platform);
      if (q.trim()) sp.set('q', q.trim());
      if (before) sp.set('before', before);
      return `/api/content/review?${sp}`;
    },
    [filter, platform, q],
  );

  const load = useCallback(
    async (append = false) => {
      setError('');
      try {
        const res = await fetch(query(append ? nextBefore : null), { headers: { 'x-admin-key': adminKey }, cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as {
          posts: Post[];
          hasMore: boolean;
          nextBefore: string | null;
          counts?: Record<string, number>;
          accounts?: { platform: string; name: string | null }[];
        };
        setPosts((cur) => (append ? [...cur, ...body.posts] : body.posts));
        setNextBefore(body.hasMore ? body.nextBefore : null);
        if (body.counts) setCounts(body.counts);
        setAccounts(body.accounts ?? []);
      } catch {
        setError('Could not load posts.');
      }
    },
    [adminKey, query, nextBefore],
  );

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, platform]);

  // Anything mid-flight refreshes itself.
  useEffect(() => {
    const inFlight = posts.some((p) => ['draft', 'approved', 'publishing'].includes(p.status));
    if (!inFlight) return;
    const t = setInterval(() => void load(false), 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  async function act(post: Post, action: 'approve' | 'reject' | 'save' | 'retry' | 'regenerate' | 'delete', platforms?: Platform[]) {
    if (action === 'delete' && !confirm('Delete this post record? Media stays in the archive.')) return;
    if (action === 'regenerate' && !confirm('Reject this version and generate a fresh one from the original capture?')) return;
    setBusy(post.id);
    try {
      const res = await fetch('/api/content/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id: post.id, action, captions: drafts[post.id], platforms }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'That did not work.');
      } else {
        setDrafts((d) => {
          const next = { ...d };
          delete next[post.id];
          return next;
        });
      }
      await load(false);
    } finally {
      setBusy(null);
    }
  }

  const caption = (p: Post, k: Platform | 'default') => drafts[p.id]?.[k] ?? p.captions?.[k] ?? '';
  const setCaption = (p: Post, k: Platform | 'default', v: string) =>
    setDrafts((d) => ({ ...d, [p.id]: { ...d[p.id], [k]: v } }));

  return (
    <div className="mt-6">
      {/* Accounts */}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((pl) => {
          const acct = accounts.find((a) => a.platform === pl);
          return (
            <a
              key={pl}
              href={`/api/social/connect/${pl}?key=${encodeURIComponent(adminKey)}`}
              className={ui.pill(Boolean(acct))}
              title={acct ? `Connected${acct.name ? ` as ${acct.name}` : ''}. Click to reconnect.` : 'Not connected. Click to connect.'}
            >
              {acct ? '●' : '○'} {pl}
            </a>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={ui.pill(filter === f.id)}>
            {f.label}
            {counts[f.id] !== undefined ? ` · ${counts[f.id]}` : ''}
          </button>
        ))}
        <span className="mx-1 hidden h-5 border-l border-white/10 sm:block" />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform | '')}
          className="rounded-lg border border-white/15 bg-black px-2 py-1 text-xs uppercase tracking-[0.15em] text-white/70 focus:border-vitae-green focus:outline-none"
        >
          <option value="">any platform</option>
          {PLATFORMS.map((pl) => (
            <option key={pl} value={pl}>
              {pl}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(false)}
          placeholder="Search captions"
          className="w-48 rounded-lg border border-white/15 bg-black px-3 py-1 text-xs text-white placeholder:text-white/30 focus:border-vitae-green focus:outline-none"
        />
        <button onClick={() => load(false)} className={ui.btnQuiet}>
          Refresh
        </button>
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>

      {posts.length === 0 && (
        <p className="mt-10 text-sm font-light text-white/50">
          {filter === 'needs' ? 'Nothing waiting. Send something from the Shortcut or post a research brief.' : 'Nothing here.'}
        </p>
      )}

      <div className="mt-6 space-y-6">
        {posts.map((p) => {
          const editable = ['draft', 'ready', 'failed'].includes(p.status);
          const selected = p.platforms ?? [];
          const landed = Object.entries(p.results ?? {}).filter(([k]) => k !== 'drive');
          const landedNames = landed.map(([k]) => k);
          const missing = selected.filter((pl) => !landedNames.includes(pl));
          const showAll = open[p.id];
          const drive = (p.results as Record<string, unknown> | null)?.drive as string[] | undefined;
          return (
            <article key={p.id} className={`${ui.glass} p-5 sm:p-7`}>
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <span className={`${ui.label} ${TONE[p.status] ?? 'text-white/50'}`}>
                  {p.status} · {p.media_kind === 'slides' ? `${p.media_urls?.length ?? 0} slides` : p.media_kind}
                  {p.ai_disclosure ? '' : ' · original'}
                </span>
                <span className="text-xs text-white/40">
                  {p.published_at ? `published ${hst(p.published_at)}` : `created ${hst(p.created_at)}`}
                </span>
              </header>

              {p.source && (
                <p className="mt-3 text-xs text-white/50">
                  <span className="uppercase tracking-[0.2em] text-white/30">from {p.source.kind}</span>
                  {p.source.note ? ` · ${p.source.note.slice(0, 200)}${p.source.note.length > 200 ? '…' : ''}` : ''}
                </p>
              )}

              {/* Where it landed */}
              {landed.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {landed.map(([pl, r]) =>
                    r?.url ? (
                      <a key={pl} href={r.url} target="_blank" rel="noreferrer" className={ui.pill(true)}>
                        {pl} ↗
                      </a>
                    ) : (
                      <span key={pl} className={ui.pill(true)} title={r?.id ? `id ${r.id}` : undefined}>
                        {pl} ✓
                      </span>
                    ),
                  )}
                  {p.status === 'published' &&
                    missing.map((pl) => (
                      <span key={pl} className="rounded-full border border-red-500/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-red-400">
                        {pl} missed
                      </span>
                    ))}
                  {drive?.[0] && (
                    <a href={drive[0]} target="_blank" rel="noreferrer" className="text-xs text-white/40 hover:text-white">
                      Drive archive ↗
                    </a>
                  )}
                </div>
              )}

              {p.media_urls?.length > 0 && (
                <div className="mt-4">
                  {p.media_kind === 'video' ? (
                    <video src={p.media_urls[0]} controls playsInline className="max-h-80 rounded-xl border border-white/10" />
                  ) : (
                    // A deck scrolls horizontally in carousel order, numbered as it will post.
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {p.media_urls.map((u, i) => (
                        <figure key={u} className="relative shrink-0">
                          {/* Signed Supabase URLs, so next/image is not worth the config. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt="" className="h-56 rounded-xl border border-white/10" />
                          {p.media_urls.length > 1 && (
                            <figcaption className="absolute left-2 top-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] tabular-nums text-vitae-green">
                              {i + 1}/{p.media_urls.length}
                            </figcaption>
                          )}
                        </figure>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Captions: editable while pending, collapsed to the default once it is out */}
              <div className="mt-5 space-y-3">
                {(editable || showAll ? (['default', ...PLATFORMS] as const) : (['default'] as const)).map((k) => (
                  <label key={k} className="block">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">{k}</span>
                    <textarea
                      value={caption(p, k)}
                      onChange={(e) => setCaption(p, k, e.target.value)}
                      readOnly={!editable}
                      rows={k === 'default' || k === 'youtube' ? 3 : 2}
                      className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white/90 read-only:text-white/50 focus:border-vitae-green/60 focus:outline-none"
                    />
                  </label>
                ))}
                {!editable && (
                  <button onClick={() => setOpen((o) => ({ ...o, [p.id]: !showAll }))} className="text-xs text-white/40 hover:text-white">
                    {showAll ? 'Hide per-platform copy' : 'Show per-platform copy and job log'}
                  </button>
                )}
              </div>

              {/* Platforms */}
              <div className="mt-4 flex flex-wrap gap-2">
                {PLATFORMS.map((pl) => {
                  const on = selected.includes(pl);
                  return (
                    <button
                      key={pl}
                      disabled={!editable}
                      onClick={() => act(p, 'save', on ? selected.filter((x) => x !== pl) : [...selected, pl])}
                      className={`${ui.pill(on)} disabled:opacity-60`}
                    >
                      {pl}
                    </button>
                  );
                })}
              </div>

              {p.error && <p className="mt-4 text-sm text-red-400">{p.error}</p>}

              {/* Job log */}
              {(editable || showAll) && p.jobs?.length > 0 && (
                <ul className="mt-4 space-y-1 border-t border-white/5 pt-3">
                  {p.jobs.map((j) => (
                    <li key={j.id} className="text-xs text-white/40">
                      <span className="text-white/25">{hst(j.updated_at)}</span> · {j.kind} →{' '}
                      <span className={j.state === 'failed' ? 'text-red-400' : j.state === 'done' ? 'text-white/60' : 'text-vitae-green'}>
                        {j.state}
                      </span>
                      {j.attempts > 1 ? ` (${j.attempts}/${j.max_attempts})` : ''}
                      {j.error ? ` — ${j.error.slice(0, 140)}` : ''}
                    </li>
                  ))}
                </ul>
              )}

              {/* Actions */}
              <div className="mt-5 flex flex-wrap gap-3">
                {editable && (
                  <>
                    <button
                      disabled={busy === p.id || selected.length === 0}
                      onClick={() => act(p, p.status === 'failed' && landed.length ? 'retry' : 'approve', selected)}
                      className={ui.btn}
                    >
                      {busy === p.id
                        ? 'Working…'
                        : p.status === 'failed' && landed.length
                          ? `Retry ${missing.length} missed`
                          : `Approve and post to ${selected.length}`}
                    </button>
                    <button disabled={busy === p.id} onClick={() => act(p, 'save', selected)} className={ui.btnQuiet}>
                      Save edits
                    </button>
                    {p.source && (
                      <button disabled={busy === p.id} onClick={() => act(p, 'regenerate')} className={ui.btnQuiet}>
                        Regenerate
                      </button>
                    )}
                    <button disabled={busy === p.id} onClick={() => act(p, 'reject')} className={ui.btnDanger}>
                      Reject
                    </button>
                  </>
                )}
                {p.status === 'published' && missing.length > 0 && (
                  <button disabled={busy === p.id} onClick={() => act(p, 'retry', selected)} className={ui.btn}>
                    Retry {missing.join(', ')}
                  </button>
                )}
                {p.status === 'rejected' && p.source && (
                  <button disabled={busy === p.id} onClick={() => act(p, 'regenerate')} className={ui.btnQuiet}>
                    Regenerate
                  </button>
                )}
                {p.status !== 'publishing' && (
                  <button disabled={busy === p.id} onClick={() => act(p, 'delete')} className={`${ui.btnDanger} ml-auto`}>
                    Delete record
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {nextBefore && (
        <div className="mt-8 text-center">
          <button onClick={() => load(true)} className={ui.btnQuiet}>
            Load older
          </button>
        </div>
      )}
    </div>
  );
}
