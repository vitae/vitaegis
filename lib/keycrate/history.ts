/* ═══════════════════════════════════════════════════════════════════════════════
   KeyCrate · undo / redo
   An immutable snapshot stack over the set's item list. Every edit pushes; undo
   and redo walk the stack. Capped so a long session doesn't grow unbounded.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

const CAP = 200;

export const createHistory = <T>(present: T): History<T> => ({ past: [], present, future: [] });

export function push<T>(h: History<T>, next: T): History<T> {
  if (next === h.present) return h;
  const past = [...h.past, h.present];
  if (past.length > CAP) past.shift();
  return { past, present: next, future: [] };
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h;
  const past = h.past.slice(0, -1);
  return { past, present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  const [present, ...future] = h.future;
  return { past: [...h.past, h.present], present, future };
}

/** Replace the present without recording it (e.g. after loading a playlist). */
export const reset = <T>(present: T): History<T> => createHistory(present);

export const canUndo = <T>(h: History<T>) => h.past.length > 0;
export const canRedo = <T>(h: History<T>) => h.future.length > 0;
