'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { Suspense } from 'react';

// Dynamically import Matrix background for client-side only rendering
const MatrixBackground3D = dynamic(
  () => import('../components/MatrixBackground3D'),
  { ssr: false }
);

// Loading component for 3D scene
function MatrixLoader() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-0">
      <div className="text-green-400 text-2xl animate-pulse">
        Initializing Matrix...
      </div>
    </div>
  );
}

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <Layout>
      {/* 3D Matrix Background */}
      <Suspense fallback={<MatrixLoader />}>
        <MatrixBackground3D />
      </Suspense>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-5xl"
        >
          <motion.h1
            variants={itemVariants}
            className="text-6xl md:text-8xl font-bold mb-6 tracking-tight"
          >
            Enter the{' '}
            <span className="text-green-400 drop-shadow-[0_0_30px_rgba(0,255,65,0.5)]">
              Matrix
            </span>
            <br />
            of Web3
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto"
          >
            Decentralized infrastructure powered by blockchain technology.
            <br />
            Ultra-fast, secure, and built for the next evolution of the web.
          </motion.p>

          <motion.div variants={itemVariants} className="flex gap-6 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-green-400 text-black font-bold text-lg rounded-lg shadow-[0_0_30px_rgba(0,255,65,0.5)] hover:shadow-[0_0_50px_rgba(0,255,65,0.8)] transition-all"
            >
              Enter the Matrix
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 border-2 border-green-400 text-green-400 font-bold text-lg rounded-lg hover:bg-green-400/10 transition-all"
            >
              Learn More
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-32 px-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto"
        >
          <h2 className="text-5xl font-bold text-center mb-16 text-green-400">
            Decentralized Solutions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Crypto Payments',
                description:
                  'Accept ETH, SOL, USDC, and any EVM-compatible token with instant settlement.',
                icon: '₿',
              },
              {
                title: 'Digital Products',
                description:
                  'Sell files, access keys, or Web3 services with automated delivery.',
                icon: '◈',
              },
              {
                title: 'Smart Contracts',
                description:
                  'Fully automated and trustless workflows deployed on-chain.',
                icon: '⬡',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -10 }}
                className="bg-black/50 backdrop-blur-md border border-green-400/30 rounded-xl p-8 hover:border-green-400 transition-all hover:shadow-[0_0_30px_rgba(0,255,65,0.3)]"
              >
                <div className="text-5xl mb-4 text-green-400">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-4 text-green-400">
                  {feature.title}
                </h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-32 px-6 bg-black/30 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-center"
        >
          {[
            { value: '100K+', label: 'Transactions' },
            { value: '99.9%', label: 'Uptime' },
            { value: '<1s', label: 'Settlement' },
            { value: '24/7', label: 'Support' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-5xl font-bold text-green-400 mb-2">
                {stat.value}
              </div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center bg-gradient-to-r from-green-900/30 to-black/30 backdrop-blur-md border border-green-400/50 rounded-2xl p-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to take the{' '}
            <span className="text-green-400">red pill</span>?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join the decentralized revolution and unlock the true potential of Web3.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-12 py-5 bg-green-400 text-black font-bold text-xl rounded-lg shadow-[0_0_40px_rgba(0,255,65,0.6)] hover:shadow-[0_0_60px_rgba(0,255,65,0.9)] transition-all"
          >
            Get Started Now
          </motion.button>
        </motion.div>
      </section>
    </Layout>
  );
}
