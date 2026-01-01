import React, { useState } from "react";
import Link from "next/link";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        aria-label="Open menu"
        className="p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#00ff6a]"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-4 top-16 bg-black bg-opacity-90 rounded-lg shadow-lg py-4 px-6 flex flex-col gap-4 z-50 border border-[#00ff6a]">
          <Link href="/shop" className="text-white hover:text-[#00ff6a]" onClick={() => setOpen(false)}>Shop</Link>
          <Link href="/about" className="text-white hover:text-[#00ff6a]" onClick={() => setOpen(false)}>About</Link>
          <Link href="/contact" className="text-white hover:text-[#00ff6a]" onClick={() => setOpen(false)}>Contact</Link>
          <Link href="/classes" className="text-white hover:text-[#00ff6a]" onClick={() => setOpen(false)}>Classes</Link>
        </div>
      )}
    </div>
  );
}
