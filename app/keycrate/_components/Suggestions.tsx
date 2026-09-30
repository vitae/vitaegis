'use client';

import { groupSuggestions } from '@/lib/keycrate/suggest';
import { TRANSITION_FEEL, TRANSITION_LABEL, TRANSITION_ORDER } from '@/lib/keycrate/harmonic';
import { formatBpm } from '../_lib/download';
import { useKeyCrate } from '../_state/store';
import { KeyBadge, MoodLine, SectionTitle, TRANSITION_COLOR } from './ui';

/* Top 10 for the selected playlist song (or the last track), grouped by transition type.
   Each pick shows the named harmonic move, its mood shift and the maths behind it. */

export default function Suggestions() {
  const { derived, actions, state } = useKeyCrate();
  const { suggestions, anchorTrack: last } = derived;
  if (!last) return null;
  const selected = state.anchor !== null;
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
      {selected && (
        <p className="-mt-1 mb-2 flex items-center gap-2 text-xs text-[#808880]">
          <span className="min-w-0 flex-1 truncate">
            After <span className="text-[#00ff00]">{last.title}</span>. Picks go right under it.
          </span>
          <button
            type="button"
            onClick={() => actions.selectAnchor(null)}
            className="shrink-0 text-[#808880] underline hover:text-white"
            data-testid="kc-anchor-clear"
          >
            Back to end
          </button>
        </p>
      )}
      {suggestions.length === 0 ? (
        <p className="text-sm text-[#808880]">
          Nothing fits within ±{state.set.settings.bpmTolerance}% in {state.set.settings.mode} mode.
          Widen the tolerance or switch modes in settings.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {TRANSITION_ORDER.filter((t) => groups.has(t)).map((type) => (
            <div key={type}>
              <p className="text-xs" style={{ color: TRANSITION_COLOR[type] }}>
                {TRANSITION_LABEL[type]}{' '}
                <span className="text-[#808880]">· {TRANSITION_FEEL[type]}</span>
              </p>
              <ul className="mt-1 flex flex-col">
                {groups.get(type)!.map((s) => {
                  const m = s.transition.move;
                  const bpm = s.transition.bpm;
                  return (
                    <li key={s.track.id}>
                      <button
                        type="button"
                        onClick={() => actions.addTrack(s.track.id)}
                        className="kc-row flex w-full items-center gap-2 rounded px-2 py-1.5 text-left"
                        aria-label={`Add ${s.track.artist} – ${s.track.title}: ${m ? `${m.name}, ${m.mood.label}, ` : ''}${s.reason}`}
                        title={s.reason}
                        data-testid="kc-suggestion"
                      >
                        <KeyBadge camelot={s.track.camelot} muted />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-white">
                            {s.track.title}{' '}
                            <span className="text-[#808880]">· {s.track.artist}</span>
                          </span>
                          {m ? (
                            <>
                              <span className="flex min-w-0 items-baseline gap-1.5 text-xs">
                                <span
                                  className="shrink-0"
                                  style={{ color: TRANSITION_COLOR[s.transition.type] }}
                                  data-testid="kc-move"
                                >
                                  {m.name}
                                </span>
                                <MoodLine move={m} className="min-w-0" />
                              </span>
                              <span
                                className="kc-mono block truncate text-[11px] text-[#808880]"
                                data-testid="kc-maths"
                              >
                                {m.maths}
                              </span>
                            </>
                          ) : (
                            <span className="block truncate text-xs text-[#808880]">
                              {s.reason}
                            </span>
                          )}
                        </span>
                        <span className="kc-mono shrink-0 text-right text-xs text-white">
                          {formatBpm(s.track.bpm)}
                          {bpm && (
                            <span className="block text-[11px] text-[#808880]">
                              {bpm.kind !== 'direct' ? `${bpm.kind} ` : ''}
                              {bpm.percent >= 0 ? '+' : ''}
                              {bpm.percent.toFixed(1)}%
                            </span>
                          )}
                          {s.transition.semitoneShift !== 0 && (
                            <span className="block text-[11px] text-[#ffff00]">
                              {s.transition.semitoneShift > 0 ? '+' : ''}
                              {s.transition.semitoneShift} st
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
