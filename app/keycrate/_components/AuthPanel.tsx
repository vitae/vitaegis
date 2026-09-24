'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/keycrate/cloud';
import { useKeyCrate } from '../_state/store';
import { Button, inputClass } from './ui';

/* Signed out: everything stays local. Signed in: sync the library and save sets to the cloud. */

export default function AuthPanel() {
  const { state, actions } = useKeyCrate();
  const { session, busy, signInPrompt } = state;
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = !!supabaseBrowser();

  if (!configured) return null;

  if (session) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#808880]">
        <span className="truncate">{session.user.email}</span>
        <Button size="sm" onClick={actions.syncLibrary} disabled={!!busy} data-testid="kc-sync">
          {busy ?? 'Sync library'}
        </Button>
        <Button size="sm" onClick={actions.saveToCloud} disabled={!!busy || state.set.history.present.length === 0}>
          Save set to cloud
        </Button>
        <Button size="sm" variant="quiet" onClick={actions.signOut}>
          Sign out
        </Button>
      </div>
    );
  }

  const form = (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const res = await fetch('/api/keycrate/signin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        const json = (await res.json().catch(() => ({}))) as { error?: string; allowed?: boolean };
        if (!res.ok) {
          setError(json.error ?? 'Could not send the link');
          return;
        }
        if (json.allowed) {
          const sb = supabaseBrowser();
          const { error: err } = await sb!.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/keycrate` } });
          if (err) {
            setError(err.message);
            return;
          }
        }
        setSent(true);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email for magic link" className={`${inputClass} w-56`} />
      <Button type="submit" size="md" variant="primary">
        Email me a sign-in link
      </Button>
      {sent && <span className="text-xs text-[#00ff00]">If that address is allowed, a link is on its way.</span>}
      {error && <span className="text-xs text-[#ff0000]">{error}</span>}
    </form>
  );

  if (signInPrompt) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Sign in to save to the cloud" className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center">
        <div className="w-full max-w-md rounded-lg border border-white/15 bg-black p-4">
          <p className="text-sm text-white">Sign in to save this set to the cloud and share it.</p>
          <p className="mb-3 text-xs text-[#808880]">Everything you have built stays on this device either way.</p>
          {form}
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
    <Button size="sm" variant="quiet" onClick={() => actions.requestSignIn(true)}>
      Sign in for cloud sync
    </Button>
  );
}
