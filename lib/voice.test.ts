import { describe, expect, it } from 'vitest';
import { SIGNATURE_PHRASES, VITAE_VOICE } from './voice';

describe('VITAE_VOICE', () => {
  it('carries every signature phrase into the prompt', () => {
    for (const { phrase } of SIGNATURE_PHRASES) expect(VITAE_VOICE).toContain(`"${phrase}"`);
  });

  it('includes Wealth Whispers and Wealth of Wisdom', () => {
    const phrases = SIGNATURE_PHRASES.map((p) => p.phrase);
    expect(phrases).toContain('Wealth Whispers');
    expect(phrases).toContain('Wealth of Wisdom');
  });
});
