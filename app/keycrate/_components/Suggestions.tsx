'use client';

import { groupSuggestions } from '@/lib/keycrate/suggest';
import { TRANSITION_FEEL, TRANSITION_LABEL, TRANSITION_ORDER } from '@/lib/keycrate/harmonic';
import { formatBpm } from '../_lib/download';
import { useKeyCrate } from '../_state/store';
import { KeyBadge, SectionTitle, TRANSITION_COLOR } from './ui';

/* Top 10 for the last track in the set, grouped by transition type. */

export default function Suggestions() {
  const { derived, actions, state } = useKeyCrate();
  const { suggestions, setTracks } = derived;
  const last = setTracks[setTracks.length - 1];
  if (!last) return null;
  const groups = groupSuggestions(suggestions);
  return (
    <div className="kc-dense mt-4" data-testid="kc-suggestions">
      <SectionTitle
        right={
          <span className="text-xs text-[#808880]">
            after {last.camelot ?? '?'} · {formatBpm(last.bpm)}
          </span>
        }
      >
        Next track
      </SectionTitle>
      {suggestions.length === 0 ? (
        <p className="text-sm text-[#808880]">
          Nothing fits within ±{state.set.settings.bpmTolerance}% in {state.set.settings.mode} mode. Widen the tolerance or switch modes in settings.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {TRANSITION_ORDER.filter((t) => groups.has(t)).map((type) => (
            <div key={type}>
              <p className="text-xs" style={{ color: TRANSITION_COLOR[type] }}>
                {TRANSITION_LABEL[type]} <span className="text-[#808880]">· {TRANSITION_FEEL[type]}</span>
              </p>
              <ul className="mt-1 flex flex-col">
                {groups.get(type)!.map((s) => (
                  <li key={s.track.id}>
                    <button
                      type="button"
                      onClick={() => actions.addTrack(s.track.id)}
                      className="kc-row flex w-full items-center gap-2 rounded px-2 py-1.5 text-left"
                      aria-label={`Add ${s.track.artist} – ${s.track.title}: ${s.reason}`}
                      data-testid="kc-suggestion"
                    >
                      <KeyBadge camelot={s.track.camelot} muted />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-white">
                          {s.track.title} <span className="text-[#808880]">· {s.track.artist}</span>
                        </span>
                        <span className="block truncate text-xs text-[#808880]">{s.reason}</span>
                      </span>
                      <span className="kc-mono shrink-0 text-xs text-white">{formatBpm(s.track.bpm)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
