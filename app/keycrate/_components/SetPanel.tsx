'use client';

import { useEffect, useRef, useState } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TRANSITION_LABEL, type Transition } from '@/lib/keycrate/harmonic';
import { safeFilename, toCsv, toM3u8, toRekordboxXml } from '@/lib/keycrate/export';
import type { Track } from '@/lib/keycrate/types';
import { downloadText, formatBpm } from '../_lib/download';
import { useKeyCrate } from '../_state/store';
import Settings from './Settings';
import Suggestions from './Suggestions';
import Timeline from './Timeline';
import { PlayButton } from './Audio';
import { Button, inputClass, KeyBadge, SectionTitle, TRANSITION_COLOR } from './ui';

/* ═══════════════════════════════════════════════════════════════════════════════
   The set being built: drag to reorder, swipe (or the × button) to remove, undo/redo,
   transitions between rows, the BPM/energy timeline, save, export and share.
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function SetPanel() {
  const { state, derived, actions } = useKeyCrate();
  const { set, busy } = state;
  const { setTracks, transitions } = derived;
  const items = set.history.present;
  const [menu, setMenu] = useState<'none' | 'export' | 'settings'>('none');
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Keyboard undo/redo when focus is inside the tool.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) actions.redo();
        else actions.undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((_, i) => rowId(i) === active.id);
    const to = items.findIndex((_, i) => rowId(i) === over.id);
    actions.moveItem(from, to);
  };

  const exportAs = (kind: 'xml' | 'm3u8' | 'csv') => {
    const name = set.name.trim() || 'keycrate-set';
    if (kind === 'xml')
      downloadText(`${safeFilename(name)}.xml`, toRekordboxXml(name, setTracks), 'application/xml');
    if (kind === 'm3u8')
      downloadText(`${safeFilename(name)}.m3u8`, toM3u8(name, setTracks), 'audio/mpegurl');
    if (kind === 'csv')
      downloadText(`${safeFilename(name)}.csv`, toCsv(setTracks, set.settings), 'text/csv');
    setMenu('none');
  };

  const clashes = transitions.filter((t) => t.clash).length;
  const totalS = setTracks.reduce((s, t) => s + (t.durationS ?? 0), 0);

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Set">
      <SectionTitle
        right={
          <span className="kc-mono text-xs text-[#808880]">
            {items.length} tracks · {Math.round(totalS / 60)} min
            {clashes ? (
              <span className="text-[#ff0000]">
                {' '}
                · {clashes} clash{clashes > 1 ? 'es' : ''}
              </span>
            ) : null}
          </span>
        }
      >
        Set
      </SectionTitle>

      <div className="flex gap-2">
        <input
          value={set.name}
          onChange={(e) => actions.setName(e.target.value)}
          aria-label="Set name"
          className={inputClass}
          data-testid="kc-set-name"
        />
        <Button
          size="md"
          onClick={actions.undo}
          disabled={!derived.canUndo}
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
        >
          ↶
        </Button>
        <Button
          size="md"
          onClick={actions.redo}
          disabled={!derived.canRedo}
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => setMenu(menu === 'settings' ? 'none' : 'settings')}
          aria-expanded={menu === 'settings'}
        >
          {set.settings.mode === 'smooth'
            ? 'Smooth'
            : set.settings.mode === 'dramatic'
              ? 'Dramatic'
              : 'Journey'}{' '}
          · {set.settings.keyLock ? 'key lock on' : 'key lock off'}
        </Button>
        <Button
          size="sm"
          onClick={actions.saveSet}
          disabled={items.length === 0}
          data-testid="kc-save"
        >
          Save
        </Button>
        <Button
          size="sm"
          onClick={() => setMenu(menu === 'export' ? 'none' : 'export')}
          disabled={items.length === 0}
          aria-expanded={menu === 'export'}
          data-testid="kc-export"
        >
          Export
        </Button>
        <Button
          size="sm"
          onClick={async () => {
            const url = await actions.share();
            if (url) {
              setShareUrl(url);
              await navigator.clipboard?.writeText(url).catch(() => undefined);
              actions.toast('Share link copied');
            }
          }}
          disabled={items.length === 0 || !!busy}
        >
          Share
        </Button>
        <Button size="sm" variant="quiet" onClick={actions.newSet}>
          New
        </Button>
      </div>
      {shareUrl && (
        <p className="kc-selectable mt-2 truncate text-xs text-[#808880]">
          Read-only link:{' '}
          <a href={shareUrl} className="text-[#00ff00] underline" target="_blank" rel="noreferrer">
            {shareUrl}
          </a>
        </p>
      )}

      {menu === 'export' && (
        <div
          className="mt-2 flex flex-wrap gap-2 rounded-md border border-white/10 p-2"
          role="group"
          aria-label="Export formats"
        >
          <Button size="sm" onClick={() => exportAs('xml')} data-testid="kc-export-xml">
            rekordbox XML
          </Button>
          <Button size="sm" onClick={() => exportAs('m3u8')}>
            M3U8
          </Button>
          <Button size="sm" onClick={() => exportAs('csv')}>
            CSV
          </Button>
        </div>
      )}
      {menu === 'settings' && <Settings />}

      <div className="kc-dense mt-3 min-h-0 flex-1 overflow-y-auto" data-testid="kc-set-list">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/15 p-4 text-sm text-[#808880]">
            Tap tracks in the library to build the set. Drag to reorder, swipe left to remove.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={items.map((_, i) => rowId(i))}
              strategy={verticalListSortingStrategy}
            >
              <ol className="flex flex-col">
                {items.map((it, i) => {
                  const track = derived.trackMap.get(it.trackId);
                  const into = i > 0 ? transitions[i - 1] : null;
                  return (
                    <li key={rowId(i)} className="flex flex-col">
                      {into && <TransitionRow t={into} />}
                      <SetRow
                        id={rowId(i)}
                        index={i}
                        track={track}
                        note={it.note}
                        onRemove={() => actions.removeAt(i)}
                        onNote={(n) => actions.setNote(i, n)}
                      />
                    </li>
                  );
                })}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Timeline tracks={setTracks} className="mt-3" />
      <Suggestions />
    </section>
  );
}

const rowId = (i: number) => `row-${i}`;

function TransitionRow({ t }: { t: Transition }) {
  const color = TRANSITION_COLOR[t.type];
  return (
    <div
      className="flex items-center gap-2 py-1 pl-3 text-xs"
      style={{ color }}
      data-testid="kc-transition"
    >
      <span aria-hidden>↓</span>
      <span>
        {TRANSITION_LABEL[t.type]}
        {t.semitoneShift
          ? ` (${t.effectiveToKey} after ${t.semitoneShift > 0 ? '+' : ''}${t.semitoneShift} st)`
          : ''}
      </span>
      <span className="kc-mono text-[#808880]">
        {t.bpmChangePct === null
          ? 'no BPM'
          : `${t.bpmChangePct >= 0 ? '+' : ''}${t.bpmChangePct.toFixed(1)}%`}
        {t.bpm && t.bpm.kind !== 'direct' ? ` ${t.bpm.kind}-time` : ''}
        {!t.bpm && t.bpmChangePct !== null ? ' out of range' : ''}
      </span>
      {t.clash && <span className="text-[#ff0000]">· warning: clash</span>}
    </div>
  );
}

function SetRow({
  id,
  index,
  track,
  note,
  onRemove,
  onNote,
}: {
  id: string;
  index: number;
  track: Track | undefined;
  note?: string;
  onRemove: () => void;
  onNote: (n: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [editingNote, setEditingNote] = useState(false);

  // Swipe left to remove: tracked on the row body, separate from the drag handle.
  const onTouchStart = (e: React.TouchEvent) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current) return;
    const x = e.touches[0].clientX - start.current.x;
    const y = e.touches[0].clientY - start.current.y;
    if (Math.abs(y) > Math.abs(x)) return;
    setDx(Math.min(0, x));
  };
  const onTouchEnd = () => {
    if (dx < -96) onRemove();
    setDx(0);
    start.current = null;
  };

  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-md border border-white/10 ${isDragging ? 'z-10 bg-black' : 'bg-black'}`}
      data-testid="kc-set-row"
    >
      <div
        className="absolute inset-y-0 right-0 flex w-24 items-center justify-end pr-3 text-xs text-[#ff0000]"
        aria-hidden
        style={{ opacity: dx < -20 ? 1 : 0 }}
      >
        remove
      </div>
      <div
        className="relative flex items-center gap-2 bg-black py-1.5 pl-1 pr-1"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dx === 0 ? 'transform 150ms ease' : 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          className="flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-[#808880] hover:text-white active:cursor-grabbing"
          aria-label={`Reorder track ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <span className="kc-mono w-5 shrink-0 text-right text-xs text-[#808880]">{index + 1}</span>
        <PlayButton track={track} />
        <KeyBadge camelot={track?.camelot ?? null} muted />
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setEditingNote((v) => !v)}
          aria-label={`Note for ${track?.title ?? 'track'}`}
        >
          <span className="block truncate text-sm text-white">
            {track?.title ?? 'Missing track'}
          </span>
          <span className="block truncate text-xs text-[#808880]">
            {track?.artist}
            {note ? ` · ${note}` : ''}
          </span>
        </button>
        <span className="kc-mono shrink-0 text-xs text-white">{formatBpm(track?.bpm)}</span>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-10 w-8 shrink-0 items-center justify-center text-[#808880] hover:text-[#ff0000]"
          aria-label={`Remove track ${index + 1}`}
        >
          ×
        </button>
      </div>
      {editingNote && (
        <input
          autoFocus
          defaultValue={note ?? ''}
          placeholder="Note for this transition"
          className={`${inputClass} mb-1 ml-8 w-[calc(100%-2.5rem)]`}
          onBlur={(e) => {
            onNote(e.target.value);
            setEditingNote(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditingNote(false);
          }}
        />
      )}
    </div>
  );
}
