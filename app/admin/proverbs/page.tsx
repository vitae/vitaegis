'use client';

import { useState, useEffect } from 'react';

interface Proverb {
  id: string;
  text: string;
  source: string;
  tag: string;
  note?: string;
  created_at: string;
}

const TAGS = [
  'Zen',
  'Stoic',
  'Taoist',
  'Kundalini',
  'Hip-Hop',
  'Ancient',
  'Personal',
  'Modern',
  'Cyberpunk',
];

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
};

export default function AdminProverbsPage() {
  const [proverbs, setProverbs] = useState<Proverb[]>([]);
  const [form, setForm] = useState({
    text: '',
    source: '',
    tag: 'Personal',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const load = () => {
    setLoadingList(true);
    fetch('/api/proverbs')
      .then((r) => r.json())
      .then((d) => setProverbs(d.proverbs || []))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.text.trim()) return;
    setSaving(true);
    await fetch('/api/proverbs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ text: '', source: '', tag: 'Personal', note: '' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/proverbs/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div
      style={{
        fontFamily: "'Courier New', monospace",
        background: '#020408',
        minHeight: '100vh',
        color: '#00ff9d',
        padding: '32px 16px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 8,
              color: '#00ff9d44',
              marginBottom: 8,
            }}
          >
            VITAEGIS · ADMIN
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 4,
              margin: 0,
              fontFamily: 'Georgia, serif',
              textShadow: '0 0 30px #00ff9d44',
            }}
          >
            ◈ PROVERBS FEED
          </h1>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 4,
              color: '#00ff9d44',
              marginTop: 8,
            }}
          >
            ENCODE WISDOM INTO THE ARCHIVE · {proverbs.length} ENTRIES
          </div>
        </div>

        {/* Form */}
        <div
          style={{
            padding: 24,
            border: '1px solid #00ff9d22',
            background: '#00ff9d05',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 4,
              color: '#00ff9d55',
              marginBottom: 20,
            }}
          >
            NEW ENTRY
          </div>

          <textarea
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            placeholder="Enter the proverb or saying..."
            rows={3}
            style={{
              width: '100%',
              background: '#00ff9d08',
              border: '1px solid #00ff9d22',
              color: '#00ff9d',
              padding: 14,
              fontSize: 15,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.7,
              marginBottom: 12,
            }}
          />

          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="Source / Author"
              style={{
                flex: 1,
                background: '#00ff9d08',
                border: '1px solid #00ff9d22',
                color: '#00ff9d',
                padding: '10px 14px',
                fontSize: 13,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <select
              value={form.tag}
              onChange={(e) => setForm({ ...form, tag: e.target.value })}
              style={{
                background: '#000',
                border: '1px solid #00ff9d22',
                color: TAG_COLORS[form.tag] || '#00ff9d',
                padding: '10px 14px',
                fontSize: 11,
                fontFamily: 'inherit',
                outline: 'none',
                letterSpacing: 2,
                minWidth: 130,
              }}
            >
              {TAGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Personal note — why does this resonate? (optional)"
            style={{
              width: '100%',
              background: '#00ff9d08',
              border: '1px solid #00ff9d22',
              color: '#00ff9d77',
              padding: '10px 14px',
              fontSize: 12,
              fontFamily: 'inherit',
              outline: 'none',
              marginBottom: 16,
            }}
          />

          <button
            onClick={submit}
            disabled={saving || !form.text.trim()}
            style={{
              background: saved ? '#00ff9d22' : saving ? '#00ff9d0a' : '#00ff9d18',
              border: `1px solid ${saved ? '#00ff9d' : '#00ff9d44'}`,
              color: '#00ff9d',
              padding: '12px 36px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 11,
              letterSpacing: 4,
              fontFamily: 'inherit',
              transition: 'all 0.3s',
              boxShadow: saved ? '0 0 20px #00ff9d33' : 'none',
            }}
          >
            {saved ? '✓ ENCODED' : saving ? 'ENCODING...' : '+ ENCODE INTO ARCHIVE'}
          </button>
        </div>

        {/* Archive */}
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 4,
              color: '#00ff9d44',
              marginBottom: 16,
            }}
          >
            ARCHIVE —{' '}
            {loadingList ? 'LOADING...' : `${proverbs.length} ENTRIES`}
          </div>

          {[...proverbs].map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                gap: 14,
                padding: '14px 16px',
                border: '1px solid #00ff9d0e',
                background: '#00ff9d03',
                marginBottom: 6,
                alignItems: 'flex-start',
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
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: '#d0ffd8',
                    lineHeight: 1.6,
                    marginBottom: 5,
                  }}
                >
                  &quot;{p.text}&quot;
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#00ff9d44' }}>
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
                  <span
                    style={{
                      fontSize: 9,
                      color: '#00ff9d22',
                      letterSpacing: 1,
                    }}
                  >
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
                {p.note && (
                  <div
                    style={{
                      fontSize: 11,
                      color: '#00ff9d2a',
                      marginTop: 5,
                      fontStyle: 'italic',
                    }}
                  >
                    ↳ {p.note}
                  </div>
                )}
              </div>
              <button
                onClick={() => remove(p.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ff008033',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: 4,
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          ))}

          {!loadingList && proverbs.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color: '#00ff9d22',
                fontSize: 12,
                letterSpacing: 3,
              }}
            >
              ARCHIVE EMPTY — ADD YOUR FIRST PROVERB ABOVE
            </div>
          )}
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: 48,
            fontSize: 9,
            letterSpacing: 6,
            color: '#00ff9d11',
          }}
        >
          VITAEGIS · HEALTH · STEALTH · WEALTH
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #00ff9d2a; }
        button:hover { opacity: 0.8; }
        select option { background: #000; color: #00ff9d; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #00ff9d1a; }
      `}</style>
    </div>
  );
}
