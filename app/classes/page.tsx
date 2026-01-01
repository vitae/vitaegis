"use client";

import React from "react";

export default function ClassesPage() {
  return (
    <main className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      {/* Matrix Canvas Effect (not rendered in SSR/React, but could be a React effect) */}
      {/* <canvas id="matrix"></canvas> */}

      <div className="content min-h-screen">
        <section className="container mx-auto px-4 py-16 text-center">
          <div className="animate-bounce text-6xl mb-6">🧘‍♀️</div>
          <h1 className="text-7xl font-black mb-4" style={{textShadow:'0 0 20px #dc2626,0 0 40px #dc2626'}}>
            <span className="bg-gradient-to-r from-red-700 via-red-500 to-red-300 bg-clip-text text-transparent">MEDITATION MONDAYS</span>
          </h1>
          <p className="text-3xl text-red-500 tracking-wider font-semibold mb-8">SUNSET SESSIONS</p>
          <p className="max-w-2xl mx-auto mb-12 text-lg">Aloha! Where ancient wisdom meets modern science.</p>
          <div className="bg-red-900/10 backdrop-blur-lg border-2 border-red-700/40 shadow-lg rounded-full w-[350px] md:w-[600px] h-[350px] md:h-[600px] mx-auto flex flex-col justify-center items-center">
            <p className="text-3xl md:text-5xl font-bold text-red-500 mb-8">EVERY MONDAY</p>
            <p className="text-2xl md:text-4xl mb-2">Meditation: 4:30 PM</p>
            <p className="text-2xl md:text-4xl mb-6">Yoga: 5:30 PM</p>
            <p className="text-xl md:text-3xl text-red-500">Lē'ahi Beach Park</p>
            <p className="text-xl md:text-3xl text-red-500 mb-6">Waikīkī, Hawaii</p>
            <p className="text-lg md:text-2xl mb-6">Bring water and a mat.</p>
            <p className="text-xl md:text-3xl text-red-500">FREE</p>
          </div>
        </section>

        {/* EXPERIENCE */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-4xl font-bold text-center mb-12" style={{textShadow:'0 0 20px #dc2626,0 0 40px #dc2626'}}>
            <span className="bg-gradient-to-r from-red-700 via-red-500 to-red-300 bg-clip-text text-transparent">THE EXPERIENCE</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-red-900/10 backdrop-blur-lg border-2 border-red-700/40 shadow-lg rounded-3xl p-8 text-center hover:scale-105 transition">
              <div className="text-5xl mb-4">🧘</div>
              <h3 className="text-2xl font-bold text-red-500 mb-4">Breathing Meditation</h3>
              <p className="text-gray-400">Advanced breathing techniques to cultivate clarity and peace.</p>
            </div>
            <div className="bg-red-900/10 backdrop-blur-lg border-2 border-red-700/40 shadow-lg rounded-3xl p-8 text-center hover:scale-105 transition">
              <div className="text-5xl mb-4">🕉️</div>
              <h3 className="text-2xl font-bold text-red-500 mb-4">Gentle Yoga Flow</h3>
              <p className="text-gray-400">Mindful movement for all experience levels.</p>
            </div>
            <div className="bg-red-900/10 backdrop-blur-lg border-2 border-red-700/40 shadow-lg rounded-3xl p-8 text-center hover:scale-105 transition">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-2xl font-bold text-red-500 mb-4">Community Circle</h3>
              <p className="text-gray-400">Connect, share, and grow together.</p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="bg-red-900/10 backdrop-blur-lg border-2 border-red-700/40 shadow-lg rounded-3xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 text-red-500">ELEVATE YOUR MONDAYS</h2>
            <div className="grid md:grid-cols-2 gap-6 text-gray-300">
              <div className="flex items-start space-x-3"><span className="text-red-500 text-xl">✓</span><span>Reduce stress and anxiety</span></div>
              <div className="flex items-start space-x-3"><span className="text-red-500 text-xl">✓</span><span>Improve focus and clarity</span></div>
              <div className="flex items-start space-x-3"><span className="text-red-500 text-xl">✓</span><span>Increase physical flexibility</span></div>
              <div className="flex items-start space-x-3"><span className="text-red-500 text-xl">✓</span><span>Cultivate inner peace</span></div>
              <div className="flex items-start space-x-3"><span className="text-red-500 text-xl">✓</span><span>Enhance awareness</span></div>
              <div className="flex items-start space-x-3"><span className="text-red-500 text-xl">✓</span><span>Join a supportive community</span></div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="bg-purple-900/10 backdrop-blur-lg border-2 border-purple-700/40 shadow-lg rounded-3xl p-12 max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold mb-6" style={{textShadow:'0 0 20px #dc2626,0 0 40px #dc2626'}}>
              <span className="bg-gradient-to-r from-red-700 via-red-500 to-red-300 bg-clip-text text-transparent">BEGIN YOUR JOURNEY</span>
            </h2>
            <p className="mb-8 text-lg">No experience necessary. Bring a mat, wear comfortable clothes, and come with an open heart.</p>
            <div className="space-y-4">
              <div className="bg-red-900/10 backdrop-blur-lg border-2 border-red-700/40 shadow-lg rounded-2xl p-6 inline-block">
                <p className="text-2xl font-bold text-red-500 mb-2">RSVP TODAY</p>
                <p>Call: (808) 333-1234</p>
                <p>Email: aloha@meditationmondays.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="container mx-auto px-4 py-8 text-center text-gray-500 text-sm">
          <p>PEACE • PRESENCE • POWER</p>
          <p className="mt-2">© 2025 Meditation Mondays. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}
