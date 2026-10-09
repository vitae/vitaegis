'use client';

import { useCallback, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { useVitaeTools } from './useVitaeTools';

/* ═══════════════════════════════════════════════════════════════════════════════
   Vitae · conversation
   One tap starts a WebRTC session with the Vitae agent using a token from our route.
   The orb variant is the floating control; the page variant adds the transcript.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface TranscriptLine {
  role: 'user' | 'agent';
  text: string;
}

type Phase = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

const AWAY = 'Vitae is away. Try again.';

function phaseOf(status: string, isSpeaking: boolean, error: string | null): Phase {
  if (error) return 'error';
  if (status === 'connecting') return 'connecting';
  if (status === 'connected') return isSpeaking ? 'speaking' : 'listening';
  return 'idle';
}

function Inner({
  size,
  lines,
  error,
  setError,
}: {
  size: 'orb' | 'page';
  lines: TranscriptLine[];
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const { startSession, endSession, status, isSpeaking } = useConversation();
  const phase = phaseOf(status, isSpeaking, error);
  const live = status === 'connected' || status === 'connecting';

  const start = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/vitae/token', { method: 'POST' });
      const json = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok || !json.token) throw new Error(json.error || AWAY);
      startSession({ conversationToken: json.token, connectionType: 'webrtc' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : AWAY;
      setError(/denied|permission|NotAllowed/i.test(msg) ? 'Microphone blocked.' : msg);
    }
  }, [startSession, setError]);

  const label =
    phase === 'idle'
      ? 'Talk to Vitae'
      : phase === 'connecting'
        ? 'Connecting…'
        : phase === 'listening'
          ? 'Listening'
          : phase === 'speaking'
            ? 'Vitae'
            : error;
  const last = lines[lines.length - 1];
  const disc = size === 'orb' ? 'h-14 w-14' : 'h-24 w-24';

  return (
    <div className={`flex flex-col items-center gap-3 ${size === 'page' ? 'w-full' : ''}`}>
      <button
        type="button"
        aria-label={live ? 'End conversation with Vitae' : 'Talk to Vitae'}
        onClick={() => (live ? endSession() : start())}
        className={`glass-panel glass-panel--hover flex ${disc} items-center justify-center rounded-full text-[#00ff00] transition ${
          phase === 'listening' || phase === 'connecting' ? 'animate-pulse' : ''
        }`}
        style={phase === 'speaking' ? { boxShadow: '0 0 36px rgba(0,255,0,0.55)' } : undefined}
      >
        <span className="relative z-10 text-xs font-semibold uppercase tracking-[0.2em]">
          {live ? '■' : '●'}
        </span>
      </button>
      <p
        className={`text-xs uppercase tracking-[0.3em] ${
          phase === 'error' ? 'text-vitae-red' : 'text-[#00ff00]/80'
        }`}
        aria-live="polite"
      >
        {label}
      </p>
      {size === 'orb' && last && live && (
        <p className="max-w-[16rem] text-center text-xs text-white/60">{last.text}</p>
      )}
      {size === 'page' && lines.length > 0 && (
        <ol className="mt-4 flex w-full flex-col gap-2 text-left">
          {lines.map((l, i) => (
            <li
              key={i}
              className={`text-sm ${l.role === 'agent' ? 'text-white/85' : 'text-[#00ff00]/80'}`}
            >
              <span className="mr-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                {l.role === 'agent' ? 'Vitae' : 'You'}
              </span>
              {l.text}
            </li>
          ))}
        </ol>
      )}
      {phase === 'error' && (
        <button
          type="button"
          onClick={start}
          className="text-xs uppercase tracking-[0.2em] text-white/60 hover:text-white"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default function VitaeConversation({ size }: { size: 'orb' | 'page' }) {
  const tools = useVitaeTools();
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <ConversationProvider
      clientTools={tools}
      onMessage={({ message, role }) => setLines((prev) => [...prev, { role, text: message }])}
      onError={(message) =>
        setError(
          /denied|permission|NotAllowed/i.test(message) ? 'Microphone blocked.' : message || AWAY,
        )
      }
      onDisconnect={(details) => {
        if (details.reason === 'error') setError(details.message || 'Connection lost.');
      }}
    >
      <Inner size={size} lines={lines} error={error} setError={setError} />
    </ConversationProvider>
  );
}
