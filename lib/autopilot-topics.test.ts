import { describe, expect, it } from 'vitest';
import { autopilotNote, buildTopics, pickTopic, slotOpen, type Topic } from './autopilot-topics';
import { pillars } from './pillars';

const t = (key: string, pillar: string): Topic => ({
  key,
  pillar,
  dossier: 'd',
  title: key,
  detail: '',
});

describe('buildTopics', () => {
  it('turns every pillar dossier entry into a unique topic', () => {
    const topics = buildTopics(pillars);
    expect(topics.length).toBeGreaterThan(20);
    expect(new Set(topics.map((x) => x.key)).size).toBe(topics.length);
    expect(new Set(topics.map((x) => x.pillar))).toEqual(new Set(['Health', 'Stealth', 'Wealth']));
  });
});

describe('pickTopic', () => {
  const topics = [t('a', 'Health'), t('b', 'Health'), t('c', 'Wealth'), t('d', 'Stealth')];

  it('never repeats a recent topic while fresh ones remain', () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(['c', 'd']).toContain(pickTopic(topics, ['a', 'b'], seed)!.key);
    }
  });

  it('moves off the last pillar', () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(pickTopic(topics, ['a'], seed)!.pillar).not.toBe('Health');
    }
  });

  it('brings back the longest-rested topic once all are used', () => {
    expect(pickTopic(topics, ['d', 'c', 'b', 'a'], 3)!.key).toBe('a');
  });

  it('returns null with no topics', () => {
    expect(pickTopic([], [], 1)).toBeNull();
  });
});

describe('slotOpen', () => {
  const now = new Date('2026-10-01T12:00:00Z');
  const ago = (h: number) => new Date(now.getTime() - h * 3_600_000);

  it('opens on an empty history', () => {
    expect(slotOpen(now, [], 4)).toBe(true);
  });

  it('spaces posts evenly across the day', () => {
    expect(slotOpen(now, [ago(2)], 4)).toBe(false); // 6h spacing
    expect(slotOpen(now, [ago(5.5)], 4)).toBe(true); // within the 90% tolerance
  });

  it('caps the rolling 24 hours', () => {
    expect(slotOpen(now, [ago(7), ago(13), ago(19), ago(23)], 4)).toBe(false);
    expect(slotOpen(now, [ago(7), ago(13), ago(19), ago(25)], 4)).toBe(true);
  });
});

describe('autopilotNote', () => {
  it('asks for a generated video so the caption stage renders one', () => {
    expect(autopilotNote(t('a', 'Health'))).toMatch(/\bgenerate\b/i);
  });
});
