'use client';

import { useEffect } from 'react';

/**
 * Locks page zoom on touch devices. iOS Safari ignores `user-scalable=no` in the viewport
 * tag, so pinch gestures are cancelled here; double-tap zoom is off via `touch-action`.
 */
export default function NoZoom() {
  useEffect(() => {
    const cancel = (e: Event) => e.preventDefault();
    const cancelPinch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    const cancelScale = (e: TouchEvent) => {
      // Safari reports the pinch scale on touchmove; anything other than 1 is a zoom
      if ((e as TouchEvent & { scale?: number }).scale !== undefined && (e as TouchEvent & { scale: number }).scale !== 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('gesturestart', cancel, { passive: false });
    document.addEventListener('gesturechange', cancel, { passive: false });
    document.addEventListener('gestureend', cancel, { passive: false });
    document.addEventListener('touchstart', cancelPinch, { passive: false });
    document.addEventListener('touchmove', cancelScale, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', cancel);
      document.removeEventListener('gesturechange', cancel);
      document.removeEventListener('gestureend', cancel);
      document.removeEventListener('touchstart', cancelPinch);
      document.removeEventListener('touchmove', cancelScale);
    };
  }, []);

  return null;
}
