import { describe, expect, it } from 'vitest';
import { canRedo, canUndo, createHistory, push, redo, undo } from './history';

describe('history', () => {
  it('undoes and redoes in order, and a new edit clears the future', () => {
    let h = createHistory<string[]>([]);
    h = push(h, ['a']);
    h = push(h, ['a', 'b']);
    expect(canUndo(h)).toBe(true);
    h = undo(h);
    expect(h.present).toEqual(['a']);
    expect(canRedo(h)).toBe(true);
    h = redo(h);
    expect(h.present).toEqual(['a', 'b']);
    h = undo(h);
    h = push(h, ['a', 'c']);
    expect(canRedo(h)).toBe(false);
    h = undo(h);
    h = undo(h);
    expect(h.present).toEqual([]);
    expect(undo(h)).toBe(h);
  });
  it('ignores identical pushes', () => {
    const h = createHistory(1);
    expect(push(h, 1)).toBe(h);
  });
});
