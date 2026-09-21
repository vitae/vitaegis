import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section, Bullets } from '../legal/Legal';
import { CONTACT_EMAIL, SITE, LAST_UPDATED } from '../legal/content';

export const metadata: Metadata = {
  title: 'Data Deletion | VITAEGIS',
  description: 'How to have your data removed from Vitaegis, what gets deleted, and how long it takes.',
};

export default function DataDeletionPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Data Deletion"
      updated={LAST_UPDATED}
      intro={`How to have your information removed from ${SITE}. One email, no account required, no retention offers.`}
    >
      <Section heading="How to ask">
        <p>
          Email{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Data%20deletion%20request`}
            className="text-vitae-green hover:underline"
          >
            {CONTACT_EMAIL}
          </a>{' '}
          with the subject <span className="text-white">Data deletion request</span>.
        </p>
        <p>Include whichever of these apply, so we can find your records:</p>
        <Bullets
          items={[
            ['The email address', 'you used to buy something or contact us.'],
            ['Your Facebook or Instagram username', 'if you interacted with us there.'],
            ['Roughly when', 'you used the site, which helps if you are unsure what we hold.'],
          ]}
        />
        <p className="pt-2">
          You do not need an account, and we will not ask you to explain why.
        </p>
      </Section>

      <Section heading="What happens next">
        <Bullets
          items={[
            ['Within 3 days', 'we confirm we received the request.'],
            ['Within 30 days', 'the data is deleted and we email you a short note confirming what was removed.'],
            ['If we cannot find anything', 'under the details you gave, we tell you that rather than leaving you waiting.'],
          ]}
        />
      </Section>

      <Section heading="What gets deleted">
        <p>Everything we hold that identifies you, including:</p>
        <Bullets
          items={[
            ['Contact details', 'and any correspondence.'],
            ['Anything you typed', 'into the Oracle features or a form.'],
            ['Content and media', 'connected to you stored in our database and file storage.'],
            ['Social connections', 'and tokens tied to your account, with the connection revoked.'],
          ]}
        />
      </Section>

      <Section heading="What we may have to keep">
        <p>
          Records of completed purchases are retained for tax and accounting reasons, typically seven years.
          That is a legal obligation rather than a choice, and we strip those records back to the minimum
          required: the transaction itself, not your wider activity. Stripe holds payment data under its own
          policy, and you can contact Stripe directly about it.
        </p>
        <p>
          Anonymous analytics cannot be traced back to you and therefore cannot be selectively removed.
        </p>
      </Section>

      <Section heading="Revoking access yourself">
        <p>
          If you connected a social or fitness account, you can cut it off immediately without waiting for
          us. On Facebook, go to Settings, then Apps and Websites, and remove Vitaegis. On Strava, go to
          Settings, then My Apps. Revoking access stops any further data reaching us, and we delete what we
          already hold when you email us.
        </p>
      </Section>

      <Section heading="Related">
        <p>
          The{' '}
          <Link href="/privacy" className="text-vitae-green hover:underline">
            privacy policy
          </Link>{' '}
          explains what is collected in the first place and who processes it.
        </p>
      </Section>
    </LegalPage>
  );
}
