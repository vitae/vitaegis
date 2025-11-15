import Link from "next/link";

export default function Header() {
  return (
    <header className="flex justify-between p-4 border-b border-neon">
      <h1 className="text-2xl font-futura neon-text">Vitaegis Vitality</h1>
      <nav className="space-x-4">
        <Link href="/">Home</Link>
        <Link href="/matrix-demo">Matrix Demo</Link>
        <Link href="/about">About</Link>
        <Link href="/meditation">Meditation</Link>
        <Link href="/yoga">Yoga</Link>
        <Link href="/taichi">Tai Chi</Link>
        <Link href="/products">Products</Link>
        <Link href="/live">Live</Link>
        <Link href="/information">Info</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </header>
  );
}
