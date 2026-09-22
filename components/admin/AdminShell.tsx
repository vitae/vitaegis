'use client';

// Shared frame for every admin screen: one key (kept in localStorage), one nav, one look.
// Children get the key once it has been accepted by the server.

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const KEY_STORAGE = 'vitaegis-content-admin-key';

export const ui = {
  glass: 'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg',
  label: 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green',
  input:
    'w-full rounded-lg border border-vitae-green/30 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-vitae-green focus:outline-none',
  btn: 'rounded-lg border border-vitae-green/50 px-4 py-2 text-sm text-vitae-green hover:bg-vitae-green/10 disabled:opacity-40',
  btnQuiet: 'rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-40',
  btnDanger: 'rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-40',
  pill: (on: boolean) =>
    `rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] transition-colors ${
      on ? 'border-vitae-green/60 bg-vitae-green/10 text-vitae-green' : 'border-white/15 text-white/40 hover:border-white/30'
    }`,
};

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/content', label: 'Content' },
  { href: '/admin/research', label: 'Research' },
  { href: '/admin/proverbs', label: 'Proverbs' },
  { href: '/admin/log', label: 'Oracle log' },
];

interface AdminShellProps {
  title: string;
  blurb?: ReactNode;
  /** Rendered once the key is accepted. */
  children: (key: string, reload: () => void) => ReactNode;
  /** Optional check the shell runs to validate the key; defaults to the overview route. */
  probe?: string;
  wide?: boolean;
}

export default function AdminShell({ title, blurb, children, probe = '/api/admin/overview', wide }: AdminShellProps) {
  const pathname = usePathname();
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const tryKey = useCallback(
    async (k: string) => {
      if (!k) return;
      setError('');
      try {
        const res = await fetch(probe, { headers: { 'x-admin-key': k }, cache: 'no-store' });
        if (res.status === 403) {
          setError('That key was rejected.');
          setAuthed(false);
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        setAuthed(true);
        try {
          localStorage.setItem(KEY_STORAGE, k);
        } catch {
          /* private mode: type it each visit */
        }
      } catch {
        setError('Could not reach the server.');
      }
    },
    [probe],
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY_STORAGE);
      if (saved) {
        setKey(saved);
        void tryKey(saved);
      }
    } catch {
      /* ignore */
    }
  }, [tryKey]);

  const signOut = () => {
    try {
      localStorage.removeItem(KEY_STORAGE);
    } catch {
      /* ignore */
    }
    setKey('');
    setAuthed(false);
  };

  return (
    <main className="min-h-screen w-full bg-black text-left text-white" style={{ fontFamily: "'Jost', sans-serif" }}>
      <div className={`mx-auto ${wide ? 'max-w-6xl' : 'max-w-5xl'} px-4 pb-32 pt-4 sm:px-6`}>
        <nav className="flex flex-wrap items-center gap-2">
          {NAV.map((n) => {
            const on = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={ui.pill(on)}>
                {n.label}
              </Link>
            );
          })}
          {authed && (
            <button onClick={signOut} className="ml-auto text-xs text-white/40 hover:text-white/70">
              Sign out
            </button>
          )}
        </nav>

        <p className={`${ui.label} mt-8`}>Vitaegis · admin</p>
        <h1 className="mt-3 text-4xl font-bold uppercase tracking-[0.12em] text-vitae-green">{title}</h1>
        {blurb && <div className="mt-3 max-w-2xl text-sm font-light text-white/60">{blurb}</div>}

        {!authed && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tryKey(key)}
              placeholder="Admin key"
              autoFocus
              className="w-64 rounded-lg border border-vitae-green/30 bg-black px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-vitae-green focus:outline-none"
            />
            <button onClick={() => tryKey(key)} className={ui.btn}>
              Open
            </button>
            {error && <span className="text-sm text-red-400">{error}</span>}
            <p className="w-full text-xs text-white/40">
              The key is the CONTENT_ADMIN_KEY environment variable on Vercel. It is remembered in this browser only.
            </p>
          </div>
        )}

        {authed && children(key, () => setTick((t) => t + 1))}
        <span className="hidden">{tick}</span>
      </div>
    </main>
  );
}
