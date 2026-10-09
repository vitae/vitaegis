import Link from 'next/link';
import { Fragment } from 'react';

export type Pillar = 'health' | 'stealth' | 'wealth';

const PILLARS: { id: Pillar; label: string; href: string }[] = [
  { id: 'health', label: 'Health', href: '/health' },
  { id: 'stealth', label: 'Stealth', href: '/stealth' },
  { id: 'wealth', label: 'Wealth', href: '/wealth' },
];

type Props = {
  /** Separator between pillars. */
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

/** "Health • Stealth • Wealth", each pillar linking to its category page. */
export default function PillarLinks({
  separator = '•',
  upper = false,
  active,
  className,
  linkClassName = 'transition-colors hover:text-white focus-visible:text-white',
  activeClassName,
  separatorClassName,
}: Props) {
  return (
    <span className={className}>
      {PILLARS.map((p, i) => (
        <Fragment key={p.id}>
          {i > 0 && <span className={separatorClassName}> {separator} </span>}
          <Link
            href={p.href}
            className={[linkClassName, p.id === active ? activeClassName : '']
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
