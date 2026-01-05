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
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 flex flex-col items-center justify-center text-justify">
            <div className="flex flex-col items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vitae-green/20 to-transparent border border-vitae-green/50 flex items-center justify-center mx-auto">
                <span className="text-vitae-green font-bold text-lg font-[Jost]">V</span>
              </div>
              <span className="text-xl font-semibold tracking-wider mx-auto font-[Jost]">VITAEGIS</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-xs mx-auto text-justify text-center [text-align-last:center]">
              Ancient wisdom meets Cyberspirituality. Evolve your energy with Meditation, Yoga, and Tai Chi.
            </p>

            {/* Social Links */}
            <div className="flex gap-3 justify-center w-full">
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
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-vitae-green hover:border-vitae-green/30 transition-all"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
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
        <div className="mt-16 pt-8 border-t border-white/10 w-full flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div className="text-white/40 text-sm">
            © 2026 Vitaegis. All rights reserved.
          </div>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-6 text-sm">
            <a href="#" className="text-white/40 hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-white/40 hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-white/40 hover:text-white transition-colors">
              Cookies
            </a>
          </div>
        </div>

        {/* Decorative element */}
        <div className="mt-8 flex justify-center">
          <div className="text-[#00ff00]/80 text-[0.6rem] sm:text-xs tracking-[0.3em] uppercase whitespace-nowrap">
            Health • Stealth • Wealth
          </div>
        </div>
      </div>
    </footer>
  );
}
