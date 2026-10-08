'use client';

// Proverbs: the archive the oracle draws from. Add one at a time, or drop in a PDF and let
// Claude pull the lines worth keeping.

import { useCallback, useEffect, useRef, useState } from 'react';
import AdminShell, { ui } from '@/components/admin/AdminShell';

interface Proverb {
  id: string;
  text: string;
  source: string;
  tag: string;
  note?: string;
  created_at: string;
}

interface ExtractedQuote {
  text: string;
  source: string;
  tag: string;
  selected: boolean;
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
  'Love',
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
  Love: '#ff00ff',
};

function Tag({ tag }: { tag: string }) {
  const c = TAG_COLORS[tag] || '#00ff00';
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]"
      style={{ color: c, borderColor: `${c}55` }}
    >
      {tag}
    </span>
  );
}

export default function ProverbsArchive() {
  return (
    <AdminShell
      title="Proverbs"
      blurb="The archive the oracle draws from. Encode a line at a time, or drop in a book and keep the lines worth keeping."
    >
      {(key) => <Body adminKey={key} />}
    </AdminShell>
  );
}

function Body({ adminKey }: { adminKey: string }) {
  const headers = { 'x-admin-key': adminKey };
  const [proverbs, setProverbs] = useState<Proverb[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'single' | 'pdf'>('single');

  // Single entry
  const [form, setForm] = useState({ text: '', source: '', tag: 'Personal', note: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // PDF
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [pdfTag, setPdfTag] = useState('Ancient');
  const [extracting, setExtracting] = useState(false);
  const [quotes, setQuotes] = useState<ExtractedQuote[]>([]);
  const [encoding, setEncoding] = useState(false);
  const [encoded, setEncoded] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/proverbs', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const d = (await res.json()) as { proverbs: Proverb[] };
      setProverbs(d.proverbs ?? []);
      setError('');
    } catch {
      setError('Could not load the archive.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!form.text.trim()) return;
    setSaving(true);
    const res = await fetch('/api/proverbs', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      setError('Could not save that proverb.');
      return;
    }
    setForm({ text: '', source: '', tag: 'Personal', note: '' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    void load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/proverbs/${id}`, { method: 'DELETE', headers });
    void load();
  };

  const handleFile = (file: File) => {
    if (file.type !== 'application/pdf') return;
    setPdfFile(file);
    setQuotes([]);
    setEncoded(0);
    if (!bookTitle) setBookTitle(file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));
  };

  const extract = () => {
    if (!pdfFile) return;
    setExtracting(true);
    setQuotes([]);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      try {
        const res = await fetch('/api/proverbs/extract-pdf', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64, bookTitle, defaultTag: pdfTag }),
        });
        const data = (await res.json()) as { quotes?: Omit<ExtractedQuote, 'selected'>[] };
        setQuotes((data.quotes ?? []).map((q) => ({ ...q, selected: true })));
      } catch {
        setError('Extraction failed.');
      }
      setExtracting(false);
    };
    reader.readAsDataURL(pdfFile);
  };

  const encodeSelected = async () => {
    const selected = quotes.filter((q) => q.selected);
    if (!selected.length) return;
    setEncoding(true);
    await Promise.all(
      selected.map((q) =>
        fetch('/api/proverbs', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: q.text, source: q.source, tag: q.tag, note: '' }),
        }),
      ),
    );
    setEncoding(false);
    setEncoded(selected.length);
    setQuotes([]);
    setPdfFile(null);
    setBookTitle('');
    setTimeout(() => setEncoded(0), 3000);
    void load();
  };

  const selectedCount = quotes.filter((q) => q.selected).length;

  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setTab('single')} className={ui.pill(tab === 'single')}>
          Single quote
        </button>
        <button onClick={() => setTab('pdf')} className={ui.pill(tab === 'pdf')}>
          Upload PDF
        </button>
        <span className="ml-auto text-xs text-white/40">
          {proverbs ? `${proverbs.length} entries` : 'Loading…'}
        </span>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {tab === 'single' && (
        <section className={`${ui.glass} space-y-3 p-4 sm:p-6`}>
          <p className={ui.label}>New entry</p>
          <textarea
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            placeholder="The proverb or saying…"
            rows={3}
            className={`${ui.input} resize-y text-base leading-relaxed`}
          />
          <div className="flex flex-wrap gap-3">
            <input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="Source / author"
              className={`${ui.input} min-w-[12rem] flex-1`}
            />
            <select
              value={form.tag}
              onChange={(e) => setForm({ ...form, tag: e.target.value })}
              className={`${ui.input} w-auto`}
              style={{ color: TAG_COLORS[form.tag] || '#00ff00' }}
            >
              {TAGS.map((t) => (
                <option key={t} value={t} className="bg-black text-white">
                  {t}
                </option>
              ))}
            </select>
          </div>
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Personal note: why it resonates (optional)"
            className={ui.input}
          />
          <div className="flex items-center gap-3">
            <button onClick={submit} disabled={saving || !form.text.trim()} className={ui.btn}>
              {saved ? '✓ Encoded' : saving ? 'Encoding…' : 'Encode into archive'}
            </button>
          </div>
        </section>
      )}

      {tab === 'pdf' && (
        <section className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            onClick={() => fileInput.current?.click()}
            className={`${ui.glass} cursor-pointer p-10 text-center transition-colors ${
              dragOver ? 'glass-panel--prominent' : ''
            }`}
          >
            <input
              ref={fileInput}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {pdfFile ? (
              <>
                <p className="text-sm text-vitae-green">{pdfFile.name}</p>
                <p className="mt-1 text-xs text-white/40">
                  {(pdfFile.size / 1024 / 1024).toFixed(1)} MB · click to change
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-white/70">Drop a PDF here or click to browse</p>
                <p className="mt-1 text-xs text-white/40">Books, guides, scriptures, manuscripts</p>
              </>
            )}
          </div>

          {pdfFile && (
            <div className={`${ui.glass} space-y-3 p-4 sm:p-6`}>
              <div className="flex flex-wrap gap-3">
                <input
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Book title / author"
                  className={`${ui.input} min-w-[12rem] flex-1`}
                />
                <select
                  value={pdfTag}
                  onChange={(e) => setPdfTag(e.target.value)}
                  className={`${ui.input} w-auto`}
                  style={{ color: TAG_COLORS[pdfTag] || '#00ff00' }}
                >
                  {TAGS.map((t) => (
                    <option key={t} value={t} className="bg-black text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              {!quotes.length && (
                <button onClick={extract} disabled={extracting} className={ui.btn}>
                  {extracting ? 'Claude is reading the book…' : 'Extract wisdom from PDF'}
                </button>
              )}
            </div>
          )}

          {quotes.length > 0 && (
            <div className={`${ui.glass} space-y-3 p-4 sm:p-6`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className={ui.label}>
                  {selectedCount}/{quotes.length} selected
                </p>
                <button
                  onClick={() => setQuotes((q) => q.map((x) => ({ ...x, selected: true })))}
                  className={`${ui.btnQuiet} ml-auto`}
                >
                  Select all
                </button>
                <button
                  onClick={() => setQuotes((q) => q.map((x) => ({ ...x, selected: false })))}
                  className={ui.btnQuiet}
                >
                  Deselect all
                </button>
              </div>
              <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                {quotes.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setQuotes((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, selected: !x.selected } : x)),
                      )
                    }
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      q.selected
                        ? 'border-vitae-green/40 bg-vitae-green/5'
                        : 'border-white/10 bg-white/[0.02] opacity-60'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] ${
                        q.selected
                          ? 'border-vitae-green text-vitae-green'
                          : 'border-white/30 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm leading-relaxed text-white/90">
                        &ldquo;{q.text}&rdquo;
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/40">
                        — {q.source}
                        <Tag tag={q.tag} />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={encodeSelected}
                disabled={encoding || selectedCount === 0}
                className={ui.btn}
              >
                {encoding ? 'Encoding…' : `Encode ${selectedCount} selected into archive`}
              </button>
            </div>
          )}
          {encoded > 0 && <p className="text-sm text-vitae-green">✓ {encoded} quotes encoded.</p>}
        </section>
      )}

      <section className="space-y-2">
        <p className={ui.label}>Archive</p>
        {proverbs && proverbs.length === 0 && (
          <p className={`${ui.glass} p-6 text-sm text-white/50`}>
            Archive empty. Add your first proverb above.
          </p>
        )}
        {(proverbs ?? []).map((p) => (
          <article key={p.id} className={`${ui.glass} flex items-start gap-3 p-4`}>
            <span
              className="mt-1 w-0.5 self-stretch rounded-full"
              style={{ background: TAG_COLORS[p.tag] || '#00ff00' }}
            />
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-white/90">&ldquo;{p.text}&rdquo;</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/40">
                <span>— {p.source || 'Unknown'}</span>
                <Tag tag={p.tag} />
                <span>{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
              {p.note && <p className="mt-1 text-xs italic text-white/40">↳ {p.note}</p>}
            </div>
            <button onClick={() => remove(p.id)} className={ui.btnDanger} aria-label="Delete">
              ✕
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
