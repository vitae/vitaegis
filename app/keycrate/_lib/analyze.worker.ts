/* KeyCrate analysis worker: key and BPM from a slice of WAV samples, off the main thread. */

import { analyzeWavBytes, type Detected, type WavInfo } from '@/lib/keycrate/analysis';

export interface AnalyzeRequest {
  id: number;
  bytes: ArrayBuffer;
  info: WavInfo;
}

export type AnalyzeMessage = { id: number } & (
  | { type: 'done'; result: Detected }
  | { type: 'error'; message: string }
);

const ctx = self as unknown as {
  postMessage: (m: AnalyzeMessage) => void;
  onmessage: ((e: MessageEvent<AnalyzeRequest>) => void) | null;
};

ctx.onmessage = (e) => {
  const { id, bytes, info } = e.data;
  try {
    ctx.postMessage({ id, type: 'done', result: analyzeWavBytes(new Uint8Array(bytes), info) });
  } catch (err) {
    ctx.postMessage({
      id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
