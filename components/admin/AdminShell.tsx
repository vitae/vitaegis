'use client';

// Shared frame for every admin screen: one key (kept in localStorage), one nav, one look.
// Children get the key once it has been accepted by the server.

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const KEY_STORAGE = 'vitaegis-content-admin-key';

/**
 * The admin design tokens. Every control is liquid glass (see .liquid-btn in globals.css),
 * every surface is the site's glass pane, so the admin reads as part of vitaegis.com.
 */
export const ui = {
  glass: 'glass-panel rounded-2xl',
  label: 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green',
  input: 'liquid-input',
  btn: 'liquid-btn',
  btnQuiet: 'liquid-btn liquid-btn--quiet',
  btnDanger: 'liquid-btn liquid-btn--danger',
  pill: (on: boolean) => `liquid-btn liquid-btn--pill${on ? ' liquid-btn--on' : ''}`,
};

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/agent', label: 'Agent' },
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

export default function AdminShell({
  title,
  blurb,
  children,
  probe = '/api/admin/overview',
  wide,
}: AdminShellProps) {
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
        if (res.status === 403 || res.status === 401) {
          setError('That key was rejected.');
          setAuthed(false);
          return;
        }
        if (!res.ok) {
          // The key may be fine and the screen's own backend broken (a missing table, say).
          // Say what the server said instead of blaming the network.
          let detail = `HTTP ${res.status}`;
          try {
            const body = (await res.json()) as { error?: string };
            if (body?.error) detail = body.error;
          } catch {
            /* not JSON */
          }
          setError(`The server answered with an error: ${detail}`);
          setAuthed(false);
          return;
        }
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
    <main
      className="min-h-screen w-full bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
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
            <button onClick={signOut} className={`${ui.btnQuiet} ml-auto`}>
              Sign out
            </button>
          )}
        </nav>

        <p className={`${ui.label} mt-8`}>Vitaegis · admin</p>
        <h1 className="mt-3 text-4xl font-bold uppercase tracking-[0.12em] text-vitae-green">
          {title}
        </h1>
        {blurb && <div className="mt-3 max-w-2xl text-sm font-light text-white/60">{blurb}</div>}

        {!authed && (
          <div className={`${ui.glass} mt-6 flex flex-wrap items-center gap-3 p-4`}>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tryKey(key)}
              placeholder="Admin key"
              autoFocus
              className={`${ui.input} w-64`}
              style={{ width: '16rem' }}
            />
            <button onClick={() => tryKey(key)} className={ui.btn}>
              Open
            </button>
            {error && <span className="text-sm text-red-400">{error}</span>}
            <p className="w-full text-xs text-white/40">
              The key is the CONTENT_ADMIN_KEY environment variable on Vercel. It is remembered in
              this browser only.
            </p>
          </div>
        )}

        {authed && children(key, () => setTick((t) => t + 1))}
        <span className="hidden">{tick}</span>
      </div>
    </main>
  );
}
