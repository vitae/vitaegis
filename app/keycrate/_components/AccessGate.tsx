'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { formatTimeLeft, PRICE_LABEL, type AccessState } from '@/lib/keycrate/access';
import { signInWithGoogle } from '@/lib/keycrate/cloud';
import { useKeyCrate } from '../_state/store';
import { Button } from './ui';

/* ═══════════════════════════════════════════════════════════════════════════════
   Paywall. GET /api/keycrate/access decides; this only shows the result.
   - enabled:false (no Stripe price or Supabase env): the app, exactly as before.
   - anonymous: sign-in wall. trial: banner with time left. active: the app.
   - expired: paywall. The library stays in IndexedDB on the device either way.
   Offline (the request fails), the last answer this device got is used, and without
   one the app stays open, so a gig never depends on the network.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Access {
  enabled: boolean;
  state: AccessState;
  trialEndsAt: string | null;
  canManage: boolean;
}

const CACHE_KEY = 'kc:access';

function readCache(): Access | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Access) : null;
  } catch {
    return null;
  }
}
function writeCache(a: Access) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(a));
  } catch {
    /* storage blocked: nothing to remember */
  }
}

const authHeaders = (session: Session | null): Record<string, string> =>
  session ? { Authorization: `Bearer ${session.access_token}` } : {};

async function fetchAccess(session: Session | null): Promise<Access | null> {
  try {
    const res = await fetch('/api/keycrate/access', {
      headers: authHeaders(session),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<Access>;
    if (typeof json.enabled !== 'boolean' || !json.state) return null;
    return {
      enabled: json.enabled,
      state: json.state,
      trialEndsAt: json.trialEndsAt ?? null,
      canManage: !!json.canManage,
    };
  } catch {
    return null;
  }
}

/** POSTs to checkout or portal and follows the Stripe URL. Returns an error message on failure. */
async function goToStripe(path: string, session: Session | null): Promise<string | null> {
  try {
    // KeyCrate is proxied at glowwitdaflow.com; the server can't see that host, so the page
    // says where Stripe should send people back to.
    const res = await fetch(path, {
      method: 'POST',
      headers: { ...authHeaders(session), 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: window.location.origin }),
    });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !json.url) return json.error ?? 'Something went wrong. Try again.';
    window.location.assign(json.url);
    return null;
  } catch {
    return 'You look offline. Try again when connected.';
  }
}

export default function AccessGate({ children }: { children: ReactNode }) {
  const { state, actions } = useKeyCrate();
  const { ready, session } = state;
  const [access, setAccess] = useState<Access | null>(null);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const token = session?.access_token ?? null;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const refresh = useCallback(async () => {
    const fresh = await fetchAccess(sessionRef.current);
    if (fresh) {
      setOffline(false);
      setAccess(fresh);
      writeCache(fresh);
      return fresh;
    }
    setOffline(true);
    setAccess((prev) => prev ?? readCache());
    return null;
  }, []);

  // Check once the crate (and the Supabase session) has loaded, and again on sign-in / out.
  useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, token, refresh]);

  // Back from Stripe Checkout: the webhook can lag a few seconds, so poll until it lands.
  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('subscribed') !== '1') return;
    url.searchParams.delete('subscribed');
    window.history.replaceState(null, '', url.toString());
    let cancelled = false;
    setConfirming(true);
    (async () => {
      for (let i = 0; i < 15 && !cancelled; i++) {
        const a = await refresh();
        if (!a?.enabled || a.state === 'active') break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) setConfirming(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, refresh]);

  // The trial clock: tick every 30 s and re-check the moment it runs out.
  const trialEndsAt = access?.state === 'trial' ? access.trialEndsAt : null;
  useEffect(() => {
    if (!trialEndsAt) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= Date.parse(trialEndsAt)) void refresh();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [trialEndsAt, refresh]);

  // Before the answer, and whenever the paywall is off, the app renders as it always has.
  if (!access || !access.enabled) return <>{children}</>;

  let view: AccessState = access.state;
  if (view === 'trial' && access.trialEndsAt && now >= Date.parse(access.trialEndsAt)) {
    view = 'expired';
  }
  // Offline with a cached sign-in wall: the user can't sign in anyway, so let them work.
  if (offline && view === 'anonymous') view = 'active';

  if (view === 'anonymous') return <SignInWall />;
  if (view === 'expired') {
    return (
      <Paywall
        session={session}
        confirming={confirming}
        offline={offline}
        onRetry={() => void refresh()}
        onSignOut={() => void actions.signOut()}
      />
    );
  }

  return (
    <>
      {view === 'trial' && access.trialEndsAt && (
        <TrialBanner session={session} timeLeft={formatTimeLeft(access.trialEndsAt, now)} />
      )}
      {view === 'active' && access.canManage && <ManageLink session={session} />}
      {confirming && view !== 'active' && (
        <p role="status" className="px-4 py-2 text-center text-xs text-[#808880]">
          Confirming your subscription…
        </p>
      )}
      {children}
    </>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────────────── */

function Wall({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby="kc-wall-title"
      data-testid="kc-wall"
      className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center px-4 py-10"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-[#00ff00]">KeyCrate</p>
      <h1 id="kc-wall-title" className="mt-2 text-2xl font-medium text-white">
        {title}
      </h1>
      {children}
    </section>
  );
}

function SignInWall() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setError(null);
    setBusy(true);
    const err = await signInWithGoogle();
    if (err) {
      setBusy(false);
      setError(err);
    }
  };
  return (
    <Wall title="Build harmonic sets from your rekordbox library">
      <p className="mt-3 text-sm text-[#c8ccc8]">
        Sign in with Google to start. <strong className="text-white">24 hours free</strong>, then{' '}
        {PRICE_LABEL}. No card needed for the free day; cancel any time.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={() => void start()}
          disabled={busy}
          data-testid="kc-wall-signin"
        >
          {busy ? 'Opening Google…' : 'Sign in with Google'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#ff0000]">
          {error}
        </p>
      )}
      <p className="mt-6 text-xs text-[#808880]">
        Your library is stored on this device. Signing in also backs it up to your account.
      </p>
    </Wall>
  );
}

function Paywall({
  session,
  confirming,
  offline,
  onRetry,
  onSignOut,
}: {
  session: Session | null;
  confirming: boolean;
  offline: boolean;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const subscribe = async () => {
    setError(null);
    setBusy(true);
    const err = await goToStripe('/api/keycrate/checkout', session);
    if (err) {
      setBusy(false);
      setError(err);
    }
  };
  return (
    <Wall title="Your free day is over">
      <p className="mt-3 text-sm text-[#c8ccc8]">
        Keep building sets with KeyCrate for <strong className="text-white">{PRICE_LABEL}</strong>.
        Cancel any time from Manage subscription.
      </p>
      <p className="mt-2 text-xs text-[#808880]">
        Your library, playlists and sets are still saved on this device. Subscribe and they are
        right where you left them.
      </p>
      {confirming && (
        <p role="status" className="mt-3 text-sm text-[#00ff00]">
          Confirming your subscription…
        </p>
      )}
      {offline && (
        <p role="status" className="mt-3 text-sm text-[#ffff00]">
          You look offline, so this is the last status this device saw.
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={() => void subscribe()}
          disabled={busy}
          data-testid="kc-subscribe"
        >
          {busy ? 'Opening checkout…' : `Subscribe · ${PRICE_LABEL}`}
        </Button>
        <Button variant="ghost" onClick={onRetry}>
          I already subscribed
        </Button>
        <Button variant="quiet" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#ff0000]">
          {error}
        </p>
      )}
      {session?.user.email && (
        <p className="mt-6 text-xs text-[#808880]">Signed in as {session.user.email}</p>
      )}
    </Wall>
  );
}

function TrialBanner({ session, timeLeft }: { session: Session | null; timeLeft: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const subscribe = async () => {
    setError(null);
    setBusy(true);
    const err = await goToStripe('/api/keycrate/checkout', session);
    if (err) {
      setBusy(false);
      setError(err);
    }
  };
  return (
    <div
      role="region"
      aria-label="Free trial"
      data-testid="kc-trial-banner"
      className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-2 border-b border-[#00ff00]/30 px-4 py-2 text-sm sm:px-6"
    >
      <span className="text-[#c8ccc8]">
        Free trial · <span className="kc-mono text-[#00ff00]">{timeLeft}</span>
        <span className="text-[#808880]"> · then {PRICE_LABEL}</span>
      </span>
      <span className="flex items-center gap-2">
        {error && (
          <span role="alert" className="text-xs text-[#ff0000]">
            {error}
          </span>
        )}
        <Button size="sm" variant="primary" onClick={() => void subscribe()} disabled={busy}>
          {busy ? 'Opening checkout…' : 'Subscribe'}
        </Button>
      </span>
    </div>
  );
}

function ManageLink({ session }: { session: Session | null }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setError(null);
    setBusy(true);
    const err = await goToStripe('/api/keycrate/portal', session);
    if (err) {
      setBusy(false);
      setError(err);
    }
  };
  return (
    <div className="mx-auto flex w-full max-w-[1500px] items-center justify-end gap-2 px-4 pt-2 text-xs sm:px-6">
      {error && (
        <span role="alert" className="text-[#ff0000]">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={() => void open()}
        disabled={busy}
        className="text-[#808880] underline underline-offset-2 hover:text-white disabled:opacity-40"
      >
        {busy ? 'Opening…' : 'Manage subscription'}
      </button>
    </div>
  );
}
