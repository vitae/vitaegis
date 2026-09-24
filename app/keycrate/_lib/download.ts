/** Triggers a browser download of a text blob. */
export function downloadText(filename: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatDuration(s: number | null | undefined): string {
  if (s === null || s === undefined) return '–:––';
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function formatBpm(bpm: number | null | undefined): string {
  if (!bpm) return '––';
  return Number.isInteger(bpm) ? String(bpm) : bpm.toFixed(1);
}
