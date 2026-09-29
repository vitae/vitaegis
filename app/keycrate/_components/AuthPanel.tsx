'use client';

import { useEffect, useState } from 'react';
import { signInWithGoogle, supabaseBrowser } from '@/lib/keycrate/cloud';
import { useKeyCrate } from '../_state/store';
import { Button } from './ui';

/* Signed out: everything stays local. Signed in with Google: sync the library, save sets to the
   cloud, and stream the Google Drive music folder. */

export default function AuthPanel() {
  const { state, actions } = useKeyCrate();
  const { session, busy, signInPrompt } = state;
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const configured = !!supabaseBrowser();
  const email = session?.user.email;

  // Google sign-in can't be checked before it happens, so an account that isn't on
  // KEYCRATE_ALLOWED_EMAILS is signed straight back out when it returns.
  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/keycrate/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).catch(() => null);
      const json = (await res?.json().catch(() => ({}))) as { allowed?: boolean } | undefined;
      if (!cancelled && res?.ok && json?.allowed === false) {
        await actions.signOut();
        setError(`${email} isn't allowed to use KeyCrate cloud sync`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email, actions]);

  if (!configured) return null;

  if (session) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#808880]">
        <span className="truncate">{session.user.email}</span>
        <Button size="sm" onClick={actions.syncLibrary} disabled={!!busy} data-testid="kc-sync">
          {busy ?? 'Sync library'}
        </Button>
        <Button
          size="sm"
          onClick={actions.saveToCloud}
          disabled={!!busy || state.set.history.present.length === 0}
        >
          Save set to cloud
        </Button>
        <Button size="sm" variant="quiet" onClick={actions.signOut}>
          Sign out
        </Button>
      </div>
    );
  }

  const startGoogle = async () => {
    setError(null);
    setRedirecting(true);
    const err = await signInWithGoogle();
    if (err) {
      setRedirecting(false);
      setError(err);
    }
  };

  const google = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="md"
        variant="primary"
        onClick={() => void startGoogle()}
        disabled={redirecting}
        data-testid="kc-google-signin"
      >
        {redirecting ? 'Opening Google…' : 'Sign in with Google'}
      </Button>
      {error && <span className="text-xs text-[#ff0000]">{error}</span>}
    </div>
  );

  if (signInPrompt) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in to save to the cloud"
        className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      >
        <div className="w-full max-w-md rounded-lg border border-white/15 bg-black p-4">
          <p className="text-sm text-white">
            Sign in with Google to save sets to the cloud and play your Google Drive music.
          </p>
          <p className="mb-3 text-xs text-[#808880]">
            Everything you have built stays on this device either way.
          </p>
          {google}
          <div className="mt-3 flex justify-end">
            <Button variant="quiet" onClick={() => actions.requestSignIn(false)}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="quiet" onClick={() => actions.requestSignIn(true)}>
        Sign in with Google
      </Button>
      {error && <span className="text-xs text-[#ff0000]">{error}</span>}
    </div>
  );
}
