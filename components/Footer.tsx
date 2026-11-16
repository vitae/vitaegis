import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full pb-6 pt-8 sm:pb-8 sm:pt-12">
      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-white/10 pt-5 text-center text-xs text-white/60">
        <span className="inline-flex min-h-[44px] items-center">© 2026 VITAEGIS</span>
        <Link
          href="/privacy"
          className="inline-flex items-center transition-colors hover:text-white"
        >
          Privacy
        </Link>
        <Link href="/terms" className="inline-flex items-center transition-colors hover:text-white">
          Terms
        </Link>
        <Link
          href="/donate"
          className="inline-flex items-center transition-colors hover:text-white"
        >
          Donate
        </Link>
      </p>
    </footer>
  );
}
