// Worked example for the Poison Crit Stun kill sequence at one level 60 gear point.
// Tooltip math only, from the WoW Forever tooltips on forever.warcraftdb.com, not parse results.

export const gearPoint = {
  attackPower: 1000,
  critBeforeTalents: 25,
  mainHand: { speed: 1.8, average: 90 },
  offHand: { speed: 1.4, average: 65 },
  maxEnergy: 115,
  energyPerSecond: 10,
  caption:
    '~1,000 Attack Power, 25% crit before talents, a 1.8-speed main-hand dagger with ~90 average damage and a 1.4-speed off-hand with ~65 average, both poisoned, 115 max Energy (100 + 10 from Vigor, then Expansive Mind’s 5%), 10 Energy a second. Damage is before armor and before misses; a cloth target takes about 15% less from the physical rows, leather about 30% less.',
};

export type NumbersRow = {
  t: number;
  step: string;
  ability: string;
  cost: number;
  gain: number;
  energy: number;
  nonCrit: number | null;
  crit: number | null;
  expected: number;
  running: number;
  note: string;
};

export const numbersRows: NumbersRow[] = [
  { t: 0, step: '02', ability: 'Premeditation', cost: 0, gain: 0, energy: 115, nonCrit: null, crit: null, expected: 0, running: 0, note: '2 combo points from 20 yards.' },
  { t: 0, step: '03', ability: 'Eureka!', cost: 0, gain: 0, energy: 115, nonCrit: null, crit: null, expected: 0, running: 0, note: 'Abilities cost 10% less and hit 10% harder until 8 s.' },
  { t: 0, step: '04', ability: 'Cheap Shot', cost: 40, gain: 0, energy: 75, nonCrit: null, crit: null, expected: 0, running: 0, note: '60 Energy, 40 with Dirty Deeds 2/2. 4 combo points. Stun to 4 s.' },
  { t: 1, step: '05', ability: 'Mutilate', cost: 54, gain: 0, energy: 31, nonCrit: 659, crit: 1450, expected: 1015, running: 1015, note: '5 combo points, the 6th is lost. 45% crit per hand, off-hand at 50%.' },
  { t: 2, step: '07', ability: 'Shank', cost: 5, gain: 25, energy: 61, nonCrit: 103, crit: 206, expected: 134, running: 1149, note: 'Nets +20 Energy. Venom on until 8 s.' },
  { t: 3, step: '·', ability: 'Deadly Poison tick', cost: 0, gain: 0, energy: 71, nonCrit: null, crit: null, expected: 72, running: 1221, note: '~2 stacks × 23 × 1.20 Vile × 1.30 Venom. AP scaling and poison crit not modelled: Forever has not published the numbers.' },
  { t: 4, step: '06', ability: 'Kidney Shot', cost: 25, gain: 0, energy: 56, nonCrit: null, crit: null, expected: 0, running: 1221, note: '6 s stun to 10 s. Everything below 10 s takes ×1.10.' },
  { t: 4, step: '·', ability: 'Instant Poison procs, 0–4 s', cost: 0, gain: 0, energy: 56, nonCrit: null, crit: null, expected: 243, running: 1464, note: '~2 procs of 88 × 1.20 Vile, one inside Venom.' },
  { t: 4, step: '·', ability: 'Auto-attacks, 0–4 s', cost: 0, gain: 0, energy: 56, nonCrit: null, crit: null, expected: 548, running: 2012, note: '~2 main-hand and 3 off-hand swings, 80% landing.' },
  { t: 5, step: '08', ability: 'Mutilate', cost: 54, gain: 0, energy: 12, nonCrit: 725, crit: 1595, expected: 1117, running: 3129, note: '2 combo points, +1 on a crit (Seal Fate), +1 kept from Kidney Shot 40% of the time (Ruthlessness).' },
  { t: 6, step: '·', ability: 'Deadly Poison tick', cost: 0, gain: 0, energy: 22, nonCrit: null, crit: null, expected: 144, running: 3273, note: '~4 stacks, still inside Venom.' },
  { t: 8, step: '·', ability: 'Instant Poison procs, 4–8 s', cost: 0, gain: 0, energy: 42, nonCrit: null, crit: null, expected: 274, running: 3547, note: '~2 procs inside Venom. Eureka! ends here.' },
  { t: 9, step: '·', ability: 'Deadly Poison tick', cost: 0, gain: 0, energy: 52, nonCrit: null, crit: null, expected: 138, running: 3685, note: '5 stacks, Venom over.' },
  { t: 9.8, step: '08', ability: 'Mutilate', cost: 60, gain: 0, energy: 0, nonCrit: 659, crit: 1450, expected: 1015, running: 4700, note: 'Full 60 Energy now. This is the first moment you can afford it, and it empties the bar with 0.2 s of stun left.' },
  { t: 10, step: '·', ability: 'Auto-attacks, 4–10 s', cost: 0, gain: 0, energy: 2, nonCrit: null, crit: null, expected: 868, running: 5568, note: '~3 main-hand and 4 off-hand swings × 1.10 inside Kidney Shot. Stun ends.' },
  { t: 12, step: '·', ability: 'Deadly Poison tick', cost: 0, gain: 0, energy: 22, nonCrit: null, crit: null, expected: 138, running: 5706, note: 'Target is free from 10 s on.' },
  { t: 13, step: '·', ability: 'Instant Poison procs, 8–13 s', cost: 0, gain: 0, energy: 32, nonCrit: null, crit: null, expected: 212, running: 5918, note: '~2 procs, no Venom.' },
  { t: 13.3, step: '·', ability: 'Auto-attacks, 10–13.3 s', cost: 0, gain: 0, energy: 35, nonCrit: null, crit: null, expected: 482, running: 6400, note: '~2 and 2 swings.' },
  { t: 13.3, step: '09', ability: 'Cold Blood Eviscerate', cost: 35, gain: 0, energy: 0, nonCrit: 1330, crit: 2659, expected: 2659, running: 9059, note: '5 points: 958 + 15% AP, ×1.20 Coup de Grace. Guaranteed crit. Lands 3.3 s after the stun ends, and no ×1.10 from Improved Kidney Shot. Energy, not damage, is the limit.' },
];

export const numbersNotes = [
  'Forever has no settled level 60 data yet. These are tooltip math at one gear point, not parse results.',
  'Energy is the wall. From 115 the sequence spends 273 and earns 133 from regen plus 25 from Shank over 13.3 s, so the third Mutilate and the finisher cannot both fit inside Kidney Shot. To land Cold Blood Eviscerate inside the stun, skip the third Mutilate and finish at 8.6 s with 3 or 4 points, or carry Thistle Tea.',
  'Most cloth and leather targets have 3,000 to 4,000 health and are dead around the second Mutilate; the finisher row is what happens when they are not.',
  'Unclear in Forever and left out: the Attack Power coefficient on poisons, whether poison crits use the full multiplier, whether Mutilate’s off-hand hit takes the 50% off-hand penalty, and whether Seal Fate can fire once per hand. Eviscerate and Garrote use the Classic Attack Power coefficients (15% and 18%) because Forever has not published its own.',
];
