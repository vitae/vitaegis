import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section, Bullets } from '../legal/Legal';
import { CONTACT_EMAIL, SITE, LAST_UPDATED } from '../legal/content';

export const metadata: Metadata = {
  title: 'Terms of Service | VITAEGIS',
  description:
    'The terms that apply to using vitaegis.com, buying from it, and the health content on it.',
};

export default function TermsPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Terms of Service"
      updated={LAST_UPDATED}
      intro={`The rules for using ${SITE}, buying from it, and reading the health material on it. Using the site means you accept these.`}
    >
      <Section heading="What this site is">
        <p>
          Vitaegis is a personal wellness brand publishing writing, routes, practices and reference
          material, and selling digital products such as PDF books, along with classes and events.
          It is operated from Honolulu, Hawaii.
        </p>
      </Section>

      <Section heading="Health content is not medical advice">
        <p className="text-white/90">
          This is the most important thing here. Everything on this site about supplements,
          training, running, nutrition, meditation or recovery is personal experience and general
          information. It is not medical advice, it is not a diagnosis, and it is not a treatment
          plan.
        </p>
        <p>
          Talk to a qualified clinician before starting or stopping any supplement, changing your
          diet, or beginning a training programme, especially if you are pregnant, taking
          medication, or managing a health condition. What works for one person can be wrong or
          dangerous for another. Anything you do with this material is your own decision and your
          own risk.
        </p>
      </Section>

      <Section heading="Purchases and refunds">
        <Bullets
          items={[
            ['Payment', 'is handled by Stripe. Prices are in US dollars unless stated otherwise.'],
            [
              'Digital products',
              'such as PDF books are delivered by a download link sent to the email you provide. Because they cannot be returned once delivered, they are non-refundable unless the file is faulty or never arrived, in which case we will fix it or refund you.',
            ],
            [
              'Classes and events',
              'can be refunded up to 24 hours before the start time. Inside 24 hours, or for a no-show, the fee is not refundable. If we cancel, you get a full refund.',
            ],
            [
              'Problems',
              'go to the email at the bottom of this page. We would rather sort it out than argue about it.',
            ],
          ]}
        />
      </Section>

      <Section heading="What you may do with what you buy">
        <p>
          A purchase buys you a personal, non-transferable licence to read and use the material
          yourself. You may not resell it, republish it, or distribute copies. The writing,
          photography, route data, design and brand on this site belong to Vitaegis unless credited
          otherwise.
        </p>
        <p>
          Map and route data is traced on OpenStreetMap data, © OpenStreetMap contributors, and is
          used under the Open Database Licence.
        </p>
      </Section>

      <Section heading="Routes, training and the outdoors">
        <p>
          Running routes on this site are provided as information, not as a guarantee of safety.
          Conditions, traffic, surf, weather and road layouts change. Check a route yourself before
          relying on it, carry water, and use your judgement. Distances and elevation are measured
          from traced data and are approximations.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>Do not use the site to:</p>
        <Bullets
          items={[
            ['Break the law', 'or infringe someone else’s rights.'],
            [
              'Attack the service',
              'by scraping aggressively, probing for vulnerabilities, or trying to overwhelm it.',
            ],
            ['Misrepresent yourself', 'or impersonate Vitaegis or anyone connected to it.'],
          ]}
        />
      </Section>

      <Section heading="Third-party services">
        <p>
          The site relies on services run by others, including Stripe, Supabase, Vercel, Anthropic,
          Google, Strava and the social networks. Their own terms apply to their part of the
          experience, and we cannot control their availability. Links to other sites are not
          endorsements.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          The site is provided as is. To the fullest extent the law allows, Vitaegis is not liable
          for indirect or consequential losses arising from your use of it. Nothing here limits
          liability for death or personal injury caused by negligence, or for fraud, where the law
          does not permit that limitation.
        </p>
      </Section>

      <Section heading="Changes and governing law">
        <p>
          These terms may change; the date above shows when they last did, and continuing to use the
          site means accepting the current version. They are governed by the laws of the State of
          Hawaii, United States.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-vitae-green hover:underline">
            {CONTACT_EMAIL}
          </a>
          . See also the{' '}
          <Link href="/privacy" className="text-vitae-green hover:underline">
            privacy policy
          </Link>{' '}
          and{' '}
          <Link href="/data-deletion" className="text-vitae-green hover:underline">
            data deletion
          </Link>{' '}
          pages.
        </p>
      </Section>
    </LegalPage>
  );
}
