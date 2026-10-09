import { pillars, type Pillar } from '@/lib/pillars';
import { books } from '@/lib/books';
import { STORE_PRODUCTS, formatPrice } from '@/lib/store';
import { SECRETS_PRICE_LABEL } from '@/lib/secrets/price';
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
    'Every product costs the same: ' +
      formatPrice(STORE_PRODUCTS[0].priceCents) +
      ', paid once through Stripe Checkout.',
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
    text: [
      '# vitaegis.com pages',
      ...SITE_MAP.map((p) => `- ${p.title} at ${p.path}: ${p.blurb}`),
    ].join('\n'),
  };
}

export function buildKnowledge(): KnowledgeDoc[] {
  return [...pillars.map(pillarDoc), booksDoc(), storeDoc(), secretsDoc(), sitemapDoc()];
}
