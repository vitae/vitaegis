'use client';

// Dashboard: what is waiting on you, what went out, per platform, and whether the
// pipeline is healthy. Every number links to the screen where you act on it.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminShell, { ui } from '@/components/admin/AdminShell';

interface Overview {
  posts: {
    needsReview: number;
    drafting: number;
    published: number;
    published7: number;
    published30: number;
    failed: number;
    rejected: number;
    ingestTotal: number;
  };
  perPlatform: Record<string, { total: number; last7: number; last30: number }>;
  recent: { id: string; published_at: string | null; media_kind: string; caption: string; links: { platform: string; url: string | null }[] }[];
  jobs: {
    queued: number;
    running: number;
    failed: number;
    last: { kind: string; state: string; updated_at: string; error: string | null } | null;
    failedList: { id: string; kind: string; error: string | null; updated_at: string; post_id: string | null }[];
  };
  research: { sourcesDone: number; sourcesPending: number; findings: number; briefsReady: number };
  accounts: { platform: string; connected: boolean; name: string | null; expires_at: number | null }[];
  env: { gemini: boolean; anthropic: boolean; cron: boolean; drive: boolean; mediaSecret: boolean };
  generatedAt: string;
}

const hst = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-US', { timeZone: 'Pacific/Honolulu', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

function Stat({ label, value, href, tone = 'text-white' }: { label: string; value: number | string; href?: string; tone?: string }) {
  const body = (
    <div className={`${ui.glass} p-4 transition-colors ${href ? 'hover:border-vitae-green/50' : ''}`}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function AdminDashboard() {
  return (
    <AdminShell title="Dashboard" blurb="What is waiting on you, what went out, and whether the pipeline is running.">
      {(key) => <Body adminKey={key} />}
    </AdminShell>
  );
}

function Body({ adminKey }: { adminKey: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview', { headers: { 'x-admin-key': adminKey }, cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as Overview);
      setError('');
    } catch {
      setError('Could not load the overview.');
    }
  }, [adminKey]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (error) return <p className="mt-8 text-sm text-red-400">{error}</p>;
  if (!data) return <p className="mt-8 text-sm text-white/50">Loading…</p>;

  const workerStale = data.jobs.last ? Date.now() - new Date(data.jobs.last.updated_at).getTime() > 15 * 60_000 : false;
  const pending = data.jobs.queued + data.jobs.running;

  return (
    <div className="mt-8 space-y-8">
      {/* Needs you */}
      <section>
        <p className={ui.label}>Needs you</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ready to review" value={data.posts.needsReview} href="/admin/content?status=needs" tone="text-vitae-green" />
          <Stat label="Failed" value={data.posts.failed} href="/admin/content?status=failed" tone={data.posts.failed ? 'text-red-400' : 'text-white'} />
          <Stat label="Briefs ready to post" value={data.research.briefsReady} href="/admin/research" tone="text-vitae-green" />
          <Stat label="Generating now" value={data.posts.drafting + data.research.sourcesPending} />
        </div>
      </section>

      {/* Published */}
      <section>
        <p className={ui.label}>Published</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="Last 7 days" value={data.posts.published7} href="/admin/content?status=published" />
          <Stat label="Last 30 days" value={data.posts.published30} href="/admin/content?status=published" />
          <Stat label="All time" value={data.posts.published} href="/admin/content?status=published" />
        </div>
        <div className={`${ui.glass} mt-3 overflow-x-auto p-4`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-white/40">
                <th className="pb-2 font-normal">Platform</th>
                <th className="pb-2 font-normal">Account</th>
                <th className="pb-2 text-right font-normal">7d</th>
                <th className="pb-2 text-right font-normal">30d</th>
                <th className="pb-2 text-right font-normal">All</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((a) => {
                const t = data.perPlatform[a.platform] ?? { total: 0, last7: 0, last30: 0 };
                const expiring = a.expires_at && a.expires_at * 1000 - Date.now() < 3 * 24 * 60 * 60 * 1000;
                return (
                  <tr key={a.platform} className="border-t border-white/5">
                    <td className="py-2 uppercase tracking-[0.15em] text-white/80">{a.platform}</td>
                    <td className="py-2">
                      {a.connected ? (
                        <span className={expiring ? 'text-yellow-300' : 'text-vitae-green'}>
                          ● {a.name ?? 'connected'}
                          {expiring ? ' · token expiring' : ''}
                        </span>
                      ) : (
                        <a href={`/api/social/connect/${a.platform}?key=${encodeURIComponent(adminKey)}`} className="text-white/40 hover:text-white">
                          ○ connect
                        </a>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">{t.last7}</td>
                    <td className="py-2 text-right tabular-nums">{t.last30}</td>
                    <td className="py-2 text-right tabular-nums">{t.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent */}
      <section>
        <div className="flex items-baseline justify-between">
          <p className={ui.label}>Recently published</p>
          <Link href="/admin/content?status=published" className="text-xs text-white/50 hover:text-vitae-green">
            Full history →
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {data.recent.length === 0 && <p className="text-sm text-white/50">Nothing published yet.</p>}
          {data.recent.map((r) => (
            <div key={r.id} className={`${ui.glass} flex flex-wrap items-center gap-3 px-4 py-3`}>
              <span className="w-28 shrink-0 text-xs text-white/40">{hst(r.published_at)}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-white/80">{r.caption || '(no caption)'}</span>
              <span className="flex flex-wrap gap-1">
                {r.links.map((l) =>
                  l.url ? (
                    <a key={l.platform} href={l.url} target="_blank" rel="noreferrer" className={ui.pill(true)}>
                      {l.platform} ↗
                    </a>
                  ) : (
                    <span key={l.platform} className={ui.pill(false)}>
                      {l.platform}
                    </span>
                  ),
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section>
        <p className={ui.label}>Pipeline</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Jobs in flight" value={pending} />
          <Stat label="Jobs failed" value={data.jobs.failed} tone={data.jobs.failed ? 'text-red-400' : 'text-white'} />
          <Stat label="Sources read" value={data.research.sourcesDone} href="/admin/research" />
          <Stat label="Quotes + findings" value={data.research.findings} href="/admin/research" />
        </div>
        <div className={`${ui.glass} mt-3 p-4 text-sm`}>
          <p className={workerStale && pending ? 'text-yellow-300' : 'text-white/70'}>
            Worker last ran {hst(data.jobs.last?.updated_at)}
            {data.jobs.last ? ` (${data.jobs.last.kind} → ${data.jobs.last.state})` : ''}
            {workerStale && pending ? ' — jobs are waiting but the cron has been quiet for over 15 minutes.' : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ['Cron secret', data.env.cron],
                ['Gemini', data.env.gemini],
                ['Anthropic', data.env.anthropic],
                ['Media URL secret', data.env.mediaSecret],
                ['Drive archive', data.env.drive],
              ] as const
            ).map(([name, ok]) => (
              <span key={name} className={ui.pill(ok)}>
                {ok ? '●' : '○'} {name}
              </span>
            ))}
          </div>
          {data.jobs.failedList.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-white/5 pt-3">
              {data.jobs.failedList.map((j) => (
                <li key={j.id} className="text-xs text-red-300">
                  <span className="text-white/40">{hst(j.updated_at)}</span> · {j.kind}
                  {j.post_id && (
                    <>
                      {' · '}
                      <Link href={`/admin/content?q=&id=${j.post_id}`} className="underline hover:text-white">
                        post
                      </Link>
                    </>
                  )}
                  {j.error ? ` — ${j.error.slice(0, 160)}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-xs text-white/30">Updated {hst(data.generatedAt)} HST · refreshes every 30 seconds</p>
    </div>
  );
}
