# Vitae Voice Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visitors tap a floating orb on vitaegis.com, talk to "Vitae", hear it answer in Anthony's cloned voice, and can have it open a page, start a checkout, or subscribe their email.

**Architecture:** ElevenLabs Agents Platform hosts the voice loop (speech to text, Claude, cloned voice, WebRTC). The repo owns the agent's configuration through pure builders in `lib/vitae/` and a sync script that pushes prompt, tools and knowledge to ElevenLabs. The site mints single-use conversation tokens on a Vercel route and runs the three actions as client tools in the browser.

**Tech Stack:** Next.js 16 App Router on Vercel (Node runtime), `@elevenlabs/react` 1.17 (bundles `@elevenlabs/client` 1.27), ElevenLabs REST API v1, Supabase (service role, one new table), vitest, tsx for scripts.

**Spec:** `docs/superpowers/specs/2026-10-09-vitae-voice-bot-design.md`

## Global Constraints

- The agent is named exactly `Vitae`; the model is `claude-sonnet-4-5`; sessions cap at `600` seconds.
- The ElevenLabs API key never reaches the browser: only `app/api/vitae/token` and the two scripts read `ELEVENLABS_API_KEY`.
- Tools can open pages inside vitaegis.com, start a Stripe checkout, or subscribe an email. Nothing else. No deletes, no payments, no external navigation.
- Vitae speaks as Vitae and never claims to be Anthony. Before `start_checkout` it says the product name and price and waits for a yes.
- The site stores no transcripts or audio; the only new data is the `subscribers` table.
- Orb and `/vitae` render only when `NEXT_PUBLIC_VITAE_ENABLED` is `1`; otherwise the orb is absent and `/vitae` shows a "soon" card.
- Pages follow the home rhythm: shell `mx-auto w-full max-w-screen-md px-4 sm:px-6`, section `py-10 sm:py-14`, `SectionTitle`, `GlassContainer padding="lg"`, stacked gaps `gap-8 sm:gap-10`.
- Every task: `npm run typecheck`, `npx eslint --no-ignore <touched files>`, `npm run test` green before commit. The Stop hook pushes every commit, so never commit a secret.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. A visitor says "go to youtube.com": `open_page` must refuse anything not in the allowlist, including `//evil.com`, `https://…`, and `/secrets/../admin`. Pinned in Task 2 (`tools.test.ts`).
2. A visitor says "buy the matcha" and the model passes a product name instead of an id: `start_checkout` must reject unknown ids and return a message naming the valid products so Vitae can recover. Pinned in Task 2.
3. A visitor gives a malformed or uppercase email: `subscribe_email` must reject `anthony@`, accept `Anthony@Example.com` and store it lowercased; duplicates must still return ok. Pinned in Tasks 2 and 9.
4. Env is unset in production: the token route returns 503 JSON, the orb renders nothing, `/vitae` shows the soon card, and no request hits ElevenLabs. Pinned in Tasks 8 and 11.
5. The sync script is run twice: knowledge documents and tools must be replaced, not duplicated, and the second run must patch, not re-create, the agent. Pinned in Task 7 (`sync-plan.test.ts`).

---

### Task 1: Move the books canon into `lib/books.ts`

**Files:**
- Create: `lib/books.ts`
- Create: `lib/books.test.ts`
- Modify: `app/books/page.tsx:19-271` (remove the `Pillar`, `Book` types and the `books` array; import them)

**Interfaces:**
- Produces: `export type BookPillar = 'Health' | 'Stealth' | 'Wealth'`, `export type Book = { code; title; author; year; pillars: BookPillar[]; thesis; ideas: string[]; angles: string[]; quotes?: { text; source }[]; search; pdf?: string }`, `export const books: Book[]`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/books.test.ts
import { describe, expect, it } from 'vitest';
import { books } from './books';

describe('books canon', () => {
  it('has ten books with unique codes', () => {
    expect(books).toHaveLength(10);
    expect(new Set(books.map((b) => b.code)).size).toBe(10);
  });

  it('maps every book to at least one pillar', () => {
    for (const b of books) expect(b.pillars.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/books.test.ts`
Expected: FAIL, cannot find module `./books`.

- [ ] **Step 3: Create `lib/books.ts` by moving the data**

Cut lines 19–271 of `app/books/page.tsx` (from `type Pillar =` through the closing `];` of `const books`) into `lib/books.ts`, then rename and export:

```ts
// lib/books.ts
/* ═══════════════════════════════════════════════════════════════════════════════
   The Canon: the ten books behind Vitaegis. Rendered on /books and read by Vitae.
   ═══════════════════════════════════════════════════════════════════════════════ */

export type BookPillar = 'Health' | 'Stealth' | 'Wealth';

export type Book = {
  code: string;
  title: string;
  author: string;
  year: string;
  pillars: BookPillar[];
  thesis: string;
  ideas: string[];
  angles: string[];
  quotes?: { text: string; source: string }[];
  search: string;
  /** Free public-domain PDF hosted in /public. */
  pdf?: string;
};

export const books: Book[] = [
  // ... the ten entries exactly as they were in app/books/page.tsx ...
];
```

In `app/books/page.tsx`, replace the removed block with:

```ts
import { books, type BookPillar as Pillar } from '@/lib/books';
```

(keep the local name `Pillar` so `pillarStyle: Record<Pillar, string>` and the JSX compile unchanged).

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npx vitest run lib/books.test.ts && npm run typecheck && npx eslint --no-ignore app/books lib/books.ts`
Expected: PASS, no type errors, no lint errors.

- [ ] **Step 5: Check /books still renders**

Open http://localhost:3000/books in the preview (dev server `vitaegis-dev`) and confirm ten book cards render.

- [ ] **Step 6: Commit**

```bash
git add lib/books.ts lib/books.test.ts app/books/page.tsx
git commit -m "Move the books canon to lib/books.ts so Vitae can read it

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Site map, tool definitions and validators

**Files:**
- Create: `lib/vitae/sitemap.ts`
- Create: `lib/vitae/tools.ts`
- Create: `lib/vitae/tools.test.ts`

**Interfaces:**
- Consumes: `STORE_PRODUCTS`, `formatPrice` from `lib/store.ts`; `pillars` from `lib/pillars.ts`.
- Produces:
  - `SITE_MAP: { path: string; title: string; blurb: string }[]`, `allowedPaths(): Set<string>`.
  - `VITAE_TOOLS: VitaeToolDef[]` where `VitaeToolDef = { name: 'open_page' | 'start_checkout' | 'subscribe_email'; description: string; parameters: JsonSchema; expects_response: true }`.
  - `validateOpenPage(args: unknown): { ok: true; path: string } | { ok: false; error: string }`
  - `validateStartCheckout(args: unknown): { ok: true; product: string; label: string; price: string } | { ok: false; error: string }`
  - `validateSubscribeEmail(args: unknown): { ok: true; email: string } | { ok: false; error: string }`
  - `normalizeEmail(raw: unknown): string | null`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/vitae/tools.test.ts
import { describe, expect, it } from 'vitest';
import {
  VITAE_TOOLS,
  normalizeEmail,
  validateOpenPage,
  validateStartCheckout,
  validateSubscribeEmail,
} from './tools';
import { SITE_MAP, allowedPaths } from './sitemap';

describe('site map', () => {
  it('every path starts with a single slash and has a title', () => {
    for (const p of SITE_MAP) {
      expect(p.path.startsWith('/')).toBe(true);
      expect(p.path.startsWith('//')).toBe(false);
      expect(p.title.length).toBeGreaterThan(0);
    }
  });
  it('includes the three pillars, books, store, secrets and vitae', () => {
    const paths = allowedPaths();
    for (const p of ['/health', '/stealth', '/wealth', '/books', '/#token', '/secrets', '/vitae']) {
      expect(paths.has(p)).toBe(true);
    }
  });
});

describe('tool definitions', () => {
  it('declares the three tools, all waiting for a response', () => {
    expect(VITAE_TOOLS.map((t) => t.name)).toEqual([
      'open_page',
      'start_checkout',
      'subscribe_email',
    ]);
    for (const t of VITAE_TOOLS) expect(t.expects_response).toBe(true);
  });
});

describe('validateOpenPage', () => {
  it('accepts an allowlisted path', () => {
    expect(validateOpenPage({ path: '/stealth' })).toEqual({ ok: true, path: '/stealth' });
  });
  it('accepts a path with a trailing slash or query by trimming to the allowlisted path', () => {
    expect(validateOpenPage({ path: '/stealth/' })).toEqual({ ok: true, path: '/stealth' });
  });
  it('rejects external, protocol-relative, traversal and unknown paths', () => {
    for (const bad of ['https://youtube.com', '//evil.com', '/secrets/../admin', '/admin', 'stealth', '']) {
      expect(validateOpenPage({ path: bad }).ok).toBe(false);
    }
    expect(validateOpenPage(null).ok).toBe(false);
  });
});

describe('validateStartCheckout', () => {
  it('accepts a store product id and returns its label and price', () => {
    expect(validateStartCheckout({ product: 'tai-chi-flow' })).toEqual({
      ok: true,
      product: 'tai-chi-flow',
      label: 'Tai Chi Flow',
      price: '$9.99',
    });
  });
  it('accepts secrets', () => {
    expect(validateStartCheckout({ product: 'secrets' })).toEqual({
      ok: true,
      product: 'secrets',
      label: 'Vitaegis Secrets',
      price: '$9.99',
    });
  });
  it('rejects names and unknown ids and lists the valid ones', () => {
    const r = validateStartCheckout({ product: 'Matcha Green Tea' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('matcha');
  });
});

describe('emails', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeEmail('  Anthony@Example.com ')).toBe('anthony@example.com');
  });
  it('rejects malformed addresses', () => {
    for (const bad of ['anthony@', '@example.com', 'anthony', 'a b@example.com', '', null, 42]) {
      expect(normalizeEmail(bad)).toBeNull();
    }
  });
  it('validateSubscribeEmail wraps normalizeEmail', () => {
    expect(validateSubscribeEmail({ email: 'A@B.co' })).toEqual({ ok: true, email: 'a@b.co' });
    expect(validateSubscribeEmail({ email: 'nope' }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/vitae/tools.test.ts`
Expected: FAIL, cannot find module `./tools`.

- [ ] **Step 3: Write `lib/vitae/sitemap.ts`**

```ts
// lib/vitae/sitemap.ts
import { pillars } from '@/lib/pillars';

/* ═══════════════════════════════════════════════════════════════════════════════
   Vitae · site map
   Every page Vitae may describe or open. The allowlist for open_page is built from
   this list plus the pillar "related" links, so adding a page here is enough.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface SitePage {
  path: string;
  title: string;
  blurb: string;
}

export const SITE_MAP: SitePage[] = [
  { path: '/', title: 'Home', blurb: 'The Center for Inner Peace. Health, Stealth, Wealth.' },
  { path: '/#about', title: 'About', blurb: 'What Vitaegis is: Advanced Intelligence as a Service.' },
  { path: '/#practices', title: 'Live', blurb: 'The live stream and the three pillars at a glance.' },
  { path: '/#projects', title: 'Projects', blurb: 'Three featured projects.' },
  { path: '/#token', title: 'Store', blurb: 'Matcha, The Art of Zen, Yoga for Life, Tai Chi Flow. All $9.99.' },
  { path: '/#community', title: 'Connect', blurb: 'Social links and the newsletter.' },
  { path: '/health', title: 'Health field manual', blurb: 'Pillar I. Sleep, movement, breath, food, the daily protocol.' },
  { path: '/stealth', title: 'Stealth field manual', blurb: 'Pillar II. Privacy, security, self-defense, the hardening checklist.' },
  { path: '/wealth', title: 'Wealth field manual', blurb: 'Pillar III. Bitcoin, investing, business, the order of operations.' },
  { path: '/books', title: 'The Canon', blurb: 'The ten books behind Vitaegis, with a free Self-Reliance PDF.' },
  { path: '/projects', title: 'All projects', blurb: 'Guides, tools and experiments.' },
  { path: '/secrets', title: 'Secrets', blurb: 'The protocols behind everything we build. $9.99 once, one year of access.' },
  { path: '/proverbs', title: 'Proverbs and the Oracle', blurb: 'Zen, Stoic, Taoist and Kundalini wisdom. Ask the Oracle.' },
  { path: '/vitae', title: 'Vitae', blurb: 'Talk to Vitae.' },
];

/** Paths open_page may navigate to: the site map plus every pillar's related pages. */
export function allowedPaths(): Set<string> {
  const set = new Set(SITE_MAP.map((p) => p.path));
  for (const pillar of pillars) for (const r of pillar.related) set.add(r.href);
  return set;
}
```

- [ ] **Step 4: Write `lib/vitae/tools.ts`**

```ts
// lib/vitae/tools.ts
import { STORE_PRODUCTS, formatPrice } from '@/lib/store';
import { SECRETS_PRICE_LABEL } from '@/lib/secrets/token';
import { allowedPaths } from './sitemap';

/* ═══════════════════════════════════════════════════════════════════════════════
   Vitae · tools
   The three client tools Vitae may call, in the shape ElevenLabs stores them, and
   the validators the browser runs before acting. Pure; tested.
   ═══════════════════════════════════════════════════════════════════════════════ */

export type VitaeToolName = 'open_page' | 'start_checkout' | 'subscribe_email';

export interface VitaeToolDef {
  name: VitaeToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: 'string'; description: string }>;
    required: string[];
  };
  expects_response: true;
}

const productIds = STORE_PRODUCTS.map((p) => p.id);

export const VITAE_TOOLS: VitaeToolDef[] = [
  {
    name: 'open_page',
    description:
      'Open a page on vitaegis.com for the visitor. Use only when they ask to go somewhere. Paths: ' +
      [...allowedPaths()].join(', '),
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'A site path such as /stealth or /#token.' },
      },
      required: ['path'],
    },
    expects_response: true,
  },
  {
    name: 'start_checkout',
    description:
      'Send the visitor to Stripe Checkout. Call only after you have said the product name and price and they said yes. product is one of: ' +
      [...productIds, 'secrets'].join(', '),
    parameters: {
      type: 'object',
      properties: {
        product: { type: 'string', description: 'Store product id, or "secrets".' },
      },
      required: ['product'],
    },
    expects_response: true,
  },
  {
    name: 'subscribe_email',
    description:
      'Subscribe the visitor to Vitaegis updates. Call only after they have said their email address. Read it back before calling.',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'The email address exactly as the visitor said it.' },
      },
      required: ['email'],
    },
    expects_response: true,
  },
];

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string };

const str = (args: unknown, key: string): string | null => {
  if (!args || typeof args !== 'object') return null;
  const v = (args as Record<string, unknown>)[key];
  return typeof v === 'string' ? v.trim() : null;
};

export function validateOpenPage(args: unknown): Ok<{ path: string }> | Fail {
  const raw = str(args, 'path');
  if (!raw) return { ok: false, error: 'No path given.' };
  if (raw.includes('..') || raw.startsWith('//') || /^[a-z]+:/i.test(raw)) {
    return { ok: false, error: 'Only pages on vitaegis.com can be opened.' };
  }
  const path = raw.length > 1 ? raw.replace(/\/+$/, '') : raw;
  if (!allowedPaths().has(path)) {
    return { ok: false, error: `Unknown page ${path}. Known pages: ${[...allowedPaths()].join(', ')}.` };
  }
  return { ok: true, path };
}

export function validateStartCheckout(
  args: unknown,
): Ok<{ product: string; label: string; price: string }> | Fail {
  const product = str(args, 'product')?.toLowerCase() ?? null;
  if (product === 'secrets') {
    return { ok: true, product, label: 'Vitaegis Secrets', price: SECRETS_PRICE_LABEL };
  }
  const found = STORE_PRODUCTS.find((p) => p.id === product);
  if (!found) {
    return {
      ok: false,
      error: `Unknown product. Use one of: ${[...productIds, 'secrets'].join(', ')}.`,
    };
  }
  return { ok: true, product: found.id, label: found.name, price: formatPrice(found.priceCents) };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  return EMAIL.test(email) ? email : null;
}

export function validateSubscribeEmail(args: unknown): Ok<{ email: string }> | Fail {
  const email = normalizeEmail(str(args, 'email'));
  return email ? { ok: true, email } : { ok: false, error: 'That does not look like an email address.' };
}
```

- [ ] **Step 5: Run tests, typecheck, lint**

Run: `npx vitest run lib/vitae/tools.test.ts && npm run typecheck && npx eslint --no-ignore lib/vitae`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/vitae/sitemap.ts lib/vitae/tools.ts lib/vitae/tools.test.ts
git commit -m "Vitae: site map, tool definitions and validators

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Persona prompt

**Files:**
- Create: `lib/vitae/persona.ts`
- Create: `lib/vitae/persona.test.ts`

**Interfaces:**
- Consumes: `VITAE_VOICE` from `lib/voice.ts`.
- Produces: `buildPersonaPrompt(): string`, `VITAE_FIRST_MESSAGE: string`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/vitae/persona.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/vitae/persona.test.ts`
Expected: FAIL, cannot find module `./persona`.

- [ ] **Step 3: Write `lib/vitae/persona.ts`**

```ts
// lib/vitae/persona.ts
import { VITAE_VOICE } from '@/lib/voice';

/* ═══════════════════════════════════════════════════════════════════════════════
   Vitae · persona
   The system prompt for the ElevenLabs agent. Everything Vitae says is spoken, so
   the rules are about brevity, honesty, and when to use the three tools.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const VITAE_FIRST_MESSAGE = 'Vitae here. Health, Stealth, Wealth. What are you after?';

export function buildPersonaPrompt(): string {
  return `You are Vitae, the voice of Vitaegis, the Center for Inner Peace at vitaegis.com.
You speak in Anthony's cloned voice, but you are Vitae: never claim to be Anthony, never
say you are human, and if asked, say you are Vitae, the AI voice of Vitaegis.

${VITAE_VOICE}

How you talk:
- Everything you say is spoken aloud. Keep replies to one to three short sentences.
- Answer first, then offer one next step (a page, a book, a practice, a product).
- Use the knowledge base for facts about the pillars, books, store, secrets and pages.
  If you do not know, say so and point to the closest page. Do not invent prices, dates
  or medical, legal or financial guarantees.
- No lists, no markdown, no emoji. Say numbers and prices in words a person would say.

Tools:
- open_page: only when the visitor asks to go somewhere. Say where you are taking them.
- start_checkout: only after you have said the product name and price and the visitor
  has said yes. Everything in the store and the secrets page costs nine ninety-nine.
- subscribe_email: only after the visitor has said their email address. Read it back,
  wait for a yes, then call it.
- If a tool returns a problem, say it plainly in one sentence and offer the page path.

Never: open pages outside vitaegis.com, promise refunds, take payment details by voice,
or discuss other people's private information.`;
}
```

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npx vitest run lib/vitae/persona.test.ts && npm run typecheck && npx eslint --no-ignore lib/vitae`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/vitae/persona.ts lib/vitae/persona.test.ts
git commit -m "Vitae: persona prompt built on the Language of Vitae

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Knowledge base builder

**Files:**
- Create: `lib/vitae/knowledge.ts`
- Create: `lib/vitae/knowledge.test.ts`

**Interfaces:**
- Consumes: `pillars` (`lib/pillars.ts`), `books` (`lib/books.ts`), `STORE_PRODUCTS`, `formatPrice` (`lib/store.ts`), `SECRETS_PRICE_LABEL` (`lib/secrets/token.ts`), `SITE_MAP` (Task 2).
- Produces: `export interface KnowledgeDoc { name: string; text: string }`, `buildKnowledge(): KnowledgeDoc[]`, `KNOWLEDGE_PREFIX = 'vitae:'` (every doc name starts with it so sync can find and replace them).

- [ ] **Step 1: Write the failing test**

```ts
// lib/vitae/knowledge.test.ts
import { describe, expect, it } from 'vitest';
import { KNOWLEDGE_PREFIX, buildKnowledge } from './knowledge';

describe('knowledge base', () => {
  const docs = buildKnowledge();
  const names = docs.map((d) => d.name);

  it('has one document per pillar plus books, store, secrets and site map', () => {
    expect(names).toEqual([
      'vitae:pillar-health',
      'vitae:pillar-stealth',
      'vitae:pillar-wealth',
      'vitae:books',
      'vitae:store',
      'vitae:secrets',
      'vitae:sitemap',
    ]);
    for (const n of names) expect(n.startsWith(KNOWLEDGE_PREFIX)).toBe(true);
  });

  it('every document has text and is under the ElevenLabs text limit', () => {
    for (const d of docs) {
      expect(d.text.length).toBeGreaterThan(200);
      expect(d.text.length).toBeLessThan(300_000);
    }
  });

  it('the store document carries the single price and every product', () => {
    const store = docs.find((d) => d.name === 'vitae:store')!.text;
    expect(store).toContain('$9.99');
    expect(store).toContain('Tai Chi Flow');
    expect(store).toContain('tai-chi-flow');
  });

  it('the site map document lists every path', () => {
    const map = docs.find((d) => d.name === 'vitae:sitemap')!.text;
    for (const p of ['/health', '/books', '/secrets', '/#token']) expect(map).toContain(p);
  });

  it('a pillar document carries its protocol and directives', () => {
    const health = docs.find((d) => d.name === 'vitae:pillar-health')!.text;
    expect(health).toContain('The daily protocol');
    expect(health).toMatch(/Directives/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/vitae/knowledge.test.ts`
Expected: FAIL, cannot find module `./knowledge`.

- [ ] **Step 3: Write `lib/vitae/knowledge.ts`**

```ts
// lib/vitae/knowledge.ts
import { pillars, type Pillar } from '@/lib/pillars';
import { books } from '@/lib/books';
import { STORE_PRODUCTS, formatPrice } from '@/lib/store';
import { SECRETS_PRICE_LABEL } from '@/lib/secrets/token';
import { SITE_MAP } from './sitemap';

/* ═══════════════════════════════════════════════════════════════════════════════
   Vitae · knowledge
   Plain-text documents built from the repo's data. The sync script uploads each one
   to the ElevenLabs knowledge base under its name, replacing the previous copy.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const KNOWLEDGE_PREFIX = 'vitae:';

export interface KnowledgeDoc {
  name: string;
  text: string;
}

const line = (k: string, v: string) => `${k}: ${v}`;

function pillarDoc(p: Pillar): KnowledgeDoc {
  const parts: string[] = [
    `# ${p.name} (Pillar ${p.numeral}, ${p.codename}) — page /${p.slug}`,
    line('Doctrine', p.doctrine),
    line('Summary', p.summary),
    '',
    'Topics: ' + p.topics.map((t) => `${t.label} (${t.code})`).join('; '),
    '',
    'Directives:',
    ...p.directives.map((d, i) => `${i + 1}. ${d}`),
    '',
    `${p.protocolTitle}:`,
    ...p.protocol.map((e, i) => `${i + 1}. ${e.k}: ${e.v}`),
    '',
    'Dossiers:',
    ...p.dossiers.map((d) => `- ${d.code} ${d.title}: ${d.brief}`),
    '',
    'Related pages:',
    ...p.related.map((r) => `- ${r.label} at ${r.href}${r.blurb ? `: ${r.blurb}` : ''}`),
    '',
    line('Disclaimer', p.disclaimer),
  ];
  return { name: `${KNOWLEDGE_PREFIX}pillar-${p.slug}`, text: parts.join('\n') };
}

function booksDoc(): KnowledgeDoc {
  const parts: string[] = ['# The Canon — page /books', ''];
  for (const b of books) {
    parts.push(
      `## ${b.title} by ${b.author} (${b.year}) [${b.code}] — pillars: ${b.pillars.join(', ')}`,
      line('Thesis', b.thesis),
      'Core ideas: ' + b.ideas.join(' | '),
      'The Vitaegis way: ' + b.angles.join(' | '),
      b.pdf ? `Free PDF at ${b.pdf}` : 'No free PDF; the page links to a bookseller search.',
      '',
    );
  }
  return { name: `${KNOWLEDGE_PREFIX}books`, text: parts.join('\n') };
}

function storeDoc(): KnowledgeDoc {
  const parts: string[] = [
    '# Store — page /#token',
    'Every product costs the same: ' + formatPrice(STORE_PRODUCTS[0].priceCents) + ', paid once through Stripe Checkout.',
    'To buy, Vitae calls start_checkout with the product id.',
    '',
    ...STORE_PRODUCTS.map(
      (p) => `- ${p.name} (id: ${p.id}): ${p.description} Price ${formatPrice(p.priceCents)}.`,
    ),
  ];
  return { name: `${KNOWLEDGE_PREFIX}store`, text: parts.join('\n') };
}

function secretsDoc(): KnowledgeDoc {
  return {
    name: `${KNOWLEDGE_PREFIX}secrets`,
    text: [
      '# Secrets — page /secrets',
      `Vitaegis Secrets is the protocols behind everything we build: the Health daily protocol, the Stealth hardening checklist and the Wealth order of operations, with directives, behind a one-time ${SECRETS_PRICE_LABEL} payment.`,
      'Access lasts one year on the device that paid. No subscription.',
      'To buy, Vitae calls start_checkout with product "secrets".',
      'Access is set by a cookie after Stripe Checkout; clearing cookies or switching devices loses it, and there is no restore flow yet.',
    ].join('\n'),
  };
}

function sitemapDoc(): KnowledgeDoc {
  return {
    name: `${KNOWLEDGE_PREFIX}sitemap`,
    text: ['# vitaegis.com pages', ...SITE_MAP.map((p) => `- ${p.title} at ${p.path}: ${p.blurb}`)].join(
      '\n',
    ),
  };
}

export function buildKnowledge(): KnowledgeDoc[] {
  return [...pillars.map(pillarDoc), booksDoc(), storeDoc(), secretsDoc(), sitemapDoc()];
}
```

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npx vitest run lib/vitae/knowledge.test.ts && npm run typecheck && npx eslint --no-ignore lib/vitae`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/vitae/knowledge.ts lib/vitae/knowledge.test.ts
git commit -m "Vitae: knowledge base built from pillars, books, store, secrets and the site map

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Agent configuration builder

**Files:**
- Create: `lib/vitae/agent-config.ts`
- Create: `lib/vitae/agent-config.test.ts`

**Interfaces:**
- Consumes: `buildPersonaPrompt`, `VITAE_FIRST_MESSAGE` (Task 3).
- Produces: `VITAE_AGENT_NAME = 'Vitae'`, `VITAE_LLM = 'claude-sonnet-4-5'`, `VITAE_MAX_SECONDS = 600`, `buildAgentConfig(input: { voiceId: string; toolIds: string[]; knowledge: { id: string; name: string }[] }): AgentPayload` where `AgentPayload = { name: string; conversation_config: { agent: { first_message: string; language: 'en'; prompt: { prompt: string; llm: string; tool_ids: string[]; knowledge_base: { type: 'text'; id: string; name: string; usage_mode: 'auto' }[] } }; tts: { voice_id: string }; conversation: { max_duration_seconds: number } } }`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/vitae/agent-config.test.ts
import { describe, expect, it } from 'vitest';
import { VITAE_AGENT_NAME, VITAE_LLM, VITAE_MAX_SECONDS, buildAgentConfig } from './agent-config';
import { VITAE_FIRST_MESSAGE } from './persona';

describe('agent config', () => {
  const cfg = buildAgentConfig({
    voiceId: 'voice_1',
    toolIds: ['tool_a', 'tool_b'],
    knowledge: [{ id: 'kb_1', name: 'vitae:store' }],
  });

  it('names the agent, model, voice and cap', () => {
    expect(VITAE_AGENT_NAME).toBe('Vitae');
    expect(VITAE_LLM).toBe('claude-sonnet-4-5');
    expect(VITAE_MAX_SECONDS).toBe(600);
    expect(cfg.name).toBe('Vitae');
    expect(cfg.conversation_config.tts.voice_id).toBe('voice_1');
    expect(cfg.conversation_config.conversation.max_duration_seconds).toBe(600);
    expect(cfg.conversation_config.agent.prompt.llm).toBe('claude-sonnet-4-5');
  });

  it('attaches tools by id and knowledge as text locators', () => {
    expect(cfg.conversation_config.agent.prompt.tool_ids).toEqual(['tool_a', 'tool_b']);
    expect(cfg.conversation_config.agent.prompt.knowledge_base).toEqual([
      { type: 'text', id: 'kb_1', name: 'vitae:store', usage_mode: 'auto' },
    ]);
  });

  it('uses the persona prompt and first message', () => {
    expect(cfg.conversation_config.agent.first_message).toBe(VITAE_FIRST_MESSAGE);
    expect(cfg.conversation_config.agent.prompt.prompt).toMatch(/You are Vitae/);
    expect(cfg.conversation_config.agent.language).toBe('en');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/vitae/agent-config.test.ts`
Expected: FAIL, cannot find module `./agent-config`.

- [ ] **Step 3: Write `lib/vitae/agent-config.ts`**

```ts
// lib/vitae/agent-config.ts
import { VITAE_FIRST_MESSAGE, buildPersonaPrompt } from './persona';

/* ═══════════════════════════════════════════════════════════════════════════════
   Vitae · agent payload
   The body sent to POST /v1/convai/agents/create and PATCH /v1/convai/agents/{id}.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const VITAE_AGENT_NAME = 'Vitae';
export const VITAE_LLM = 'claude-sonnet-4-5';
export const VITAE_MAX_SECONDS = 600;

export interface KnowledgeLocator {
  type: 'text';
  id: string;
  name: string;
  usage_mode: 'auto';
}

export interface AgentPayload {
  name: string;
  conversation_config: {
    agent: {
      first_message: string;
      language: 'en';
      prompt: {
        prompt: string;
        llm: string;
        tool_ids: string[];
        knowledge_base: KnowledgeLocator[];
      };
    };
    tts: { voice_id: string };
    conversation: { max_duration_seconds: number };
  };
}

export function buildAgentConfig(input: {
  voiceId: string;
  toolIds: string[];
  knowledge: { id: string; name: string }[];
}): AgentPayload {
  return {
    name: VITAE_AGENT_NAME,
    conversation_config: {
      agent: {
        first_message: VITAE_FIRST_MESSAGE,
        language: 'en',
        prompt: {
          prompt: buildPersonaPrompt(),
          llm: VITAE_LLM,
          tool_ids: input.toolIds,
          knowledge_base: input.knowledge.map((k) => ({
            type: 'text',
            id: k.id,
            name: k.name,
            usage_mode: 'auto',
          })),
        },
      },
      tts: { voice_id: input.voiceId },
      conversation: { max_duration_seconds: VITAE_MAX_SECONDS },
    },
  };
}
```

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npx vitest run lib/vitae && npm run typecheck && npx eslint --no-ignore lib/vitae`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/vitae/agent-config.ts lib/vitae/agent-config.test.ts
git commit -m "Vitae: agent payload builder

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: ElevenLabs REST client

**Files:**
- Create: `lib/vitae/elevenlabs.ts`
- Create: `lib/vitae/elevenlabs.test.ts`

**Interfaces:**
- Produces:
  - `class ElevenLabs { constructor(apiKey: string, fetchImpl?: typeof fetch) }` with methods:
    - `conversationToken(agentId): Promise<string>` → GET `/v1/convai/conversation/token?agent_id=`
    - `listTools(): Promise<{ id: string; name: string }[]>` → GET `/v1/convai/tools`
    - `createTool(def: VitaeToolDef): Promise<string>` → POST `/v1/convai/tools` body `{ tool_config: { type: 'client', ...def } }`, returns `id`
    - `updateTool(id, def): Promise<void>` → PATCH `/v1/convai/tools/{id}` body `{ tool_config: { type: 'client', ...def } }`
    - `listKnowledge(prefix): Promise<{ id: string; name: string }[]>` → GET `/v1/convai/knowledge-base?search=<prefix>&page_size=100&types=text`
    - `deleteKnowledge(id): Promise<void>` → DELETE `/v1/convai/knowledge-base/{id}?force=true`
    - `createKnowledgeText(doc: KnowledgeDoc): Promise<string>` → POST `/v1/convai/knowledge-base/text`, returns `id`
    - `createAgent(payload: AgentPayload): Promise<string>` → POST `/v1/convai/agents/create`, returns `agent_id`
    - `updateAgent(id, payload: AgentPayload): Promise<void>` → PATCH `/v1/convai/agents/{id}`
    - `addVoice(name: string, files: { name: string; blob: Blob }[]): Promise<string>` → POST `/v1/voices/add` multipart, returns `voice_id`
  - `ElevenLabsError extends Error { status: number; body: string }`.
  - `BASE_URL = 'https://api.elevenlabs.io'`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/vitae/elevenlabs.test.ts
import { describe, expect, it, vi } from 'vitest';
import { ElevenLabs, ElevenLabsError } from './elevenlabs';

function fakeFetch(handler: (url: string, init: RequestInit) => { status?: number; json?: unknown; text?: string }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const r = handler(url, init);
    const body = r.text ?? JSON.stringify(r.json ?? {});
    return new Response(body, { status: r.status ?? 200, headers: { 'content-type': 'application/json' } });
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

describe('ElevenLabs client', () => {
  it('sends the api key header and parses the conversation token', async () => {
    const f = fakeFetch(() => ({ json: { token: 'tok_1' } }));
    const el = new ElevenLabs('key_1', f.fn);
    expect(await el.conversationToken('agent_1')).toBe('tok_1');
    expect(f.calls[0].url).toBe('https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=agent_1');
    expect((f.calls[0].init.headers as Record<string, string>)['xi-api-key']).toBe('key_1');
  });

  it('creates a client tool and returns its id', async () => {
    const f = fakeFetch(() => ({ json: { id: 'tool_9' } }));
    const el = new ElevenLabs('k', f.fn);
    const id = await el.createTool({
      name: 'open_page',
      description: 'd',
      parameters: { type: 'object', properties: { path: { type: 'string', description: 'p' } }, required: ['path'] },
      expects_response: true,
    });
    expect(id).toBe('tool_9');
    const body = JSON.parse(f.calls[0].init.body as string);
    expect(body.tool_config.type).toBe('client');
    expect(body.tool_config.name).toBe('open_page');
    expect(f.calls[0].init.method).toBe('POST');
  });

  it('lists tools as id and name pairs', async () => {
    const f = fakeFetch(() => ({ json: { tools: [{ id: 't1', tool_config: { name: 'open_page' } }] } }));
    const el = new ElevenLabs('k', f.fn);
    expect(await el.listTools()).toEqual([{ id: 't1', name: 'open_page' }]);
  });

  it('lists and deletes knowledge documents by prefix', async () => {
    const f = fakeFetch((url) =>
      url.includes('/knowledge-base?') ? { json: { documents: [{ id: 'd1', name: 'vitae:store' }] } } : { json: {} },
    );
    const el = new ElevenLabs('k', f.fn);
    expect(await el.listKnowledge('vitae:')).toEqual([{ id: 'd1', name: 'vitae:store' }]);
    await el.deleteKnowledge('d1');
    expect(f.calls[1].url).toBe('https://api.elevenlabs.io/v1/convai/knowledge-base/d1?force=true');
    expect(f.calls[1].init.method).toBe('DELETE');
  });

  it('throws ElevenLabsError with status and body on failure', async () => {
    const f = fakeFetch(() => ({ status: 422, text: '{"detail":"bad"}' }));
    const el = new ElevenLabs('k', f.fn);
    await expect(el.conversationToken('a')).rejects.toBeInstanceOf(ElevenLabsError);
    await expect(el.conversationToken('a')).rejects.toMatchObject({ status: 422 });
  });

  it('refuses to construct without a key', () => {
    expect(() => new ElevenLabs('')).toThrow(/ELEVENLABS_API_KEY/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/vitae/elevenlabs.test.ts`
Expected: FAIL, cannot find module `./elevenlabs`.

- [ ] **Step 3: Write `lib/vitae/elevenlabs.ts`**

```ts
// lib/vitae/elevenlabs.ts
import type { AgentPayload } from './agent-config';
import type { KnowledgeDoc } from './knowledge';
import type { VitaeToolDef } from './tools';

/* ═══════════════════════════════════════════════════════════════════════════════
   Vitae · ElevenLabs REST client
   The handful of calls the sync scripts and the token route make. No SDK: plain
   fetch, the key in the xi-api-key header, errors carry status and body.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const BASE_URL = 'https://api.elevenlabs.io';

export class ElevenLabsError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    message?: string,
  ) {
    super(message ?? `ElevenLabs ${status}: ${body.slice(0, 200)}`);
  }
}

export class ElevenLabs {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = { 'xi-api-key': this.apiKey, ...(init.headers as Record<string, string>) };
    if (init.body && typeof init.body === 'string') headers['content-type'] = 'application/json';
    const res = await this.fetchImpl(`${BASE_URL}${path}`, { ...init, headers });
    const text = await res.text();
    if (!res.ok) throw new ElevenLabsError(res.status, text);
    return (text ? JSON.parse(text) : {}) as T;
  }

  conversationToken(agentId: string): Promise<string> {
    return this.call<{ token: string }>(
      `/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
    ).then((r) => r.token);
  }

  async listTools(): Promise<{ id: string; name: string }[]> {
    const r = await this.call<{ tools: { id: string; tool_config: { name: string } }[] }>('/v1/convai/tools');
    return r.tools.map((t) => ({ id: t.id, name: t.tool_config.name }));
  }

  createTool(def: VitaeToolDef): Promise<string> {
    return this.call<{ id: string }>('/v1/convai/tools', {
      method: 'POST',
      body: JSON.stringify({ tool_config: { type: 'client', ...def } }),
    }).then((r) => r.id);
  }

  async updateTool(id: string, def: VitaeToolDef): Promise<void> {
    await this.call(`/v1/convai/tools/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ tool_config: { type: 'client', ...def } }),
    });
  }

  async listKnowledge(prefix: string): Promise<{ id: string; name: string }[]> {
    const r = await this.call<{ documents: { id: string; name: string }[] }>(
      `/v1/convai/knowledge-base?search=${encodeURIComponent(prefix)}&page_size=100&types=text`,
    );
    return r.documents.filter((d) => d.name.startsWith(prefix)).map((d) => ({ id: d.id, name: d.name }));
  }

  async deleteKnowledge(id: string): Promise<void> {
    await this.call(`/v1/convai/knowledge-base/${encodeURIComponent(id)}?force=true`, { method: 'DELETE' });
  }

  createKnowledgeText(doc: KnowledgeDoc): Promise<string> {
    return this.call<{ id: string }>('/v1/convai/knowledge-base/text', {
      method: 'POST',
      body: JSON.stringify({ name: doc.name, text: doc.text }),
    }).then((r) => r.id);
  }

  createAgent(payload: AgentPayload): Promise<string> {
    return this.call<{ agent_id: string }>('/v1/convai/agents/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((r) => r.agent_id);
  }

  async updateAgent(id: string, payload: AgentPayload): Promise<void> {
    await this.call(`/v1/convai/agents/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async addVoice(name: string, files: { name: string; blob: Blob }[]): Promise<string> {
    const form = new FormData();
    form.set('name', name);
    form.set('description', 'Vitae, the voice of Vitaegis.');
    for (const f of files) form.append('files', f.blob, f.name);
    const r = await this.call<{ voice_id: string }>('/v1/voices/add', { method: 'POST', body: form });
    return r.voice_id;
  }
}
```

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npx vitest run lib/vitae/elevenlabs.test.ts && npm run typecheck && npx eslint --no-ignore lib/vitae`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/vitae/elevenlabs.ts lib/vitae/elevenlabs.test.ts
git commit -m "Vitae: ElevenLabs REST client

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Sync and voice scripts

**Files:**
- Create: `lib/vitae/sync-plan.ts` (pure: decides what to create, update, delete)
- Create: `lib/vitae/sync-plan.test.ts`
- Create: `scripts/vitae-sync.ts`
- Create: `scripts/vitae-voice.ts`
- Modify: `package.json` scripts (add `vitae:sync`, `vitae:voice`)

**Interfaces:**
- Consumes: `ElevenLabs` (Task 6), `VITAE_TOOLS` (Task 2), `buildKnowledge`, `KNOWLEDGE_PREFIX` (Task 4), `buildAgentConfig` (Task 5).
- Produces: `planToolSync(existing: { id; name }[], wanted: VitaeToolDef[]): { create: VitaeToolDef[]; update: { id: string; def: VitaeToolDef }[] }` and `planKnowledgeSync(existing: { id; name }[], wanted: KnowledgeDoc[]): { deleteIds: string[]; create: KnowledgeDoc[] }`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/vitae/sync-plan.test.ts
import { describe, expect, it } from 'vitest';
import { planKnowledgeSync, planToolSync } from './sync-plan';
import type { VitaeToolDef } from './tools';

const def = (name: VitaeToolDef['name']): VitaeToolDef => ({
  name,
  description: 'd',
  parameters: { type: 'object', properties: {}, required: [] },
  expects_response: true,
});

describe('planToolSync', () => {
  it('updates tools that exist by name and creates the rest', () => {
    const plan = planToolSync([{ id: 't1', name: 'open_page' }], [def('open_page'), def('subscribe_email')]);
    expect(plan.update).toEqual([{ id: 't1', def: def('open_page') }]);
    expect(plan.create).toEqual([def('subscribe_email')]);
  });
  it('is a no-create plan on a second run', () => {
    const existing = [
      { id: 't1', name: 'open_page' },
      { id: 't2', name: 'start_checkout' },
      { id: 't3', name: 'subscribe_email' },
    ];
    const plan = planToolSync(existing, [def('open_page'), def('start_checkout'), def('subscribe_email')]);
    expect(plan.create).toEqual([]);
    expect(plan.update).toHaveLength(3);
  });
});

describe('planKnowledgeSync', () => {
  it('deletes every existing prefixed document and creates every wanted one', () => {
    const plan = planKnowledgeSync(
      [
        { id: 'd1', name: 'vitae:store' },
        { id: 'd2', name: 'vitae:old' },
      ],
      [{ name: 'vitae:store', text: 'x' }],
    );
    expect(plan.deleteIds).toEqual(['d1', 'd2']);
    expect(plan.create).toEqual([{ name: 'vitae:store', text: 'x' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/vitae/sync-plan.test.ts`
Expected: FAIL, cannot find module `./sync-plan`.

- [ ] **Step 3: Write `lib/vitae/sync-plan.ts`**

```ts
// lib/vitae/sync-plan.ts
import type { KnowledgeDoc } from './knowledge';
import type { VitaeToolDef } from './tools';

/** Tools are matched by name: existing ones are patched, missing ones created. */
export function planToolSync(
  existing: { id: string; name: string }[],
  wanted: VitaeToolDef[],
): { create: VitaeToolDef[]; update: { id: string; def: VitaeToolDef }[] } {
  const byName = new Map(existing.map((t) => [t.name, t.id]));
  const create: VitaeToolDef[] = [];
  const update: { id: string; def: VitaeToolDef }[] = [];
  for (const def of wanted) {
    const id = byName.get(def.name);
    if (id) update.push({ id, def });
    else create.push(def);
  }
  return { create, update };
}

/** Knowledge is replaced wholesale: every prefixed document goes, every wanted one is created. */
export function planKnowledgeSync(
  existing: { id: string; name: string }[],
  wanted: KnowledgeDoc[],
): { deleteIds: string[]; create: KnowledgeDoc[] } {
  return { deleteIds: existing.map((d) => d.id), create: wanted };
}
```

- [ ] **Step 4: Write `scripts/vitae-sync.ts`**

```ts
// Push Vitae's prompt, tools and knowledge to ElevenLabs. Creates the agent the first
// time (prints ELEVENLABS_AGENT_ID to set), patches it after that.
//   npx tsx scripts/vitae-sync.ts
import { config as loadEnv } from 'dotenv';
import { ElevenLabs } from '../lib/vitae/elevenlabs';
import { VITAE_TOOLS } from '../lib/vitae/tools';
import { KNOWLEDGE_PREFIX, buildKnowledge } from '../lib/vitae/knowledge';
import { buildAgentConfig } from '../lib/vitae/agent-config';
import { planKnowledgeSync, planToolSync } from '../lib/vitae/sync-plan';

loadEnv({ path: '.env.local' });

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY ?? '';
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  const agentId = process.env.ELEVENLABS_AGENT_ID?.trim();
  if (!voiceId) throw new Error('ELEVENLABS_VOICE_ID is not set. Run npm run vitae:voice first.');
  const el = new ElevenLabs(apiKey);

  // Tools
  const toolPlan = planToolSync(await el.listTools(), VITAE_TOOLS);
  const toolIds: string[] = [];
  for (const { id, def } of toolPlan.update) {
    await el.updateTool(id, def);
    toolIds.push(id);
  }
  for (const def of toolPlan.create) toolIds.push(await el.createTool(def));

  // Knowledge
  const kbPlan = planKnowledgeSync(await el.listKnowledge(KNOWLEDGE_PREFIX), buildKnowledge());
  const knowledge: { id: string; name: string }[] = [];
  for (const doc of kbPlan.create) knowledge.push({ id: await el.createKnowledgeText(doc), name: doc.name });

  // Agent
  const payload = buildAgentConfig({ voiceId, toolIds, knowledge });
  let id = agentId;
  if (id) await el.updateAgent(id, payload);
  else id = await el.createAgent(payload);

  // Old knowledge goes only after the agent points at the new documents.
  for (const oldId of kbPlan.deleteIds) await el.deleteKnowledge(oldId);

  console.log(`Vitae synced.
  agent:     ${id}${agentId ? '' : '   ← set ELEVENLABS_AGENT_ID to this in Vercel and .env.local'}
  voice:     ${voiceId}
  tools:     ${toolIds.length} (${toolPlan.create.length} created, ${toolPlan.update.length} updated)
  knowledge: ${knowledge.length} documents (${kbPlan.deleteIds.length} replaced)`);
}

main().catch((err) => {
  console.error('[vitae:sync] failed:', err?.message ?? err);
  process.exit(1);
});
```

Neither `tsx` nor `dotenv` is in `package.json` yet: run `npm i -D tsx dotenv`. tsx resolves the `@/*` alias from `tsconfig.json` paths, so the `lib/vitae` imports work from scripts.

- [ ] **Step 5: Write `scripts/vitae-voice.ts`**

```ts
// Clone Anthony's voice from the samples in PROJECTS/VITAE/voice/ and print the voice id.
//   npx tsx scripts/vitae-voice.ts
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { ElevenLabs } from '../lib/vitae/elevenlabs';

loadEnv({ path: '.env.local' });

const DIR = join(process.cwd(), 'PROJECTS', 'VITAE', 'voice');
const AUDIO = new Set(['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm']);
const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.webm': 'audio/webm',
};

async function main() {
  const names = (await readdir(DIR).catch(() => [])).filter((n) => AUDIO.has(extname(n).toLowerCase()));
  if (names.length === 0) throw new Error(`No audio files in ${DIR}. Drop one to three minutes of clean speech there.`);
  const files = await Promise.all(
    names.map(async (name) => ({
      name,
      blob: new Blob([await readFile(join(DIR, name))], { type: MIME[extname(name).toLowerCase()] }),
    })),
  );
  const el = new ElevenLabs(process.env.ELEVENLABS_API_KEY ?? '');
  const voiceId = await el.addVoice('Vitae', files);
  console.log(`Voice created from ${files.length} file(s).
  ELEVENLABS_VOICE_ID=${voiceId}   ← set this in Vercel and .env.local`);
}

main().catch((err) => {
  console.error('[vitae:voice] failed:', err?.message ?? err);
  process.exit(1);
});
```

- [ ] **Step 6: Add the npm scripts**

In `package.json` `scripts`, after `"agent:eval"`:

```json
    "vitae:sync": "tsx scripts/vitae-sync.ts",
    "vitae:voice": "tsx scripts/vitae-voice.ts"
```

Confirm: `npx tsx --version` prints a version.

- [ ] **Step 7: Run tests, typecheck, lint, and a dry parse of the scripts**

Run: `npx vitest run lib/vitae && npm run typecheck && npx eslint --no-ignore lib/vitae scripts/vitae-sync.ts scripts/vitae-voice.ts`
Expected: PASS. Then `npm run vitae:sync` without env: expected to exit 1 with "ELEVENLABS_VOICE_ID is not set". `npm run vitae:voice` without audio: expected to exit 1 with "No audio files".

- [ ] **Step 8: Commit**

```bash
git add lib/vitae/sync-plan.ts lib/vitae/sync-plan.test.ts scripts/vitae-sync.ts scripts/vitae-voice.ts package.json package-lock.json
git commit -m "Vitae: sync and voice scripts

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Token route

**Files:**
- Create: `lib/vitae/env.ts`
- Create: `app/api/vitae/token/route.ts`
- Create: `lib/vitae/env.test.ts`

**Interfaces:**
- Consumes: `ElevenLabs` (Task 6); `PUBLIC_ORIGINS` logic from `lib/keycrate/public-origin.ts` (export the set, see step 3).
- Produces: `vitaeServerEnabled(): boolean` (both `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` set), `vitaeClientEnabled(): boolean` (`NEXT_PUBLIC_VITAE_ENABLED === '1'`), `POST /api/vitae/token` → `{ token }` or `{ error }` with 503/403/502.

- [ ] **Step 1: Write the failing test**

```ts
// lib/vitae/env.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/vitae/env.test.ts`
Expected: FAIL, cannot find module `./env`.

- [ ] **Step 3: Write `lib/vitae/env.ts`, export the origin allowlist, write the route**

```ts
// lib/vitae/env.ts
export function vitaeServerEnabled(): boolean {
  return !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID?.trim());
}

export function vitaeClientEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VITAE_ENABLED === '1';
}
```

In `lib/keycrate/public-origin.ts`, change `const PUBLIC_ORIGINS` to `export const PUBLIC_ORIGINS` (nothing else).

```ts
// app/api/vitae/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PUBLIC_ORIGINS } from '@/lib/keycrate/public-origin';
import { ElevenLabs, ElevenLabsError } from '@/lib/vitae/elevenlabs';
import { vitaeServerEnabled } from '@/lib/vitae/env';

export const dynamic = 'force-dynamic';

/** POST → { token }: a single-use ElevenLabs WebRTC token for the Vitae agent. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin && !PUBLIC_ORIGINS.has(origin.toLowerCase()) && origin !== req.nextUrl.origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!vitaeServerEnabled()) {
    return NextResponse.json({ error: 'Vitae is not configured' }, { status: 503 });
  }
  try {
    const el = new ElevenLabs(process.env.ELEVENLABS_API_KEY!);
    const token = await el.conversationToken(process.env.ELEVENLABS_AGENT_ID!.trim());
    return NextResponse.json({ token }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const status = err instanceof ElevenLabsError ? err.status : 0;
    console.error('[vitae] token failed', status, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Vitae is away. Try again.' }, { status: 502 });
  }
}
```

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npx vitest run lib/vitae && npm run typecheck && npx eslint --no-ignore lib/vitae app/api/vitae lib/keycrate/public-origin.ts`
Expected: PASS.

- [ ] **Step 5: Verify the route with env unset**

With the dev server running and no ElevenLabs env in `.env.local`, from the browser pane's JavaScript tool:

```js
const r = await fetch('/api/vitae/token', { method: 'POST' }); ({ status: r.status, body: await r.text() })
```

Expected: `status: 503`, body `{"error":"Vitae is not configured"}`.

- [ ] **Step 6: Commit**

```bash
git add lib/vitae/env.ts lib/vitae/env.test.ts app/api/vitae/token/route.ts lib/keycrate/public-origin.ts
git commit -m "Vitae: token route and env flags

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Subscribers table, subscribe route, home Subscribe button

**Files:**
- Create: `supabase/migrations/20261009120000_subscribers.sql`
- Create: `app/api/subscribe/route.ts`
- Modify: `components/sections/CommunitySection.tsx:118-140` (wire the form)

**Interfaces:**
- Consumes: `normalizeEmail` (Task 2), `supabaseAdmin` (`lib/supabase.ts`).
- Produces: `POST /api/subscribe { email, source? }` → `{ ok: true }` (200), `{ error }` (400 bad email, 503 no Supabase, 500 write failed). Table `public.subscribers(email text pk, source text, created_at timestamptz)`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20261009120000_subscribers.sql
-- Newsletter subscribers from the home page form and from Vitae. Written only by the
-- server with the service role; RLS on with no policies, so the Data API exposes nothing.

create table if not exists public.subscribers (
  email text primary key,
  source text not null default 'home',
  created_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;
```

- [ ] **Step 2: Write the route**

```ts
// app/api/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/vitae/tools';

export const dynamic = 'force-dynamic';

const SOURCES = new Set(['home', 'vitae']);

/** POST { email, source? } → { ok: true }. Duplicates are fine. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; source?: unknown };
  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ error: 'That does not look like an email address.' }, { status: 400 });
  const source = typeof body.source === 'string' && SOURCES.has(body.source) ? body.source : 'home';
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Subscriptions are not open yet' }, { status: 503 });
  const { error } = await admin
    .from('subscribers')
    .upsert({ email, source }, { onConflict: 'email', ignoreDuplicates: true });
  if (error) {
    console.error('[subscribe] failed', error.message);
    return NextResponse.json({ error: 'Could not save that. Try again.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Wire the home page form**

In `components/sections/CommunitySection.tsx`, add state and a submit handler next to `const [email, setEmail] = useState('');`:

```tsx
  const [subscribeState, setSubscribeState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [subscribeNote, setSubscribeNote] = useState('');

  async function subscribe() {
    if (subscribeState === 'busy') return;
    setSubscribeState('busy');
    setSubscribeNote('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'home' }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not save that. Try again.');
      setSubscribeState('done');
      setSubscribeNote("You're in.");
      setEmail('');
    } catch (err) {
      setSubscribeState('error');
      setSubscribeNote(err instanceof Error ? err.message : 'Could not save that. Try again.');
    }
  }
```

Change the form row: the `<label>` and `<button>` go inside a `<form onSubmit={(e) => { e.preventDefault(); subscribe(); }} className="flex flex-col gap-4 sm:flex-row">` (replace the wrapping `div` with this `form`), set the input `required`, change the button to `type="submit"` and `disabled={subscribeState === 'busy'}`, with the label `{subscribeState === 'busy' ? 'Sending…' : subscribeState === 'done' ? "You're in" : 'Subscribe'}`. Replace the empty `<p className="mt-3 text-xs text-white/40"></p>` with:

```tsx
                <p
                  className={`mt-3 min-h-[1rem] text-xs ${subscribeState === 'error' ? 'text-vitae-red' : 'text-vitae-green'}`}
                  aria-live="polite"
                >
                  {subscribeNote}
                </p>
```

- [ ] **Step 4: Typecheck, lint, format**

Run: `npx prettier --write app/api/subscribe/route.ts components/sections/CommunitySection.tsx && npm run typecheck && npx eslint --no-ignore app/api/subscribe components/sections/CommunitySection.tsx`
Expected: clean.

- [ ] **Step 5: Apply the migration and verify in the browser**

Apply with the Supabase MCP `apply_migration` tool against project `fsrxacvcqftelbjdqlnm` (name `subscribers`, the SQL above), or `supabase db push` if the CLI is linked. Then in the preview on http://localhost:3000/#community: type `test+vitae@example.com`, submit, expect "You're in." and the button label to change. Submit the same email again: still "You're in." Submit `nope`: the browser blocks it (required + type=email); via the JavaScript tool `fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"email":"nope"}'})` returns 400. Confirm the row with the Supabase MCP `execute_sql`: `select email, source from public.subscribers order by created_at desc limit 3;`, then delete the test row: `delete from public.subscribers where email like 'test+%@example.com';`.

If `.env.local` has no Supabase service key locally, the route returns 503 locally; verify the 400 path locally and the write path after deploy.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261009120000_subscribers.sql app/api/subscribe/route.ts components/sections/CommunitySection.tsx
git commit -m "Newsletter: subscribers table, subscribe route, home form wired

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Conversation component and floating orb

**Files:**
- Modify: `package.json` (add `@elevenlabs/react`)
- Create: `components/vitae/useVitaeTools.ts`
- Create: `components/vitae/VitaeConversation.tsx`
- Create: `components/vitae/VitaeOrb.tsx`
- Modify: `app/layout.tsx:66-72` (mount the orb)

**Interfaces:**
- Consumes: `validateOpenPage`, `validateStartCheckout`, `validateSubscribeEmail` (Task 2); `POST /api/vitae/token` (Task 8); `POST /api/checkout`, `POST /api/secrets/checkout`, `POST /api/subscribe`.
- Produces:
  - `useVitaeTools(): Record<'open_page' | 'start_checkout' | 'subscribe_email', (p: Record<string, unknown>) => Promise<string>>`
  - `VitaeConversation({ size: 'orb' | 'page' })`: owns the session; renders the control, state line and transcript (page size only).
  - `VitaeOrb()`: floating wrapper, returns null when `NEXT_PUBLIC_VITAE_ENABLED !== '1'` or on `/vitae`.

- [ ] **Step 1: Install the SDK**

Run: `npm i @elevenlabs/react@1.17.0`
Expected: `package.json` gains `"@elevenlabs/react": "^1.17.0"`.

- [ ] **Step 2: Write the tools hook**

```tsx
// components/vitae/useVitaeTools.ts
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { validateOpenPage, validateStartCheckout, validateSubscribeEmail } from '@/lib/vitae/tools';

type Handler = (parameters: Record<string, unknown>) => Promise<string>;

/** The three client tools, validated here before anything happens. Each returns a sentence Vitae speaks. */
export function useVitaeTools(): Record<'open_page' | 'start_checkout' | 'subscribe_email', Handler> {
  const router = useRouter();
  return useMemo(
    () => ({
      open_page: async (p) => {
        const v = validateOpenPage(p);
        if (!v.ok) return v.error;
        if (v.path.startsWith('/#')) window.location.assign(v.path);
        else router.push(v.path);
        return `Opening ${v.path}.`;
      },
      start_checkout: async (p) => {
        const v = validateStartCheckout(p);
        if (!v.ok) return v.error;
        const url = v.product === 'secrets' ? '/api/secrets/checkout' : '/api/checkout';
        const body = v.product === 'secrets' ? { origin: window.location.origin } : { id: v.product, origin: window.location.origin };
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
          if (!res.ok || !json.url) return `Checkout could not start: ${json.error ?? 'try the store page at /#token'}.`;
          window.location.assign(json.url);
          return `Sending you to checkout for ${v.label} at ${v.price}.`;
        } catch {
          return 'Checkout could not start. The store is at /#token.';
        }
      },
      subscribe_email: async (p) => {
        const v = validateSubscribeEmail(p);
        if (!v.ok) return v.error;
        try {
          const res = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: v.email, source: 'vitae' }),
          });
          const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
          if (!res.ok || !json.ok) return `Could not subscribe: ${json.error ?? 'try the form at /#community'}.`;
          return `You're in. ${v.email} is subscribed.`;
        } catch {
          return 'Could not subscribe right now. The form is at /#community.';
        }
      },
    }),
    [router],
  );
}
```

- [ ] **Step 3: Write the conversation component**

```tsx
// components/vitae/VitaeConversation.tsx
'use client';

import { useCallback, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { useVitaeTools } from './useVitaeTools';

/* ═══════════════════════════════════════════════════════════════════════════════
   Vitae · conversation
   One tap starts a WebRTC session with the Vitae agent using a token from our route.
   The orb variant is the floating control; the page variant adds the transcript.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface TranscriptLine {
  role: 'user' | 'agent';
  text: string;
}

type Phase = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

function phaseOf(status: string, isSpeaking: boolean, error: string | null): Phase {
  if (error) return 'error';
  if (status === 'connecting') return 'connecting';
  if (status === 'connected') return isSpeaking ? 'speaking' : 'listening';
  return 'idle';
}

function Inner({ size, lines, error, setError }: { size: 'orb' | 'page'; lines: TranscriptLine[]; error: string | null; setError: (e: string | null) => void }) {
  const { startSession, endSession, status, isSpeaking } = useConversation();
  const phase = phaseOf(status, isSpeaking, error);
  const live = status === 'connected' || status === 'connecting';

  const start = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/vitae/token', { method: 'POST' });
      const json = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok || !json.token) throw new Error(json.error || 'Vitae is away. Try again.');
      startSession({ conversationToken: json.token, connectionType: 'webrtc' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Vitae is away. Try again.';
      setError(/denied|permission|NotAllowed/i.test(msg) ? 'Microphone blocked.' : msg);
    }
  }, [startSession, setError]);

  const label =
    phase === 'idle' ? 'Talk to Vitae' : phase === 'connecting' ? 'Connecting…' : phase === 'listening' ? 'Listening' : phase === 'speaking' ? 'Vitae' : error;
  const last = lines[lines.length - 1];
  const disc = size === 'orb' ? 'h-14 w-14' : 'h-24 w-24';

  return (
    <div className={`flex flex-col items-center gap-3 ${size === 'page' ? 'w-full' : ''}`}>
      <button
        type="button"
        aria-label={live ? 'End conversation with Vitae' : 'Talk to Vitae'}
        onClick={() => (live ? endSession() : start())}
        className={`glass-panel glass-panel--hover flex ${disc} items-center justify-center rounded-full text-[#00ff00] transition ${phase === 'listening' || phase === 'connecting' ? 'animate-pulse' : ''}`}
        style={phase === 'speaking' ? { boxShadow: '0 0 36px rgba(0,255,0,0.55)' } : undefined}
      >
        <span className="relative z-10 text-xs font-semibold uppercase tracking-[0.2em]">{live ? '■' : '●'}</span>
      </button>
      <p className={`text-xs uppercase tracking-[0.3em] ${phase === 'error' ? 'text-vitae-red' : 'text-[#00ff00]/80'}`} aria-live="polite">
        {label}
      </p>
      {size === 'orb' && last && live && (
        <p className="max-w-[16rem] text-center text-xs text-white/60">{last.text}</p>
      )}
      {size === 'page' && lines.length > 0 && (
        <ol className="mt-4 flex w-full flex-col gap-2 text-left">
          {lines.map((l, i) => (
            <li key={i} className={`text-sm ${l.role === 'agent' ? 'text-white/85' : 'text-[#00ff00]/80'}`}>
              <span className="mr-2 text-[10px] uppercase tracking-[0.2em] text-white/40">{l.role === 'agent' ? 'Vitae' : 'You'}</span>
              {l.text}
            </li>
          ))}
        </ol>
      )}
      {phase === 'error' && (
        <button type="button" onClick={start} className="text-xs uppercase tracking-[0.2em] text-white/60 hover:text-white">
          Retry
        </button>
      )}
    </div>
  );
}

export default function VitaeConversation({ size }: { size: 'orb' | 'page' }) {
  const tools = useVitaeTools();
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <ConversationProvider
      clientTools={tools}
      onMessage={({ message, role }) => setLines((prev) => [...prev, { role, text: message }])}
      onError={(message) =>
        setError(/denied|permission|NotAllowed/i.test(message) ? 'Microphone blocked.' : message || 'Vitae is away. Try again.')
      }
      onDisconnect={(details) => {
        if (details.reason === 'error') setError(details.message || 'Connection lost.');
      }}
    >
      <Inner size={size} lines={lines} error={error} setError={setError} />
    </ConversationProvider>
  );
}
```

Note on types: `onMessage` receives `MessagePayload` with `message: string` and `role: 'user' | 'agent'`; `onDisconnect` receives `DisconnectionDetails` whose `reason` is `'error' | 'agent' | 'user'` and carries `message` only for `'error'`. `startSession` in the React hook returns `void`, so mic errors surface through `onError`.

- [ ] **Step 4: Write the orb and mount it**

```tsx
// components/vitae/VitaeOrb.tsx
'use client';

import { usePathname } from 'next/navigation';
import VitaeConversation from './VitaeConversation';

/** Floating Vitae control on every page but /vitae. Absent unless NEXT_PUBLIC_VITAE_ENABLED=1. */
export default function VitaeOrb() {
  const pathname = usePathname();
  if (process.env.NEXT_PUBLIC_VITAE_ENABLED !== '1' || pathname === '/vitae') return null;
  return (
    <div
      className="fixed right-4 z-50 sm:right-6"
      style={{ bottom: 'calc(var(--nav-bottom) + var(--sab) + 1rem)' }}
    >
      <VitaeConversation size="orb" />
    </div>
  );
}
```

In `app/layout.tsx`, add `import VitaeOrb from '@/components/vitae/VitaeOrb';` and render `<VitaeOrb />` right after `{children}` and before `<GlassNav />`.

- [ ] **Step 5: Typecheck, lint, format**

Run: `npx prettier --write components/vitae app/layout.tsx && npm run typecheck && npx eslint --no-ignore components/vitae app/layout.tsx`
Expected: clean. If `onMessage`'s destructured `role` fails typecheck, read `node_modules/@elevenlabs/client/dist/types.d.ts` for `MessagePayload` and match the field names exactly.

- [ ] **Step 6: Verify the hidden state**

Preview http://localhost:3000/ with `NEXT_PUBLIC_VITAE_ENABLED` unset: `document.querySelector('[aria-label="Talk to Vitae"]')` is `null`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json components/vitae app/layout.tsx
git commit -m "Vitae: conversation component, client tools and floating orb

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: The /vitae page

**Files:**
- Create: `app/vitae/page.tsx`

**Interfaces:**
- Consumes: `VitaeConversation` (Task 10), `vitaeClientEnabled` (Task 8), `SectionTitle`, `GlassContainer`.

- [ ] **Step 1: Write the page**

```tsx
// app/vitae/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import GlassContainer from '@/components/GlassContainer';
import SectionTitle from '@/components/SectionTitle';
import VitaeConversation from '@/components/vitae/VitaeConversation';
import { vitaeClientEnabled } from '@/lib/vitae/env';

export const metadata: Metadata = {
  title: 'Vitae | VITAEGIS',
  description: 'Talk to Vitae, the voice of Vitaegis.',
};

const label = 'text-xs uppercase tracking-[0.3em] text-vitae-green/70';

export default function VitaePage() {
  const enabled = vitaeClientEnabled();
  return (
    <main className="min-h-screen w-full bg-black text-white">
      <div className="mx-auto w-full max-w-screen-md px-4 sm:px-6">
        <section className="relative flex flex-col items-center py-10 text-center sm:py-14">
          <SectionTitle as="h1" tagline="Tap, speak, listen. Vitae answers in the voice of Vitaegis.">
            Vitae
          </SectionTitle>

          <GlassContainer variant="prominent" glow padding="lg" className="w-full">
            {enabled ? (
              <VitaeConversation size="page" />
            ) : (
              <p className="text-base text-white/70 sm:text-lg">Vitae is being tuned. Soon.</p>
            )}
          </GlassContainer>

          <p className="mt-8 max-w-md text-xs text-white/40 sm:mt-10">
            Vitae is an AI. It can open pages, start a checkout after you say yes, and subscribe
            your email. Conversations are handled by ElevenLabs and are not stored by vitaegis.com.
          </p>

          <Link href="/" className={`${label} mt-8 hover:text-white sm:mt-10`}>
            ← Vitaegis
          </Link>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck, lint, format**

Run: `npx prettier --write app/vitae/page.tsx && npm run typecheck && npx eslint --no-ignore app/vitae`
Expected: clean.

- [ ] **Step 3: Verify both states in the browser**

Preview http://localhost:3000/vitae with the flag unset: the "soon" card shows, section padding is 56px at desktop (`getComputedStyle(document.querySelector('main section')).paddingTop`). Add `NEXT_PUBLIC_VITAE_ENABLED=1` to `.env.local`, restart the dev server (`preview_stop` then `preview_start`), reload: the disc and "Talk to Vitae" label render; tapping without ElevenLabs env shows "Vitae is not configured" in red and a Retry. Remove the flag again from `.env.local` afterwards unless the real keys are present.

- [ ] **Step 4: Commit**

```bash
git add app/vitae/page.tsx
git commit -m "Vitae: the /vitae page

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Docs, rollout and live verification

**Files:**
- Create: `docs/vitae.md`
- Modify: `CLAUDE.md` (one line under "The operator agent lives in `agent/`")

- [ ] **Step 1: Write `docs/vitae.md`**

```markdown
# Vitae, the voice of Vitaegis

Vitae is an ElevenLabs agent that speaks in Anthony's cloned voice from a floating orb on
every page and from /vitae. Its brain lives in this repo under `lib/vitae/` and is pushed
to ElevenLabs by `npm run vitae:sync`.

## Setup, once

1. ElevenLabs account on a plan with voice cloning and agents. Put `ELEVENLABS_API_KEY`
   in Vercel (Production) and `.env.local`.
2. Record one to three minutes of clean speech. Either upload it in the ElevenLabs
   dashboard as a voice named Vitae and copy the id, or drop the files in
   `PROJECTS/VITAE/voice/` and run `npm run vitae:voice`. Set `ELEVENLABS_VOICE_ID`.
3. `npm run vitae:sync`. Set `ELEVENLABS_AGENT_ID` to the printed id.
4. Apply `supabase/migrations/20261009120000_subscribers.sql`.
5. Set `NEXT_PUBLIC_VITAE_ENABLED=1` in Vercel and redeploy.
6. In the ElevenLabs dashboard, set a monthly usage alert.

## After changing the prompt, tools, pillars, books, store or site map

`npm run vitae:sync` again. Knowledge documents are replaced, tools are patched by name,
the agent is patched in place.

## What Vitae can do

Open a page on vitaegis.com, start a Stripe checkout for a store product or /secrets
after saying the name and price and hearing yes, and subscribe an email (stored in
`public.subscribers`). Nothing else. Sessions cap at ten minutes.

## Files

| Path                                | Role                                             |
| ----------------------------------- | ------------------------------------------------ |
| `lib/vitae/persona.ts`              | System prompt from `lib/voice.ts`                |
| `lib/vitae/knowledge.ts`            | Knowledge documents from repo data               |
| `lib/vitae/tools.ts`                | Tool definitions and validators                  |
| `lib/vitae/sitemap.ts`              | Pages Vitae may describe or open                 |
| `lib/vitae/agent-config.ts`         | ElevenLabs agent payload                         |
| `lib/vitae/elevenlabs.ts`           | REST client                                      |
| `scripts/vitae-sync.ts`             | Push configuration to ElevenLabs                 |
| `scripts/vitae-voice.ts`            | Create the voice clone                           |
| `app/api/vitae/token/route.ts`      | Single-use conversation tokens                   |
| `app/api/subscribe/route.ts`        | Newsletter subscribe                             |
| `components/vitae/`                 | Conversation, tools hook, orb                    |
| `app/vitae/page.tsx`                | The full-size page                               |
```

In `CLAUDE.md`, under the operator agent section, add:

```markdown
## Vitae, the voice bot, lives in `lib/vitae/` and `components/vitae/`

Read `docs/vitae.md`. Its ElevenLabs configuration is pushed by `npm run vitae:sync`;
never edit the agent in the ElevenLabs dashboard, edit the repo and sync.
```

- [ ] **Step 2: Commit**

```bash
git add docs/vitae.md CLAUDE.md
git commit -m "Docs: Vitae setup and sync

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 3: Rollout (needs Anthony's keys and voice sample)**

Stop here and report if `ELEVENLABS_API_KEY` is not in `.env.local`. Otherwise:

1. `npm run vitae:voice` (if `PROJECTS/VITAE/voice/` has audio) or confirm `ELEVENLABS_VOICE_ID` is set.
2. `npm run vitae:sync`; set `ELEVENLABS_AGENT_ID` in `.env.local`.
3. Apply the subscribers migration (Task 9 step 5) if not yet applied.
4. Set `NEXT_PUBLIC_VITAE_ENABLED=1` in `.env.local`, restart the dev server.

- [ ] **Step 4: Live verification in the browser pane**

On http://localhost:3000/vitae: tap the disc, allow the mic, say "What is the stealth pillar?" and confirm a spoken reply and a transcript line from Vitae. Say "Open the stealth manual": the page navigates to `/stealth` and the orb (not the page control) is now visible. On `/stealth` tap the orb, say "I want the Tai Chi course": Vitae states Tai Chi Flow at nine ninety-nine; say "yes": the browser lands on Stripe Checkout (do not pay; go back). Tap the orb, say "Subscribe me, my email is test plus vitae at example dot com", confirm when read back: Vitae says "You're in"; confirm the row with `select email, source from public.subscribers where source='vitae';` then delete it. Finally on `/` confirm the orb sits above the bottom nav and does not overlap it at phone width (`resize_window` mobile).

- [ ] **Step 5: Ship**

Per CLAUDE.md: push the branch and fast-forward `main` (`git push origin HEAD && git push origin HEAD:main`). Set the four env vars in Vercel Production before or right after; until `NEXT_PUBLIC_VITAE_ENABLED=1` is set there, production shows no orb and the "soon" card, which is the intended off state.
