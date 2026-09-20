'use client';

// Review gate between generation and publishing. Nothing reaches a social account
// without a human pressing approve here.

import { useCallback, useEffect, useState } from 'react';

const PLATFORMS = ['instagram', 'facebook', 'youtube', 'tiktok', 'twitter'] as const;
type Platform = (typeof PLATFORMS)[number];

const glass = 'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';
const KEY_STORAGE = 'vitaegis-content-admin-key';

interface Post {
  id: string;
  status: string;
  captions: Partial<Record<Platform | 'default', string>>;
  media_kind: string;
  media_url: string | null;
  platforms: Platform[];
  error: string | null;
  created_at: string;
  published_at: string | null;
  results: Record<string, unknown> | null;
}

const STATUS_TONE: Record<string, string> = {
  draft: 'text-white/50',
  ready: 'text-vitae-green',
  approved: 'text-vitae-green',
  publishing: 'text-vitae-green',
  published: 'text-white',
  rejected: 'text-white/40',
  failed: 'text-red-400',
};

export default function ContentReview() {
  const [key, setKey] = useState('');
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [accounts, setAccounts] = useState<{ platform: string; name: string | null }[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<Platform | 'default', string>>>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY_STORAGE);
      if (saved) setKey(saved);
    } catch {
      /* private mode: just type the key each visit */
    }
  }, []);

  const load = useCallback(
    async (k: string) => {
      if (!k) return;
      setError('');
      try {
        const res = await fetch('/api/content/review', { headers: { 'x-admin-key': k }, cache: 'no-store' });
        if (res.status === 403) {
          setError('That key was rejected.');
          setPosts(null);
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { posts: Post[]; accounts?: { platform: string; name: string | null }[] };
        setPosts(body.posts);
        setAccounts(body.accounts ?? []);
        try {
          localStorage.setItem(KEY_STORAGE, k);
        } catch {
          /* ignore */
        }
      } catch {
        setError('Could not load the queue.');
      }
    },
    [],
  );

  useEffect(() => {
    if (key) load(key);
  }, [key, load]);

  async function act(post: Post, action: 'approve' | 'reject' | 'save', platforms?: Platform[]) {
    setBusy(post.id);
    try {
      const res = await fetch('/api/content/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: JSON.stringify({ id: post.id, action, captions: drafts[post.id], platforms }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'That did not work.');
      }
      await load(key);
    } finally {
      setBusy(null);
    }
  }

  const caption = (p: Post, k: Platform | 'default') => drafts[p.id]?.[k] ?? p.captions?.[k] ?? '';
  const setCaption = (p: Post, k: Platform | 'default', v: string) =>
    setDrafts((d) => ({ ...d, [p.id]: { ...d[p.id], [k]: v } }));

  return (
    <main
      className="fixed inset-0 z-10 w-full overflow-y-auto overscroll-contain bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-12 sm:px-6">
        <p className={label}>Vitaegis · admin</p>
        <h1 className="mt-3 text-4xl font-bold uppercase tracking-[0.12em] text-vitae-green">Content review</h1>
        <p className="mt-3 max-w-xl text-sm font-light text-white/60">
          Everything the pipeline generated, waiting on you. Nothing posts until you approve it.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Admin key"
            className="w-64 rounded-lg border border-vitae-green/30 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-vitae-green focus:outline-none"
          />
          <button onClick={() => load(key)} className="rounded-lg border border-vitae-green/40 px-4 py-2 text-sm text-vitae-green hover:bg-vitae-green/10">
            Refresh
          </button>
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>

        {posts && (
          <div className="mt-6 flex flex-wrap gap-2">
            {PLATFORMS.map((pl) => {
              const acct = accounts.find((a) => a.platform === pl);
              return (
                <a
                  key={pl}
                  href={`/api/social/connect/${pl}?key=${encodeURIComponent(key)}`}
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${
                    acct ? 'border-vitae-green/50 text-vitae-green' : 'border-white/15 text-white/40 hover:text-white/70'
                  }`}
                  title={acct ? `Connected${acct.name ? ` as ${acct.name}` : ''}. Click to reconnect.` : 'Not connected. Click to connect.'}
                >
                  {acct ? '●' : '○'} {pl}
                </a>
              );
            })}
          </div>
        )}

        {posts && posts.length === 0 && (
          <p className="mt-10 text-sm font-light text-white/50">Nothing in the queue yet. Send something from the Shortcut.</p>
        )}

        <div className="mt-8 space-y-6">
          {(posts ?? []).map((p) => {
            const editable = ['draft', 'ready', 'failed'].includes(p.status);
            const selected = p.platforms ?? [];
            return (
              <article key={p.id} className={`${glass} p-5 sm:p-7`}>
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={`${label} ${STATUS_TONE[p.status] ?? 'text-white/50'}`}>{p.status}</span>
                  <span className="text-xs text-white/40">
                    {new Date(p.created_at).toLocaleString('en-US', { timeZone: 'Pacific/Honolulu' })}
                  </span>
                </header>

                {p.media_url && (
                  <div className="mt-4">
                    {p.media_kind === 'video' ? (
                      <video src={p.media_url} controls playsInline className="max-h-80 rounded-xl border border-white/10" />
                    ) : (
                      // Generated media lives on a signed Supabase URL, so next/image is not worth the config.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.media_url} alt="" className="max-h-80 rounded-xl border border-white/10" />
                    )}
                  </div>
                )}

                <div className="mt-5 space-y-3">
                  {(['default', ...PLATFORMS] as const).map((k) => (
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
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {PLATFORMS.map((pl) => {
                    const on = selected.includes(pl);
                    return (
                      <button
                        key={pl}
                        disabled={!editable}
                        onClick={() =>
                          act(p, 'save', on ? selected.filter((x) => x !== pl) : [...selected, pl])
                        }
                        className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] disabled:opacity-40 ${
                          on ? 'border-vitae-green/60 bg-vitae-green/10 text-vitae-green' : 'border-white/15 text-white/40'
                        }`}
                      >
                        {pl}
                      </button>
                    );
                  })}
                </div>

                {p.error && <p className="mt-4 text-sm text-red-400">{p.error}</p>}
                {p.published_at && (
                  <p className="mt-4 text-xs text-white/50">
                    Published {new Date(p.published_at).toLocaleString('en-US', { timeZone: 'Pacific/Honolulu' })}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    disabled={!editable || busy === p.id || selected.length === 0}
                    onClick={() => act(p, 'approve', selected)}
                    className="rounded-lg border border-vitae-green/50 px-4 py-2 text-sm text-vitae-green hover:bg-vitae-green/10 disabled:opacity-40"
                  >
                    {busy === p.id ? 'Working…' : `Approve and post to ${selected.length}`}
                  </button>
                  <button
                    disabled={!editable || busy === p.id}
                    onClick={() => act(p, 'save', selected)}
                    className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-40"
                  >
                    Save edits
                  </button>
                  <button
                    disabled={!editable || busy === p.id}
                    onClick={() => act(p, 'reject')}
                    className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
