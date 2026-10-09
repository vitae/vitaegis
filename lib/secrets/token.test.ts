import { describe, expect, it } from 'vitest';
import { signSecretsToken, verifySecretsToken } from './token';

const secret = 'test-signing-secret';
const now = 1_800_000_000;

describe('secrets token', () => {
  it('round-trips valid claims', () => {
    const token = signSecretsToken({ sid: 'cs_test_123', exp: now + 60 }, secret);
    expect(verifySecretsToken(token, secret, now)).toEqual({ sid: 'cs_test_123', exp: now + 60 });
  });

  it('rejects an expired token', () => {
    const token = signSecretsToken({ sid: 'cs_test_123', exp: now - 1 }, secret);
    expect(verifySecretsToken(token, secret, now)).toBeNull();
  });

  it('rejects a token signed with another secret', () => {
    const token = signSecretsToken({ sid: 'cs_test_123', exp: now + 60 }, 'other');
    expect(verifySecretsToken(token, secret, now)).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const token = signSecretsToken({ sid: 'cs_test_123', exp: now + 60 }, secret);
    const [, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sid: 'cs_forged', exp: now + 60 })).toString(
      'base64url',
    );
    expect(verifySecretsToken(`${forged}.${sig}`, secret, now)).toBeNull();
  });

  it('rejects garbage, empty and missing tokens', () => {
    expect(verifySecretsToken('', secret, now)).toBeNull();
    expect(verifySecretsToken(undefined, secret, now)).toBeNull();
    expect(verifySecretsToken('nodot', secret, now)).toBeNull();
    expect(verifySecretsToken('a.b', secret, now)).toBeNull();
    expect(verifySecretsToken('a.b', '', now)).toBeNull();
  });
});
