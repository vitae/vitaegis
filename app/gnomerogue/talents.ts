export type Talent = {
  name: string;
  tier: number;
  col: number;
  max: number;
  rank: number;
  icon: string;
  text: string;
  meta: string;
  prereqTier: number | null;
};

export type Tree = { name: string; points: number; talents: Talent[] };

export const trees: Tree[] = [
  {
    "name": "Assassination",
    "points": 10,
    "talents": [
      {
        "name": "Improved Gouge",
        "tier": 0,
        "col": 0,
        "max": 3,
        "rank": 3,
        "icon": "ability_gouge",
        "text": "Increases the duration of your Gouge ability by 1.5 sec.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Remorseless Attacks",
        "tier": 0,
        "col": 1,
        "max": 2,
        "rank": 0,
        "icon": "ability_fiegndead",
        "text": "After killing a non-trivial enemy, gives you a 40% increased critical strike chance on your next Sinister Strike, Backstab, Ambush, Mutilate, or Ghostly Strike. Lasts 20 sec.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Malice",
        "tier": 0,
        "col": 2,
        "max": 5,
        "rank": 5,
        "icon": "ability_racial_bloodrage",
        "text": "Increases your critical strike chance with all attacks and Poisons by 5%.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Ruthlessness",
        "tier": 1,
        "col": 0,
        "max": 3,
        "rank": 2,
        "icon": "ability_druid_disembowel",
        "text": "Gives your finishing moves a 40% chance to add a Combo Point to your target.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Improved Expose Armor",
        "tier": 1,
        "col": 1,
        "max": 2,
        "rank": 0,
        "icon": "ability_warrior_riposte",
        "text": "Reduces the Energy cost of your Expose Armor ability by 10, and refunds 2 Combo Points when cast with 5 Combo Points.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Improved Slice and Dice",
        "tier": 1,
        "col": 3,
        "max": 3,
        "rank": 0,
        "icon": "ability_rogue_slicedice",
        "text": "Increases the duration of your Slice and Dice ability by 45%.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Vigor",
        "tier": 2,
        "col": 0,
        "max": 2,
        "rank": 0,
        "icon": "spell_nature_earthbindtotem",
        "text": "Increases your maximum Energy by 10.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Blood Splatter",
        "tier": 2,
        "col": 1,
        "max": 1,
        "rank": 0,
        "icon": "ability_rogue_rupture",
        "text": "Increases the duration of your Rupture ability by 6 sec and your Garrote ability by 9 sec.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Lethality",
        "tier": 2,
        "col": 2,
        "max": 2,
        "rank": 0,
        "icon": "ability_criticalstrike",
        "text": "Increases the critical strike damage bonus of your Sinister Strike, Gouge, Backstab, Mutilate, Ghostly Strike, and Hemorrhage abilities by 20%.",
        "meta": "",
        "prereqTier": 0
      },
      {
        "name": "Vile Poisons",
        "tier": 3,
        "col": 0,
        "max": 5,
        "rank": 0,
        "icon": "ability_rogue_feigndeath",
        "text": "Increases the damage dealt by your poisons by 20% and gives your poisons an additional 40% chance to resist dispel effects.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Cold Blood",
        "tier": 3,
        "col": 1,
        "max": 1,
        "rank": 0,
        "icon": "spell_ice_lament",
        "text": "When activated, increases the critical strike chance of your next Sinister Strike, Backstab, Ambush, Eviscerate, or Mutilate by 100%.",
        "meta": "Instant · 3 min cooldown",
        "prereqTier": null
      },
      {
        "name": "Improved Poisons",
        "tier": 3,
        "col": 2,
        "max": 5,
        "rank": 0,
        "icon": "ability_poisons",
        "text": "Increases the chance to apply Poisons to your target by 10%, and gives Poison applications a 50% chance to not consume a charge.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Relentless Strikes",
        "tier": 4,
        "col": 0,
        "max": 5,
        "rank": 0,
        "icon": "ability_warrior_decisivestrike",
        "text": "Your finishing moves have a 20% chance per Combo Point to restore 25 Energy.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Venom",
        "tier": 4,
        "col": 1,
        "max": 1,
        "rank": 0,
        "icon": "inv_sword_31",
        "text": "Causes your Shank ability to increase your Poison damage by 30% and your chance to apply Poisons by 20% for 6 sec.",
        "meta": "Requires Melee Weapon",
        "prereqTier": null
      },
      {
        "name": "Improved Kidney Shot",
        "tier": 4,
        "col": 2,
        "max": 2,
        "rank": 0,
        "icon": "ability_rogue_kidneyshot",
        "text": "Enemies Stunned by your Kidney Shot ability take 10% increased damage from your poisons and attacks.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Seal Fate",
        "tier": 5,
        "col": 2,
        "max": 3,
        "rank": 0,
        "icon": "spell_shadow_chilltouch",
        "text": "Your critical strikes from abilities that add Combo Points have a 100% chance to add an additional Combo Point.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Mutilate",
        "tier": 6,
        "col": 1,
        "max": 1,
        "rank": 0,
        "icon": "ability_rogue_deadlybrew",
        "text": "Instantly attacks with both weapons for 90% weapon damage plus an additional 36 with each weapon. Damage increased by 20% against Poisoned targets. Awards 2 Combo Points.",
        "meta": "60 Energy · Melee Range · Instant · Requires Daggers",
        "prereqTier": 4
      }
    ]
  },
  {
    "name": "Combat",
    "points": 5,
    "talents": [
      {
        "name": "Coup de Grace",
        "tier": 0,
        "col": 0,
        "max": 3,
        "rank": 3,
        "icon": "ability_rogue_eviscerate",
        "text": "Increases the damage done by your Eviscerate ability by 20%, and the damage and storage rate of your Death Mark ability by 20%.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Efficient Strikes",
        "tier": 0,
        "col": 1,
        "max": 2,
        "rank": 2,
        "icon": "spell_shadow_ritualofsacrifice",
        "text": "Reduces the Energy cost of your Sinister Strike and Hemorrhage abilities by 5.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Lightning Reflexes",
        "tier": 0,
        "col": 2,
        "max": 5,
        "rank": 0,
        "icon": "spell_nature_invisibilty",
        "text": "Increases your Dodge chance by 5%.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Puncturing Wounds",
        "tier": 1,
        "col": 0,
        "max": 3,
        "rank": 0,
        "icon": "ability_backstab",
        "text": "Increases the critical strike chance of your Backstab by 30% and your Mutilate by 15%, and gives Backstab a 45% chance to add an additional Combo Point.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Deflection",
        "tier": 1,
        "col": 1,
        "max": 3,
        "rank": 0,
        "icon": "ability_parry",
        "text": "Increases your Parry chance by 6%.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Precision",
        "tier": 1,
        "col": 2,
        "max": 3,
        "rank": 0,
        "icon": "ability_marksmanship",
        "text": "Improves your chance to hit by 3%.",
        "meta": "Requires Melee Weapon",
        "prereqTier": null
      },
      {
        "name": "Improved Sprint",
        "tier": 1,
        "col": 3,
        "max": 2,
        "rank": 0,
        "icon": "ability_rogue_sprint",
        "text": "Gives a 100% chance to remove all movement impairing effects when you activate your Sprint ability.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Endurance",
        "tier": 2,
        "col": 0,
        "max": 2,
        "rank": 0,
        "icon": "spell_shadow_shadowward",
        "text": "Reduces the cooldown of your Sprint and Evasion abilities by 60%.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Riposte",
        "tier": 2,
        "col": 1,
        "max": 1,
        "rank": 0,
        "icon": "ability_warrior_challange",
        "text": "A strike that becomes active after parrying an opponent's attack.  This attack deals 150% weapon damage and disarms the target for 6 sec.",
        "meta": "10 Energy · Melee Range · Instant · 6 sec cooldown",
        "prereqTier": 1
      },
      {
        "name": "Composure",
        "tier": 2,
        "col": 3,
        "max": 2,
        "rank": 0,
        "icon": "ability_rogue_fleetfooted",
        "text": "Increases the Energy cost reduction of your Poised ability by 10.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Improved Kick",
        "tier": 3,
        "col": 0,
        "max": 2,
        "rank": 0,
        "icon": "ability_kick",
        "text": "Gives your Kick ability a 100% chance to Silence the target for 2 sec.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Flawless Execution",
        "tier": 3,
        "col": 1,
        "max": 1,
        "rank": 0,
        "icon": "inv_sword_35",
        "text": "Reduces the Energy cost of your Eviscerate ability by 15.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Weapon Expertise",
        "tier": 3,
        "col": 2,
        "max": 2,
        "rank": 0,
        "icon": "spell_holy_blessingofstrength",
        "text": "Reduces the chance for your attacks to be Dodged or Parried by 2%.",
        "meta": "",
        "prereqTier": 1
      },
      {
        "name": "Aggression",
        "tier": 3,
        "col": 3,
        "max": 3,
        "rank": 0,
        "icon": "ability_racial_avatar",
        "text": "Increases the damage of your Sinister Strike and Eviscerate abilities by 15%.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Dual Wield Specialization",
        "tier": 4,
        "col": 0,
        "max": 2,
        "rank": 0,
        "icon": "ability_dualwield",
        "text": "Increases the damage done by your off-hand weapon by 50%.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Blade Flurry",
        "tier": 4,
        "col": 1,
        "max": 1,
        "rank": 0,
        "icon": "ability_warrior_punishingblow",
        "text": "Increases your melee attack speed by 20% and your melee attacks strike an additional nearby opponent. Lasts 15 sec.",
        "meta": "25 Energy · Instant · 2 min cooldown",
        "prereqTier": null
      },
      {
        "name": "Hack and Slash",
        "tier": 4,
        "col": 2,
        "max": 5,
        "rank": 0,
        "icon": "inv_sword_27",
        "text": "Gives your melee weapon attacks a benefit depending on the weapon. Axe/Sword: Your successful melee attacks have a 5% chance to trigger an extra attack on the target. Dagger/Fist: Increases your critical strike chance by 5%. Mace: Your attacks ignore 15% of your target's armor.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Flash of Steel",
        "tier": 5,
        "col": 2,
        "max": 5,
        "rank": 0,
        "icon": "ability_rogue_restlessblades",
        "text": "Increases the Energy generated by your Shank ability by 15 and reduces its cooldown by 2.0 sec.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Adrenaline Rush",
        "tier": 6,
        "col": 1,
        "max": 1,
        "rank": 0,
        "icon": "spell_shadow_shadowworddominate",
        "text": "Increases your Energy regeneration rate by 100% for 15 sec.",
        "meta": "Instant · 5 min cooldown",
        "prereqTier": 4
      }
    ]
  },
  {
    "name": "Subtlety",
    "points": 36,
    "talents": [
      {
        "name": "Setup",
        "tier": 0,
        "col": 0,
        "max": 3,
        "rank": 0,
        "icon": "spell_nature_mirrorimage",
        "text": "Gives you a 45% chance to add a Combo Point to your target after Dodging their attack or fully resisting one of their spells.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Master of Deception",
        "tier": 0,
        "col": 1,
        "max": 3,
        "rank": 3,
        "icon": "spell_shadow_charm",
        "text": "Reduces the chance enemies have to detect you while in Stealth mode as if you were 3 levels higher.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Opportunity",
        "tier": 0,
        "col": 2,
        "max": 5,
        "rank": 5,
        "icon": "ability_warrior_warcry",
        "text": "Increases the damage dealt by your Backstab, Garrote, Ambush, and Mutilate abilities by 20%.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Dirty Deeds",
        "tier": 1,
        "col": 0,
        "max": 2,
        "rank": 2,
        "icon": "spell_shadow_summonsuccubus",
        "text": "Reduces the Energy cost of your Cheap Shot and Garrote abilities by 20, and your Garrote ability no longer requires you to be behind your target.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Camouflage",
        "tier": 1,
        "col": 1,
        "max": 3,
        "rank": 3,
        "icon": "ability_stealth",
        "text": "Reduces your speed penalty from your Stealth ability by 15% and reduces its cooldown by 6 sec.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Improved Ambush",
        "tier": 1,
        "col": 2,
        "max": 3,
        "rank": 3,
        "icon": "ability_rogue_ambush",
        "text": "Increases the critical strike chance of your Ambush ability by 45%.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Dirty Tricks",
        "tier": 1,
        "col": 3,
        "max": 2,
        "rank": 0,
        "icon": "ability_sap",
        "text": "Reduces the Energy cost of your Sap and Blind abilities by 50%.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Initiative",
        "tier": 2,
        "col": 0,
        "max": 3,
        "rank": 3,
        "icon": "spell_shadow_fumble",
        "text": "Gives you a 100% chance to add an additional combo point to your target when using your Ambush, Garrote, or Cheap Shot ability.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Premeditation",
        "tier": 2,
        "col": 1,
        "max": 1,
        "rank": 1,
        "icon": "spell_shadow_possession",
        "text": "Adds 2 Combo Points to your target. You must add to or use those combo points within 20 sec or the combo points are lost.",
        "meta": "20 yd range · Instant · 2 min cooldown",
        "prereqTier": null
      },
      {
        "name": "Serrated Blades",
        "tier": 2,
        "col": 2,
        "max": 3,
        "rank": 3,
        "icon": "inv_sword_17",
        "text": "Causes your attacks to ignore 9% of your target's Armor and increases the damage dealt by your Rupture ability by 30%.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Elusiveness",
        "tier": 3,
        "col": 0,
        "max": 2,
        "rank": 2,
        "icon": "spell_magic_lesserinvisibilty",
        "text": "Reduces the cooldown of your Vanish and Blind abilities by 90 sec.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Ghostly Strike",
        "tier": 3,
        "col": 1,
        "max": 1,
        "rank": 1,
        "icon": "spell_shadow_curse",
        "text": "A strike that deals 125% (180% if a Dagger is equipped in your Main Hand) weapon damage, increases your chance to dodge by 15% for 7 sec, and causes your next Ambush or Garrote cast within 7 sec to not require Stealth.  Awards 1 combo point.",
        "meta": "40 Energy · Melee Range · Instant · 20 sec cooldown · Requires Melee Weapon",
        "prereqTier": null
      },
      {
        "name": "Quick Getaway",
        "tier": 3,
        "col": 3,
        "max": 2,
        "rank": 0,
        "icon": "ability_rogue_blackjack",
        "text": "Increases the maximum number of targets you may have Sapped by 1, and increases your movement speed by 30% for 3 sec after Sapping a target.",
        "meta": "",
        "prereqTier": 1
      },
      {
        "name": "Heightened Senses",
        "tier": 4,
        "col": 0,
        "max": 2,
        "rank": 2,
        "icon": "ability_ambush",
        "text": "Increases your Stealth detection as if you were 3 levels higher and reduces your chance to be hit by spells and ranged attacks by 4%.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Preparation",
        "tier": 4,
        "col": 1,
        "max": 1,
        "rank": 1,
        "icon": "spell_shadow_antishadow",
        "text": "When activated, this ability immediately finishes the cooldown on your other Rogue abilities.",
        "meta": "Instant · 10 min cooldown",
        "prereqTier": null
      },
      {
        "name": "Hemorrhage",
        "tier": 4,
        "col": 2,
        "max": 1,
        "rank": 1,
        "icon": "spell_shadow_lifedrain",
        "text": "An instant strike that deals 100% weapon damage (145% if a Dagger is equipped) and causes the target to take 15% increased Rupture and Garrote damage from the Rogue. Lasts 15 sec. Awards 1 Combo Point.",
        "meta": "35 Energy · Melee Range · Instant · Requires Melee Weapon",
        "prereqTier": 2
      },
      {
        "name": "Boot Knife",
        "tier": 5,
        "col": 2,
        "max": 5,
        "rank": 5,
        "icon": "inv_sword_32",
        "text": "Grants your Shank ability a 100% chance to add 2 Combo Points to the target.",
        "meta": "",
        "prereqTier": null
      },
      {
        "name": "Death Mark",
        "tier": 6,
        "col": 1,
        "max": 1,
        "rank": 1,
        "icon": "ability_creature_cursed_02",
        "text": "Finishing move that marks the target, storing a portion of the damage dealt by your attacks per Combo Point. Garrote and Rupture damage is stored at twice the rate. After 6 sec, the stored damage is dealt, up to a maximum increased by Attack Power and Critical Strike chance: 1 point  : 12% stored, 165 damage cap 2 points: 24% stored, 267 damage cap 3 points: 36% stored, 369 damage cap 4 points: 48% stored, 471 damage cap 5 points: 60% stored, 573 damage cap",
        "meta": "25 Energy / 1 to 5 Combo Points · 20 yd range · Instant · 10 sec cooldown",
        "prereqTier": 4
      }
    ]
  }
];

export function withRanks(base: Tree[], ranks: Record<string, number>): Tree[] {
  const left = new Set(Object.keys(ranks));
  const out = base.map((tree) => {
    const talents = tree.talents.map((t) => {
      const rank = ranks[t.name] ?? 0;
      left.delete(t.name);
      if (rank > t.max) throw new Error(`${t.name}: rank ${rank} exceeds max ${t.max}`);
      return { ...t, rank };
    });
    return { ...tree, talents, points: talents.reduce((n, t) => n + t.rank, 0) };
  });
  if (left.size) throw new Error(`Unknown talents: ${[...left].join(', ')}`);
  return out;
}

export const poisonCritTrees: Tree[] = withRanks(trees, {
  Malice: 5,
  'Remorseless Attacks': 2,
  Ruthlessness: 3,
  Lethality: 2,
  Vigor: 2,
  'Blood Splatter': 1,
  'Vile Poisons': 5,
  'Improved Poisons': 3,
  'Cold Blood': 1,
  Venom: 1,
  'Improved Kidney Shot': 2,
  'Seal Fate': 3,
  Mutilate: 1,
  'Coup de Grace': 3,
  'Lightning Reflexes': 2,
  'Puncturing Wounds': 3,
  'Master of Deception': 3,
  Opportunity: 5,
  Camouflage: 2,
  Initiative: 2,
});
