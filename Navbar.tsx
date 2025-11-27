"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 w-full z-50 nav-frost"
    >
      <div className="container py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-10 h-10 bg-[#00ff6a] text-black flex items-center justify-center font-bold rounded-lg transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,255,106,0.5)]"
            style={{
              boxShadow: "0 0 15px rgba(0, 255, 106, 0.3)",
            }}
          >
            VV
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[#00ff6a] neon-text-subtle tracking-wide">
              Vitaegis
            </span>
            <span className="text-[10px] text-gray-500 tracking-[0.2em] uppercase">
              Vitality
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <NavLink href="/shop">Shop</NavLink>
          <NavLink href="/about">About</NavLink>
          <NavLink href="/contact">Contact</NavLink>
        </nav>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-gray-400 hover:text-white">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
    </motion.header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative text-sm text-gray-400 hover:text-white transition-colors duration-200 py-2 group"
    >
      {children}
      <span className="absolute bottom-0 left-0 w-0 h-px bg-[#00ff6a] transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}
