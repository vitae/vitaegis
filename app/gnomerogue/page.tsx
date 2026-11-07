import type { Metadata } from 'next';
import Link from 'next/link';
import { poisonCritTrees, trees, type Talent, type Tree } from './talents';
import TalentCalculator from './TalentCalculator';
import { gearPoint, numbersNotes, numbersRows } from './numbers';

const TAVERN_URL = 'https://www.warcrafttavern.com/forever/tools/talent-calculator/rogue';

export const metadata: Metadata = {
  title: 'Gnome Rogue PvP Builds | WoW Forever | VITAEGIS',
  description:
    'Two level 60 Gnome Rogue PvP specs for WoW Forever: the 31/8/12 Poison Crit Stun build that stuns, poisons and kills inside one window, and the 10/5/36 Subtlety Ambush and Death Mark build.',
  openGraph: {
    title: 'Gnome Rogue PvP Builds | WoW Forever',
    description: 'The 31/8/12 Poison Crit Stun spec and the 10/5/36 Subtlety spec, with the full talent trees.',
    type: 'article',
  },
};

const icon = (name: string) => `/gnomerogue/icons/${name}.jpg`;

const CELL = 56;
const ROW = 72;
const COL = 68;
const PAD = 16;
const HEAD = 56;

type Step = { step: string; icon: string; text: string; damage?: string };
type Poison = { name: string; icon: string; text: string };
type Gear = { title: string; text: string };

const racials: { name: string; icon: string; kind: string; text: string }[] = [
  {
    name: 'Escape Artist',
    icon: 'ability_rogue_trip',
    kind: 'Active · 2 min cooldown',
    text: 'Removes every root and snare and makes you immune to new ones for 3 seconds. It no longer has a chance to fail. This is the reason to play a Gnome: Frost Nova, Entangling Roots, Hamstring and Wing Clip stop being a death sentence.',
  },
  {
    name: 'Eureka!',
    icon: 'inv_gnometoy',
    kind: 'Active · short burst window',
    text: 'New in Forever. Your damaging abilities cost less and hit about 10% harder for a few seconds. Press it right before Ambush so the opener and the hits that feed Death Mark all land inside it.',
  },
  {
    name: 'Expansive Mind',
    icon: 'inv_enchant_essenceeternallarge',
    kind: 'Passive',
    text: 'Now raises your maximum Energy instead of Intellect. Guides list it at 5% to 10% depending on the build they tested, so check the tooltip in game. A bigger Energy pool means one more global in every burst.',
  },
  {
    name: 'Engineering Specialization',
    icon: 'inv_misc_gear_01',
    kind: 'Passive',
    text: 'Makes your Engineering devices less likely to backfire. Engineering is the PvP profession, so this trait is never wasted.',
  },
];

const sequence: Step[] = [
  { step: 'Stealth', icon: 'ability_stealth', text: 'Pick the target and the angle. Camouflage keeps you close to run speed.' },
  { step: 'Premeditation', icon: 'spell_shadow_possession', text: 'Two free combo points from 20 yards, before you open.' },
  { step: 'Eureka!', icon: 'inv_gnometoy', text: 'Pop the racial as you close the last few yards.' },
  { step: 'Ambush', icon: 'ability_rogue_ambush', text: 'On cloth and leather. Initiative adds a combo point. Open with Cheap Shot on plate, or on anyone you need to hold still.' },
  { step: 'Kidney Shot', icon: 'ability_rogue_kidneyshot', text: 'Spend the points on the stun so nothing that follows can be answered.' },
  { step: 'Hemorrhage and Shank', icon: 'spell_shadow_lifedrain', text: 'Rebuild to five. Boot Knife makes every Shank worth two combo points.' },
  { step: 'Death Mark', icon: 'ability_creature_cursed_02', text: 'Five points. It stores 60% of your damage for 6 seconds, then deals it all at once.' },
  { step: 'Ghostly Strike into Ambush', icon: 'spell_shadow_curse', text: 'Ghostly Strike lets the next Ambush land out of Stealth. That second Ambush goes straight into the mark.' },
  { step: 'Eviscerate', icon: 'ability_rogue_eviscerate', text: 'Finish as the mark detonates. Gouge if you need Energy first.' },
  { step: 'Vanish and Preparation', icon: 'ability_vanish', text: 'Vanish and open again. Preparation resets Vanish, Sprint, Evasion and Premeditation for a third go.' },
];

const poisons: Poison[] = [
  { name: 'Crippling Poison', icon: 'ability_poisonsting', text: 'Main hand by default. Nobody walks away from you.' },
  { name: 'Wound Poison', icon: 'inv_misc_herb_16', text: 'Off hand against healers and anyone with a self heal.' },
  { name: 'Mind-Numbing Poison', icon: 'spell_nature_nullifydisease', text: 'Swap in against casters to stretch their cast times.' },
];

const gear: Gear[] = [
  { title: 'Weapons', text: 'Two daggers. Ambush needs a dagger in the main hand, and Ghostly Strike and Hemorrhage both hit harder with one. Put the slowest, hardest-hitting dagger in the main hand.' },
  { title: 'Stats', text: 'Agility first, then Attack Power and critical strike. Poisons now scale with Attack Power and can crit. Keep Stamina high: a dead rogue does no burst.' },
  { title: 'Hit', text: 'This build skips Precision. Hit rating from gear covers players, who are the same level as you. Pick up Precision if you also raid on this spec.' },
  { title: 'Professions', text: 'Engineering for grenades and gadgets, which pairs with the Gnome racial. Leatherworking or Alchemy as the second, depending on whether you want gear or potions.' },
];

const poisonCritSequence: Step[] = [
  {
    step: 'Stealth',
    icon: 'ability_stealth',
    text: 'Deadly Poison on the main hand, Instant Poison on the off hand. Master of Deception keeps you unseen, and with Dirty Deeds you no longer need to be behind them.',
    damage: '0 damage \u00b7 Deadly Poison V: 30% per hit, 92 Nature over 12 s a stack, 5 stacks \u00b7 Instant Poison VI: 20% per hit, 76\u2013100 Nature \u00b7 both \u00d71.20 (Vile Poisons), +6% apply chance (Improved Poisons 3/5), +5% crit (Malice)',
  },
  {
    step: 'Premeditation',
    icon: 'spell_shadow_possession',
    text: 'Two free combo points from 20 yards, before you open. Two minute cooldown, so it is there for the first opener of every fight.',
    damage: '0 damage \u00b7 0 Energy \u00b7 +2 combo points \u00b7 20 yd \u00b7 2 min cooldown',
  },
  {
    step: 'Eureka!',
    icon: 'inv_gnometoy',
    text: 'Pop the racial as you close the last few yards so the whole stun lands inside it.',
    damage: '0 damage \u00b7 damaging abilities cost 10% less Energy and deal \u00d71.10 for 8 s \u00b7 2 min cooldown \u00b7 periodic damage (poison ticks, Garrote) is not boosted',
  },
  {
    step: 'Cheap Shot or Garrote',
    icon: 'ability_rogue_garrote',
    text: 'Cheap Shot when you want the full stun chain: four seconds and two more combo points, so you are at four before you have swung. Garrote from the front when you want guaranteed damage instead: Dirty Deeds drops the behind requirement, Opportunity adds 20%, Blood Splatter stretches the bleed, and you are at three. Either way Dirty Deeds makes the opener 20 Energy cheaper.',
    damage: 'Cheap Shot: 0 damage \u00b7 40 Energy with Dirty Deeds 2/2 \u00b7 +2 combo points \u00b7 4 s stun. Garrote: 552 over 18 s (rank 6) + 18% of Attack Power, \u00d71.20 (Opportunity), +9 s (Blood Splatter) \u00b7 30 Energy \u00b7 +1 combo point \u00b7 bleed, cannot be dispelled',
  },
  {
    step: 'Mutilate',
    icon: 'ability_rogue_deadlybrew',
    text: 'Both daggers, 20% harder once the first poison lands. This takes you to five from either opener. After Cheap Shot the spare point is lost, and that is fine: the press is for the poison and the damage.',
    damage: '90% weapon damage + 71 per hand (rank 3) \u00b7 60 Energy, 54 under Eureka! \u00b7 \u00d71.20 vs poisoned (Mutilate) \u00b7 \u00d71.20 (Opportunity) \u00b7 crit +15% (Puncturing Wounds) +5% (Malice) \u00b7 crit damage \u00d72.2 (Lethality) \u00b7 +2 combo points, +1 per crit (Seal Fate)',
  },
  {
    step: 'Kidney Shot',
    icon: 'ability_rogue_kidneyshot',
    text: 'Five points as Cheap Shot ends, or straight after the Mutilate if you opened with Garrote. Improved Kidney Shot makes them take 10% more from your poisons and attacks for the whole stun.',
    damage: '0 damage \u00b7 25 Energy \u00b7 6 s stun at 5 points (rank 2) \u00b7 target takes \u00d71.10 from your attacks and poisons for the stun (Improved Kidney Shot) \u00b7 40% chance to keep 1 combo point (Ruthlessness) \u00b7 20 s cooldown',
  },
  {
    step: 'Shank',
    icon: 'inv_sword_31',
    text: 'Venom: poison damage up 30% and poisons apply 20% more often for 6 seconds. Every Mutilate that follows is inside that window.',
    damage: '50% off-hand weapon damage (rank 2) \u00b7 5 Energy, generates 25 \u00b7 cannot miss \u00b7 10 s cooldown \u00b7 Venom: poison damage \u00d71.30 and +20% apply chance for 6 s \u00b7 no combo point without Boot Knife',
  },
  {
    step: 'Mutilate, Mutilate',
    icon: 'ability_rogue_deadlybrew',
    text: 'Puncturing Wounds gives each one 15% more crit, Lethality makes the crits 20% bigger, and Seal Fate turns each crit into an extra combo point. Deadly Poison stacks twice a press.',
    damage: 'Same formula \u00d71.10 inside Kidney Shot (Improved Kidney Shot) \u00b7 54 Energy, then 60 once Eureka! ends at 8 s \u00b7 Deadly Poison 30% + 6% + 20% (Venom) per hit, two hits a press',
  },
  {
    step: 'Cold Blood into Eviscerate',
    icon: 'spell_ice_lament',
    text: 'Five points, a guaranteed crit, Coup de Grace adds 20%. This is the kill, still inside the stun.',
    damage: '904\u20131012 at 5 points (rank 9) + 15% of Attack Power \u00b7 35 Energy, 32 under Eureka! \u00b7 \u00d71.20 (Coup de Grace) \u00b7 \u00d71.10 if still inside Kidney Shot \u00b7 100% crit (Cold Blood), crit \u00d72.0: Lethality does not cover Eviscerate',
  },
  {
    step: 'Vanish and again',
    icon: 'ability_vanish',
    text: 'If anyone is left, Vanish and open with Cheap Shot on the next one. Remorseless Attacks gives the first Mutilate after a kill 40% more crit.',
    damage: '0 damage \u00b7 5 min cooldown \u00b7 Remorseless Attacks: next Mutilate +40% crit for 20 s after a kill \u00b7 Deadly Poison keeps ticking for up to 12 s after you leave',
  },
];


const poisonCritPoisons: Poison[] = [
  { name: 'Deadly Poison', icon: 'ability_rogue_dualweild', text: 'Main hand. Stacks to five fast with Mutilate swinging both daggers, and Vile Poisons adds 20% damage.' },
  { name: 'Instant Poison', icon: 'ability_poisons', text: 'Off hand. Direct damage on every proc, which the fast off-hand dagger procs often. This is the damage pick.' },
  { name: 'Wound Poison', icon: 'inv_misc_herb_16', text: 'Swap onto the off hand against healers and anyone with a self heal. Crippling Poison goes there instead when you are being kited.' },
];

const poisonCritGear: Gear[] = [
  { title: 'Weapons', text: 'Two daggers, and Mutilate will not fire without them. It hits with both, so the main hand wants the hardest-hitting dagger you can find and the off hand wants the fastest one for poison procs.' },
  { title: 'Stats', text: 'Critical strike first, since Puncturing Wounds, Seal Fate, Lethality, Cold Blood and Malice all pay out on crits, then Attack Power. The build skips Precision, so take hit from gear: a missed Kidney Shot is a lost fight.' },
  { title: 'Why 31 / 8 / 12', text: 'Thirty-one in Assassination for Mutilate and every poison and crit talent on the way. Eight in Combat for Puncturing Wounds and Coup de Grace, the two biggest damage talents outside the main tree. Twelve in Subtlety for Opportunity, which is 20% on Mutilate and Garrote, Dirty Deeds maxed so Garrote works from the front and the opener costs 20 less Energy, and Premeditation so Kidney Shot lands on time in every opener. One point in Camouflage is enough: you are not racing anyone in Stealth. Death Mark, Preparation and the escape talents are gone on purpose: this build kills inside the first stun or Vanishes to try again.' },
  { title: 'Professions', text: 'Engineering for grenades, which land harder on a target you have stunned with Improved Kidney Shot, and the Gnome racial.' },
];

const poisonCritDuos: Partners[] = [
  {
    name: 'Mage, Fire or Arcane',
    tag: 'Most lethal · double burst',
    icons: ['classicon_mage'],
    text: 'The fastest kill either of you can set up. Your Cheap Shot and Kidney Shot give the mage ten seconds of free casting, and Pyroblast, Fire Blast and your Cold Blood Eviscerate land in the same window. Polymorph or Frost Nova takes the second player out while it happens. Nobody heals, so if the opener misses you both reset with Vanish and Blink.',
  },
  {
    name: 'Holy Paladin',
    tag: 'Longest stun window',
    icons: ['classicon_paladin'],
    text: 'Hammer of Justice on the end of your Kidney Shot nearly doubles the window where Mutilate does 20% more to a poisoned target. Blessing of Freedom keeps you in melee when Escape Artist is down, Cleanse strips what gets you kited, and Blessing of Protection replaces the Preparation this build gave up.',
  },
];

type Partners = { name: string; tag: string; icons: string[]; text: string };

const duos: Partners[] = [
  {
    name: 'Discipline or Holy Priest',
    tag: 'Best all-around · healer duo',
    icons: ['classicon_priest'],
    text: 'Rogue and Priest is the time-tested pair and the base of Rogue, Mage, Priest in threes. The priest shields and dispels you, and Psychic Scream controls the second player while you kill the first. Subtlety lives on clean setups and clean resets: the priest covers your defensive gaps while Escape Artist keeps you on the kill target during your go.',
  },
  {
    name: 'Mage, Fire or Arcane',
    tag: 'Best double damage duo',
    icons: ['classicon_mage'],
    text: 'The classic kill pair. The mage brings damage, reliable slows and long control chains: Polymorph or Frost Nova holds one target while your stuns hold the other, and the burst lands inside your Kidney Shot. Sap and Polymorph together take a whole second player out of the fight. Frost trades some damage for even more control.',
  },
  {
    name: 'Restoration Druid',
    tag: 'Double stealth',
    icons: ['classicon_druid'],
    text: 'Two stealthers pick every fight. You both open from Stealth, the druid roots and heals over time while staying mobile, and neither of you can be forced into a fight you did not choose.',
  },
  {
    name: 'Holy Paladin',
    tag: 'Longest stun chain',
    icons: ['classicon_paladin'],
    text: 'Hammer of Justice extends your stun chain, Blessing of Freedom covers the snares Escape Artist is on cooldown for, and Blessing of Protection saves you from a warrior or another rogue.',
  },
];

const trios: Partners[] = [
  {
    name: 'Mage and Discipline Priest',
    tag: 'Most control',
    icons: ['classicon_mage', 'classicon_priest'],
    text: 'Rogue, Mage, Priest. The most control of any three: Sap, Polymorph and Psychic Scream on the others while you and the mage kill one target inside a stun. Hard to play, and the highest ceiling.',
  },
  {
    name: 'Warlock and Restoration Druid',
    tag: 'Spread pressure',
    icons: ['classicon_warlock', 'classicon_druid'],
    text: 'Pressure everywhere. The warlock spreads damage over time and Fears, the druid keeps both of you alive on the move, and your Death Mark burst finishes whoever the curses have worn down.',
  },
  {
    name: 'Arms Warrior and Holy Paladin',
    tag: 'Double melee',
    icons: ['classicon_warrior', 'classicon_paladin'],
    text: 'Two melee on one target with a healer behind them. Mortal Strike covers the healing reduction, so run Crippling Poison on both daggers, and chain Kidney Shot into Hammer of Justice.',
  },
];

const sources: { label: string; href: string }[] = [
  { label: 'Warcraft Tavern: Subtlety Rogue Guide', href: 'https://www.warcrafttavern.com/forever/guides/subtlety-rogue/' },
  { label: 'Warcraft Tavern: Rogue Talent Calculator', href: 'https://www.warcrafttavern.com/forever/tools/talent-calculator/rogue' },
  { label: 'Icy Veins: Gnome Race Guide', href: 'https://www.icy-veins.com/wow-forever/gnome-race-guide' },
  { label: 'Icy Veins: Best Races tier list', href: 'https://www.icy-veins.com/wow-forever/news/the-best-races-in-wow-forever-pve-and-pvp-tier-list/' },
  { label: 'Warcraft Tavern: Gnome Racial Abilities', href: 'https://www.warcrafttavern.com/forever/guides/gnome-racials/' },
  { label: 'Warcraft Tavern: Rogue Poisons Guide (poisons scale with Attack Power and can crit in Forever)', href: 'https://www.warcrafttavern.com/forever/guides/poisons/' },
  { label: 'Warcraft Tavern: Assassination Rogue Guide', href: 'https://www.warcrafttavern.com/forever/guides/assassination-rogue/' },
  { label: 'Icy Veins: Assassination Rogue (Forever)', href: 'https://www.icy-veins.com/wow-forever/assassination-rogue-melee-dps-pve-spec-builds-talents' },
  { label: 'warcraftdb: Mutilate rank 3, 90% weapon damage + 71 per hand, +20% vs poisoned', href: 'https://forever.warcraftdb.com/data/spell/1241584' },
  { label: 'warcraftdb: Garrote rank 6, 552 over 18 s plus Attack Power', href: 'https://forever.warcraftdb.com/data/spell/11290' },
  { label: 'warcraftdb: Cheap Shot, 60 Energy, 4 s stun, 2 combo points', href: 'https://forever.warcraftdb.com/data/spell/1833' },
  { label: 'warcraftdb: Kidney Shot rank 2, 6 s at 5 points', href: 'https://forever.warcraftdb.com/data/spell/8643' },
  { label: 'warcraftdb: Shank rank 2, 5 Energy, 50% off-hand damage, generates 25 Energy', href: 'https://forever.warcraftdb.com/data/spell/1329549' },
  { label: 'warcraftdb: Eviscerate rank 9, 904\u20131012 at 5 points plus Attack Power', href: 'https://forever.warcraftdb.com/data/spell/31016' },
  { label: 'warcraftdb: Deadly Poison V, 30% per hit, 92 Nature over 12 s, 5 stacks', href: 'https://forever.warcraftdb.com/data/spell/25351' },
  { label: 'warcraftdb: Instant Poison VI, 20% per hit, 76\u2013100 Nature', href: 'https://forever.warcraftdb.com/data/spell/11340' },
  { label: 'warcraftdb: Eureka! (Rogue), 10% cheaper and 10% more damage for 8 s', href: 'https://forever.warcraftdb.com/data/spell/1259812' },
  { label: 'warcraftdb: Expansive Mind (Rogue), max Energy +5%', href: 'https://forever.warcraftdb.com/data/spell/1259803' },
  { label: 'warcraftdb: Cold Blood, Premeditation and Venom talent tooltips', href: 'https://forever.warcraftdb.com/data/spell/14177' },
];

const glass =
  'rounded-2xl border border-vitae-green/25 bg-white/[0.03] backdrop-blur-lg shadow-[0_0_40px_rgba(0,255,0,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.25em] text-vitae-green';

function Icon({ name, alt, dim }: { name: string; alt: string; dim?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon(name)}
      alt={alt}
      width={CELL}
      height={CELL}
      loading="lazy"
      className={`h-14 w-14 rounded-md border ${
        dim ? 'border-white/15 opacity-35 grayscale' : 'border-vitae-green shadow-[0_0_12px_rgba(0,255,0,0.45)]'
      }`}
    />
  );
}

function TalentCell({ t }: { t: Talent }) {
  const taken = t.rank > 0;
  return (
    <div
      className="group absolute outline-none"
      style={{ left: PAD + t.col * COL, top: PAD + t.tier * ROW, width: CELL, height: CELL }}
      tabIndex={0}
      aria-label={`${t.name}, ${t.rank} of ${t.max}`}
    >
      <Icon name={t.icon} alt={t.name} dim={!taken} />
      <span
        className={`absolute -bottom-2 -right-2 rounded border bg-black px-1 text-[11px] font-semibold leading-4 ${
          taken ? 'border-vitae-green text-vitae-green' : 'border-white/20 text-white/40'
        }`}
      >
        {t.rank}/{t.max}
      </span>
      <div
        role="tooltip"
        className="pointer-events-none fixed inset-x-2 z-50 hidden rounded-xl border border-vitae-green/60 bg-black/95 p-4 text-left shadow-[0_0_30px_rgba(0,255,0,0.25)] group-hover:block group-focus:block"
        style={{ top: HEAD + PAD + t.tier * ROW + CELL + 12 }}
      >
        <p className="text-base font-semibold text-white">{t.name}</p>
        <p className={`${label} mt-1`}>
          Rank {t.rank}/{t.max}
          {t.meta ? ` · ${t.meta}` : ''}
        </p>
        <p className="mt-2 text-sm font-light leading-relaxed text-white/80">{t.text}</p>
      </div>
    </div>
  );
}

function TreePanel({ tree }: { tree: Tree }) {
  return (
    <div className={`${glass} relative mx-auto w-full max-w-[304px] focus-within:z-20 hover:z-20`}>
      <div className="flex h-14 items-center justify-between border-b border-vitae-green/25 px-4">
        <h3 className="text-lg font-medium uppercase tracking-[0.15em] text-white">{tree.name}</h3>
        <span className="text-2xl font-light text-vitae-green">{tree.points}</span>
      </div>
      <div className="relative mx-auto" style={{ width: PAD * 2 + COL * 3 + CELL, height: PAD * 2 + ROW * 6 + CELL }}>
        {tree.talents
          .filter((t) => t.prereqTier !== null)
          .map((t) => (
            <span
              key={`${t.name}-link`}
              aria-hidden
              className={`absolute w-0.5 ${t.rank > 0 ? 'bg-vitae-green' : 'bg-white/20'}`}
              style={{
                left: PAD + t.col * COL + CELL / 2 - 1,
                top: PAD + (t.prereqTier as number) * ROW + CELL,
                height: (t.tier - (t.prereqTier as number)) * ROW - CELL,
              }}
            />
          ))}
        {tree.talents.map((t) => (
          <TalentCell key={t.name} t={t} />
        ))}
      </div>
    </div>
  );
}

function TalentSections({ build, interactive }: { build: Tree[]; interactive?: boolean }) {
  return (
    <>
      {interactive ? (
        <TalentCalculator
          trees={trees}
          presets={[
            { name: 'Poison Crit Stun', build: poisonCritTrees },
            { name: 'Subtlety', build: trees },
          ]}
          tavernUrl={TAVERN_URL}
        />
      ) : (
        <section className="mt-12">
          <h2 className={`${label} text-center`}>Talent trees</h2>
          <p className="mt-2 text-center text-sm font-light text-white/50">
            Hover or tap a talent to read it. Lit talents are taken.
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {build.map((tree) => (
              <TreePanel key={tree.name} tree={tree} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className={label}>Spec list</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          {build.map((tree) => (
            <div key={tree.name} className={`${glass} p-5`}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-medium uppercase tracking-[0.15em]">{tree.name}</h3>
                <span className={label}>{tree.points} points</span>
              </div>
              {tree.points === 0 ? (
                <p className="mt-4 text-sm font-light text-white/50">No points in this tree.</p>
              ) : (
                <ul className="mt-4 divide-y divide-vitae-green/20">
                  {tree.talents
                    .filter((t) => t.rank > 0)
                    .map((t) => (
                      <li key={t.name} className="grid grid-cols-[3.5rem_1fr] gap-3 py-3">
                        <Icon name={t.icon} alt="" />
                        <div>
                          <p className="font-medium leading-tight">
                            {t.name}{' '}
                            <span className="whitespace-nowrap text-vitae-green">
                              {t.rank}/{t.max}
                            </span>
                          </p>
                          <p className="mt-1 text-sm font-light leading-snug text-white/60">{t.text}</p>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function SequenceSection({ items }: { items: Step[] }) {
  return (
    <section className={`${glass} mt-12 p-6 sm:p-10`}>
      <h2 className={`${label} text-center`}>Kill sequence</h2>
      <ol className="mt-6 divide-y divide-vitae-green/20">
        {items.map((s, i) => (
          <li key={s.step} className="grid grid-cols-[2.5rem_3.5rem_1fr] items-center gap-3 py-3">
            <span className="text-2xl font-light leading-none text-vitae-green">
              {String(i + 1).padStart(2, '0')}
            </span>
            <Icon name={s.icon} alt="" />
            <div>
              <p className="font-medium">{s.step}</p>
              <p className="text-sm font-light leading-snug text-white/60">{s.text}</p>
              {s.damage && <p className="mt-2 font-mono text-xs leading-relaxed text-vitae-cyan">{s.damage}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function NumbersSection() {
  const num = (n: number) => n.toLocaleString('en-US');
  return (
    <section className={`${glass} mt-12 p-6 sm:p-10`}>
      <h2 className={`${label} text-center`}>The numbers</h2>
      <p className="mt-3 text-center text-sm font-light leading-relaxed text-white/60">{gearPoint.caption}</p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-vitae-green/40 text-left text-[10px] uppercase tracking-[0.2em] text-vitae-green">
              <th className="py-2 pr-3 font-semibold">Step</th>
              <th className="py-2 pr-3 font-semibold">Ability</th>
              <th className="py-2 pr-3 text-right font-semibold">Energy</th>
              <th className="py-2 pr-3 text-right font-semibold">Pool</th>
              <th className="py-2 pr-3 text-right font-semibold">Non-crit / crit</th>
              <th className="py-2 pr-3 text-right font-semibold">Expected</th>
              <th className="py-2 pr-3 text-right font-semibold">Running</th>
              <th className="py-2 pr-3 text-right font-semibold">Sec</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vitae-green/15">
            {numbersRows.map((r, i) => {
              const hit = r.nonCrit !== null && r.crit !== null;
              const stunOver = r.t > 10;
              return (
                <tr key={i} className={stunOver ? 'text-white/55' : 'text-white/85'}>
                  <td className="py-2 pr-3 text-vitae-green">{r.step}</td>
                  <td className="py-2 pr-3">
                    <span className={hit ? 'text-white' : ''}>{r.ability}</span>
                    <span className="block max-w-[18rem] whitespace-normal font-sans text-[11px] font-light leading-snug text-white/45">{r.note}</span>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {r.cost > 0 ? `\u2212${r.cost}` : ''}
                    {r.gain > 0 ? ` +${r.gain}` : ''}
                  </td>
                  <td className="py-2 pr-3 text-right text-vitae-cyan">{r.energy}</td>
                  <td className="py-2 pr-3 text-right">{hit ? `${num(r.nonCrit as number)} / ${num(r.crit as number)}` : '\u2014'}</td>
                  <td className="py-2 pr-3 text-right text-white">{r.expected ? num(r.expected) : ''}</td>
                  <td className="py-2 pr-3 text-right text-vitae-magenta">{num(r.running)}</td>
                  <td className="py-2 pr-3 text-right">{r.t}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="mt-5 space-y-2">
        {numbersNotes.map((n) => (
          <li key={n} className="text-sm font-light leading-relaxed text-white/50">
            {n}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PoisonSection({ items }: { items: Poison[] }) {
  return (
    <section className="mt-12">
      <h2 className={label}>Poisons</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {items.map((p) => (
          <div key={p.name} className="rounded-xl border border-vitae-green/30 bg-vitae-green/[0.04] p-5">
            <Icon name={p.icon} alt="" />
            <p className="mt-3 font-medium">{p.name}</p>
            <p className="mt-1 text-sm font-light leading-relaxed text-white/70">{p.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function GearSection({ items }: { items: Gear[] }) {
  return (
    <section className="mt-12">
      <h2 className={label}>Gear and professions</h2>
      <dl className="mt-4 divide-y divide-vitae-green/20">
        {items.map((g) => (
          <div key={g.title} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
            <dt className="text-lg font-medium">{g.title}</dt>
            <dd className="font-light leading-relaxed text-white/75">{g.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PartnerSection({ title, color, border, items }: { title: string; color: string; border: string; items: Partners[] }) {
  return (
    <section className="mt-12">
      <h2 className={`text-2xl font-bold uppercase tracking-[0.15em] sm:text-3xl ${color}`}>{title}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {items.map((d) => (
          <li key={d.name} className={`rounded-xl border bg-white/[0.03] p-5 ${border}`}>
            <div className="flex items-center gap-2">
              <Icon name="classicon_rogue" alt="Rogue" />
              {d.icons.map((i) => (
                <Icon key={i} name={i} alt="" />
              ))}
            </div>
            <p className={`mt-3 text-lg font-medium ${color}`}>{d.name}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/60">{d.tag}</p>
            <p className="mt-2 font-light leading-relaxed text-white/75">{d.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

const split = (build: Tree[]) => build.map((t) => t.points).join(' / ');

export default function GnomeRoguePage() {
  return (
    <main
      className="min-h-screen w-full bg-black text-left text-white"
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      <div className="mx-auto max-w-5xl px-4 pb-32 pt-10 sm:px-6">
        <Link href="/" className={`${label} hover:text-white`}>
          ← Vitaegis
        </Link>

        <header id="poison-crit-stun" className="py-14 text-center">
          <div className="flex items-center justify-center gap-3">
            <Icon name="achievement_character_gnome_male" alt="Gnome" />
            <Icon name="classicon_rogue" alt="Rogue" />
            <Icon name="ability_rogue_dualweild" alt="Deadly Poison" />
          </div>
          <p className={`${label} mt-6`}>WoW Forever · Level 60 PvP</p>
          <h1
            className="mt-4 text-4xl font-bold uppercase tracking-[0.12em] text-vitae-green sm:text-6xl"
            style={{ textShadow: '0 0 24px rgba(0,255,0,0.45)' }}
          >
            Gnome Rogue
            <br />
            Poison Crit Stun
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            A Mutilate spec built for the most damage a Gnome Rogue can do inside one stun. Cheap
            Shot, Mutilate, Kidney Shot, Venom, two more Mutilates and a Cold Blood Eviscerate.
          </p>
          <p className="mt-8 text-5xl font-light tracking-[0.1em] text-white sm:text-6xl">{split(poisonCritTrees)}</p>
          <p className={`${label} mt-2`}>Assassination · Combat · Subtlety</p>
          <nav className="mt-8 flex justify-center gap-6 text-sm font-semibold uppercase tracking-[0.2em]">
            <a href="#poison-crit-stun" className="text-vitae-green">
              Build 1 · Poison Crit Stun
            </a>
            <a href="#subtlety" className="text-white/60 hover:text-vitae-green">
              Build 2 · Subtlety
            </a>
          </nav>
        </header>

        <section className="border-l-2 border-vitae-green pl-5">
          <h2 className={label}>The short version</h2>
          <p className="mt-3 font-light leading-relaxed text-white/75">
            Premeditation, then Cheap Shot or a front Garrote, Mutilate to five, Kidney Shot, Shank
            for Venom, then two Mutilates and a Cold Blood Eviscerate while they are still stunned.
            Every talent in the build makes that window hit harder: Opportunity and Puncturing
            Wounds on Mutilate, Improved Kidney Shot on everything, Seal Fate to reach five points
            faster, Coup de Grace on the finisher.
          </p>
          <p className="mt-3 text-sm font-light leading-relaxed text-white/50">
            Malice gives 5% critical strike to attacks and poisons, and Vile Poisons, Improved
            Poisons and Venom make Deadly and Instant Poison a real share of the damage. Death Mark,
            Preparation and the escape talents are not here, on purpose: see the gear notes.
          </p>
          <p className="mt-3 text-sm font-light leading-relaxed text-white/50">
            Forever launched on November 4, 2026. Both specs are built on the live talent trees and
            launch-week guides, not on settled level 60 results, so expect them to move as hotfixes
            land.
          </p>
        </section>

        <TalentSections build={poisonCritTrees} interactive />

        <section className="mt-12">
          <h2 className={label}>Why Gnome</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {racials.map((r) => (
              <div key={r.name} className="grid grid-cols-[3.5rem_1fr] gap-4 rounded-xl border border-vitae-green/30 bg-vitae-green/[0.04] p-5">
                <Icon name={r.icon} alt="" />
                <div>
                  <p className="text-lg font-medium leading-tight">{r.name}</p>
                  <p className={`${label} mt-1`}>{r.kind}</p>
                  <p className="mt-2 font-light leading-relaxed text-white/75">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <SequenceSection items={poisonCritSequence} />
        <NumbersSection />
        <PoisonSection items={poisonCritPoisons} />
        <GearSection items={poisonCritGear} />

        <PartnerSection title="Most lethal DUO" color="text-vitae-magenta" border="border-vitae-magenta/40" items={poisonCritDuos} />

        <header id="subtlety" className="mt-24 border-t border-vitae-green/25 py-14 text-center">
          <div className="flex items-center justify-center gap-3">
            <Icon name="achievement_character_gnome_male" alt="Gnome" />
            <Icon name="classicon_rogue" alt="Rogue" />
            <Icon name="ability_stealth" alt="Subtlety" />
          </div>
          <p className={`${label} mt-6`}>Build 2 · WoW Forever · Level 60 PvP</p>
          <h2
            className="mt-4 text-4xl font-bold uppercase tracking-[0.12em] text-vitae-green sm:text-6xl"
            style={{ textShadow: '0 0 24px rgba(0,255,0,0.45)' }}
          >
            Subtlety
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            An Ambush and Death Mark spec built for battlegrounds, duels and world PvP, with daggers,
            Engineering and the Gnome racials doing the heavy lifting.
          </p>
          <p className="mt-8 text-5xl font-light tracking-[0.1em] text-white sm:text-6xl">{split(trees)}</p>
          <p className={`${label} mt-2`}>Assassination · Combat · Subtlety</p>
        </header>

        <section className="border-l-2 border-vitae-green pl-5">
          <h2 className={label}>The short version</h2>
          <p className="mt-3 font-light leading-relaxed text-white/75">
            Open from Stealth with Ambush, stun with Kidney Shot, then load Death Mark and feed it a
            second Ambush through Ghostly Strike. Vanish and Preparation let you do it again. Escape
            Artist keeps mages and hunters from kiting you while it happens.
          </p>
        </section>

        <TalentSections build={trees} />
        <SequenceSection items={sequence} />
        <PoisonSection items={poisons} />
        <GearSection items={gear} />

        <PartnerSection title="Best DUO partners" color="text-vitae-magenta" border="border-vitae-magenta/40" items={duos} />

        <PartnerSection title="Best TRIO partners" color="text-vitae-cyan" border="border-vitae-cyan/40" items={trios} />

        <p className="mt-4 text-sm font-light leading-relaxed text-white/50">
          Partner picks are Alliance classes and follow how these pairings have worked in classic-era
          PvP. Forever has no settled level 60 results yet.
        </p>

        <section className="mt-12">
          <h2 className={label}>Sources</h2>
          <ul className="mt-3 space-y-1">
            {sources.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-light text-white/70 underline decoration-vitae-green/40 underline-offset-4 hover:text-vitae-green"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-center text-sm font-light leading-relaxed text-white/45">
          World of Warcraft and its talent and ability icons are trademarks and copyrights of
          Blizzard Entertainment, used here for commentary on the game. Icons come from
          Blizzard&apos;s official World of Warcraft icon server. This is a fan page and is not
          affiliated with or endorsed by Blizzard.
        </p>
      </div>
    </main>
  );
}
