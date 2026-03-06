'use client';

import { useState, useEffect, useRef } from 'react';

interface Proverb {
  id: string;
  text: string;
  source: string;
  tag: string;
  note?: string;
  created_at: string;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const TAG_COLORS: Record<string, string> = {
  Zen: '#00ff9d',
  Stoic: '#00cfff',
  Taoist: '#a78bfa',
  Kundalini: '#f97316',
  'Hip-Hop': '#fbbf24',
  Ancient: '#e879f9',
  Personal: '#34d399',
  Modern: '#60a5fa',
  Cyberpunk: '#ff0080',
  Love: '#ff00ff',
};

export default function ProverbsPage() {
  const [proverbs, setProverbs] = useState<Proverb[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'PROVERBS ONLINE. I am the living archive of collected wisdom. Ask me anything — I will respond only from the sacred library.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'oracle' | 'library'>('oracle');
  const [filterTag, setFilterTag] = useState('All');
  const [glitch, setGlitch] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch('/api/proverbs')
      .then((r) => r.json())
      .then((data) => setProverbs(data.proverbs || []))
      .catch(() => setProverbs([]));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = 'アイウエオカキクケコ0123456789ABCDEF◈⊕∞';
    const cols = Math.floor(canvas.width / 16);
    const drops = Array(cols).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = `rgba(0,255,157,${Math.random() * 0.12 + 0.03})`;
        ctx.font = '12px monospace';
        ctx.fillText(char, i * 16, y * 16);
        if (y * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    };

    const interval = setInterval(draw, 50);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const triggerGlitch = () => {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 400);
  };

  const askOracle = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    triggerGlitch();

    try {
      const res = await fetch('/api/proverbs/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'CONNECTION INTERRUPTED. The signal was lost in the noise.' },
      ]);
    }
    setLoading(false);
  };

  const tags = Array.from(new Set(proverbs.map((p) => p.tag)));
  const filtered = filterTag === 'All' ? proverbs : proverbs.filter((p) => p.tag === filterTag);

  return (
    <div
      style={{
        fontFamily: "'Courier New', monospace",
        background: '#000',
        minHeight: '100vh',
        color: '#00ff9d',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background:
            'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 800,
          margin: '0 auto',
          padding: '32px 16px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 8,
              color: '#00ff9d55',
              marginBottom: 10,
            }}
          >
            VITAEGIS PROTOCOL
          </div>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 900,
              letterSpacing: 6,
              margin: 0,
              fontFamily: 'Georgia, serif',
              textShadow: glitch
                ? '3px 0 #ff0080, -3px 0 #00cfff'
                : '0 0 40px #00ff9d66, 0 0 80px #00ff9d22',
              transition: 'text-shadow 0.1s',
            }}
          >
            ◈ PROVERBS ◈
          </h1>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 6,
              color: '#00ff9d44',
              marginTop: 10,
            }}
          >
            WISDOM ORACLE
          </div>
          <div
            style={{
              display: 'inline-flex',
              gap: 24,
              marginTop: 16,
              padding: '8px 24px',
              border: '1px solid #00ff9d22',
              background: '#00ff9d06',
              fontSize: 10,
              letterSpacing: 2,
            }}
          >
            <span>
              ARCHIVE:{' '}
              <span style={{ color: '#00ff9d' }}>{proverbs.length} ENTRIES</span>
            </span>
            <span>|</span>
            <span>
              STATUS: <span style={{ color: '#00ff9d' }}>ONLINE</span>
            </span>
          </div>
        </div>

        {/* Nav */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            marginBottom: 28,
            borderBottom: '1px solid #00ff9d1a',
          }}
        >
          {(
            [
              ['oracle', '◈ ORACLE'],
              ['library', '⊕ LIBRARY'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{
                background: view === key ? '#00ff9d12' : 'transparent',
                border: 'none',
                borderBottom:
                  view === key ? '2px solid #00ff9d' : '2px solid transparent',
                color: view === key ? '#00ff9d' : '#00ff9d44',
                padding: '10px 24px',
                cursor: 'pointer',
                fontSize: 11,
                letterSpacing: 3,
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ORACLE */}
        {view === 'oracle' && (
          <div>
            <div
              style={{
                height: 420,
                overflowY: 'auto',
                padding: 16,
                marginBottom: 16,
                border: '1px solid #00ff9d1a',
                background: '#00ff9d04',
              }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: 3,
                      marginBottom: 5,
                      color: m.role === 'user' ? '#00cfff66' : '#00ff9d33',
                    }}
                  >
                    {m.role === 'user' ? 'YOU' : 'PROVERBS'}
                  </div>
                  <div
                    style={{
                      maxWidth: '88%',
                      padding: '12px 16px',
                      background:
                        m.role === 'user' ? '#00cfff08' : '#00ff9d08',
                      border: `1px solid ${
                        m.role === 'user' ? '#00cfff1a' : '#00ff9d1a'
                      }`,
                      fontSize: 13,
                      lineHeight: 1.75,
                      color: m.role === 'user' ? '#00cfff' : '#c0ffd8',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div
                  style={{
                    color: '#00ff9d33',
                    fontSize: 11,
                    letterSpacing: 3,
                    animation: 'pulse 1.2s infinite',
                  }}
                >
                  ◈ SEARCHING ARCHIVE...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && askOracle()}
                placeholder="Speak your question to the oracle..."
                style={{
                  flex: 1,
                  background: '#00ff9d06',
                  border: '1px solid #00ff9d2a',
                  color: '#00ff9d',
                  padding: '12px 16px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <button
                onClick={askOracle}
                disabled={loading}
                style={{
                  background: '#00ff9d1a',
                  border: '1px solid #00ff9d44',
                  color: '#00ff9d',
                  padding: '12px 28px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 11,
                  letterSpacing: 3,
                  fontFamily: 'inherit',
                }}
              >
                CONSULT
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 12,
              }}
            >
              {[
                'I need focus',
                "I'm feeling lost",
                'Teach me discipline',
                'I face a hard choice',
                'Give me strength',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #00ff9d1a',
                    color: '#00ff9d44',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: 10,
                    letterSpacing: 2,
                    fontFamily: 'inherit',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* LIBRARY */}
        {view === 'library' && (
          <div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginBottom: 16,
                flexWrap: 'wrap',
              }}
            >
              {['All', ...tags].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterTag(t)}
                  style={{
                    background:
                      filterTag === t
                        ? `${TAG_COLORS[t] || '#00ff9d'}18`
                        : 'transparent',
                    border: `1px solid ${
                      filterTag === t
                        ? TAG_COLORS[t] || '#00ff9d'
                        : '#00ff9d1a'
                    }`,
                    color:
                      filterTag === t
                        ? TAG_COLORS[t] || '#00ff9d'
                        : '#00ff9d44',
                    padding: '5px 12px',
                    cursor: 'pointer',
                    fontSize: 10,
                    letterSpacing: 2,
                    fontFamily: 'inherit',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 3,
                color: '#00ff9d33',
                marginBottom: 16,
              }}
            >
              {filtered.length} ENTRIES
            </div>
            {filtered.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: 16,
                  marginBottom: 8,
                  border: '1px solid #00ff9d0e',
                  background: '#00ff9d03',
                  display: 'flex',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 2,
                    alignSelf: 'stretch',
                    background: TAG_COLORS[p.tag] || '#00ff9d',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: '#d0ffd8',
                      marginBottom: 6,
                    }}
                  >
                    &quot;{p.text}&quot;
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#00ff9d55' }}>
                      — {p.source || 'Unknown'}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        padding: '2px 8px',
                        border: `1px solid ${TAG_COLORS[p.tag] || '#00ff9d'}33`,
                        color: TAG_COLORS[p.tag] || '#00ff9d',
                      }}
                    >
                      {p.tag}
                    </span>
                  </div>
                  {p.note && (
                    <div
                      style={{
                        fontSize: 11,
                        color: '#00ff9d33',
                        marginTop: 6,
                        fontStyle: 'italic',
                      }}
                    >
                      ↳ {p.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 60,
                  color: '#00ff9d22',
                  fontSize: 12,
                  letterSpacing: 3,
                }}
              >
                ARCHIVE EMPTY
              </div>
            )}
          </div>
        )}

        <div
          style={{
            textAlign: 'center',
            marginTop: 48,
            fontSize: 9,
            letterSpacing: 6,
            color: '#00ff9d1a',
          }}
        >
          VITAEGIS · HEALTH · STEALTH · WEALTH
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder { color: #00ff9d2a; }
        button:hover { opacity: 0.8; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #00ff9d1a; }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
