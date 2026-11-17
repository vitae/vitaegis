'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ACCESS_FLAG_COOKIE, PROJECTS_PRICE_LABEL } from '@/lib/projects-access';

interface Props {
  /** The locked project this button buys, e.g. "/travel". */
  project: string;
}

const glass =
  'glass-panel glass-panel--lit glass-panel--hover flex min-h-[52px] w-full items-center justify-center rounded-xl px-8 text-base font-medium tracking-wide text-[#00ff00] transition-colors hover:text-white disabled:opacity-60 sm:w-auto sm:min-w-[160px]';

/** Opens the Stripe pay window for one project. Same glass as the store Buy buttons. */
export default function UnlockProjectsButton({ project }: Props) {
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const flag = document.cookie.split('; ').find((c) => c.startsWith(`${ACCESS_FLAG_COOKIE}=`));
    setUnlocked(!!flag?.split('=')[1]?.split('.').includes(project.slice(1)));
  }, [project]);

  async function checkout() {
    setState('busy');
    try {
      const res = await fetch('/api/projects/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, origin: window.location.origin }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (!data.url) throw new Error('no checkout url');
      window.location.href = data.url;
    } catch {
      setState('error');
    }
  }

  if (unlocked) {
    return (
      <Link href={project} className={glass} style={{ textShadow: '0 0 12px rgba(0,255,0,0.35)' }}>
        <span className="relative z-10">Open</span>
      </Link>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <button
        type="button"
        disabled={state === 'busy'}
        onClick={checkout}
        className={glass}
        style={{ textShadow: '0 0 12px rgba(0,255,0,0.35)' }}
      >
        <span className="relative z-10">
          {state === 'busy' ? 'Redirecting…' : `Unlock · ${PROJECTS_PRICE_LABEL}`}
        </span>
      </button>
      <p className="text-xs text-vitae-red empty:hidden" aria-live="polite">
        {state === 'error' ? 'Could not open checkout. Try again.' : ''}
      </p>
    </div>
  );
}
