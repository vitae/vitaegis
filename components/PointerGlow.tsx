'use client';

import { useEffect } from 'react';

/**
 * Lights the glass under the pointer. One passive listener for the whole site writes the
 * pointer position into CSS variables on the pane being hovered; the highlight itself is
 * drawn in CSS (.glass-panel::after), so nothing re-renders.
 */
export default function PointerGlow() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let frame = 0;
    let current: HTMLElement | null = null;
    let x = 0;
    let y = 0;

    const paint = () => {
      frame = 0;
      if (!current) return;
      const rect = current.getBoundingClientRect();
      current.style.setProperty('--mx', `${x - rect.left}px`);
      current.style.setProperty('--my', `${y - rect.top}px`);
      current.style.setProperty('--lit', '1');
    };

    const onMove = (e: PointerEvent) => {
      const pane = (e.target as Element | null)?.closest<HTMLElement>('.glass-panel') ?? null;
      if (pane !== current) {
        current?.style.setProperty('--lit', '0');
        current = pane;
      }
      x = e.clientX;
      y = e.clientY;
      if (current && !frame) frame = requestAnimationFrame(paint);
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
      current?.style.setProperty('--lit', '0');
    };
  }, []);

  return null;
}
