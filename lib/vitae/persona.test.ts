import { describe, expect, it } from 'vitest';
import { VITAE_FIRST_MESSAGE, buildPersonaPrompt } from './persona';
import { VITAE_VOICE } from '@/lib/voice';

describe('persona prompt', () => {
  const prompt = buildPersonaPrompt();
  it('carries the Language of Vitae', () => {
    expect(prompt).toContain(VITAE_VOICE);
  });
  it('states who Vitae is and is not', () => {
    expect(prompt).toMatch(/You are Vitae/);
    expect(prompt).toMatch(/never claim to be Anthony/i);
  });
  it('requires confirmation before checkout and limits length', () => {
    expect(prompt).toMatch(/name and price/i);
    expect(prompt).toMatch(/one to three/i);
  });
  it('has a short first message', () => {
    expect(VITAE_FIRST_MESSAGE.length).toBeLessThan(120);
  });
});
