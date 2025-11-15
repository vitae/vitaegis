'use client';

import { motion } from 'framer-motion';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8 }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/30 border-b border-green-500/20"
      >
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-2xl font-bold text-green-400 tracking-wider"
          >
            VITAEGIS
          </motion.div>

          <div className="flex gap-6">
            {['Home', 'About', 'Products', 'Contact'].map((item) => (
              <motion.a
                key={item}
                href={`/${item.toLowerCase()}`}
                whileHover={{ scale: 1.1, color: '#00ff41' }}
                className="text-gray-300 hover:text-green-400 transition-colors cursor-pointer"
              >
                {item}
              </motion.a>
            ))}
          </div>
        </div>
      </motion.nav>

      {/* Main content */}
      <main className="relative z-10">{children}</main>

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
