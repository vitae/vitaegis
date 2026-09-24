'use client';

import type { BuildMode, JourneyCurve, PlaylistSettings } from '@/lib/keycrate/types';
import { useKeyCrate } from '../_state/store';
import { inputClass } from './ui';

/* Build mode, dramatic budget, BPM tolerance, key lock and the journey curves. */

const PRESET_JOURNEY: JourneyCurve = {
  energy: [3, 6, 9, 5, 9, 4],
  bpm: [122, 126, 128, 124, 130, 124],
  length: 12,
};

const MODES: Array<{ id: BuildMode; label: string; hint: string }> = [
  { id: 'smooth', label: 'Smooth', hint: 'same key, fifths, relative, diagonal' },
  { id: 'dramatic', label: 'Dramatic', hint: 'adds boosts, semitone lifts and thirds, rationed' },
  { id: 'journey', label: 'Journey', hint: 'follow an energy and BPM curve' },
];

export default function Settings() {
  const { state, actions } = useKeyCrate();
  const s = state.set.settings;
  const update = (patch: Partial<PlaylistSettings>) => actions.setSettings({ ...s, ...patch });
  const journey = s.journey ?? PRESET_JOURNEY;

  return (
    <div
      className="mt-2 flex flex-col gap-3 rounded-md border border-white/10 p-3 text-xs"
      role="group"
      aria-label="Build settings"
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-[#808880]">Mode</legend>
        {MODES.map((m) => (
          <label key={m.id} className="flex items-center gap-2 text-white">
            <input
              type="radio"
              name="kc-mode"
              checked={s.mode === m.id}
              onChange={() =>
                update({ mode: m.id, journey: m.id === 'journey' ? journey : s.journey })
              }
              className="h-4 w-4 accent-[#00ff00]"
            />
            {m.label} <span className="text-[#808880]">· {m.hint}</span>
          </label>
        ))}
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[#808880]">
          BPM tolerance ±{s.bpmTolerance}%
          <input
            type="range"
            min={1}
            max={16}
            value={s.bpmTolerance}
            onChange={(e) => update({ bpmTolerance: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1 text-[#808880]">
          One dramatic move per {s.dramaticEvery} tracks
          <input
            type="range"
            min={2}
            max={10}
            value={s.dramaticEvery}
            onChange={(e) => update({ dramaticEvery: Number(e.target.value) })}
            disabled={s.mode === 'smooth'}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-white">
        <input
          type="checkbox"
          checked={s.keyLock}
          onChange={(e) => update({ keyLock: e.target.checked })}
          className="h-4 w-4 accent-[#00ff00]"
        />
        Key lock on{' '}
        <span className="text-[#808880]">
          · Master Tempo keeps the key when pitching more than ±3%
        </span>
      </label>

      {s.mode === 'journey' && (
        <div className="flex flex-col gap-2">
          <p className="text-[#808880]">
            Six points across the set: warm-up → peak → breakdown → peak → close.
          </p>
          <div className="grid grid-cols-6 gap-1">
            {journey.energy.map((v, i) => (
              <label key={i} className="flex flex-col items-center gap-1 text-[#808880]">
                <span className="text-white">{v}</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={v}
                  aria-label={`Energy point ${i + 1}`}
                  onChange={(e) =>
                    update({
                      journey: {
                        ...journey,
                        energy: journey.energy.map((x, j) =>
                          j === i ? Number(e.target.value) : x,
                        ),
                      },
                    })
                  }
                  className="w-full"
                />
                <span>E{i + 1}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1">
            {journey.bpm.map((v, i) => (
              <label key={i} className="flex flex-col items-center gap-1 text-[#808880]">
                <input
                  type="number"
                  inputMode="decimal"
                  value={v}
                  aria-label={`BPM point ${i + 1}`}
                  onChange={(e) =>
                    update({
                      journey: {
                        ...journey,
                        bpm: journey.bpm.map((x, j) => (j === i ? Number(e.target.value) : x)),
                      },
                    })
                  }
                  className={`${inputClass} px-1 text-center`}
                />
                <span>B{i + 1}</span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[#808880]">
            Planned length
            <input
              type="number"
              min={2}
              max={60}
              value={journey.length}
              onChange={(e) =>
                update({
                  journey: { ...journey, length: Math.max(2, Number(e.target.value) || 2) },
                })
              }
              className={`${inputClass} w-20`}
            />
            tracks
          </label>
        </div>
      )}
    </div>
  );
}
