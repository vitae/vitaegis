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
        <label className="block text-sm mb-2 text-white">Number of Tickets</label>
        <select
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full rounded-2xl bg-black/20 backdrop-blur-[2px] border border-white/10 p-4 text-white focus:border-red-400 focus:outline-none transition"
        >
          {[1, 2, 3, 4, 5].map((q) => (
            <option key={q} value={q}>
              {q} × $9
            </option>
          ))}
        </select>
      </div>

      <div className="w-full">
        <div className="p-5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-[2px]">
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
        <p className="text-white text-sm mt-2 text-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">{message}</p>
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
    const words = [' ♥ MEDITATION', ' ♥ MONDAYS', ' ♥ PEACE', ' ♥ ZEN', ' ♥ YOGA', ' ♥ ALOHA', ' ♥ BALANCE', ' ♥ ENERGY', ' ♥ LOVE', ' ♥ BREATH'];
    const speed = 0.3; // Slow, smooth movement

    let width = window.innerWidth;
    let height = window.innerHeight;
    let columns = Math.floor(width / fontSize);
    
    // Each column has: y position, word index, and current letter index
    // Scatter start positions using a prime multiplier to avoid diagonal pattern
    let drops = Array.from({ length: columns }, (_, i) => ({
      y: -((i * 7) % 30) * 2,
      wordIndex: i % words.length,
      letterIndex: 0,
    }));

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      columns = Math.floor(width / fontSize);
      drops = Array.from({ length: columns }, (_, i) => ({
        y: -((i * 7) % 30) * 2,
        wordIndex: i % words.length,
        letterIndex: 0,
      }));

      canvas.width = width * DPR;
      canvas.height = height * DPR;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.font = `bold ${fontSize}px Jost, sans-serif`;
      
      // Fill canvas with solid black initially
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    };

    const draw = () => {
      // Semi-transparent black overlay - lower alpha = letters stay red longer
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(0, 0, width, height);

      // Bright red text, no glow/shadow to prevent red accumulation
      ctx.fillStyle = '#ff0000';
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        const word = words[d.wordIndex];
        const prevY = Math.floor(d.y - speed);
        const currY = Math.floor(d.y);
        
        // Only draw when crossing to a new grid row
        if (currY !== prevY && d.y > 0) {
          const char = word[d.letterIndex];
          const x = i * fontSize;
          const y = currY * fontSize;
          ctx.fillText(char, x, y);
          
          // Move to next letter in the word
          d.letterIndex = (d.letterIndex + 1) % word.length;
        }

        // Move drop down smoothly
        d.y += speed;

        // Reset to top when off screen (deterministic, no random)
        if (d.y * fontSize > height) {
          d.y = -5;
          d.wordIndex = (d.wordIndex + 1) % words.length;
          d.letterIndex = 0;
        }
      }

      requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
    return () => window.removeEventListener('resize', resize);
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
            <div className="w-full max-w-md backdrop-blur-[2px] bg-black/20 border border-white/10 rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_40px_rgba(239,68,68,0.15)]">
              
              {/* Top Accent Bar */}
              <div className="h-1 bg-gradient-to-r from-transparent via-red-500/80 to-transparent" />
              
              {/* Header */}
              <div className="px-6 pt-8 pb-4 text-center border-b border-white/10">
                <p className="text-red-400 text-base tracking-[0.3em] uppercase mb-2">Vitaegis Presents</p>
                <h1 className="text-[2.75rem] sm:text-5xl font-black bg-gradient-to-b from-white via-red-200 to-red-500 bg-clip-text text-transparent leading-tight">
                  MEDITATION
                </h1>
                <h1 className="text-[2.75rem] sm:text-5xl font-black bg-gradient-to-b from-red-400 to-red-600 bg-clip-text text-transparent leading-tight">
                  MONDAYS
                </h1>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="h-px w-12 bg-red-500/50" />
                  <span className="text-red-400 text-xl">✦ SUNSET SESSIONS ✦</span>
                  <span className="h-px w-12 bg-red-500/50" />
                </div>
              </div>

              {/* Event Details */}
              <div className="px-6 py-6 text-center space-y-5">
                <div className="inline-block px-6 py-3 border border-white/10 rounded-2xl bg-black/10 backdrop-blur-[2px]">
                  <p className="text-3xl sm:text-4xl font-bold text-white">EVERY MONDAY</p>
                </div>
                
                <div className="space-y-4">
                  <p className="text-2xl sm:text-3xl text-white font-semibold">🧘 Meditation</p>
                  <p className="text-red-400 font-bold text-xl sm:text-2xl">4:30 PM</p>
                  <p className="text-2xl sm:text-3xl text-white font-semibold pt-2">🕉️ Yoga</p>
                  <p className="text-red-400 font-bold text-xl sm:text-2xl">5:30 PM</p>
                </div>

                <div className="pt-2">
                  <p className="text-red-400 font-bold text-2xl">📍 Lē'ahi Beach Park</p>
                  <p className="text-white text-lg">Waikīkī, Honolulu</p>
                </div>

                <div className="space-y-1 text-lg text-white">
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
                <span className="flex-1 h-px bg-white/20" />
                <span className="px-4 text-red-400 text-xs uppercase tracking-wider">Support the Movement</span>
                <span className="flex-1 h-px bg-white/20" />
              </div>

              {/* Payment Section */}
              <div id="payment-section" className="mx-4 my-6 p-6 rounded-2xl bg-black/10 backdrop-blur-[2px] border border-white/10">
                <p className="text-center text-white text-sm mb-4">Support Our Community</p>
                <CheckoutForm />
              </div>

              {/* Bottom Accent */}
              <div className="h-1 bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
            </div>

            {/* Tagline */}
            <p className="mt-6 text-white text-sm tracking-wider">
              Ancient wisdom. Aloha spirit.
            </p>
          </main>
        </Elements>
      )}
    </>
  );
}
