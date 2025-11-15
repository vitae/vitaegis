'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Layout({ children }) {
  const [activeNav, setActiveNav] = useState('home');

  const navItems = [
    { name: 'Home', href: '/', icon: '◈' },
    { name: 'About', href: '/about', icon: '◆' },
    { name: 'Products', href: '/products', icon: '◇' },
    { name: 'Contact', href: '/contact', icon: '◈' },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Main content */}
      <main className="relative z-10">{children}</main>

      {/* Bottom Glassmorphic Navigation */}
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        {/* Glassmorphic container */}
        <div className="mx-auto max-w-2xl px-4 pb-safe">
          <div className="relative backdrop-blur-xl bg-gradient-to-r from-black/40 via-green-900/20 to-black/40 border border-green-500/30 rounded-3xl shadow-[0_0_40px_rgba(0,255,65,0.15)] mb-4">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-green-500/10 to-transparent blur-xl" />

            {/* Navigation content */}
            <div className="relative flex items-center justify-around px-6 py-4">
              {/* Logo */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center justify-center"
              >
                <a href="/" className="flex flex-col items-center gap-1">
                  <div className="text-green-400 text-2xl font-bold tracking-wider glow-green-strong">
                    V
                  </div>
                  <span className="text-[10px] text-green-400/70 font-mono">VITAEGIS</span>
                </a>
              </motion.div>

              {/* Vertical divider */}
              <div className="h-12 w-px bg-gradient-to-b from-transparent via-green-500/50 to-transparent" />

              {/* Navigation items */}
              {navItems.map((item, index) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  onClick={() => setActiveNav(item.name.toLowerCase())}
                  whileHover={{ scale: 1.15, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                    activeNav === item.name.toLowerCase()
                      ? 'text-green-400'
                      : 'text-gray-400 hover:text-green-300'
                  }`}
                >
                  {/* Icon */}
                  <motion.div
                    animate={{
                      boxShadow:
                        activeNav === item.name.toLowerCase()
                          ? '0 0 20px rgba(0,255,65,0.6)'
                          : '0 0 0px rgba(0,255,65,0)',
                    }}
                    className={`text-xl ${
                      activeNav === item.name.toLowerCase() ? 'glow-green' : ''
                    }`}
                  >
                    {item.icon}
                  </motion.div>

                  {/* Label */}
                  <span className="text-[10px] font-mono tracking-wider">
                    {item.name.toUpperCase()}
                  </span>

                  {/* Active indicator */}
                  {activeNav === item.name.toLowerCase() && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute -bottom-1 w-8 h-0.5 bg-green-400 rounded-full shadow-[0_0_10px_rgba(0,255,65,0.8)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Footer */}
      <footer className="relative z-10 border-t border-green-500/20 bg-black/50 backdrop-blur-md">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-green-400 font-bold mb-4">VITAEGIS</h3>
              <p className="text-gray-400 text-sm">
                Next-generation Web3 infrastructure built on decentralized technology.
              </p>
            </div>
            <div>
              <h4 className="text-green-400 font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/about" className="hover:text-green-400">About</a></li>
                <li><a href="/products" className="hover:text-green-400">Products</a></li>
                <li><a href="/contact" className="hover:text-green-400">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-green-400 font-bold mb-4">Connect</h4>
              <p className="text-gray-400 text-sm">Follow the white rabbit...</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-green-500/20 text-center text-gray-500 text-sm">
            © 2025 VITAEGIS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
