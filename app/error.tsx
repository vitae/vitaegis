'use client';

import { useEffect } from 'react';

// After a deploy, a tab or home-screen app opened on the old build can ask for
// script chunks that no longer exist. Reload once to pick up the new build.
const RELOAD_FLAG = 'vitaegis-chunk-reload';

function isChunkError(error: Error) {
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    `${error.name} ${error.message}`,
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    if (!isChunkError(error)) return;
    try {
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, '1');
    } catch {
      return;
    }
    window.location.reload();
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 bg-black">
      <h1 className="text-2xl font-bold text-vitae-green">Something went wrong</h1>
      <p className="text-white/60 max-w-sm">This page hit an error. Reloading usually fixes it.</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2 rounded-full border border-white/20 text-white"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem(RELOAD_FLAG);
            } catch {}
            window.location.reload();
          }}
          className="px-5 py-2 rounded-full bg-vitae-green text-black font-semibold"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
