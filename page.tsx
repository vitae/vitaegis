"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import BuyButton from "../components/BuyButton";
import WalletButton from "../components/WalletButton";

export default function Home() {
  return (
    <main className="container">
      {/* Hero Section */}
      <section className="min-h-[80vh] flex flex-col items-center justify-center text-center py-20">
        {/* Main Title */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1
            className="text-5xl md:text-7xl font-light tracking-[0.15em] mb-2"
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              textShadow:
                "0 0 40px rgba(0, 255, 106, 0.6), 0 0 80px rgba(0, 255, 106, 0.3), 0 0 120px rgba(0, 255, 106, 0.15)",
            }}
          >
            <span className="text-[#00ff6a]">Vitaegis</span>{" "}
            <span className="text-white">Vitality</span>
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-xs tracking-[0.4em] text-[#00ff6a]/60 uppercase mt-4 mb-8"
        >
          Health • Stealth • Wealth
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-gray-400 text-lg max-w-xl mx-auto mb-12 leading-relaxed"
        >
          A cyberpunk path to{" "}
          <span className="text-[#00ff6a]/80">meditation</span>,{" "}
          <span className="text-[#00ff6a]/80">breathwork</span>,{" "}
          <span className="text-[#00ff6a]/80">movement</span> and{" "}
          <span className="text-[#00ff6a]/80">sonic alchemy</span>.
        </motion.p>

        {/* Disciplines */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          {["Zen", "Kundalini", "Tai Chi", "Qi Gong"].map((discipline, i) => (
            <span
              key={discipline}
              className="px-4 py-2 text-sm text-[#00ff6a]/70 border border-[#00ff6a]/20 rounded-full bg-[#00ff6a]/5"
            >
              {discipline}
            </span>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <BuyButton />
          <Link href="/about" className="btn-neon-outline">
            Learn More
          </Link>
          <WalletButton />
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid md:grid-cols-3 gap-6"
        >
          <FeatureCard
            title="Meditation"
            description="Ancient Zen practices enhanced with binaural frequencies"
            icon="◎"
          />
          <FeatureCard
            title="Movement"
            description="Yang-style Tai Chi flows for energy cultivation"
            icon="☯"
          />
          <FeatureCard
            title="Breathwork"
            description="Kundalini awakening through sacred breathing"
            icon="△"
          />
        </motion.div>
      </section>

      {/* Version Badge */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[#00ff6a]/30 z-20">
        <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#00ff6a]/30" />
        <span className="text-[10px] tracking-[0.3em] font-mono">v0.1.0</span>
        <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#00ff6a]/30" />
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="card-glass p-6 transition-all duration-300"
    >
      <div className="text-3xl text-[#00ff6a] mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </motion.div>
  );
}
