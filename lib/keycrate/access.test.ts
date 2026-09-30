import { describe, expect, it } from 'vitest';
import { decideAccess, formatTimeLeft, isPaid, parseEmails, TRIAL_MS } from './access';

const start = '2026-09-30T12:00:00.000Z';
const at = (ms: number) => Date.parse(start) + ms;

describe('decideAccess', () => {
  it('is anonymous without a user', () => {
    expect(decideAccess({ userId: null, now: at(0) })).toEqual({
      state: 'anonymous',
      trialEndsAt: null,
    });
  });

  it('gives 24 hours from the first sign-in', () => {
    const d = decideAccess({ userId: 'u', trialStartedAt: start, now: at(TRIAL_MS - 1) });
    expect(d.state).toBe('trial');
    expect(d.trialEndsAt).toBe('2026-10-01T12:00:00.000Z');
  });

  it('expires at exactly 24 hours', () => {
    expect(decideAccess({ userId: 'u', trialStartedAt: start, now: at(TRIAL_MS) }).state).toBe(
      'expired',
    );
  });

  it('starts the trial now when there is no row yet', () => {
    const d = decideAccess({ userId: 'u', trialStartedAt: null, now: at(0) });
    expect(d.state).toBe('trial');
    expect(d.trialEndsAt).toBe('2026-10-01T12:00:00.000Z');
  });

  it('is active with a paid subscription, during or after the trial', () => {
    for (const status of ['active', 'trialing', 'past_due']) {
      expect(
        decideAccess({
          userId: 'u',
          trialStartedAt: start,
          subscriptionStatus: status,
          now: at(TRIAL_MS * 30),
        }).state,
      ).toBe('active');
    }
  });

  it('is expired after the trial when the subscription is not paid', () => {
    for (const status of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused']) {
      expect(
        decideAccess({
          userId: 'u',
          trialStartedAt: start,
          subscriptionStatus: status,
          now: at(TRIAL_MS + 1),
        }).state,
      ).toBe('expired');
    }
  });

  it('keeps a canceled subscriber in the trial if the day is not over', () => {
    expect(
      decideAccess({
        userId: 'u',
        trialStartedAt: start,
        subscriptionStatus: 'canceled',
        now: at(1000),
      }).state,
    ).toBe('trial');
  });

  it('comps KEYCRATE_FREE_EMAILS, case-insensitively', () => {
    const d = decideAccess({
      userId: 'u',
      email: 'Owner@Example.com ',
      trialStartedAt: start,
      freeEmails: parseEmails(' owner@example.com, other@example.com'),
      now: at(TRIAL_MS * 100),
    });
    expect(d).toEqual({ state: 'active', trialEndsAt: null });
  });

  it('treats a bad timestamp as starting now', () => {
    expect(decideAccess({ userId: 'u', trialStartedAt: 'nope', now: at(0) }).state).toBe('trial');
  });
});

describe('helpers', () => {
  it('parses email lists', () => {
    expect(parseEmails(undefined)).toEqual([]);
    expect(parseEmails(' A@b.co, ,c@d.co ')).toEqual(['a@b.co', 'c@d.co']);
  });

  it('knows paid statuses', () => {
    expect(isPaid('active')).toBe(true);
    expect(isPaid(null)).toBe(false);
    expect(isPaid('canceled')).toBe(false);
  });

  it('formats time left', () => {
    const ends = new Date(at(TRIAL_MS)).toISOString();
    expect(formatTimeLeft(ends, at(0))).toBe('24h 0m left');
    expect(formatTimeLeft(ends, at(TRIAL_MS - 9 * 60_000 - 5))).toBe('9m left');
    expect(formatTimeLeft(ends, at(TRIAL_MS - 30_000))).toBe('less than a minute left');
    expect(formatTimeLeft(ends, at(TRIAL_MS))).toBe('Trial ended');
  });
});
