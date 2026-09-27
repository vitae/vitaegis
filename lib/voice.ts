/* ═══════════════════════════════════════════════════════════════════════════════
   THE LANGUAGE OF VITAE
   One source for how Vitae talks. Every model prompt that writes in the brand's
   voice (captions, the Proverbs oracle) pulls from here, so curating the voice
   means editing this file.
   ═══════════════════════════════════════════════════════════════════════════════ */

/** Signature phrases: Vitae's own coinages. Use them naturally, never forced. */
export const SIGNATURE_PHRASES: { phrase: string; use: string }[] = [
  {
    phrase: 'Wealth Whispers',
    use: 'Quiet, hard-won insight about money, value and compounding: the stealth-wealth side. Introduces a tip, a lesson or a proverb about wealth.',
  },
  {
    phrase: 'Wealth of Wisdom',
    use: 'Knowledge as the real treasure: framing a teaching, a book idea or a proverb as something to store and grow like capital.',
  },
];

export const VITAE_VOICE = `The language of Vitae:
- Calm, precise, a little cyberpunk. Ancient practice meets modern technology.
- Health • Stealth • Wealth is the frame for everything.
- Signature phrases (Vitae's own; weave in where they fit, at most one per piece, keep the capitalization):
${SIGNATURE_PHRASES.map((p) => `  • "${p.phrase}": ${p.use}`).join('\n')}`;
