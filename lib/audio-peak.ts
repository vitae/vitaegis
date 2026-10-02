// Find the most intense stretch of a track: the window with the highest loudness, with a
// bonus for punch (how much the level jumps from moment to moment), so a busy drop beats
// a long sustained pad of the same volume. Pure, so it can be tested on synthetic audio.

/**
 * @param samples mono PCM in [-1, 1]
 * @param rate    sample rate of `samples`
 * @param seconds length of the window to find
 * @param skip    ignore this many seconds at each end (DJ intros and outros)
 * @returns the window's start in seconds
 */
export function loudestWindow(
  samples: Float32Array,
  rate: number,
  seconds: number,
  skip = 15,
): number {
  const block = Math.max(1, Math.round(rate * 0.05)); // 50 ms loudness blocks
  const blocks: number[] = [];
  for (let i = 0; i + block <= samples.length; i += block) {
    let sum = 0;
    for (let j = i; j < i + block; j++) sum += samples[j] * samples[j];
    blocks.push(Math.sqrt(sum / block));
  }
  const per = Math.round(seconds / 0.05);
  const total = blocks.length;
  const lo = Math.min(Math.round(skip / 0.05), Math.max(0, total - per));
  const hi = Math.max(lo, total - per - Math.round(skip / 0.05));
  let best = lo;
  let bestScore = -Infinity;
  for (let s = lo; s <= hi; s += 2) {
    let level = 0;
    let punch = 0;
    for (let k = s; k < s + per && k < total; k++) {
      level += blocks[k];
      if (k > s) punch += Math.max(0, blocks[k] - blocks[k - 1]);
    }
    const score = level / per + 2 * (punch / per);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return (best * block) / rate;
}
