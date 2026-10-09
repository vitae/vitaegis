import Link from 'next/link';
import { Fragment } from 'react';

export type Pillar = 'health' | 'stealth' | 'wealth';

const PILLARS: { id: Pillar; label: string; href: string }[] = [
  { id: 'health', label: 'Health', href: '/health' },
  { id: 'stealth', label: 'Stealth', href: '/stealth' },
  { id: 'wealth', label: 'Wealth', href: '/wealth' },
];

type Props = {
  /** Separator between pillars. Omit for a true centred dot drawn in CSS. */
  separator?: string;
  /** Render labels in capitals (the text itself, not just CSS). */
  upper?: boolean;
  /** Pillar this page belongs to, styled with `activeClassName`. */
  active?: Pillar;
  className?: string;
  linkClassName?: string;
  activeClassName?: string;
  separatorClassName?: string;
};

/**
 * "Health · Stealth · Wealth", each pillar linking to its category page. Always one line:
 * the three words and their dots are an inline flex row that never wraps, and the dot is a
 * real circle vertically centred on the text, so letter-spacing on the parent cannot push it
 * around or stretch the gaps.
 */
export default function PillarLinks({
  separator,
  upper = false,
  active,
  className,
  linkClassName = 'transition-colors hover:text-white focus-visible:text-white',
  activeClassName,
  separatorClassName,
}: Props) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap ${className ?? ''}`}>
      {PILLARS.map((p, i) => (
        <Fragment key={p.id}>
          {i > 0 &&
            (separator ? (
              <span aria-hidden className={`mx-2 tracking-normal ${separatorClassName ?? ''}`}>
                {separator}
              </span>
            ) : (
              <span
                aria-hidden
                className={`mx-[0.7em] inline-block h-[0.28em] w-[0.28em] flex-none rounded-full bg-current opacity-70 ${separatorClassName ?? ''}`}
              />
            ))}
          <Link
            href={p.href}
            className={[
              'inline-flex items-center',
              linkClassName,
              p.id === active ? activeClassName : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {upper ? p.label.toUpperCase() : p.label}
          </Link>
        </Fragment>
      ))}
    </span>
  );
}
