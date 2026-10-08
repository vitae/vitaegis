'use client';

// Oracle log: every question put to the Proverbs oracle and what it answered.

import { useCallback, useEffect, useState } from 'react';
import AdminShell, { ui } from '@/components/admin/AdminShell';

interface LogEntry {
  id: string;
  question: string;
  reply: string | null;
  error: string | null;
  created_at: string;
}

const hst = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: 'Pacific/Honolulu',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function OracleLog() {
  return (
    <AdminShell
      title="Oracle log"
      blurb="Every consultation of the Proverbs oracle: the question, the reply, and anything that went wrong."
      probe="/api/oracle-logs"
    >
      {(key) => <Body adminKey={key} />}
    </AdminShell>
  );
}

function Body({ adminKey }: { adminKey: string }) {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'errors'>('all');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/oracle-logs', {
        headers: { 'x-admin-key': adminKey },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { logs: LogEntry[] };
      setLogs(data.logs ?? []);
      setError('');
    } catch {
      setError('Could not load the log.');
    }
  }, [adminKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const errors = logs?.filter((l) => l.error).length ?? 0;
  const shown = (logs ?? []).filter((l) => filter === 'all' || l.error);

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter('all')} className={ui.pill(filter === 'all')}>
          All · {logs?.length ?? '…'}
        </button>
        <button onClick={() => setFilter('errors')} className={ui.pill(filter === 'errors')}>
          Errors · {errors}
        </button>
        <button onClick={() => void load()} className={`${ui.btnQuiet} ml-auto`}>
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!logs && !error && <p className="text-sm text-white/50">Loading…</p>}
      {logs && shown.length === 0 && (
        <p className={`${ui.glass} p-6 text-sm text-white/50`}>
          {filter === 'errors' ? 'No errors recorded.' : 'No consultations recorded yet.'}
        </p>
      )}

      {shown.map((log) => (
        <article key={log.id} className={`${ui.glass} p-4 sm:p-5`}>
          <header className="flex items-center justify-between gap-3">
            <span
              className={`text-[10px] uppercase tracking-[0.25em] ${
                log.error ? 'text-red-400' : 'text-vitae-green'
              }`}
            >
              {log.error ? 'Error' : 'Answered'}
            </span>
            <span className="text-xs text-white/40">{hst(log.created_at)}</span>
          </header>
          <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/40">Question</p>
          <p className="mt-1 text-sm text-white">{log.question}</p>
          {log.reply && (
            <>
              <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-white/40">Reply</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                {log.reply}
              </p>
            </>
          )}
          {log.error && (
            <>
              <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-red-400/70">Error</p>
              <p className="mt-1 text-sm text-red-400">{log.error}</p>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
