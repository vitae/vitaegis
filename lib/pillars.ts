/* ═══════════════════════════════════════════════════════════════════════════════
   THE THREE PILLARS: Health • Stealth • Wealth
   Field manual content for /health, /stealth and /wealth.
   ═══════════════════════════════════════════════════════════════════════════════ */

export type PillarSlug = 'health' | 'stealth' | 'wealth';

export type Entry = { k: string; v: string };

export type Dossier = {
  code: string;
  title: string;
  brief: string;
  entries: Entry[];
};

export type Pillar = {
  slug: PillarSlug;
  numeral: string;
  name: string;
  codename: string;
  glyph: string;
  color: string;
  doctrine: string;
  summary: string;
  /** Five headline topics shown on the homepage, each linking to a dossier. */
  topics: { label: string; code: string }[];
  directives: string[];
  protocolTitle: string;
  protocol: Entry[];
  dossiers: Dossier[];
  related: { href: string; label: string }[];
  disclaimer: string;
};

export const pillars: Pillar[] = [
  /* ─────────────────────────────────── I. HEALTH ─────────────────────────────────── */
  {
    slug: 'health',
    numeral: 'I',
    name: 'Health',
    codename: 'Operation Vessel',
    glyph: '體',
    color: '#00ff00',
    doctrine: 'The body is the first asset and the last line of defense. Guard it like one.',
    summary:
      'Light, sleep, movement, food and herbs. The protocols that keep the operator sharp, strong and hard to kill.',
    topics: [
      { label: 'Circadian Rhythm', code: 'H-01' },
      { label: 'REM Sleep', code: 'H-02' },
      { label: 'Running', code: 'H-04' },
      { label: 'Foods & Recipes', code: 'H-06' },
      { label: 'Herbs & Supplements', code: 'H-08' },
    ],
    directives: [
      'Sunlight in your eyes within an hour of waking. Every day.',
      'Same wake time seven days a week. Sleep is scheduled, not found.',
      'Lift heavy twice a week. Run easy most days, hard once.',
      'Eat food with one ingredient. Protein and plants at every meal.',
      'Measure before you medicate: bloodwork once a year.',
    ],
    protocolTitle: 'The daily protocol',
    protocol: [
      {
        k: '06:00',
        v: 'Wake at the same time every day. 500 ml water with a pinch of sea salt. No phone for 30 minutes.',
      },
      {
        k: '06:15',
        v: '10 minutes of outdoor light (20–30 if overcast). This sets the master clock and the evening melatonin timer.',
      },
      {
        k: '07:00',
        v: 'Move: run, lift or tai chi. First caffeine at 07:30, and none after noon.',
      },
      { k: '12:00', v: 'Largest meal. Walk 10 minutes after eating to blunt the glucose spike.' },
      {
        k: '15:00',
        v: '10–20 minute NSDR or yoga nidra instead of a second coffee. Step outside for afternoon light.',
      },
      { k: '19:00', v: 'Last meal, 3 hours before bed. Dim the house. Warm, low lights only.' },
      {
        k: '21:00',
        v: 'Screens off or night mode. Hot shower or sauna, then a cool, dark bedroom at 65–68°F (18–20°C).',
      },
      { k: '22:00', v: 'Lights out. 7–9 hours in bed. Mouth relaxed, phone in another room.' },
    ],
    dossiers: [
      {
        code: 'H-01',
        title: 'Circadian rhythm',
        brief:
          'A clock in the brain (the suprachiasmatic nucleus) runs every organ on a 24-hour cycle. Light is its main input. Control light and you control energy, hunger and sleep.',
        entries: [
          {
            k: 'Morning light',
            v: 'Bright outdoor light soon after waking advances the clock, raises morning cortisol and times melatonin for about 14–16 hours later.',
          },
          {
            k: 'Night darkness',
            v: 'Bright light after sunset delays the clock and suppresses melatonin. Use dim, warm lamps and block overhead lights.',
          },
          {
            k: 'Anchor wake time',
            v: 'A fixed wake time does more than a fixed bedtime. Sleeping in on weekends is self-inflicted jet lag.',
          },
          {
            k: 'Meal timing',
            v: 'Eat within a 10–12 hour daytime window. Late meals shift the liver and gut clocks and hurt sleep.',
          },
          {
            k: 'Temperature',
            v: 'Core temperature drops to start sleep. A cool room and a warm shower 1–2 hours before bed both speed that drop.',
          },
        ],
      },
      {
        code: 'H-02',
        title: 'Sleep: REM and deep sleep',
        brief:
          'Sleep runs in cycles of about 90 minutes. Deep (slow-wave) sleep dominates early in the night and repairs the body. REM dominates the final hours and consolidates memory, emotion and skill.',
        entries: [
          {
            k: 'Why the last hours matter',
            v: 'Most REM happens in the last third of the night. Cut sleep from 8 to 6 hours and you lose far more than a quarter of your REM.',
          },
          {
            k: 'REM thieves',
            v: 'Alcohol, cannabis, late caffeine and many antidepressants suppress REM. One drink with dinner fragments the second half of the night.',
          },
          {
            k: 'Deep-sleep builders',
            v: 'Daytime exercise, a cool room, no late meals and a consistent schedule. Deep sleep also rises after sleep debt, so do not nap late.',
          },
          {
            k: 'Caffeine math',
            v: 'Caffeine has a half-life of about 5–6 hours. A 2 pm coffee is still a quarter strength at midnight.',
          },
          {
            k: 'Track, don’t obsess',
            v: 'Wearables estimate stages roughly. Trust how you feel at 10 am and your resting heart rate trend more than a nightly score.',
          },
          {
            k: 'Red flags',
            v: 'Loud snoring, gasping or waking unrefreshed after 8 hours can mean sleep apnea. Get a sleep study: it is common and treatable.',
          },
        ],
      },
      {
        code: 'H-03',
        title: 'Theta and the brainwave states',
        brief:
          'Brain activity shows up as rhythms. Beta (13–30 Hz) is focused waking. Alpha (8–12 Hz) is relaxed and eyes-closed. Theta (4–8 Hz) is the twilight between waking and sleep. Delta (0.5–4 Hz) is deep sleep.',
        entries: [
          {
            k: 'Where theta lives',
            v: 'Drowsiness, deep meditation, hypnagogic imagery and REM sleep. It is linked to memory encoding and creative insight.',
          },
          {
            k: 'Meditation',
            v: 'Experienced meditators show more frontal theta. Start with 10 minutes of breath counting; the state follows the practice.',
          },
          {
            k: 'NSDR / yoga nidra',
            v: 'A guided body scan lying down, 10–30 minutes. It brings you to the edge of sleep and restores focus without grogginess.',
          },
          {
            k: 'Hypnagogia',
            v: 'Edison and Dalí napped holding an object that fell as they drifted off, waking them in the theta window to capture ideas.',
          },
          {
            k: 'Binaural beats',
            v: 'Evidence that audio “entrains” theta is mixed. They may help you relax, but they are a tool, not a shortcut past practice.',
          },
        ],
      },
      {
        code: 'H-04',
        title: 'Running routines',
        brief:
          'Build the engine slowly and it lasts decades. About 80% of running should be easy enough to talk in full sentences; 20% hard.',
        entries: [
          {
            k: 'Foundation (weeks 1–8)',
            v: '3 runs a week, 20–40 minutes, conversational pace. Walk breaks are allowed. Add no more than 10% volume per week.',
          },
          {
            k: 'Zone 2 base',
            v: 'Easy runs at a pace where you breathe through your nose. This builds mitochondria and fat burning.',
          },
          {
            k: 'VO₂ max session',
            v: 'Once a week: 4 × 4 minutes hard, 3 minutes easy between. VO₂ max is one of the strongest predictors of lifespan.',
          },
          {
            k: 'Long run',
            v: 'Once a week, 25–30% of weekly volume, all easy. This is the backbone of endurance.',
          },
          {
            k: 'Strides',
            v: '4–6 × 20 seconds fast and relaxed after an easy run. Keeps form sharp without fatigue.',
          },
          {
            k: 'Durability',
            v: 'Calf raises, single-leg squats and hip work twice a week. Most running injuries are strength problems.',
          },
        ],
      },
      {
        code: 'H-05',
        title: 'Exercises and training',
        brief:
          'Muscle is armor and a metabolic organ. Strength, engine, mobility and balance: train all four every week.',
        entries: [
          {
            k: 'Strength (2–3×/week)',
            v: 'Squat, hinge (deadlift), push (press), pull (row, pull-up), carry. 3–5 sets of 5–10 reps, add weight slowly.',
          },
          {
            k: 'Grip and carries',
            v: 'Farmer’s carries and dead hangs. Grip strength tracks with longevity and is useful in any fight.',
          },
          {
            k: 'Mobility',
            v: '10 minutes daily: deep squat hold, hip openers, thoracic rotations, hangs. Or practice yoga or tai chi.',
          },
          {
            k: 'Balance',
            v: 'Single-leg stands, tai chi, barefoot work. Falls are a leading cause of injury death after 65; train it now.',
          },
          {
            k: 'Breathwork',
            v: 'Box breathing (4-4-4-4) to steady nerves. The physiological sigh (two inhales, one long exhale) is the fastest way to calm down.',
          },
          {
            k: 'Heat and cold',
            v: 'Sauna 2–4× a week is linked to better heart health. Cold plunges raise alertness; skip them right after lifting if muscle gain is the goal.',
          },
        ],
      },
      {
        code: 'H-06',
        title: 'Foods and fruits',
        brief:
          'Eat like a hunter-gatherer with a farmer’s pantry. Protein first, plants second, sugar last.',
        entries: [
          {
            k: 'Protein',
            v: 'About 1.6 g per kg of bodyweight daily (0.7 g per lb). Eggs, fish, poultry, beef, Greek yogurt, lentils.',
          },
          {
            k: 'Fatty fish',
            v: 'Salmon, sardines, mackerel twice a week for omega-3s (EPA and DHA).',
          },
          {
            k: 'Greens and crucifers',
            v: 'Spinach, kale, broccoli, arugula, cabbage. Nitrates for blood flow; sulforaphane for detox pathways.',
          },
          {
            k: 'Fermented foods',
            v: 'Kefir, yogurt, kimchi, sauerkraut. A Stanford study found daily fermented foods increased gut microbe diversity and lowered inflammation markers.',
          },
          {
            k: 'Berries',
            v: 'Blueberries, blackberries, raspberries. High fiber, low sugar, rich in polyphenols.',
          },
          {
            k: 'Kiwi and tart cherry',
            v: 'Two kiwis an hour before bed and tart cherry juice have both improved sleep in small trials.',
          },
          {
            k: 'Pomegranate and citrus',
            v: 'Polyphenols and vitamin C. Eat the fruit, not the juice, to keep the fiber.',
          },
          {
            k: 'Olive oil, nuts, avocado',
            v: 'The fats of the Mediterranean diet, the most studied eating pattern for heart health.',
          },
          {
            k: 'Avoid',
            v: 'Ultra-processed foods, seed-oil fried foods, sugary drinks, and alcohol. These are the real toxins.',
          },
        ],
      },
      {
        code: 'H-07',
        title: 'Recipes',
        brief: 'Four field rations. Fast, cheap and built on the foods above.',
        entries: [
          {
            k: 'Green dawn smoothie',
            v: '1 cup kefir, handful spinach, ½ frozen banana, ½ cup blueberries, 1 tbsp chia, 1 scoop protein. Blend.',
          },
          {
            k: 'Operator bowl',
            v: 'Rice or quinoa, baked salmon, sautéed kale in olive oil, avocado, kimchi, sesame seeds, squeeze of lime.',
          },
          {
            k: 'Bone broth',
            v: 'Roasted beef or chicken bones, onion, garlic, ginger, 1 tbsp apple cider vinegar. Cover with water and simmer 12–24 hours. Strain, salt, sip.',
          },
          {
            k: 'Golden milk',
            v: '1 cup warm milk, 1 tsp turmeric, pinch black pepper, ½ tsp cinnamon, slice of ginger, honey to taste. Evening ritual, no caffeine.',
          },
        ],
      },
      {
        code: 'H-08',
        title: 'Herbs',
        brief:
          'The old pharmacy. Useful, but real medicine: they have doses, side effects and drug interactions.',
        entries: [
          {
            k: 'Ashwagandha',
            v: '300–600 mg of root extract. Lowers stress and cortisol and may improve sleep. Cycle it; avoid with thyroid disease or pregnancy.',
          },
          {
            k: 'Turmeric',
            v: 'Curcumin for inflammation. Take with black pepper and fat for absorption. Can thin blood.',
          },
          { k: 'Ginger', v: 'Nausea, digestion and joint pain. Fresh in tea or food daily.' },
          {
            k: 'Rhodiola',
            v: '200–400 mg in the morning for fatigue under stress. Stimulating, so not at night.',
          },
          {
            k: 'Lion’s mane',
            v: 'A mushroom studied for nerve growth and focus. Early human evidence is promising but small.',
          },
          { k: 'Holy basil (tulsi)', v: 'An adaptogen tea for calm and blood sugar.' },
          { k: 'Chamomile and lemon balm', v: 'Evening teas for mild anxiety and sleep onset.' },
          { k: 'Green tea', v: 'L-theanine plus gentle caffeine: calm focus. Matcha for more.' },
        ],
      },
      {
        code: 'H-09',
        title: 'Supplements',
        brief: 'Supplements fill gaps. Test first so you know which gaps you have.',
        entries: [
          {
            k: 'Vitamin D3 + K2',
            v: '1,000–4,000 IU D3 if your blood level is low (aim for 30–60 ng/mL). K2 helps direct calcium.',
          },
          {
            k: 'Magnesium',
            v: 'Glycinate or threonate, 200–400 mg in the evening. Most people eat too little.',
          },
          { k: 'Omega-3', v: '1–2 g of EPA+DHA daily if you don’t eat fatty fish twice a week.' },
          {
            k: 'Creatine monohydrate',
            v: '3–5 g daily. The most researched supplement there is: strength, muscle and emerging brain benefits.',
          },
          {
            k: 'Electrolytes',
            v: 'Sodium, potassium and magnesium for runners, sauna users and anyone sweating a lot.',
          },
          {
            k: 'Protein powder',
            v: 'Whey or plant protein when you can’t hit your target with food.',
          },
          {
            k: 'Buy tested',
            v: 'Look for third-party seals (NSF, USP, Informed Sport). The supplement industry is barely regulated.',
          },
        ],
      },
    ],
    related: [
      { href: '/run', label: 'Run routes & log' },
      { href: '/vitamins', label: 'Vitamins' },
      { href: '/ed', label: 'Vitality guide' },
      { href: '/classes', label: 'Classes' },
    ],
    disclaimer:
      'Education only, not medical advice. These statements have not been evaluated by the FDA. Herbs and supplements interact with medications. Talk to a doctor before starting anything new, especially if you are pregnant, take prescription drugs or have a medical condition.',
  },

  /* ─────────────────────────────────── II. STEALTH ─────────────────────────────────── */
  {
    slug: 'stealth',
    numeral: 'II',
    name: 'Stealth',
    codename: 'Operation Shadow',
    glyph: '忍',
    color: '#00ff00',
    doctrine: 'What they cannot see, they cannot target. Be unremarkable, be encrypted, be ready.',
    summary:
      'Cybersecurity, anonymity, encryption, key custody, situational awareness and self-defense. The shinobi code for the digital age.',
    topics: [
      { label: 'Cybersecurity', code: 'S-01' },
      { label: 'Encryption', code: 'S-02' },
      { label: 'Secret Keys', code: 'S-03' },
      { label: 'Situational Security', code: 'S-07' },
      { label: 'Self-Defense', code: 'S-08' },
    ],
    directives: [
      'A password manager and a hardware key. Never reuse a password.',
      'Your seed phrase never touches a screen, a camera or a cloud.',
      'Post the photo after you leave, never while you are there.',
      'Notice the exits. Notice the hands. Leave before it starts.',
      'Say less. Every detail you share is a key someone can copy.',
    ],
    protocolTitle: 'The hardening checklist',
    protocol: [
      {
        k: 'Hour 1',
        v: 'Install a password manager (Bitwarden, 1Password). Change your email, bank and phone-carrier passwords to long random ones.',
      },
      {
        k: 'Hour 2',
        v: 'Turn on passkeys or a FIDO2 hardware key (YubiKey) for email and money accounts. Replace SMS codes everywhere you can.',
      },
      {
        k: 'Hour 3',
        v: 'Add a carrier PIN or port-out lock to stop SIM swaps. Freeze your credit at Equifax, Experian and TransUnion (free).',
      },
      {
        k: 'Day 2',
        v: 'Turn on full-disk encryption (FileVault, BitLocker) and automatic updates. Set a 6+ digit phone passcode.',
      },
      {
        k: 'Day 3',
        v: 'Move sensitive chat to Signal with disappearing messages. Use email aliases (SimpleLogin, iCloud Hide My Email) for signups.',
      },
      {
        k: 'Week 1',
        v: 'Opt out of data brokers, or pay a removal service. Lock down social profiles and strip location from old posts.',
      },
      {
        k: 'Week 2',
        v: 'Set a family safe word for calls that sound like an emergency. AI can clone a voice from seconds of audio.',
      },
      {
        k: 'Ongoing',
        v: 'Back up with 3-2-1: three copies, two media, one off-site and encrypted. Test a restore every quarter.',
      },
    ],
    dossiers: [
      {
        code: 'S-01',
        title: 'Cybersecurity fundamentals',
        brief:
          'Most breaches are not genius hackers. They are reused passwords, phished logins and unpatched devices. Close the easy doors and you are harder than 95% of targets.',
        entries: [
          {
            k: 'Email is the master key',
            v: 'Whoever owns your inbox can reset everything else. Protect it with a hardware key and a unique password.',
          },
          {
            k: 'Phishing',
            v: 'Never log in from a link you were sent. Type the address yourself. Urgency is the tell.',
          },
          {
            k: 'Updates',
            v: 'Patch phones, browsers and routers promptly. Most exploits target bugs that already have fixes.',
          },
          {
            k: 'Least privilege',
            v: 'Daily use on a standard account, not admin. Remove apps and browser extensions you don’t use.',
          },
          {
            k: 'Network',
            v: 'Change the router’s default password, update its firmware, put smart-home devices on a guest network.',
          },
          {
            k: 'Lockdown mode',
            v: 'If you are a high-value target, iPhone Lockdown Mode and Android Advanced Protection shrink the attack surface.',
          },
        ],
      },
      {
        code: 'S-02',
        title: 'Encryption',
        brief:
          'Encryption turns data into noise for anyone without the key. Use it at rest (on disk), in transit (on the wire) and end-to-end (only you and the recipient can read it).',
        entries: [
          {
            k: 'Messages',
            v: 'Signal is the gold standard for end-to-end encrypted chat and calls. Turn on disappearing messages by default.',
          },
          {
            k: 'Devices',
            v: 'FileVault (Mac), BitLocker (Windows), LUKS (Linux). Modern phones encrypt by default once a passcode is set.',
          },
          {
            k: 'Files',
            v: 'Use age or VeraCrypt for encrypted archives. Cryptomator for encrypting files before they reach any cloud.',
          },
          {
            k: 'Email',
            v: 'Proton Mail or Tuta encrypt mailboxes. Normal email is a postcard; don’t send secrets by it.',
          },
          {
            k: 'The weak point',
            v: 'Encryption is only as strong as the key and the endpoint. A malware-infected phone reads your Signal messages before they’re encrypted.',
          },
        ],
      },
      {
        code: 'S-03',
        title: 'Secret keys and custody',
        brief:
          'A private key is the asset. Whoever holds it owns the account, the wallet or the identity. Treat keys like bullion.',
        entries: [
          {
            k: 'Seed phrases',
            v: 'Write the 12 or 24 words by hand or stamp them in steel. Never photograph, type, email or store them in a password manager.',
          },
          {
            k: 'Geographic split',
            v: 'Store copies in two secure places. For large sums use multisig (2-of-3 keys in different locations) so no single theft or fire loses everything.',
          },
          {
            k: 'Passphrase (25th word)',
            v: 'An extra passphrase creates a hidden wallet. A decoy wallet with a small balance can defuse a $5 wrench attack.',
          },
          {
            k: 'Hardware wallets',
            v: 'Buy direct from the manufacturer. Verify the device on arrival. Never enter a seed on a website, ever.',
          },
          {
            k: 'API and SSH keys',
            v: 'Never commit keys to code. Use environment variables or a secrets manager, rotate on any suspicion, scope to least privilege.',
          },
          {
            k: 'Inheritance',
            v: 'Write a sealed letter of instructions for heirs, separate from the keys. Secrecy that dies with you is a loss.',
          },
        ],
      },
      {
        code: 'S-04',
        title: 'Anonymity and privacy',
        brief:
          'Privacy is choosing what to reveal. Anonymity is revealing nothing linked to you. Compartmentalize: one identity per purpose, never crossed.',
        entries: [
          {
            k: 'Know your threat',
            v: 'Hiding from advertisers, a stalker or a nation-state are three different jobs. Model the threat before picking tools.',
          },
          {
            k: 'VPN',
            v: 'Hides your traffic from the local network and ISP, but the VPN company sees it. It is privacy from some, not anonymity.',
          },
          {
            k: 'Tor',
            v: 'Routes traffic through three relays so no single one sees who you are and where you go. Slow, but the real tool for anonymity.',
          },
          {
            k: 'Browser',
            v: 'Brave, Firefox with uBlock Origin, or Mullvad Browser. Block trackers and third-party cookies.',
          },
          {
            k: 'Compartments',
            v: 'Separate emails and phone numbers for banking, shopping, social and private life. A leak in one doesn’t expose the rest.',
          },
          {
            k: 'Data brokers',
            v: 'Your address, relatives and phone number are for sale. Opt out one by one or pay a removal service yearly.',
          },
          {
            k: 'Home address',
            v: 'Use a PO box, virtual mailbox or registered agent for public filings, packages and LLC paperwork.',
          },
        ],
      },
      {
        code: 'S-05',
        title: 'AI technology: sword and shield',
        brief:
          'AI multiplies both attacker and defender. Use it to work faster, and assume adversaries use it to fake faces, voices and messages.',
        entries: [
          {
            k: 'Deepfake voices',
            v: 'Cloned voices of family and executives are used in scams. Verify through a second channel or a safe word before sending money.',
          },
          {
            k: 'Data you feed it',
            v: 'Anything typed into a cloud AI may be stored. Keep keys, client data and secrets out, or run a local model.',
          },
          {
            k: 'Local models',
            v: 'Open-weight models run on your own hardware, so sensitive work never leaves the machine.',
          },
          {
            k: 'Prompt injection',
            v: 'AI agents that read email or web pages can be hijacked by hidden instructions. Don’t give an agent money or keys without human approval.',
          },
          {
            k: 'Defensive AI',
            v: 'Use AI to review code, summarize logs, spot phishing and draft security plans. It is a force multiplier for a small team.',
          },
        ],
      },
      {
        code: 'S-06',
        title: 'Social media OPSEC',
        brief:
          'Every post is intelligence. Location, routine, relationships and wealth can be mapped from a feed in minutes.',
        entries: [
          {
            k: 'Delay location',
            v: 'Post after you leave a place. Never show a live location, your home exterior, your street or your car plate.',
          },
          {
            k: 'Metadata',
            v: 'Photos carry GPS in EXIF data. Most platforms strip it on upload, but files sent directly often keep it.',
          },
          {
            k: 'Reflections and details',
            v: 'Windows, sunglasses, mail, badges and keys in photos have all been used to find people.',
          },
          {
            k: 'Stealth wealth',
            v: 'Don’t post assets, balances or crypto holdings. Flaunting wealth invites fraud, kidnapping and lawsuits.',
          },
          {
            k: 'Security questions',
            v: 'Your first pet and high-school mascot are in your old posts. Answer security questions with random passwords.',
          },
        ],
      },
      {
        code: 'S-07',
        title: 'Situational security',
        brief:
          'The best fight is the one you saw coming and avoided. Awareness is a habit, not paranoia.',
        entries: [
          {
            k: 'Cooper color code',
            v: 'White: oblivious. Yellow: relaxed awareness (your default in public). Orange: a specific possible threat. Red: action.',
          },
          {
            k: 'Baseline and anomaly',
            v: 'Read the normal behavior of a place. Then watch for what breaks it: someone too focused on you, hands hidden, a mismatch in dress or mood.',
          },
          {
            k: 'OODA loop',
            v: 'Observe, orient, decide, act. Whoever cycles faster controls the encounter.',
          },
          {
            k: 'Exits and seats',
            v: 'Enter any room and note two exits. Sit with a view of the door.',
          },
          {
            k: 'Gray man',
            v: 'Neutral clothes, no logos, no tactical gear, no flash. Blend in so you’re never selected.',
          },
          {
            k: 'Travel',
            v: 'Share your itinerary with one trusted person. Carry a decoy wallet. Keep your phone charged and your door locked with a wedge.',
          },
        ],
      },
      {
        code: 'S-08',
        title: 'Self-defense',
        brief: 'Avoid, escape, then fight only if you must. Winning is going home.',
        entries: [
          {
            k: 'Hierarchy',
            v: 'Awareness, then avoidance, then de-escalation, then escape. Physical defense is the last layer, not the first.',
          },
          {
            k: 'De-escalation',
            v: 'Hands up, open and in front ("the fence"), calm voice, step back at an angle. You look peaceful and stay ready.',
          },
          {
            k: 'Train real arts',
            v: 'Brazilian jiu-jitsu, boxing, Muay Thai and wrestling are pressure-tested with live sparring. Train at least twice a week.',
          },
          {
            k: 'Targets',
            v: 'If attacked: eyes, throat, groin, knees. Strike to create space, then run.',
          },
          {
            k: 'Tools',
            v: 'Pepper spray, a flashlight and a phone. Know your local laws on carrying anything.',
          },
          {
            k: 'The law',
            v: 'Force must be proportionate and end when the threat ends. Know your state’s self-defense and duty-to-retreat rules.',
          },
        ],
      },
      {
        code: 'S-09',
        title: 'Ninja tactics and wisdom',
        brief:
          'The shinobi were masters of intelligence, not just combat. Their edge was patience, disguise, information and the art of not being there.',
        entries: [
          {
            k: 'Shinobi = endurance',
            v: 'The character 忍 means to endure. The first skill is patience: wait, watch, strike only on your terms.',
          },
          {
            k: 'Hensōjutsu',
            v: 'The art of disguise. Today: a boring online profile, generic clothes, a quiet car. Be forgettable.',
          },
          {
            k: 'Intelligence first',
            v: '"Know the enemy and know yourself; in a hundred battles you will never be in peril." — Sun Tzu',
          },
          {
            k: 'Economy of motion',
            v: '"Do nothing which is of no use." — Miyamoto Musashi. Spend no energy, word or dollar without purpose.',
          },
          {
            k: 'Need to know',
            v: 'Tell people your plans after they succeed. Share information by role, not by friendship.',
          },
          {
            k: 'Silence',
            v: '"Speech is silver, silence is golden." Every secret-keeping order ever built runs on this rule.',
          },
        ],
      },
    ],
    related: [
      { href: '/keycrate', label: 'KeyCrate' },
      { href: '/proverbs', label: 'Proverbs' },
      { href: '/travel', label: 'Travel' },
    ],
    disclaimer:
      'Education only. This is defensive guidance for protecting yourself and your property. Use force only as a lawful last resort, and follow the laws where you live and travel.',
  },

  /* ─────────────────────────────────── III. WEALTH ─────────────────────────────────── */
  {
    slug: 'wealth',
    numeral: 'III',
    name: 'Wealth',
    codename: 'Operation Treasury',
    glyph: '財',
    color: '#00ff00',
    doctrine: 'Own assets, not liabilities. Compound quietly. Let time do the heavy lifting.',
    summary:
      'Bitcoin, stocks, saving, trusts, LLCs, business building and the legal "glitches" the wealthy use. Build it, protect it, pass it on.',
    topics: [
      { label: 'Bitcoin', code: 'W-01' },
      { label: 'Investing', code: 'W-03' },
      { label: 'Money Glitches', code: 'W-05' },
      { label: 'LLCs & Trusts', code: 'W-06' },
      { label: 'Business & Brand', code: 'W-08' },
    ],
    directives: [
      'Pay yourself first: automate 20% of income into assets on payday.',
      'Never pass up free money: take the full employer match.',
      'Hold bitcoin in your own keys. Not your keys, not your coins.',
      'Own businesses and equities. Rent is what you pay for not owning.',
      'If it sounds easy and guaranteed, it is a scam. Every time.',
    ],
    protocolTitle: 'The order of operations',
    protocol: [
      {
        k: 'Step 1',
        v: 'Budget: know every dollar in and out. Cut subscriptions and car payments first.',
      },
      { k: 'Step 2', v: 'Emergency fund: one month of expenses in a high-yield savings account.' },
      { k: 'Step 3', v: 'Take the full 401(k) match. It is an instant 50–100% return.' },
      {
        k: 'Step 4',
        v: 'Kill high-interest debt. Paying off a 25% credit card is a guaranteed 25% return.',
      },
      { k: 'Step 5', v: 'Grow the emergency fund to 3–6 months. Then max an HSA and a Roth IRA.' },
      {
        k: 'Step 6',
        v: 'Invest 15–20%+ of income: broad index funds plus a bitcoin allocation you can hold for 4+ years.',
      },
      { k: 'Step 7', v: 'Build a business or side income. Form an LLC once it earns money.' },
      {
        k: 'Step 8',
        v: 'Protect it: insurance, a will, a revocable trust, and asset protection as the numbers grow.',
      },
    ],
    dossiers: [
      {
        code: 'W-01',
        title: 'Bitcoin: the new standard',
        brief:
          'Bitcoin is a fixed-supply digital money: 21 million coins, issued on a public schedule, secured by the largest computing network on Earth. The thesis is simple: dollars are printed, bitcoin is not.',
        entries: [
          {
            k: 'Scarcity',
            v: 'No one can make more than 21 million. The supply issued to miners halves about every four years.',
          },
          {
            k: 'Self-custody',
            v: 'Move coins off exchanges to a hardware wallet you control. Exchanges fail (Mt. Gox, FTX) and freeze accounts.',
          },
          {
            k: 'Dollar-cost average',
            v: 'Buy a fixed amount every week or month regardless of price. It removes emotion and timing.',
          },
          {
            k: 'Time horizon',
            v: 'Bitcoin has fallen 70–80% several times. Only hold what you can keep through a four-year cycle without selling.',
          },
          {
            k: 'Lightning',
            v: 'The Lightning Network sends bitcoin instantly for fractions of a cent: payments, tips and cross-border transfers.',
          },
          {
            k: 'Taxes',
            v: 'In the US, selling or spending bitcoin is a taxable event. Track your cost basis from day one.',
          },
        ],
      },
      {
        code: 'W-02',
        title: 'Crypto beyond bitcoin',
        brief:
          'Thousands of tokens exist. Most will go to zero. Treat everything past bitcoin as venture-capital risk.',
        entries: [
          {
            k: 'Ethereum',
            v: 'A programmable blockchain for smart contracts, stablecoins and tokenized assets. The second-largest network.',
          },
          {
            k: 'Stablecoins',
            v: 'Dollar-pegged tokens (USDC, USDT) for fast settlement. Check reserves and issuer risk.',
          },
          {
            k: 'Position size',
            v: 'Keep speculative altcoins to a small slice you can lose entirely.',
          },
          {
            k: 'Red flags',
            v: 'Guaranteed yield, anonymous teams, “send me crypto and I’ll double it”, pressure to act now. All scams.',
          },
          {
            k: 'Security',
            v: 'Use a separate wallet for experiments. Never sign a transaction you don’t understand; wallet drainers look like airdrops.',
          },
        ],
      },
      {
        code: 'W-03',
        title: 'Stocks and investing',
        brief:
          'You can’t out-trade the market, but you can own it. Low-cost index funds beat most professional managers over 15-year periods.',
        entries: [
          {
            k: 'Core holding',
            v: 'A total US market or S&P 500 index fund, plus international. Expense ratio under 0.10%.',
          },
          {
            k: 'Compounding',
            v: '$500 a month at 8% for 30 years is about $750,000. You contribute $180,000; time does the rest.',
          },
          {
            k: 'Rule of 72',
            v: 'Divide 72 by the return rate to get years to double. At 8%, money doubles every 9 years.',
          },
          {
            k: 'Don’t time it',
            v: 'Missing the 10 best days in a 20-year period can cut returns roughly in half. Stay invested.',
          },
          {
            k: 'Individual stocks',
            v: 'Keep stock picking to a small share. Know the business, its moat and its cash flow before buying.',
          },
          {
            k: 'Rebalance',
            v: 'Once a year, trim what has grown too large and add to what has fallen behind.',
          },
        ],
      },
      {
        code: 'W-04',
        title: 'Saving and cash flow',
        brief: 'Income is not wealth. The gap between what you earn and what you spend is.',
        entries: [
          {
            k: 'Automate',
            v: 'Split paychecks automatically: bills, savings, investing. What you don’t see, you don’t spend.',
          },
          {
            k: 'Big three',
            v: 'Housing, transport and food are 60%+ of spending. Win there and small purchases don’t matter.',
          },
          {
            k: 'High-yield savings',
            v: 'Keep cash in a high-yield account or Treasury bills, not a 0.01% checking account.',
          },
          {
            k: '30-day rule',
            v: 'Wait 30 days before any non-essential purchase over $100. Most wants disappear.',
          },
          {
            k: 'Stealth wealth',
            v: 'Drive a paid-off car, live below your means, invest the difference. Rich is quiet; broke is loud.',
          },
        ],
      },
      {
        code: 'W-05',
        title: 'The legal “money glitches”',
        brief:
          'There is no infinite money glitch, but the tax code and markets do have loopholes the wealthy use daily. All legal, all boring, all powerful.',
        entries: [
          {
            k: 'Employer match',
            v: 'Free money: a 100% match on 5% of salary doubles that money on day one.',
          },
          {
            k: 'HSA triple tax',
            v: 'Tax-deductible in, tax-free growth, tax-free out for medical costs. Invest it and save receipts to reimburse yourself years later.',
          },
          {
            k: 'Roth IRA',
            v: 'Pay tax now, never again. Decades of growth come out tax-free in retirement.',
          },
          {
            k: 'Buy, borrow, die',
            v: 'The wealthy rarely sell appreciated assets. They borrow against them, and heirs inherit with a stepped-up basis that erases the gain.',
          },
          {
            k: 'Tax-loss harvesting',
            v: 'Sell investments at a loss to offset gains and up to $3,000 of income a year, then buy a similar (not identical) fund.',
          },
          {
            k: 'House hacking',
            v: 'Buy a 2–4 unit property, live in one unit, rent the others. Tenants pay your mortgage.',
          },
          {
            k: '1031 exchange',
            v: 'Sell investment real estate and roll the proceeds into another property to defer capital gains tax.',
          },
          {
            k: 'Business deductions',
            v: 'A real business can deduct its legitimate expenses: equipment, software, a home office, travel for work.',
          },
        ],
      },
      {
        code: 'W-06',
        title: 'LLCs and business entities',
        brief:
          'An entity separates your business from your personal life: legally, financially and on paper.',
        entries: [
          {
            k: 'LLC',
            v: 'A limited liability company shields personal assets from business debts and lawsuits, if you keep it separate.',
          },
          {
            k: 'Keep the veil',
            v: 'Separate bank account, no mixing funds, sign contracts as the LLC, keep records. Mixing money lets courts pierce the shield.',
          },
          {
            k: 'Where to form',
            v: 'Usually your home state. Wyoming and Delaware have privacy and legal advantages, but you still register where you operate.',
          },
          {
            k: 'S-corp election',
            v: 'Once profit is roughly $50–80k+, an S-corp election can cut self-employment tax by paying a reasonable salary plus distributions.',
          },
          {
            k: 'Holding company',
            v: 'A parent LLC owning operating LLCs isolates risk: one lawsuit doesn’t sink every venture.',
          },
          {
            k: 'Privacy',
            v: 'Use a registered agent and business address so your home doesn’t appear in public records.',
          },
        ],
      },
      {
        code: 'W-07',
        title: 'Trusts and legacy',
        brief:
          'Wealth that isn’t structured is lost to probate, lawsuits and taxes. Trusts are how families keep it for generations.',
        entries: [
          {
            k: 'Will',
            v: 'The minimum. Names guardians for children and says where assets go. Everyone needs one.',
          },
          {
            k: 'Revocable living trust',
            v: 'You control it while alive. Assets pass to heirs privately and skip probate, which is public, slow and expensive.',
          },
          {
            k: 'Irrevocable trust',
            v: 'You give up control in exchange for asset protection and possible estate-tax savings.',
          },
          {
            k: 'Beneficiaries',
            v: 'Retirement accounts and life insurance pass by beneficiary form, not by will. Keep them current.',
          },
          {
            k: 'Term life insurance',
            v: 'Cheap protection for anyone who depends on your income. Buy term and invest the difference.',
          },
          {
            k: 'Get counsel',
            v: 'Trust and estate law varies by state. Pay an estate attorney once; it is cheap next to probate.',
          },
        ],
      },
      {
        code: 'W-08',
        title: 'Building businesses and brands',
        brief:
          'A job trades time for money. A business trades systems for money. A brand makes people choose you before you ask.',
        entries: [
          {
            k: 'Solve a painful problem',
            v: 'Find people already paying to solve something, and do it better, faster or cheaper.',
          },
          {
            k: 'Start small',
            v: 'Pre-sell before you build. Ten paying customers beat a thousand compliments.',
          },
          {
            k: 'Own the audience',
            v: 'Social platforms rent you reach. An email list and a website are assets you own.',
          },
          {
            k: 'Brand',
            v: 'One name, one color, one promise, repeated everywhere. Consistency builds trust faster than creativity.',
          },
          {
            k: 'Recurring revenue',
            v: 'Subscriptions, memberships and retainers turn one-time sales into predictable cash flow.',
          },
          {
            k: 'Leverage',
            v: 'Code, media and capital work while you sleep. Build products that scale without adding hours.',
          },
        ],
      },
      {
        code: 'W-09',
        title: 'AI as a wealth engine',
        brief:
          'AI is the biggest leverage shift since the internet. One person with AI can now do the work of a small team.',
        entries: [
          {
            k: 'Automate your work',
            v: 'Use AI to draft, research, code and analyze. Reclaim hours and reinvest them in building.',
          },
          {
            k: 'Build with it',
            v: 'AI-powered tools, agents and content businesses can launch in weeks with almost no capital.',
          },
          {
            k: 'Research edge',
            v: 'Use AI to read filings, summarize earnings calls and compare investments. Verify every number it gives you.',
          },
          {
            k: 'Own the picks and shovels',
            v: 'Chips, cloud, data centers and energy supply every AI company, whichever one wins.',
          },
          {
            k: 'Beware AI scams',
            v: '“AI trading bots” promising guaranteed returns are a common fraud. Real edges don’t get sold on Instagram.',
          },
        ],
      },
    ],
    related: [
      { href: '/stocks', label: 'Stocks board' },
      { href: '/keycrate', label: 'KeyCrate' },
      { href: '/projects', label: 'Projects' },
    ],
    disclaimer:
      'Education only, not financial, tax or legal advice. All investing carries risk, including loss of principal, and bitcoin and crypto are highly volatile. Talk to a licensed advisor, CPA or attorney before acting.',
  },
];

export function getPillar(slug: PillarSlug): Pillar {
  const pillar = pillars.find((p) => p.slug === slug);
  if (!pillar) throw new Error(`Unknown pillar: ${slug}`);
  return pillar;
}
