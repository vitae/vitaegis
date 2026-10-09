import { describe, expect, it } from 'vitest';
import { books } from './books';

describe('books canon', () => {
  it('has ten books with unique codes', () => {
    expect(books).toHaveLength(10);
    expect(new Set(books.map((b) => b.code)).size).toBe(10);
  });

  it('maps every book to at least one pillar', () => {
    for (const b of books) expect(b.pillars.length).toBeGreaterThan(0);
  });
});
