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

interface ExtractedQuote {
  text: string;
  source: string;
  tag: string;
  selected: boolean;
}

const TAGS = ['Zen','Stoic','Taoist','Kundalini','Hip-Hop','Ancient','Personal','Modern','Cyberpunk','Love'];

const TAG_COLORS: Record<string, string> = {
  Zen: '#00ff9d', Stoic: '#00cfff', Taoist: '#a78bfa',
  Kundalini: '#f97316', 'Hip-Hop': '#fbbf24', Ancient: '#e879f9',
  Personal: '#34d399', Modern: '#60a5fa', Cyberpunk: '#ff0080', Love: '#ff00ff',
};

export default function AdminProverbsPage() {
  const [proverbs, setProverbs] = useState<Proverb[]>([]);
  const [form, setForm] = useState({ text: '', source: '', tag: 'Personal', note: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [tab, setTab] = useState<'single' | 'pdf'>('single');

  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [pdfTag, setPdfTag] = useState('Ancient');
  const [extracting, setExtracting] = useState(false);
  const [extractedQuotes, setExtractedQuotes] = useState<ExtractedQuote[]>([]);
  const [encodingBulk, setEncodingBulk] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoadingList(true);
    fetch('/api/proverbs')
      .then((r) => r.json())
      .then((d) => setProverbs(d.proverbs || []))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => { load(); }, []);

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

  const handleFile = (file: File) => {
    if (file.type !== 'application/pdf') return;
    setPdfFile(file);
    setExtractedQuotes([]);
    setBulkDone(false);
    if (!bookTitle) setBookTitle(file.name.replace('.pdf', '').replace(/[-_]/g, ' '));
  };

  const extractFromPdf = async () => {
    if (!pdfFile) return;
    setExtracting(true);
    setExtractedQuotes([]);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      try {
        const res = await fetch('/api/proverbs/extract-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64, bookTitle, defaultTag: pdfTag }),
        });
        const data = await res.json();
        if (data.quotes) {
          setExtractedQuotes(
            data.quotes.map((q: Omit<ExtractedQuote, 'selected'>) => ({ ...q, selected: true }))
          );
        }
      } catch { /* silent */ }
      setExtracting(false);
    };
    reader.readAsDataURL(pdfFile);
  };

  const toggleQuote = (i: number) => {
    setExtractedQuotes((prev) => prev.map((q, idx) => idx === i ? { ...q, selected: !q.selected } : q));
  };

  const encodeSelected = async () => {
    const selected = extractedQuotes.filter((q) => q.selected);
    if (!selected.length) return;
    setEncodingBulk(true);
    await Promise.all(
      selected.map((q) =>
        fetch('/api/proverbs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: q.text, source: q.source, tag: q.tag, note: '' }),
        })
      )
    );
    setEncodingBulk(false);
    setBulkDone(true);
    setExtractedQuotes([]);
    setPdfFile(null);
    setBookTitle('');
    setTimeout(() => setBulkDone(false), 3000);
    load();
  };

  const selectedCount = extractedQuotes.filter((q) => q.selected).length;

  return (
    <div style={{ fontFamily: "'Courier New', monospace", background: '#020408', minHeight: '100vh', color: '#00ff9d', padding: '32px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 9, letterSpacing: 8, color: '#00ff9d44', marginBottom: 8 }}>VITAEGIS · ADMIN</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4, margin: 0, fontFamily: 'Georgia, serif', textShadow: '0 0 30px #00ff9d44' }}>
            ◈ PROVERBS FEED
          </h1>
          <div style={{ fontSize: 10, letterSpacing: 4, color: '#00ff9d44', marginTop: 8 }}>
            ENCODE WISDOM INTO THE ARCHIVE · {proverbs.length} ENTRIES
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 28, borderBottom: '1px solid #00ff9d1a' }}>
          {([['single', '+ SINGLE QUOTE'], ['pdf', '⊕ UPLOAD PDF']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              background: tab === key ? '#00ff9d12' : 'transparent',
              border: 'none', borderBottom: tab === key ? '2px solid #00ff9d' : '2px solid transparent',
              color: tab === key ? '#00ff9d' : '#00ff9d44',
              padding: '10px 24px', cursor: 'pointer', fontSize: 11,
              letterSpacing: 3, fontFamily: 'inherit', transition: 'all 0.2s',
            }}>{label}</button>
          ))}
        </div>

        {/* SINGLE QUOTE */}
        {tab === 'single' && (
          <div style={{ padding: 24, border: '1px solid #00ff9d22', background: '#00ff9d05', marginBottom: 40 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: '#00ff9d55', marginBottom: 20 }}>NEW ENTRY</div>
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Enter the proverb or saying..."
              rows={3}
              style={{ width: '100%', background: '#00ff9d08', border: '1px solid #00ff9d22', color: '#00ff9d', padding: 14, fontSize: 15, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.7, marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="Source / Author"
                style={{ flex: 1, background: '#00ff9d08', border: '1px solid #00ff9d22', color: '#00ff9d', padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
              />
              <select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}
                style={{ background: '#000', border: '1px solid #00ff9d22', color: TAG_COLORS[form.tag] || '#00ff9d', padding: '10px 14px', fontSize: 11, fontFamily: 'inherit', outline: 'none', letterSpacing: 2, minWidth: 130 }}>
                {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Personal note — why does this resonate? (optional)"
              style={{ width: '100%', background: '#00ff9d08', border: '1px solid #00ff9d22', color: '#00ff9d77', padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', outline: 'none', marginBottom: 16 }}
            />
            <button onClick={submit} disabled={saving || !form.text.trim()} style={{
              background: saved ? '#00ff9d22' : saving ? '#00ff9d0a' : '#00ff9d18',
              border: `1px solid ${saved ? '#00ff9d' : '#00ff9d44'}`,
              color: '#00ff9d', padding: '12px 36px', cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 11, letterSpacing: 4, fontFamily: 'inherit', transition: 'all 0.3s',
              boxShadow: saved ? '0 0 20px #00ff9d33' : 'none',
            }}>
              {saved ? '✓ ENCODED' : saving ? 'ENCODING...' : '+ ENCODE INTO ARCHIVE'}
            </button>
          </div>
        )}

        {/* PDF UPLOAD */}
        {tab === 'pdf' && (
          <div style={{ marginBottom: 40 }}>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#00ff9d' : pdfFile ? '#00ff9d55' : '#00ff9d22'}`,
                background: dragOver ? '#00ff9d0a' : pdfFile ? '#00ff9d06' : '#00ff9d03',
                padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                marginBottom: 16, transition: 'all 0.2s',
              }}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {pdfFile ? (
                <div>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>◈</div>
                  <div style={{ fontSize: 13, color: '#00ff9d', letterSpacing: 2 }}>{pdfFile.name}</div>
                  <div style={{ fontSize: 10, color: '#00ff9d44', marginTop: 4 }}>
                    {(pdfFile.size / 1024 / 1024).toFixed(1)} MB · Click to change
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 36, marginBottom: 12, color: '#00ff9d22' }}>⊕</div>
                  <div style={{ fontSize: 13, color: '#00ff9d66', letterSpacing: 2, marginBottom: 6 }}>DROP PDF HERE OR CLICK TO BROWSE</div>
                  <div style={{ fontSize: 10, color: '#00ff9d33', letterSpacing: 1 }}>Books, guides, scriptures, manuscripts</div>
                </div>
              )}
            </div>

            {pdfFile && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="Book title / Author"
                  style={{ flex: 1, background: '#00ff9d08', border: '1px solid #00ff9d22', color: '#00ff9d', padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                <select value={pdfTag} onChange={(e) => setPdfTag(e.target.value)}
                  style={{ background: '#000', border: '1px solid #00ff9d22', color: TAG_COLORS[pdfTag] || '#00ff9d', padding: '10px 14px', fontSize: 11, fontFamily: 'inherit', outline: 'none', letterSpacing: 2, minWidth: 130 }}>
                  {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {pdfFile && !extractedQuotes.length && (
              <button onClick={extractFromPdf} disabled={extracting} style={{
                background: extracting ? '#a78bfa0a' : '#a78bfa18',
                border: `1px solid ${extracting ? '#a78bfa33' : '#a78bfa66'}`,
                color: '#a78bfa', padding: '14px', cursor: extracting ? 'not-allowed' : 'pointer',
                fontSize: 11, letterSpacing: 4, fontFamily: 'inherit', width: '100%', transition: 'all 0.3s',
                boxShadow: extracting ? '0 0 30px #a78bfa22' : 'none',
              }}>
                {extracting ? '⊕ CLAUDE IS READING THE BOOK...' : '⊕ EXTRACT WISDOM FROM PDF'}
              </button>
            )}

            {extracting && (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 10, color: '#a78bfa55', letterSpacing: 3 }}>
                Scanning for proverbs, passages, and wisdom lines...
              </div>
            )}

            {/* Extracted results */}
            {extractedQuotes.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, letterSpacing: 3, color: '#a78bfa' }}>
                    {selectedCount}/{extractedQuotes.length} SELECTED
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setExtractedQuotes(q => q.map(x => ({ ...x, selected: true })))}
                      style={{ background: 'transparent', border: '1px solid #00ff9d22', color: '#00ff9d44', padding: '4px 12px', cursor: 'pointer', fontSize: 9, letterSpacing: 2, fontFamily: 'inherit' }}>
                      SELECT ALL
                    </button>
                    <button onClick={() => setExtractedQuotes(q => q.map(x => ({ ...x, selected: false })))}
                      style={{ background: 'transparent', border: '1px solid #ff008022', color: '#ff008044', padding: '4px 12px', cursor: 'pointer', fontSize: 9, letterSpacing: 2, fontFamily: 'inherit' }}>
                      DESELECT ALL
                    </button>
                  </div>
                </div>

                <div style={{ maxHeight: 420, overflowY: 'auto', marginBottom: 16 }}>
                  {extractedQuotes.map((q, i) => (
                    <div key={i} onClick={() => toggleQuote(i)} style={{
                      display: 'flex', gap: 12, padding: '12px 14px',
                      border: `1px solid ${q.selected ? '#a78bfa33' : '#00ff9d08'}`,
                      background: q.selected ? '#a78bfa08' : '#00ff9d02',
                      marginBottom: 5, cursor: 'pointer', transition: 'all 0.15s', alignItems: 'flex-start',
                    }}>
                      <div style={{
                        width: 15, height: 15, border: `1px solid ${q.selected ? '#a78bfa' : '#00ff9d22'}`,
                        background: q.selected ? '#a78bfa22' : 'transparent', flexShrink: 0, marginTop: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#a78bfa',
                      }}>
                        {q.selected ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: q.selected ? '#d0ffd8' : '#d0ffd855', lineHeight: 1.6, marginBottom: 4 }}>
                          &quot;{q.text}&quot;
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: '#00ff9d44' }}>— {q.source}</span>
                          <span style={{ fontSize: 9, letterSpacing: 2, padding: '1px 6px', border: `1px solid ${TAG_COLORS[q.tag] || '#00ff9d'}33`, color: TAG_COLORS[q.tag] || '#00ff9d' }}>{q.tag}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={encodeSelected} disabled={encodingBulk || selectedCount === 0} style={{
                  background: bulkDone ? '#00ff9d22' : encodingBulk ? '#00ff9d0a' : '#00ff9d18',
                  border: `1px solid ${bulkDone ? '#00ff9d' : '#00ff9d44'}`,
                  color: '#00ff9d', padding: '14px', cursor: encodingBulk ? 'not-allowed' : 'pointer',
                  fontSize: 11, letterSpacing: 4, fontFamily: 'inherit', width: '100%', transition: 'all 0.3s',
                  boxShadow: bulkDone ? '0 0 20px #00ff9d33' : 'none',
                }}>
                  {bulkDone ? `✓ ${selectedCount} QUOTES ENCODED` : encodingBulk ? 'ENCODING...' : `+ ENCODE ${selectedCount} SELECTED INTO ARCHIVE`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Archive list */}
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: '#00ff9d44', marginBottom: 16 }}>
            ARCHIVE — {loadingList ? 'LOADING...' : `${proverbs.length} ENTRIES`}
          </div>
          {proverbs.map((p) => (
            <div key={p.id} style={{ display: 'flex', gap: 14, padding: '14px 16px', border: '1px solid #00ff9d0e', background: '#00ff9d03', marginBottom: 6, alignItems: 'flex-start' }}>
              <div style={{ width: 2, alignSelf: 'stretch', background: TAG_COLORS[p.tag] || '#00ff9d', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#d0ffd8', lineHeight: 1.6, marginBottom: 5 }}>&quot;{p.text}&quot;</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#00ff9d44' }}>— {p.source || 'Unknown'}</span>
                  <span style={{ fontSize: 9, letterSpacing: 2, padding: '2px 8px', border: `1px solid ${TAG_COLORS[p.tag] || '#00ff9d'}33`, color: TAG_COLORS[p.tag] || '#00ff9d' }}>{p.tag}</span>
                  <span style={{ fontSize: 9, color: '#00ff9d22', letterSpacing: 1 }}>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                {p.note && <div style={{ fontSize: 11, color: '#00ff9d2a', marginTop: 5, fontStyle: 'italic' }}>↳ {p.note}</div>}
              </div>
              <button onClick={() => remove(p.id)} style={{ background: 'transparent', border: 'none', color: '#ff008033', cursor: 'pointer', fontSize: 14, padding: 4, flexShrink: 0, lineHeight: 1 }}>✕</button>
            </div>
          ))}
          {!loadingList && proverbs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#00ff9d22', fontSize: 12, letterSpacing: 3 }}>ARCHIVE EMPTY — ADD YOUR FIRST PROVERB ABOVE</div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 48, fontSize: 9, letterSpacing: 6, color: '#00ff9d11' }}>VITAEGIS · HEALTH · STEALTH · WEALTH</div>
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
