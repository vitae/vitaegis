import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section, Bullets } from '../legal/Legal';
import { CONTACT_EMAIL, SITE, LAST_UPDATED } from '../legal/content';

export const metadata: Metadata = {
  title: 'Privacy Policy | VITAEGIS',
  description: 'What Vitaegis collects, why, who it is shared with, and how to have it deleted.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Privacy Policy"
      updated={LAST_UPDATED}
      intro={`This explains what ${SITE} collects, why, who else sees it, and how to get it removed. It covers the website and the tools behind it. Plain language, no dark patterns.`}
    >
      <Section heading="Who we are">
        <p>
          Vitaegis is a personal wellness brand and website operated from Honolulu, Hawaii. Questions about
          anything here go to{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-vitae-green hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section heading="What we collect">
        <p>Only what a given feature needs to work.</p>
        <Bullets
          items={[
            ['Purchases.', 'When you buy a class, ticket or book, Stripe collects your payment details and email. Card numbers go to Stripe directly and never touch our servers. We keep a record that the purchase happened.'],
            ['Things you send us.', 'Questions asked of the Proverbs Oracle or Health Oracle, and anything you type into a form. These are stored so features work and so we can see what is failing.'],
            ['Fitness activity.', 'If the site is connected to a Strava account, we store that account’s activity summaries: distance, pace, time, elevation, heart rate and the route outline. This is the site owner’s own data, shown publicly on the run page.'],
            ['Analytics.', 'Vercel Analytics and Speed Insights record page views and load performance. They are cookieless and do not build a profile of you across other sites.'],
            ['Technical logs.', 'Our host records IP addresses and request details automatically, as every web server does, for security and debugging.'],
          ]}
        />
        <p className="pt-2">
          We do not sell personal information, we do not run advertising trackers, and we do not use
          third-party cookies for marketing.
        </p>
      </Section>

      <Section heading="Where it goes">
        <p>
          A small number of processors handle data on our behalf. Each one gets only what its job requires.
        </p>
        <Bullets
          items={[
            ['Vercel', 'hosts the site and stores request logs.'],
            ['Supabase', 'is the database and file storage.'],
            ['Stripe', 'processes payments and holds the payment details.'],
            ['Anthropic', 'powers the Oracle features; the text of your question is sent to generate a reply.'],
            ['Google', 'provides Gemini and Veo, used to draft social captions and media from material the site owner captures.'],
            ['Strava', 'supplies activity data when an account is connected.'],
            ['Meta and other social networks', 'receive posts the site owner chooses to publish to them.'],
            ['Resend', 'sends transactional email such as purchase receipts and download links.'],
          ]}
        />
      </Section>

      <Section heading="AI and generated content">
        <p>
          Some posts and images on our social channels are generated with AI tools and are labelled as such
          where the platform supports it. Questions you ask an Oracle feature are sent to Anthropic to
          produce an answer. Do not put sensitive personal or medical information into those boxes.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          Purchase records are kept as long as tax and accounting rules require, typically seven years.
          Oracle logs and captured content are kept while they are useful and removed on request. Analytics
          data is aggregated and retained by Vercel under their own schedule.
        </p>
      </Section>

      <Section heading="Your choices">
        <p>
          You can ask for a copy of what we hold about you, ask us to correct it, or ask us to delete it.
          Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-vitae-green hover:underline">
            {CONTACT_EMAIL}
          </a>{' '}
          and we will respond within 30 days. There is a step-by-step guide on the{' '}
          <Link href="/data-deletion" className="text-vitae-green hover:underline">
            data deletion page
          </Link>
          .
        </p>
        <p>
          Depending on where you live you may have stronger rights, including under the GDPR in Europe or the
          CCPA in California. We apply the same process to everyone regardless of location.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          This site is not directed at children under 13 and we do not knowingly collect their information.
          If you believe a child has sent us something, email us and we will delete it.
        </p>
      </Section>

      <Section heading="Security and changes">
        <p>
          Traffic is encrypted in transit, credentials are stored as secrets rather than in code, and
          database access is restricted to the server. No system is perfectly secure, and we will not pretend
          otherwise.
        </p>
        <p>
          If this policy changes materially we will update the date above and, where the change is
          significant, say so on the site.
        </p>
      </Section>
    </LegalPage>
  );
}
