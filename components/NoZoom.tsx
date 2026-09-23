'use client';

import { useEffect } from 'react';

/**
 * Locks page zoom on touch devices. iOS Safari ignores `user-scalable=no` in the viewport
 * tag, so pinch gestures are cancelled here (no touchmove listener, so scrolling stays
 * off the main thread); double-tap zoom is off via `touch-action`.
 */
export default function NoZoom() {
  useEffect(() => {
    const cancel = (e: Event) => e.preventDefault();
    const cancelPinch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    document.addEventListener('gesturestart', cancel, { passive: false });
    document.addEventListener('gesturechange', cancel, { passive: false });
    document.addEventListener('gestureend', cancel, { passive: false });
    document.addEventListener('touchstart', cancelPinch, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', cancel);
      document.removeEventListener('gesturechange', cancel);
      document.removeEventListener('gestureend', cancel);
      document.removeEventListener('touchstart', cancelPinch);
    };
  }, []);

  return null;
}
