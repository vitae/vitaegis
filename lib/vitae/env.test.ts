import { afterEach, describe, expect, it } from 'vitest';
import { vitaeClientEnabled, vitaeServerEnabled } from './env';

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe('vitae env', () => {
  it('server is enabled only with key and agent id', () => {
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_AGENT_ID;
    expect(vitaeServerEnabled()).toBe(false);
    process.env.ELEVENLABS_API_KEY = 'k';
    expect(vitaeServerEnabled()).toBe(false);
    process.env.ELEVENLABS_AGENT_ID = 'a';
    expect(vitaeServerEnabled()).toBe(true);
  });
  it('client flag is the literal 1', () => {
    process.env.NEXT_PUBLIC_VITAE_ENABLED = 'true';
    expect(vitaeClientEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_VITAE_ENABLED = '1';
    expect(vitaeClientEnabled()).toBe(true);
  });
});
