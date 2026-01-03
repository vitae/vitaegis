'use client';
import { useEffect, useState, useRef } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setMessage('');

    const res = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });

    const { clientSecret, error } = await res.json();

    if (error) {
      setMessage(error);
      setLoading(false);
      return;
    }

    const result = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {},
      redirect: 'if_required',
    });

    if (result.error) {
      setMessage(result.error.message || 'Payment failed');
    } else if (result.paymentIntent?.status === 'succeeded') {
      setMessage('Payment successful! Thank you 🙏');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full">
      <div className="w-full text-left">
        <label className="block text-sm mb-2 text-white drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]">Number of Tickets</label>
        <select
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full rounded-2xl bg-black/10 border border-red-500/50 p-4 text-white focus:border-red-400 focus:outline-none transition shadow-[0_0_15px_rgba(255,0,0,0.3)]"
        >
          {[1, 2, 3, 4, 5].map((q) => (
            <option key={q} value={q}>
              {q} × $9
            </option>
          ))}
        </select>
      </div>

      <div className="w-full">
        <div className="p-5 rounded-2xl border border-red-500/50 bg-black/10 shadow-[0_0_15px_rgba(255,0,0,0.3)]">
          <PaymentElement options={{
            wallets: {
              applePay: 'auto',
              googlePay: 'auto'
            }
          }} />
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full px-8 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-2xl rounded-full shadow-lg shadow-red-500/40 border border-white/20 hover:from-red-500 hover:to-red-400 transition disabled:opacity-50 uppercase"
      >
        {loading ? 'PROCESSING…' : 'BUY TICKETS'}
      </button>

      {message && (
        <p className="text-red-500 text-sm mt-2 text-center bg-black/10 px-4 py-2 rounded-xl border border-red-500/50">{message}</p>
      )}
    </form>
  );
}

export default function MondaysPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const fontSize = window.innerWidth < 768 ? 18 : 22;
    const columnWidth = fontSize * 1.2; // Slightly wider than font to prevent overlap
    const words = [' ♥ MEDITATION', ' ♥ MONDAYS', ' ♥ PEACE', ' ♥ ZEN', ' ♥ YOGA', ' ♥ ALOHA', ' ♥ BALANCE', ' ♥ ENERGY', ' ♥ LOVE', ' ♥ BREATH'];
    const speed = 0.3; // Slow, smooth movement

    let width = window.innerWidth;
    let height = window.innerHeight;
    let columns = Math.floor(width / columnWidth);
    
    // Each column has: y position, word index, and current letter index
    // Scatter start positions using a prime multiplier to avoid diagonal pattern
    let drops = Array.from({ length: columns }, (_, i) => ({
      y: -((i * 7) % 30) * 2,
      wordIndex: i % words.length,
      letterIndex: 0,
    }));

    // Track recent characters for each column with their fade state
    const trailLength = 8; // Number of trailing characters per column
    let trails: { char: string; y: number; age: number }[][] = Array.from({ length: columns }, () => []);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      columns = Math.floor(width / columnWidth);
      drops = Array.from({ length: columns }, (_, i) => ({
        y: -((i * 7) % 30) * 2,
        wordIndex: i % words.length,
        letterIndex: 0,
      }));
      trails = Array.from({ length: columns }, () => []);

      canvas.width = width * DPR;
      canvas.height = height * DPR;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.font = `bold ${fontSize}px Jost, sans-serif`;
    };

    let isPaused = false;
    let animationId: number;

    const draw = () => {
      // Clear to pure black each frame
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      if (!isPaused) {
        for (let i = 0; i < drops.length; i++) {
          const d = drops[i];
          const word = words[d.wordIndex];
          const prevY = Math.floor(d.y - speed);
          const currY = Math.floor(d.y);
          
          // Add new character when crossing to a new grid row
          if (currY !== prevY && d.y > 0) {
            const char = word[d.letterIndex];
            trails[i].unshift({ char, y: currY * fontSize, age: 0 });
            
            // Limit trail length
            if (trails[i].length > trailLength) {
              trails[i].pop();
            }
            
            d.letterIndex = (d.letterIndex + 1) % word.length;
          }

          // Draw trail with fading opacity
          for (let j = 0; j < trails[i].length; j++) {
            const t = trails[i][j];
            const opacity = 1 - (t.age / trailLength);
            if (opacity > 0) {
              ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
              ctx.fillText(t.char, i * columnWidth, t.y);
            }
            t.age += 0.15; // Fade speed
          }
          
          // Remove fully faded characters
          trails[i] = trails[i].filter(t => t.age < trailLength);

          // Move drop down smoothly
          d.y += speed;

          // Reset to top when off screen
          if (d.y * fontSize > height) {
            d.y = -5;
            d.wordIndex = (d.wordIndex + 1) % words.length;
            d.letterIndex = 0;
          }
        }
      } else {
        // When paused, fill the canvas with black only
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
      }

      animationId = requestAnimationFrame(draw);
    };

    // Touch handlers for pausing on iPhone
    const handleTouchStart = () => { isPaused = true; };
    const handleTouchEnd = () => { isPaused = false; };

    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    animationId = requestAnimationFrame(draw);
    
    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      cancelAnimationFrame(animationId);
    };
  }, []);

  useEffect(() => {
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 1 }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, []);

  return (
    <>
      {/* Solid black background */}
      <div className="fixed inset-0 bg-black z-0" />
      
      {/* Red Matrix Rain - always rendered */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-screen h-screen z-[5] pointer-events-none"
      />

      {clientSecret && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'night',
              variables: { 
                colorPrimary: '#ef4444',
                fontFamily: 'Jost, sans-serif',
              },
            },
          }}
        >
          {/* EDM FLYER STYLE */}
          <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8 font-['Jost']">
            {/* Glassmorphic Flyer Container */}
            <div className="w-full max-w-md bg-black/10 border border-red-500/50 rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_30px_rgba(255,0,0,0.4)]">
              
              {/* Top Accent Bar */}
              <div className="h-1 bg-gradient-to-r from-transparent via-red-500/80 to-transparent" />
              
              {/* Header */}
              <div className="px-6 pt-8 pb-4 text-center border-b border-white/10">
                <p className="text-red-500 text-base tracking-[0.3em] uppercase mb-2">Vitaegis Presents</p>
                <h1 className="text-[2.75rem] sm:text-5xl font-black text-white leading-tight drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
                  MEDITATION
                </h1>
                <h1 className="text-[2.75rem] sm:text-5xl font-black text-white leading-tight drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
                  MONDAYS
                </h1>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="h-px w-12 bg-red-500/50" />
                  <span className="text-red-500 text-base">✦ SUNSET SESSIONS ✦</span>
                  <span className="h-px w-12 bg-red-500/50" />
                </div>
              </div>

              {/* Event Details */}
              <div className="px-6 py-6 text-center space-y-5">
                <div className="inline-block px-6 py-3 border border-red-500/50 rounded-2xl bg-black/10 shadow-[0_0_15px_rgba(255,0,0,0.3)]">
                  <p className="text-2xl sm:text-3xl font-bold text-white drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]">EVERY MONDAY</p>
                </div>
                
                <div className="space-y-4">
                  <p className="text-2xl sm:text-3xl text-white font-semibold drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]">🧘 Meditation</p>
                  <p className="text-white font-bold text-xl sm:text-2xl drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]">4:30 PM</p>
                  <p className="text-2xl sm:text-3xl text-white font-semibold pt-2 drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]">🕉️ Yoga</p>
                  <p className="text-white font-bold text-xl sm:text-2xl drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]">5:30 PM</p>
                </div>

                <div className="pt-2">
                  <p className="text-white font-bold text-2xl drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]">📍 Lē'ahi Beach Park</p>
                  <p className="text-white text-lg drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]">Waikīkī, Honolulu</p>
                </div>

                <div className="space-y-1 text-lg text-white drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]">
                  <p>🧘‍♀️ Bring a mat</p>
                  <p>💧 Bring water</p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-block px-8 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-2xl rounded-full shadow-lg shadow-red-500/40 border border-white/20 hover:from-red-500 hover:to-red-400 transition cursor-pointer"
                  >
                    TICKETS ONLY $9
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center px-6">
                <span className="flex-1 h-px bg-red-500" />
                <span className="px-4 text-red-500 text-xs uppercase tracking-wider">Support the Movement</span>
                <span className="flex-1 h-px bg-red-500" />
              </div>

              {/* Payment Section */}
              <div id="payment-section" className="mx-4 my-6 p-6 rounded-2xl bg-black/10 border border-red-500/50 shadow-[0_0_15px_rgba(255,0,0,0.3)]">
                <p className="text-center text-white text-sm mb-4 drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]">Support Our Community</p>
                <CheckoutForm />
              </div>

              {/* Bottom Accent */}
              <div className="h-1 bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
            </div>

            {/* Tagline */}
            <p className="mt-6 text-white text-sm tracking-wider drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]">
              Ancient wisdom. Aloha spirit.
            </p>
            <p className="mt-2 text-white text-xs tracking-wider drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]">
              © 2026 VITAEGIS. All Rights Reserved.
            </p>
          </main>
        </Elements>
      )}
    </>
  );
}
