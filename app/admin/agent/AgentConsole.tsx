'use client';

// The operator's console for the eve agent: a chat over /eve/v1 on this origin, with
// approvals and questions rendered inline. The admin key rides on every request.

import { useEffect, useRef, useState } from 'react';
import { openConversationInputs, useEveAgent } from 'eve/react';
import AdminShell, { ui } from '@/components/admin/AdminShell';

const STARTERS = [
  'Morning brief: what shipped, what needs me, what should we post today?',
  'Plan three posts for this week, one per pillar, slides only.',
  'Revenue snapshot for the last 30 days and one idea to grow it.',
  'What failed in the pipeline and can you fix it?',
];

export default function AgentConsole() {
  return (
    <AdminShell
      title="Agent"
      wide
      blurb={
        <>
          Vitae runs the content engine, the research desk and the revenue loop. It queues and
          plans on its own; publishing and anything that charges money pause here for your
          approval.
        </>
      }
    >
      {(key) => <Chat adminKey={key} />}
    </AdminShell>
  );
}

function Chat({ adminKey }: { adminKey: string }) {
  const agent = useEveAgent({
    headers: async () => ({ 'x-admin-key': adminKey }),
  });
  const [draft, setDraft] = useState('');
  const bottom = useRef<HTMLDivElement>(null);

  const busy = agent.status === 'submitted' || agent.status === 'streaming';
  const resuming = agent.status === 'resuming';
  const pending = openConversationInputs(agent.data).map((i) => i.request);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [agent.data.messages, pending.length]);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || resuming) return;
    setDraft('');
    void agent.send(message, busy ? { turnPolicy: 'steer' } : undefined);
  };

  return (
    <div className="mt-8 space-y-4">
      <div className={`${ui.glass} max-h-[60vh] min-h-[320px] overflow-y-auto p-4 sm:p-6`}>
        {agent.data.messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-white/50">Try one of these, or type your own.</p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => send(s)} className={ui.btnQuiet}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {agent.data.messages.map((m) => (
          <article key={m.id} className="mb-5">
            <header className={`${ui.label} mb-1`}>{m.role === 'user' ? 'You' : 'Vitae'}</header>
            <div className="space-y-2 text-sm leading-relaxed text-white/85">
              {m.parts.map((part, i) => {
                if (part.type === 'text') {
                  return (
                    <p key={part.id ?? i} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  );
                }
                if (part.type === 'reasoning') return null;
                if (part.type === 'dynamic-tool') {
                  const tone =
                    part.state === 'output-error'
                      ? 'text-red-400'
                      : part.state === 'approval-requested'
                        ? 'text-yellow-300'
                        : 'text-white/40';
                  return (
                    <p key={i} className={`font-mono text-xs ${tone}`}>
                      ⌁ {part.toolName} · {part.state}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </article>
        ))}

        {pending.map((req) => (
          <fieldset
            key={req.requestId}
            disabled={resuming}
            className="mb-4 rounded-xl border border-yellow-300/40 bg-yellow-300/5 p-4"
          >
            <legend className="px-1 text-xs uppercase tracking-[0.2em] text-yellow-300">
              {req.kind === 'tool-approval'
                ? 'Approval required'
                : req.kind === 'question'
                  ? 'Question'
                  : 'Session limit'}
            </legend>
            <p className="whitespace-pre-wrap text-sm text-white/85">{req.prompt}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {req.options?.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() =>
                    void agent.respond([{ requestId: req.requestId, optionId: o.id }])
                  }
                  className={ui.btn}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
        ))}

        {busy && <p className="text-xs text-white/40">Working…</p>}
        {agent.error && (
          <p className="text-sm text-red-400">
            {agent.error instanceof Error ? agent.error.message : String(agent.error)}
          </p>
        )}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={busy ? 'Steer it mid-turn…' : 'Ask Vitae…'}
          disabled={resuming}
          className={ui.input}
          autoFocus
        />
        <button type="submit" disabled={resuming || !draft.trim()} className={ui.btn}>
          Send
        </button>
        {busy && (
          <button type="button" onClick={() => void agent.cancel()} className={ui.btnQuiet}>
            Stop
          </button>
        )}
        <button type="button" onClick={() => agent.reset()} className={ui.btnQuiet}>
          New
        </button>
      </form>
      <p className="text-xs text-white/40">
        Scheduled runs (06:00 brief, Monday revenue, six-hourly watchdog) write to the dashboard
        and never publish. Session: {agent.session?.sessionId ?? 'not started'}.
      </p>
    </div>
  );
}
