'use client';

import { FaDiscord, FaTwitter, FaTelegram, FaGithub, FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';

const footerLinks = {
  Products: ['Features', 'Green Tea', 'Books'],
  Practices: ['Meditation', 'Yoga', 'Tai Chi'],
  Resources: ['Documentation', 'Videos', 'Tutorials'],
  Company: ['About', 'Mission', 'Contact'],
};

export default function Footer() {
  return (
    <footer className="relative py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-t border-white/10 flex flex-col items-center justify-center">
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-12 w-full items-start">
          {/* Brand Column - perfectly aligned and unified */}
          <div className="flex flex-col md:items-start md:justify-start col-span-1">
            <div className="flex flex-col items-center md:flex-row md:items-center md:gap-3 mb-4 md:mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vitae-green/20 to-transparent border border-vitae-green/50 flex items-center justify-center mb-2 md:mb-0 md:mr-2">
                <span className="text-vitae-green font-bold text-lg font-[Jost]">V</span>
              </div>
              <span className="text-xl font-semibold tracking-wider font-[Jost] md:ml-1">VITAEGIS</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-4 md:mb-6 max-w-xs text-center md:text-left">
              Ancient wisdom meets Cyberspirituality. Evolve your energy with Meditation, Yoga, and Tai Chi.
            </p>
            {/* Social Links */}
            <div className="flex gap-3 justify-center md:justify-start w-full">
              {[ 
                { icon: FaFacebook, href: 'https://facebook.com/vitaegis' },
                { icon: FaInstagram, href: 'https://instagram.com/vitaegis' },
                { icon: FaYoutube, href: 'https://youtube.com/vitaegis' },
                { icon: FaTwitter, href: 'https://x.com/vitaegis' },
                { icon: FaDiscord, href: '#' },
              ].map((social, i) => {
                const Icon = social.icon;
                return (
                  <a
                    key={i}
                    href={social.href}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-vitae-green hover:border-vitae-green/30 transition-all aspect-square"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link Columns - next 4 columns, top-aligned */}
          {Object.entries(footerLinks).map(([title, links], idx, arr) => (
            <div
              key={title}
              className={`col-span-1 flex flex-col items-center md:items-start${idx === arr.length - 1 ? ' mb-8 md:mb-0' : ''}`}
            >
              <h4 className="text-white font-semibold mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-white/50 hover:text-vitae-green text-sm transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>


        {/* Bottom Bar */}
        <div className="border-t border-white/10 w-full flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:justify-center pb-2">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-6 text-sm sm:leading-none">
            <span className="text-white/40 text-sm leading-none flex items-center">
              © 2026 VITAEGIS. All rights reserved.
            </span>
            {/* Add gap only on mobile, none on desktop */}
            <div className="h-4 sm:hidden" />
            <a href="#" className="text-white/40 hover:text-white transition-colors leading-none flex items-center">
              Privacy Policy
            </a>
            <a href="#" className="text-white/40 hover:text-white transition-colors leading-none flex items-center">
              Terms of Service
            </a>
            <a href="#" className="text-white/40 hover:text-white transition-colors leading-none flex items-center">
              Cookies
            </a>
          </div>
        </div>

        {/* Decorative element */}
        <div className="mt-4 flex justify-center">
          <div className="text-[#00ff00]/80 text-[0.6rem] sm:text-xs tracking-[0.3em] uppercase whitespace-nowrap">
            Health • Stealth • Wealth
          </div>
        </div>
      </div>
    </footer>
  );
}
