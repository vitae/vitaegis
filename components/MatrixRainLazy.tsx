'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const MatrixRainGPU = dynamic(() => import('@/components/MatrixRainGPU'), { ssr: false });

/** Mounts the rain once the browser is idle, so the page paints and becomes usable first. */
export default function MatrixRainLazy() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(id);
  }, []);

  return ready ? <MatrixRainGPU /> : <div className="fixed inset-0 z-0 bg-black" aria-hidden />;
}
