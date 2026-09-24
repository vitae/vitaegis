import Link from 'next/link';

export default function KeyCrateNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 pt-16 text-center">
      <h1 className="text-2xl font-medium text-white">That set isn&apos;t shared</h1>
      <p className="mt-2 text-sm text-[#808880]">
        Either the link is wrong or the owner hasn&apos;t made it public.
      </p>
      <Link href="/keycrate" className="mt-6 text-[#00ff00] underline">
        Open KeyCrate
      </Link>
    </div>
  );
}
