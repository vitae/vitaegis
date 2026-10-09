import Link from 'next/link';

export type CategoryPost = { href: string; label: string; blurb?: string };

const label = 'text-[11px] font-semibold uppercase tracking-[0.25em]';

/** "Posts · N" grid of linked cards, shared by the category pages. */
export default function CategoryPosts({
  posts,
  color = '#00ff00',
  title = 'Posts',
  className = 'mt-12',
}: {
  posts: CategoryPost[];
  color?: string;
  title?: string;
  className?: string;
}) {
  if (posts.length === 0) return null;
  return (
    <section className={`${className} text-left`}>
      <h2 className={label} style={{ color }}>
        {title} · {posts.length}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {posts.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group rounded-2xl border p-5 transition hover:bg-white/[0.04]"
            style={{ borderColor: `${color}4d` }}
          >
            <p className="text-lg font-medium text-white">
              {p.label}{' '}
              <span className="transition group-hover:translate-x-0.5" style={{ color }}>
                →
              </span>
            </p>
            {p.blurb && <p className="mt-1 text-sm font-light text-white/60">{p.blurb}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
